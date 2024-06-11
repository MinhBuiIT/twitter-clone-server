import { Collection, Db, MongoClient } from 'mongodb'
import Bookmark from '~/models/schemas/bookmarks.schemas'
import Conversation from '~/models/schemas/conversations.schemas'
import { Follow } from '~/models/schemas/follows.schemas'
import { HashTag } from '~/models/schemas/hashtags.schemas'
import { HLSVideo } from '~/models/schemas/hls_videos.schemas'
import Like from '~/models/schemas/likes.schemas'
import RefreshTokens from '~/models/schemas/refreshTokens.schemas'
import { Tweet } from '~/models/schemas/tweets.schemas'
import User from '~/models/schemas/users.schemas'
import '~/utils/config'

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@clustertwitterdb.m2uecom.mongodb.net/?retryWrites=true&w=majority&appName=ClusterTwitterDb`

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    ;(this.client = new MongoClient(uri)), (this.db = this.client.db(process.env.DB_NAME))
  }
  async connect() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await this.client.connect()
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (err) {
      console.error(err)
      // Ensures that the this.client will close when you finish/error
      await this.client.close()
    }
  }
  async createIndexUserCollection() {
    const indexCheck = await this.UsersCollection().indexExists(['email_1', 'username_1', 'email_1_password_1'])

    if (!indexCheck) {
      await this.UsersCollection().createIndex({ email: 1 }, { unique: true })
      await this.UsersCollection().createIndex({ username: 1 }, { unique: true })
      await this.UsersCollection().createIndex({ email: 1, password: 1 })
    }
  }
  async createIndexRefreshTokenCollection() {
    const indexCheck = await this.RefreshTokenCollection().indexExists(['token_1', 'ext_1'])
    if (!indexCheck) {
      await this.RefreshTokenCollection().createIndex({ token: 1 }, { unique: true })
      //set sau khi tới mốc ext thì MongoDb sẽ tự động xóa document ấy TTL Indexes
      await this.RefreshTokenCollection().createIndex({ ext: 1 }, { expireAfterSeconds: 0 })
    }
  }
  async createIndexFollowCollection() {
    const indexCheck = await this.FollowCollection().indexExists(['user_id_1_followed_user_id_1'])
    if (!indexCheck) {
      await this.FollowCollection().createIndex({ user_id: 1, followed_user_id: 1 })
    }
  }
  async createIndexHLSVideoCollection() {
    const indexCheck = await this.HLSVideoCollection().indexExists(['name_1'])
    if (!indexCheck) {
      await this.HLSVideoCollection().createIndex({ name: 1 }, { unique: true })
    }
  }
  async createIndexTextContentTweetCollection() {
    const indexCheck = await this.TweetCollection().indexExists(['content_text'])
    if (!indexCheck) {
      await this.TweetCollection().createIndex({ content: 'text' }, { default_language: 'none' })
    }
  }
  async createIndexTextHashTagCollection() {
    const indexCheck = await this.HashTagCollection().indexExists(['name_text'])
    if (!indexCheck) {
      await this.HashTagCollection().createIndex({ name: 'text' }, { default_language: 'none' })
    }
  }
  UsersCollection(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }
  RefreshTokenCollection(): Collection<RefreshTokens> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
  FollowCollection(): Collection<Follow> {
    return this.db.collection(process.env.DB_FOLLOW_COLLECTION as string)
  }
  HLSVideoCollection(): Collection<HLSVideo> {
    return this.db.collection(process.env.DB_HLS_VIDEO as string)
  }
  TweetCollection(): Collection<Tweet> {
    return this.db.collection(process.env.DB_TWEET as string)
  }
  HashTagCollection(): Collection<HashTag> {
    return this.db.collection(process.env.DB_HASHTAG as string)
  }
  BookmarkCollection(): Collection<Bookmark> {
    return this.db.collection(process.env.DB_BOOKMARK as string)
  }
  LikeCollection(): Collection<Like> {
    return this.db.collection(process.env.DB_LIKE as string)
  }
  ConversationCollection(): Collection<Conversation> {
    return this.db.collection(process.env.DB_CONVERSATION as string)
  }
}
const dbService = new DatabaseService()
export default dbService
