import { faker } from '@faker-js/faker'
import { ObjectId, WithId } from 'mongodb'
import { AudienceType, MediaType, TweetType, UserStatus } from '~/constants/enums.contants'
import { TweetReqBody } from '~/models/requests/tweets.requests'
import { RegisterReqType } from '~/models/requests/users.requests'
import { Follow } from '~/models/schemas/follows.schemas'
import { HashTag } from '~/models/schemas/hashtags.schemas'
import { Tweet } from '~/models/schemas/tweets.schemas'
import User from '~/models/schemas/users.schemas'
import databaseService from '~/services/database.services'
import { hashPassword } from '~/utils/hashPassword'

/**
 * Yêu cầu: Mọi người phải cài đặt `@faker-js/faker` vào project
 * Cài đặt: `npm i @faker-js/faker`
 */

// Mật khẩu cho các fake user
const PASSWORD = 'ak5crmVF*'
// ID của tài khoản của mình, dùng để follow người khác
const MYID = new ObjectId('665d5acd53ec3482a802a277')

// Số lượng user được tạo, mỗi user sẽ mặc định tweet 2 cái
const USER_COUNT = 400

const createRandomUser = () => {
  const user: RegisterReqType = {
    name: faker.internet.displayName(),
    email: faker.internet.email(),
    password: PASSWORD,
    confirm_password: PASSWORD,
    date_of_birth: faker.date.past().toISOString()
  }
  return user
}

const createRandomTweet = () => {
  const tweet: TweetReqBody = {
    type: TweetType.Tweet,
    audience: AudienceType.EveryOne,
    content: faker.lorem.paragraph({
      min: 10,
      max: 160
    }),
    hashtags: ['NodeJS', 'MongoDB', 'ExpressJS', 'Swagger', 'Docker', 'Socket.io'],
    media: [
      {
        type: MediaType.Image,
        url: faker.image.url()
      }
    ],
    mentions: [],
    parent_id: ''
  }
  return tweet
}
const users: RegisterReqType[] = faker.helpers.multiple(createRandomUser, {
  count: USER_COUNT
})

const insertMultipleUsers = async (users: RegisterReqType[]) => {
  console.log('Creating users...')
  const result = await Promise.all(
    users.map(async (user) => {
      const user_id = new ObjectId()
      await databaseService.UsersCollection().insertOne(
        new User({
          ...user,
          _id: user_id,
          username: `user${user_id.toString()}`,
          password: hashPassword(user.password),
          date_of_birth: new Date(user.date_of_birth),
          status: UserStatus.Verified
        })
      )
      return user_id
    })
  )
  console.log(`Created ${result.length} users`)
  return result
}

const followMultipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
  console.log('Start following...')
  const result = await Promise.all(
    followed_user_ids.map((followed_user_id) =>
      databaseService.FollowCollection().insertOne(
        new Follow({
          user_id,
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
    )
  )
  console.log(`Followed ${result.length} users`)
}

const checkAndCreateHashtags = async (hashtags: string[]) => {
  const hashtagDocuments = await Promise.all(
    hashtags.map((hashtag) => {
      // Tìm hashtag trong database, nếu có thì lấy, không thì tạo mới
      return databaseService.HashTagCollection().findOneAndUpdate(
        { name: hashtag },
        {
          $setOnInsert: new HashTag({ _id: new ObjectId(), name: hashtag })
        },
        {
          upsert: true,
          returnDocument: 'after'
        }
      )
    })
  )
  return hashtagDocuments.map((hashtag) => (hashtag as WithId<HashTag>)._id)
}

const insertTweet = async (user_id: ObjectId, body: TweetReqBody) => {
  const hashtags = await checkAndCreateHashtags(body.hashtags)
  const result = await databaseService.TweetCollection().insertOne(
    new Tweet({
      audience: body.audience,
      content: body.content,
      hashtags,
      mentions: body.mentions,
      media: body.media,
      parent_id: body.parent_id,
      type: body.type,
      user_id: user_id.toString(),
      view_guest: 0,
      view_user: 0
    })
  )
  return result
}

const insertMultipleTweets = async (ids: ObjectId[]) => {
  console.log('Creating tweets...')
  console.log(`Counting...`)
  let count = 0
  const result = await Promise.all(
    ids.map(async (id, index) => {
      await Promise.all([insertTweet(id, createRandomTweet()), insertTweet(id, createRandomTweet())])
      count += 2
      console.log(`Created ${count} tweets`)
    })
  )
  return result
}

insertMultipleUsers(users).then((ids) => {
  followMultipleUsers(new ObjectId(MYID), ids).catch((err) => {
    console.error('Error when following users')
    console.log(err)
  })
  insertMultipleTweets(ids).catch((err) => {
    console.error('Error when creating tweets')
    console.log(err)
  })
})
