import { Router } from 'express'
import {
  FollowUserController,
  UnfollowUserController,
  addUserCircleController,
  changePassword,
  forgotPasswordController,
  getMeController,
  getProfileUserController,
  loginController,
  loginGoogleController,
  logoutController,
  refreshTokenController,
  registerController,
  resendVerifiedEmailController,
  resetPasswordController,
  updateMeController,
  verifyEmailTokenController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterDataMiddleware } from '~/middlewares/helper.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  followedUserIdValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resendVerifiedEmailValidator,
  resetPasswordValidator,
  unfollowedUserIdValidator,
  updateMeValidator,
  userCircleValidator,
  verifiedUserAccountValidator,
  verifyEmailValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqType } from '~/models/requests/users.requests'
import { wrapErrorHandler } from '~/utils/handlers'
const usersRoute = Router()
/**
 * Description: Login
 * Path: users/login
 * Method: Post
 * Body: {email: string,password: string}
 *
 */
usersRoute.post('/login', loginValidator, wrapErrorHandler(loginController))
/**
 * Description: Login OAuth Google
 * Path: users/google/oauth
 * Method: POST
 *
 */
usersRoute.get('/google/oauth', wrapErrorHandler(loginGoogleController))
/**
 * Description: Register
 * Path: users/register
 * Method: Post
 * Body: {name: string,email: string,password: string,confirm_password: string,day_of_birth: ISO}
 *
 */
usersRoute.post('/register', registerValidator, wrapErrorHandler(registerController))
/**
 * Description: Logout
 * Path: users/logout
 * Method: Post
 * Body: {refresh_token: string}
 * Headers: Authorization: "Bearer <accesstoken>"
 *
 */
usersRoute.post('/logout', accessTokenValidator, refreshTokenValidator, wrapErrorHandler(logoutController))
/**
 * Description: Refresh Token
 * Path: users/refresh-token
 * Method: Post
 * Body: {refresh_token: string}
 *
 */
usersRoute.post('/refresh-token', refreshTokenValidator, wrapErrorHandler(refreshTokenController))
/**
 * Description: Verify Email
 * Path: users/verify-email
 * Method: Post
 * Body: {email_verify_token: string}
 *
 */
usersRoute.post('/verify-email', verifyEmailValidator, wrapErrorHandler(verifyEmailTokenController))
/**
 * Description: Resend Verified Email
 * Path: users/resend-verify-email
 * Method: Post
 * Body: {user_id: string}
 */
usersRoute.post('/resend-verify-email', resendVerifiedEmailValidator, wrapErrorHandler(resendVerifiedEmailController))
/**
 * Description: Forgot Password and send email on server
 * Path: users/forgot-password
 * Method: Post
 * Body: {email: string}
 */
usersRoute.post('/forgot-password', forgotPasswordValidator, wrapErrorHandler(forgotPasswordController))
/**
 * Description: Verify Forgot Password Token
 * Path: users/verify-forgot-password
 * Method: Post
 * Body: {verify_forgot_password: string}
 */
usersRoute.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapErrorHandler(verifyForgotPasswordTokenController)
)
/**
 * Description: Reset Password when verify forgot password token successfully
 * Path: users/reset-password
 * Method: Post
 * Body: {password: string,confirm_password: string, verify_forgot_password: string}
 */
usersRoute.post('/reset-password', resetPasswordValidator, wrapErrorHandler(resetPasswordController))
/**
 * Description: Change password when user has logined
 * Path: users/change-password
 * Method: Post
 * Body: {old_password: string,password: string,confirm_password: string}
 */
usersRoute.post(
  '/change-password',
  accessTokenValidator,
  verifiedUserAccountValidator,
  changePasswordValidator,
  wrapErrorHandler(changePassword)
)
/**
 * Description: Get me information
 * Path: users/me
 * Method: Post
 * Headers: {Authorization: "Bearer <accessToken>"}
 */
usersRoute.get('/me', accessTokenValidator, verifiedUserAccountValidator, getMeController)
/**
 * Description: update info profile user
 * Path: users/me
 * Method: Patch
 * Headers: {Authorization: "Bearer <accessToken>"}
 * Body: UpdateMeReqType
 */
usersRoute.patch(
  '/me',
  accessTokenValidator,
  verifiedUserAccountValidator,
  updateMeValidator,
  filterDataMiddleware<UpdateMeReqType>([
    'name',
    'username',
    'date_of_birth',
    'avatar',
    'cover_photo',
    'location',
    'bio',
    'website'
  ]),
  wrapErrorHandler(updateMeController)
)
/**
 * Description: Following user
 * Path: users/follow
 * Method: Post
 * Header: Bearer <access_token>
 * Body: followed_user_id
 */
usersRoute.post(
  '/follow',
  accessTokenValidator,
  verifiedUserAccountValidator,
  followedUserIdValidator,
  wrapErrorHandler(FollowUserController)
)
/**
 * Description: Unfollowing user
 * Path: users/follow/:followed_user_id
 * Method: DELETE
 * Header: Bearer <access_token>
 * Body: followed_user_id
 */
usersRoute.delete(
  '/follow/:followed_user_id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  unfollowedUserIdValidator,
  wrapErrorHandler(UnfollowUserController)
)
/**
 * Description: Post List User Circle
 * Path: users/user-circle
 * Method: Patch
 * Body: user_circle: []
 */
usersRoute.patch(
  '/user-circle',
  accessTokenValidator,
  verifiedUserAccountValidator,
  userCircleValidator,
  wrapErrorHandler(addUserCircleController)
)
/**
 * Description: Get user profile
 * Path: users/:username
 * Method: Get
 */
usersRoute.get('/:username', wrapErrorHandler(getProfileUserController))
export default usersRoute
