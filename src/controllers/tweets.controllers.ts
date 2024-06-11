import { NextFunction, Request, Response } from 'express'
import core from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { TWEET_MSG } from '~/constants/messages.contants'
import { TweetReqBody, TweetReqParam } from '~/models/requests/tweets.requests'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import { Tweet } from '~/models/schemas/tweets.schemas'
import tweetService from '~/services/tweets.services'

export const postTweetController = async (
  req: Request<core.ParamsDictionary, any, TweetReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const result = await tweetService.addTweet(req.body, user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: TWEET_MSG.POST_TWEET_SUCCESS,
    result
  })
}
export const getTweetController = async (req: Request<TweetReqParam>, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet
  const user_id = req.decoded_authorization?.user_id
  let result = tweet
  //Nếu người đăng get tweet thì không tăng
  if (!tweet.user_id.equals(user_id)) {
    const { view_guest, view_user, updated_at } = await tweetService.increaseViewTweet(req.params.tweet_id, user_id)
    result = { ...result, view_guest, view_user, updated_at }
  }

  return res.status(HTTP_STATUS.OK).json({
    message: TWEET_MSG.GET_TWEET_SUCCESS,
    result: result
  })
}
export const getTweetChildController = async (req: Request<TweetReqParam>, res: Response, next: NextFunction) => {
  const { _id } = req.tweet as Tweet
  const tweet_type = Number(req.query.tweet_type as string)
  const page = Number(req.query.page as string)
  const limit = Number(req.query.limit as string)
  const user_id = req.decoded_authorization?.user_id
  const { result: tweets, totalPage } = await tweetService.getTweetChild({
    parent_id: (_id as ObjectId).toString(),
    tweet_type,
    page,
    limit,
    user_id
  })
  return res.status(HTTP_STATUS.OK).json({
    message: TWEET_MSG.GET_TWEET_CHILD_SUCCESS,
    result: {
      tweets,
      tweet_type,
      page,
      limit,
      total_page: totalPage
    }
  })
}
export const getNewTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const page = Number(req.query.page as string)
  const limit = Number(req.query.limit as string)
  const { tweets, totalPage } = await tweetService.getNewTweetHandle({ user_id, page, limit })
  return res.json({
    message: 'Get New Tweet Successfully',
    result: {
      tweets,
      page,
      limit,
      total_page: totalPage
    }
  })
}
