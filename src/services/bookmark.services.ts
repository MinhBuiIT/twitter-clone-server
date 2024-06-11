import { ObjectId } from 'mongodb'
import { AudienceType, TweetType, UserStatus } from '~/constants/enums.contants'
import Bookmark from '~/models/schemas/bookmarks.schemas'
import { Tweet } from '~/models/schemas/tweets.schemas'
import dbService from './database.services'

class BookmarkService {
  async findBookmark(user_id: string, tweet_id: string) {
    const result = await dbService
      .BookmarkCollection()
      .findOne({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) })
    return result
  }
  async addBookmark(user_id: string, tweet_id: string) {
    await dbService
      .BookmarkCollection()
      .insertOne(new Bookmark({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) }))
  }
  async deleteBookmark(user_id: string, tweet_id: string) {
    await dbService.BookmarkCollection().deleteOne({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) })
  }
  async getBookmarkList(user_id: string, page: number, limit: number) {
    const [tweets, totalDocs] = await Promise.all([
      dbService
        .BookmarkCollection()
        .aggregate<Tweet>([
          {
            $match: {
              user_id: new ObjectId(user_id)
            }
          },
          {
            $lookup: {
              from: 'tweets',
              localField: 'tweet_id',
              foreignField: '_id',
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
                        $in: [user_id]
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
        ])
        .toArray(),
      dbService
        .BookmarkCollection()
        .aggregate([
          {
            $match: {
              user_id: new ObjectId(user_id)
            }
          },
          {
            $lookup: {
              from: 'tweets',
              localField: 'tweet_id',
              foreignField: '_id',
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
                        $in: [user_id]
                      }
                    }
                  ]
                }
              ]
            }
          },
          { $count: 'total' }
        ])
        .toArray()
    ])

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
    const totalPage = totalDocs.length > 0 ? Math.ceil(totalDocs[0].total / limit) : 0
    return {
      tweets,
      totalPage
    }
  }
}
const bookmarkService = new BookmarkService()
export default bookmarkService
