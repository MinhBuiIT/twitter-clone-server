import { checkSchema } from 'express-validator'
import { MediaQueryType } from '~/constants/enums.contants'
import { TWEET_MSG } from '~/constants/messages.contants'
import { validate } from '~/utils/validation'

export const searchValidator = validate(
  checkSchema(
    {
      media_type: {
        optional: true,
        isIn: {
          options: [Object.values(MediaQueryType)],
          errorMessage: TWEET_MSG.MEDIA_QUERY_TYPE_INVALID
        }
      },
      people_follow: {
        optional: true,
        equals: {
          options: 'on',
          errorMessage: TWEET_MSG.PEOPLE_FOLLOW_INVALID
        }
      }
    },
    ['query']
  )
)
