import { Router } from 'express'
import {
  getNewTweetController,
  getTweetChildController,
  getTweetController,
  postTweetController
} from '~/controllers/tweets.controllers'
import {
  audienceValidator,
  createTweetValidator,
  paginationQueryValidator,
  tweetIdValidator,
  tweetTypeQueryValidator
} from '~/middlewares/tweets.middlewares'
import {
  accessTokenValidator,
  isUserLoggedValidator,
  verifiedUserAccountValidator
} from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const tweetRoutes = Router()

/**
 * Description: Post Tweet
 * Path: tweet/
 * Method: Post
 * Body: TweetReqBody
 * Header: Bearer <access_token>
 */
tweetRoutes.post(
  '/',
  accessTokenValidator,
  verifiedUserAccountValidator,
  createTweetValidator,
  wrapErrorHandler(postTweetController)
)

/**
 * Description: Lấy các New Tweet của người user theo dõi và của chính user đó
 * Path: tweet/new-tweets
 * Method: Get
 * Header: Bearer <access_token>
 * Query: {
 *  page,
 *  limit
 * }
 */

tweetRoutes.get(
  '/new-tweets',
  accessTokenValidator,
  verifiedUserAccountValidator,
  paginationQueryValidator,
  wrapErrorHandler(getNewTweetController)
)

/**
 * Description:Khi người dùng bị banned thì ko ai có thể get bài tweet đó được. Khi tweet ở status public => mọi người có thể xem kể cả khi ko đăng nhập; Khi tweet ở status cicrle thì chỉ có người trong cicrle đó mới xem được thôi
 * Path: tweet/:tweet-id
 * Method: Get
 * Header: Bearer <access_token>
 */
tweetRoutes.get(
  '/:tweet_id',
  isUserLoggedValidator(accessTokenValidator),
  isUserLoggedValidator(verifiedUserAccountValidator),
  tweetIdValidator,
  audienceValidator,
  wrapErrorHandler(getTweetController)
)
/**
 * Description: Lấy các Tweet Child của một tweet: Retweet, Comment, Quote Tweet
 * Path: tweet/:tweet-id/child
 * Method: Get
 * Header: Bearer <access_token>
 * Query: {
 *  tweet_type: TweetType,
 *  page,
 *  limit
 * }
 */
tweetRoutes.get(
  '/:tweet_id/child',
  isUserLoggedValidator(accessTokenValidator),
  isUserLoggedValidator(verifiedUserAccountValidator),
  tweetIdValidator,
  tweetTypeQueryValidator,
  paginationQueryValidator,
  audienceValidator,
  wrapErrorHandler(getTweetChildController)
)

export default tweetRoutes
