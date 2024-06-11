import { ObjectId } from 'mongodb'
import { AudienceType, MediaQueryType, MediaType, TweetType, UserStatus } from '~/constants/enums.contants'
import dbService from './database.services'
import userService from './users.services'

class SearchService {
  private aggregateTweet({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    return [
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user'
        }
      },
      {
        $match: {
          'user.status': {
            $ne: UserStatus.Banned
          }
        }
      },
      {
        $match: {
          $or: [
            {
              audience: AudienceType.EveryOne
            },
            {
              $and: [
                {
                  audience: AudienceType.TwitterCircle
                },
                {
                  'user.cicrle_user': {
                    $in: [new ObjectId(user_id)]
                  }
                }
              ]
            }
          ]
        }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      },
      {
        $sort: {
          created_at: -1
        }
      },
      {
        $lookup: {
          from: 'hashtags',
          localField: 'hashtags',
          foreignField: '_id',
          as: 'hashtags'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'mentions',
          foreignField: '_id',
          as: 'mentions'
        }
      },
      {
        $addFields: {
          mentions: {
            $map: {
              input: '$mentions',
              as: 'item',
              in: {
                _id: '$$item._id',
                name: '$$item.name',
                username: '$$item.username'
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'bookmarks',
          localField: '_id',
          foreignField: 'tweet_id',
          as: 'bookmark_list'
        }
      },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'tweet_id',
          as: 'like_list'
        }
      },
      {
        $lookup: {
          from: 'tweets',
          localField: '_id',
          foreignField: 'parent_id',
          as: 'tweet_again'
        }
      },
      {
        $addFields: {
          bookmark_list: {
            $size: '$bookmark_list'
          },
          like_list: {
            $size: '$like_list'
          },
          retweet_count: {
            $size: {
              $filter: {
                input: '$tweet_again',
                as: 'item',
                cond: {
                  $eq: ['$$item.type', TweetType.ReTweet]
                }
              }
            }
          },
          comment_count: {
            $size: {
              $filter: {
                input: '$tweet_again',
                as: 'item',
                cond: {
                  $eq: ['$$item.type', TweetType.Comment]
                }
              }
            }
          },
          quote_count: {
            $size: {
              $filter: {
                input: '$tweet_again',
                as: 'item',
                cond: {
                  $eq: ['$$item.type', TweetType.QuoteTweet]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          tweet_again: 0,
          'user._id': 0,
          'user.password': 0,
          'user.email_verify_token': 0,
          'user.forgot_password_token': 0,
          'user.cicrle_user': 0,
          'user.date_of_birth': 0,
          'user.email': 0
        }
      }
    ]
  }
  async searchContent({
    content,
    user_id,
    page,
    limit,
    media_type,
    people_follow
  }: {
    content: string
    user_id: string
    page: number
    limit: number
    media_type?: MediaQueryType
    people_follow?: 'on'
  }) {
    const $match: any = {
      $text: {
        $search: content
      }
    }
    if (media_type) {
      if (media_type === MediaQueryType.Image) {
        $match['media.type'] = MediaType.Image
      }
      if (media_type === MediaQueryType.Video) {
        $match['media.type'] = MediaType.Video
      }
    }
    if (people_follow && people_follow === 'on') {
      const followed_id_list = await userService.getFollowedUserList(user_id)
      const followed_ids = followed_id_list.map((item) => item.followed_user_id)
      $match['user_id'] = {
        $in: followed_ids
      }
    }
    const [tweets, totalDocs] = await Promise.all([
      dbService
        .TweetCollection()
        .aggregate([
          {
            $match
          },
          ...this.aggregateTweet({ user_id, page, limit })
        ])
        .toArray(),
      dbService
        .TweetCollection()
        .aggregate([
          {
            $match
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user'
            }
          },
          {
            $match: {
              'user.status': {
                $ne: UserStatus.Banned
              }
            }
          },
          {
            $match: {
              $or: [
                {
                  audience: AudienceType.EveryOne
                },
                {
                  $and: [
                    {
                      audience: AudienceType.TwitterCircle
                    },
                    {
                      'user.cicrle_user': {
                        $in: [new ObjectId(user_id)]
                      }
                    }
                  ]
                }
              ]
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])
    const totalPage = totalDocs.length > 0 ? Math.ceil(totalDocs[0].total / limit) : 0
    //Increase View Tweet
    const tweetIdChilds = tweets
      .filter((item) => !item.user_id.equals(user_id))
      .map((item) => {
        return item._id as ObjectId
      })
    const date = new Date()
    await dbService.TweetCollection().updateMany(
      {
        _id: {
          $in: tweetIdChilds
        }
      },
      {
        $inc: { view_user: 1 }, //Luon Phai Dang Nhap
        $set: {
          updated_at: date
        }
      }
    )
    tweets.forEach((item) => {
      if (!item.user_id.equals(user_id)) {
        item.view_user += 1
        item.updated_at = date
      }
    })
    return {
      tweets,
      totalPage
    }
  }
  async searchHashTagName({
    hashTagName,
    user_id,
    page,
    limit,
    media_type,
    people_follow
  }: {
    hashTagName: string
    user_id: string
    page: number
    limit: number
    media_type?: MediaQueryType
    people_follow?: 'on'
  }) {
    const $match: any = {}
    if (media_type) {
      if (media_type === MediaQueryType.Image) {
        $match['media.type'] = MediaType.Image
      }
      if (media_type === MediaQueryType.Video) {
        $match['media.type'] = MediaType.Video
      }
    }
    if (people_follow && people_follow === 'on') {
      const followed_id_list = await userService.getFollowedUserList(user_id)
      const followed_ids = followed_id_list.map((item) => item.followed_user_id)
      $match['user_id'] = {
        $in: followed_ids
      }
    }
    const [tweets, totalDocs] = await Promise.all([
      dbService
        .HashTagCollection()
        .aggregate([
          {
            $match: {
              $text: {
                $search: hashTagName
              }
            }
          },
          {
            $lookup: {
              from: 'tweets',
              localField: '_id',
              foreignField: 'hashtags',
              as: 'tweet'
            }
          },
          {
            $unwind: {
              path: '$tweet'
            }
          },
          {
            $replaceRoot: {
              newRoot: '$tweet'
            }
          },
          { $match },
          ...this.aggregateTweet({ user_id, page, limit })
        ])
        .toArray(),
      dbService
        .HashTagCollection()
        .aggregate([
          {
            $match: {
              $text: {
                $search: hashTagName
              }
            }
          },
          {
            $lookup: {
              from: 'tweets',
              localField: '_id',
              foreignField: 'hashtags',
              as: 'tweet'
            }
          },
          {
            $unwind: {
              path: '$tweet'
            }
          },
          {
            $replaceRoot: {
              newRoot: '$tweet'
            }
          },
          {
            $match
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user'
            }
          },
          {
            $match: {
              'user.status': {
                $ne: UserStatus.Banned
              }
            }
          },
          {
            $match: {
              $or: [
                {
                  audience: AudienceType.EveryOne
                },
                {
                  $and: [
                    {
                      audience: AudienceType.TwitterCircle
                    },
                    {
                      'user.cicrle_user': {
                        $in: [new ObjectId(user_id)]
                      }
                    }
                  ]
                }
              ]
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])

    const totalPage = totalDocs.length > 0 ? Math.ceil(totalDocs[0].total / limit) : 0
    //Increase View Tweet
    const tweetIdChilds = tweets
      .filter((item) => !item.user_id.equals(user_id))
      .map((item) => {
        return item._id as ObjectId
      })
    const date = new Date()
    await dbService.TweetCollection().updateMany(
      {
        _id: {
          $in: tweetIdChilds
        }
      },
      {
        $inc: { view_user: 1 }, //Luon Phai Dang Nhap
        $set: {
          updated_at: date
        }
      }
    )
    tweets.forEach((item) => {
      if (!item.user_id.equals(user_id)) {
        item.view_user += 1
        item.updated_at = date
      }
    })
    return {
      tweets,
      totalPage
    }
  }
}
const searchService = new SearchService()
export default searchService
