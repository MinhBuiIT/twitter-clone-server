import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { BOOKMARK_MSG } from '~/constants/messages.contants'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import bookmarkService from '~/services/bookmark.services'

export const postBookmarkController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: tweet_id } = req.tweet
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const bookmark = await bookmarkService.findBookmark(user_id, tweet_id)

  if (bookmark !== null) {
    return res.status(HTTP_STATUS.OK).json({
      message: BOOKMARK_MSG.BOOKMARK_EXISTING
    })
  }
  const result = await bookmarkService.addBookmark(user_id, tweet_id)
  return res.status(HTTP_STATUS.OK).json({
    message: BOOKMARK_MSG.BOOKMARK_ADD_SUCCESS,
    result
  })
}
export const deleteBookmarkController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: tweet_id } = req.tweet
  const { user_id } = req.decoded_authorization as JwtPayloadExtension

  await bookmarkService.deleteBookmark(user_id, tweet_id)
  return res.status(HTTP_STATUS.OK).json({
    message: BOOKMARK_MSG.UNBOOKMARK_SUCCESS
  })
}
export const checkBookmarkTweetUserController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const { _id: tweet_id } = req.tweet

  const result = await bookmarkService.findBookmark(user_id, tweet_id)
  if (result === null) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: BOOKMARK_MSG.NOT_BOOKMARK_TWEET
    })
  }
  return res.status(HTTP_STATUS.OK).json({
    message: BOOKMARK_MSG.GET_BOOKMARK_SUCCESS,
    result
  })
}
export const getBookmarkListController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const { tweets, totalPage } = await bookmarkService.getBookmarkList(user_id, page, limit)
  return res.status(HTTP_STATUS.OK).json({
    message: BOOKMARK_MSG.GET_BOOKMARK_LIST_SUCCESS,
    result: {
      tweets,
      page,
      limit,
      total_page: totalPage
    }
  })
}
