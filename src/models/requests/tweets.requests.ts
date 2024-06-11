import { ParamsDictionary } from 'express-serve-static-core'
import { AudienceType, TweetType } from '~/constants/enums.contants'
import { Media } from '../Other'

export interface TweetReqBody {
  parent_id: string // neu khong co truyen len ""
  type: TweetType
  content: string
  audience: AudienceType
  hashtags: string[]
  mentions: string[] //string id
  media: Media[]
}
export interface TweetReqParam extends ParamsDictionary {
  tweet_id: string
}
