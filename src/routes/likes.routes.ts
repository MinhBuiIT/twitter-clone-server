import { Router } from 'express'
import { checkLikeTweetUserController, deleteLikeController, postLikeController } from '~/controllers/like.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserAccountValidator } from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const likeRoutes = Router()
/**
 * Description: Like Tweet
 * Path: like/
 * Method: Post
 * Body: {tweet_id: string}
 * Header: Bearer <access_token>
 */
likeRoutes.post(
  '/',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(postLikeController)
)
/**
 * Description: Unlike Tweet
 * Path: like/tweet/:tweet_id
 * Method: Delete
 * Header: Bearer <access_token>
 */
likeRoutes.delete(
  '/tweet/:tweet_id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(deleteLikeController)
)
/**
 * Description: Check User Liked a tweet
 * Path: like/tweet/:tweet_id
 * Method: get
 * Header: Bearer <access_token>
 */
likeRoutes.get(
  '/tweet/:tweet_id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  tweetIdValidator,
  wrapErrorHandler(checkLikeTweetUserController)
)
export default likeRoutes
