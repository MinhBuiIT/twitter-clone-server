import { Router } from 'express'
import {
  checkBookmarkTweetUserController,
  deleteBookmarkController,
  getBookmarkListController,
  postBookmarkController
} from '~/controllers/bookmark.controllers'
import { paginationQueryValidator, tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserAccountValidator } from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const bookmarkRoutes = Router()
/**
 * Description: Bookmark Tweet
 * Path: bookmark/
 * Method: Post
 * Body: {tweet_id: string}
 * Header: Bearer <access_token>
 */
bookmarkRoutes.post(
  '/',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(postBookmarkController)
)
/**
 * Description: Unbookmark Tweet
 * Path: bookmark/tweet/:tweet_id
 * Method: Delete
 * Header: Bearer <access_token>
 */
bookmarkRoutes.delete(
  '/tweet/:tweet_id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(deleteBookmarkController)
)
/**
 * Description: Check User Bookmark a tweet
 * Path: bookmark/tweet/:tweet_id
 * Method: get
 * Header: Bearer <access_token>
 */
bookmarkRoutes.get(
  '/tweet/:tweet_id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(checkBookmarkTweetUserController)
)
/**
 * Description: Get List Bookmark User
 * Path: bookmark/list
 * Method: Post
 * Body: {tweet_id: string}
 * Header: Bearer <access_token>
 */
bookmarkRoutes.get(
  '/list',
  accessTokenValidator,
  verifiedUserAccountValidator,
  paginationQueryValidator,
  wrapErrorHandler(getBookmarkListController)
)

export default bookmarkRoutes
