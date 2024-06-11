import { ObjectId } from 'mongodb'
import { AudienceType, TweetType } from '~/constants/enums.contants'
import { Media } from '../Other'

interface TweetContructor {
  _id?: ObjectId
  user_id: string
  parent_id: string // TweetType = Tweet thì bằng null
  type: TweetType
  content: string
  audience: AudienceType
  hashtags: ObjectId[]
  mentions: string[] //string id
  media: Media[]
  view_guest: number
  view_user: number
  created_at?: Date
  updated_at?: Date
}
export class Tweet {
  _id?: ObjectId
  user_id: ObjectId
  parent_id: ObjectId | null // TweetType = Tweet thì bằng null
  type: TweetType
  content: string
  audience: AudienceType
  hashtags: ObjectId[]
  mentions: ObjectId[] //string id
  media: Media[]
  view_guest: number
  view_user: number
  created_at: Date
  updated_at: Date
  constructor(tweetCons: TweetContructor) {
    const date = new Date()
    this._id = tweetCons._id
    this.user_id = new ObjectId(tweetCons.user_id)
    this.parent_id = tweetCons.parent_id !== '' ? new ObjectId(tweetCons.parent_id) : null
    this.type = tweetCons.type
    this.content = tweetCons.content
    this.audience = tweetCons.audience
    this.hashtags = tweetCons.hashtags
    this.mentions = tweetCons.mentions.map((item) => new ObjectId(item))
    this.media = tweetCons.media
    this.view_guest = tweetCons.view_guest
    this.view_user = tweetCons.view_user
    this.created_at = tweetCons.created_at || date
    this.updated_at = tweetCons.updated_at || date
  }
}
