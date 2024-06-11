import { ObjectId, WithId } from 'mongodb'
import { AudienceType, TweetType, UserStatus } from '~/constants/enums.contants'
import { TweetReqBody } from '~/models/requests/tweets.requests'
import { HashTag } from '~/models/schemas/hashtags.schemas'
import { Tweet } from '~/models/schemas/tweets.schemas'
import dbService from './database.services'
import userService from './users.services'

class TweetService {
  async checkAndInsertHashTag(hashTags: string[]) {
    //tìm nếu có thì return về docs nếu ko thì insert vào
    const hashTagsDocs = await Promise.all(
      hashTags.map((hashTag) => {
        const hashTagNameSplit = hashTag.split('#')
        const hashTagName = hashTagNameSplit[hashTagNameSplit.length - 1]
        return dbService.HashTagCollection().findOneAndUpdate(
          { name: hashTagName },
          {
            $setOnInsert: new HashTag({ _id: new ObjectId(), name: hashTagName })
          },
          {
            upsert: true,
            returnDocument: 'after'
          }
        )
      })
    )
    return hashTagsDocs.map((item) => item?._id)
  }
  async addTweet(body: TweetReqBody, user_id: string) {
    const hashtags = body.hashtags
    const hashTagDocs = await this.checkAndInsertHashTag(hashtags)
    const result = await dbService.TweetCollection().insertOne(
      new Tweet({
        type: body.type,
        content: body.content,
        hashtags: hashTagDocs as ObjectId[], //body.hashtags
        mentions: body.mentions,
        audience: body.audience,
        media: body.media,
        parent_id: body.parent_id,
        user_id,
        view_guest: 0,
        view_user: 0
      })
    )
    const tweet = await dbService.TweetCollection().findOne({
      _id: new ObjectId(result.insertedId)
    })
    return tweet
  }
  async getTweet(tweet_id: string) {
    const result = await dbService
      .TweetCollection()
      .aggregate<Tweet>([
        {
          $match: {
            _id: new ObjectId(tweet_id)
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
      .toArray()
    return result[0]
  }
  async increaseViewTweet(tweet_id: string, user_id: string | undefined) {
    const incre = user_id ? { view_user: 1 } : { view_guest: 1 }
    const result = await dbService.TweetCollection().findOneAndUpdate(
      { _id: new ObjectId(tweet_id) },
      {
        $inc: incre,
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          view_user: 1,
          view_guest: 1,
          updated_at: 1
        }
      }
    )
    return result as WithId<{ view_user: number; view_guest: number; updated_at: Date }>
  }
  async getTweetChild({
    parent_id,
    tweet_type,
    page,
    limit,
    user_id
  }: {
    parent_id: string
    tweet_type: TweetType
    page: number
    limit: number
    user_id: string | undefined
  }) {
    const [result, totalDocs] = await Promise.all([
      dbService
        .TweetCollection()
        .aggregate<Tweet>([
          {
            $match: {
              parent_id: new ObjectId('665c43c12a97e567e4169515'),
              type: tweet_type
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
            $sort: {
              created_at: -1
            }
          },
          {
            $skip: (page - 1) * limit
          },
          {
            $limit: limit
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
              user: 0
            }
          }
        ])
        .toArray(), //Những người dùng nào ở status Banned thì sẽ không load ra tweet child của người dùng đó
      dbService
        .TweetCollection()
        .aggregate([
          {
            $match: {
              parent_id: new ObjectId('665c43c12a97e567e4169515'),
              type: tweet_type
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
            $count: 'total_child'
          }
        ])
        .toArray()
    ])

    //Tăng view chô tweet child (tăng khi người dùng ko đăng tweet get tweet)
    const tweetIdChilds = result
      .filter((item) => !item.user_id.equals(user_id))
      .map((item) => {
        return item._id as ObjectId
      })
    const incre = user_id ? { view_user: 1 } : { view_guest: 1 }
    const date = new Date()
    await dbService.TweetCollection().updateMany(
      {
        _id: {
          $in: tweetIdChilds
        }
      },
      {
        $inc: incre,
        $set: {
          updated_at: date
        }
      }
    )
    result.forEach((item) => {
      if (!item.user_id.equals(user_id)) {
        if (user_id) {
          item.view_user += 1
        } else item.view_guest += 1
        item.updated_at = date
      }
    })
    const totalPage = totalDocs.length > 0 ? Math.ceil(totalDocs[0].total_child / limit) : 0
    //totalPage: Math.ceil(totalDocs / limit)
    return { result, totalPage }
  }
  async getNewTweetHandle({ user_id, page, limit }: { user_id: string; page: number; limit: number }) {
    const followed_user = await userService.getFollowedUserList(user_id)
    const followed_ids = followed_user.map((item) => item.followed_user_id)
    //Thêm id của chính user
    const user_objId = new ObjectId(user_id)
    followed_ids.push(user_objId)
    const [tweets, totalDocs] = await Promise.all([
      dbService
        .TweetCollection()
        .aggregate<Tweet>([
          {
            $match: {
              user_id: {
                $in: followed_ids
              }
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
                        $in: [user_objId]
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
        .TweetCollection()
        .aggregate([
          {
            $match: {
              user_id: {
                $in: followed_ids
              }
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
                        $in: [user_objId]
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
    return { tweets, totalPage }
  }
}
const tweetService = new TweetService()
export default tweetService
