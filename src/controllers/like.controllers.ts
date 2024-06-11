import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { LIKE_MSG } from '~/constants/messages.contants'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import likeService from '~/services/like.services'

export const postLikeController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: tweet_id } = req.tweet
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const like = await likeService.findLike(user_id, tweet_id)

  if (like !== null) {
    return res.status(HTTP_STATUS.OK).json({
      message: LIKE_MSG.LIKE_EXISTING
    })
  }
  await likeService.addLike(user_id, tweet_id)
  return res.status(HTTP_STATUS.OK).json({
    message: LIKE_MSG.LIKE_ADD_SUCCESS
  })
}
export const deleteLikeController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: tweet_id } = req.tweet
  const { user_id } = req.decoded_authorization as JwtPayloadExtension

  await likeService.deleteLike(user_id, tweet_id)
  return res.status(HTTP_STATUS.OK).json({
    message: LIKE_MSG.UNLIKE_SUCCESS
  })
}
export const checkLikeTweetUserController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const { _id: tweet_id } = req.tweet

  const result = await likeService.findLike(user_id, tweet_id)
  if (result === null) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: LIKE_MSG.NOT_LIKE_TWEET
    })
  }
  return res.status(HTTP_STATUS.OK).json({
    message: LIKE_MSG.GET_LIKE_SUCCESS,
    result
  })
}
