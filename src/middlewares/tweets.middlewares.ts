import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { AudienceType, MediaType, TweetType, UserStatus } from '~/constants/enums.contants'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { TWEET_MSG, USER_MSG } from '~/constants/messages.contants'
import { ErrorMessage } from '~/models/Errors'
import { Tweet } from '~/models/schemas/tweets.schemas'
import tweetService from '~/services/tweets.services'
import userService from '~/services/users.services'
import { convertEnumToArray } from '~/utils/helper'
import { validate } from '~/utils/validation'

const tweetEnumValue = convertEnumToArray(TweetType)
const audienceEnumValue = convertEnumToArray(AudienceType)
const mediaEnumValue = convertEnumToArray(MediaType)

export const createTweetValidator = validate(
  checkSchema(
    {
      type: {
        isIn: {
          options: [tweetEnumValue],
          errorMessage: TWEET_MSG.TYPE_ENUM
        }
      },
      audience: {
        isIn: {
          options: [audienceEnumValue],
          errorMessage: TWEET_MSG.AUDIENCE_ENUM
        }
      },
      parent_id: {
        custom: {
          options: (val, { req }) => {
            const type = req.body.type
            //Nếu type là Tweet thì parent_id = "" ngược lại nếu type là còn lại thì parent_id = ObjectId
            if (type === TweetType.Tweet && val !== '') {
              throw new Error(TWEET_MSG.PARENT_ID_INVALID)
            }
            if ([TweetType.ReTweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) && val === '') {
              throw new Error(TWEET_MSG.PARENT_ID_INVALID)
            }
            return true
          }
        }
      },
      content: {
        isString: {
          errorMessage: TWEET_MSG.CONTENT_STRING
        },
        custom: {
          options: (val, { req }) => {
            const type = req.body.type
            //Nếu Retweet thì content phải rỗng
            if (type === TweetType.ReTweet && val !== '') {
              throw new Error(TWEET_MSG.CONTENT_INVALID)
            }
            //Nếu các tweet type còn lại thì nếu ko có hashtags và mentions thì phái có content
            if (
              [TweetType.Tweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
              req.body.hashtags.length === 0 &&
              req.body.mentions.length === 0 &&
              val === ''
            ) {
              throw new Error(TWEET_MSG.PARENT_ID_INVALID)
            }
            return true
          }
        }
      },
      hashtags: {
        custom: {
          options: (val) => {
            if (!Array.isArray(val)) {
              throw new Error(TWEET_MSG.HASH_TAG_ARRAY)
            }
            if (val.length > 0 && !val.every((item) => typeof item === 'string')) {
              throw new Error(TWEET_MSG.HASH_TAG_ITEM_STR)
            }
            return true
          }
        }
      },
      mentions: {
        custom: {
          options: (val) => {
            if (!Array.isArray(val)) {
              throw new Error(TWEET_MSG.MENTIONS_ARRAY)
            }
            if (val.length > 0 && !val.every((item) => ObjectId.isValid(item))) {
              throw new Error(TWEET_MSG.MENTIONS_ITEM_STR)
            }
            return true
          }
        }
      },
      media: {
        custom: {
          options: (val) => {
            if (!Array.isArray(val)) {
              throw new Error(TWEET_MSG.MEDIA_ARRAY)
            }
            const checkItem = val.every((item) => {
              const keyList = Object.keys(item)

              return (
                keyList.length === 2 &&
                keyList.includes('url') &&
                keyList.includes('type') &&
                mediaEnumValue.includes(item.type)
              )
            })
            if (val.length > 0 && !checkItem) {
              throw new Error(TWEET_MSG.MEDIA_FORMAT)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const audienceValidator = async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet
  const { user_id } = tweet
  const userAuth = req.decoded_authorization
  const user = await userService.findOneUser('_id', new ObjectId(user_id))
  //Nếu người post bài tweet bị banned thì ko xem được trừ chính họ
  if (!user_id.equals(userAuth?.user_id) && user?.status === UserStatus.Banned) {
    next(new ErrorMessage({ message: TWEET_MSG.USER_TWEET_BANNED, status: HTTP_STATUS.FORBIDDEN }))
  }
  if (tweet.audience === AudienceType.TwitterCircle) {
    //Người dung da dang nhap chua
    if (!userAuth) {
      next(new ErrorMessage({ message: USER_MSG.USER_NOT_LOGIN, status: HTTP_STATUS.UNAUTHORIZED }))
    }
    //Kiểm tra người dùng trong ds Circle của người đăng tweet ko?
    const checkUserInCircle = user?.cicrle_user.some((user_cicrle) => user_cicrle.equals(userAuth?.user_id))
    if (!user_id.equals(userAuth?.user_id) && !checkUserInCircle) {
      next(new ErrorMessage({ message: TWEET_MSG.USER_NOT_CIRCLE, status: HTTP_STATUS.FORBIDDEN }))
    }
  }
  next()
}
const tweetTypeArr = convertEnumToArray(TweetType)

export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (val, { req }) => {
            if (!ObjectId.isValid(val)) {
              throw new ErrorMessage({ message: TWEET_MSG.TWEET_ID, status: HTTP_STATUS.BAD_REQUEST })
            }
            const tweet = await tweetService.getTweet(val)

            if (!tweet) throw new ErrorMessage({ message: TWEET_MSG.TWEET_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
            ;(req as Request).tweet = tweet
            return true
          }
        }
      }
    },
    ['body', 'params']
  )
)
export const tweetTypeQueryValidator = validate(
  checkSchema(
    {
      tweet_type: {
        isIn: {
          options: [tweetTypeArr],
          errorMessage: TWEET_MSG.TWEET_TYPE_INVALID
        }
      }
    },
    ['query']
  )
)
export const paginationQueryValidator = validate(
  checkSchema(
    {
      limit: {
        isNumeric: {
          errorMessage: TWEET_MSG.LIMIT_NUMBER
        },
        custom: {
          options: (val) => {
            const value = Number(val)
            if (value > 100) {
              throw new Error(TWEET_MSG.LIMIT_INVALID)
            }
            return true
          }
        }
      },
      page: {
        isNumeric: {
          errorMessage: TWEET_MSG.PAGE_NUMBER
        }
      }
    },
    ['query']
  )
)
