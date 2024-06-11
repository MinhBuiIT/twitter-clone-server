import { NextFunction, Request, Response } from 'express'
import core from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import { UserStatus } from '~/constants/enums.contants'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { USER_MSG } from '~/constants/messages.contants'
import { ErrorMessage } from '~/models/Errors'
import {
  ChangePasswordReqType,
  FollowReqParams,
  FollowReqType,
  ForgotPasswordReqType,
  ForgotPasswordTokenReqType,
  JwtPayloadExtension,
  RefreshTokenReqType,
  RegisterReqType,
  ResendEmailReqType,
  ResetPasswordReqType,
  UpdateMeReqType,
  UserCircleReqType,
  VerifyEmailReqType
} from '~/models/requests/users.requests'
import User from '~/models/schemas/users.schemas'
import dbService from '~/services/database.services'
import userService from '~/services/users.services'

export const loginController = async (req: Request, res: Response) => {
  const user = req.user as User
  if (user.status === UserStatus.Unverified) {
    return res.status(200).json({
      message: 'Please verify email'
    })
  }
  const _id = user._id as ObjectId
  const result = await userService.login(_id.toString(), user.status)
  return res.status(200).json({
    message: 'Login Successfully',
    result
  })
}
export const loginGoogleController = async (req: Request, res: Response) => {
  const { code } = req.query
  const result = await userService.oauthLoginGoogle(code as string)
  const url = `http://localhost:3000/oauth/login?access_token=${result.access_token}&refresh_token=${result.refresh_token}&newUser=${result.newUser}`
  return res.redirect(url)
}
export const registerController = async (
  req: Request<core.ParamsDictionary, any, RegisterReqType>,
  res: Response,
  next: NextFunction
) => {
  const { confirm_password, ...restData } = req.body
  const result = await userService.register(restData)
  res.status(200).json({
    message: 'Success! Register',
    result
  })
}
export const logoutController = async (
  req: Request<core.ParamsDictionary, any, RefreshTokenReqType>,
  res: Response,
  next: NextFunction
) => {
  const { refresh_token } = req.body
  await userService.deleteRefreshToken(refresh_token)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Logout successfully'
  })
}
export const refreshTokenController = async (
  req: Request<core.ParamsDictionary, any, RefreshTokenReqType>,
  res: Response,
  next: NextFunction
) => {
  const { refresh_token } = req.body
  const { user_id, exp, status_user } = req.decoded_refresh_token as JwtPayloadExtension
  //lấy exp refresh token cũ mình set cho refresh token mới
  const result = await userService.refreshTokenService(refresh_token, user_id, exp as number, status_user)
  return res.status(200).json({
    message: 'Refresh token successfully',
    result
  })
}
export const verifyEmailTokenController = async (
  req: Request<core.ParamsDictionary, any, VerifyEmailReqType>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_verify_email_token as JwtPayloadExtension
  const user = await userService.findOneUser('_id', new ObjectId(user_id))
  if (user == null) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USER_MSG.USER_NOT_FOUND
    })
  }
  if (user.status === UserStatus.Verified) {
    //khi user đã xác thực email thì email_verify_token bằng rỗng
    return res.status(HTTP_STATUS.OK).json({
      message: USER_MSG.USER_VERIFIED_EMAIL
    })
  }
  const result = await userService.verifyEmailTokenHandler(user_id)
  return res.status(200).json({
    message: 'Verify email successfully',
    result
  })
}

export const resendVerifiedEmailController = async (
  req: Request<core.ParamsDictionary, any, ResendEmailReqType>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.body
  const user = await userService.findOneUser('_id', new ObjectId(user_id))
  if (user == null) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USER_MSG.USER_NOT_FOUND
    })
  }
  if (user.status === UserStatus.Verified) {
    //khi user đã xác thực email thì email_verify_token bằng rỗng
    return res.status(HTTP_STATUS.OK).json({
      message: USER_MSG.USER_VERIFIED_EMAIL
    })
  }
  await userService.resendVerifiedEmail(user_id, user.name, user.email)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Email verify sent again'
  })
}
export const forgotPasswordController = async (
  req: Request<core.ParamsDictionary, any, ForgotPasswordReqType>,
  res: Response,
  next: NextFunction
) => {
  const { _id, status, name, email } = req.user as User

  const message = await userService.forgotPasswordService(_id as ObjectId, status, name, email)
  return res.status(HTTP_STATUS.OK).json(message)
}

export const verifyForgotPasswordTokenController = async (
  req: Request<core.ParamsDictionary, any, ForgotPasswordTokenReqType>,
  res: Response,
  next: NextFunction
) => {
  const decoded = req.decoded_forgot_password_token as JwtPayloadExtension
  const { user_id } = decoded
  const { verify_forgot_password } = req.body
  //Khi verify forgot password ko xóa verify_forgot_password trong db mà đợi khi nào người dùng reset password rồi mới xóa
  const user = await dbService
    .UsersCollection()
    .findOne({ _id: { $eq: new ObjectId(user_id) }, forgot_password_token: { $eq: verify_forgot_password } })
  if (user == null) {
    throw new ErrorMessage({ message: USER_MSG.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
  }
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.FORGOT_PASSWORD_VERIFY_TOKEN
  })
}
export const resetPasswordController = async (
  req: Request<core.ParamsDictionary, any, ResetPasswordReqType>,
  res: Response,
  next: NextFunction
) => {
  const { password, verify_forgot_password } = req.body
  const { user_id } = req.decoded_forgot_password_token as JwtPayloadExtension
  const user = await dbService
    .UsersCollection()
    .findOne({ _id: { $eq: new ObjectId(user_id) }, forgot_password_token: { $eq: verify_forgot_password } })
  if (user == null) {
    throw new ErrorMessage({ message: USER_MSG.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
  }
  await userService.resetPasswordService(user_id, password)
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.RESET_PASSWORD
  })
}
export const changePassword = async (
  req: Request<core.ParamsDictionary, any, ChangePasswordReqType>,
  res: Response,
  next: NextFunction
) => {
  const { password } = req.body
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  await userService.resetPasswordService(user_id, password)
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.CHANGE_PASSWORD_SUCCESS
  })
}
export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const user = await userService.findOneUser('_id', new ObjectId(user_id), {
    projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 }
  })
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.GET_ME_SUCCESS,
    result: user
  })
}
export const updateMeController = async (
  req: Request<core.ParamsDictionary, any, UpdateMeReqType>,
  res: Response,
  next: NextFunction
) => {
  const body = req.body

  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const user = await userService.updateMeService(user_id, body)
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.UPDATE_ME_SUCCESS,
    user
  })
}
export const getProfileUserController = async (
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.params
  const result = await userService.getUserProfile(username)
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.USER_SUCCESS,
    result
  })
}
export const FollowUserController = async (
  req: Request<core.ParamsDictionary, any, FollowReqType>,
  res: Response,
  next: NextFunction
) => {
  const user_followed = req.user as User
  if (user_followed.status === UserStatus.Unverified) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      message: USER_MSG.FOLLOWED_USER_NOT_VERIFIED_EMAIL
    })
  }
  const { followed_user_id } = req.body
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const message = await userService.followingUser(user_id, followed_user_id)
  return res.status(HTTP_STATUS.OK).json(message)
}
export const UnfollowUserController = async (req: Request<FollowReqParams>, res: Response, next: NextFunction) => {
  const { followed_user_id } = req.params
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const message = await userService.unfollowUser(user_id, followed_user_id)
  return res.status(HTTP_STATUS.OK).json(message)
}
export const addUserCircleController = async (
  req: Request<core.ParamsDictionary, any, UserCircleReqType>,
  res: Response,
  next: NextFunction
) => {
  const { user_circle } = req.body
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  const result = await userService.addUserCircleHandler(user_circle, user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: USER_MSG.USER_CIRCLE_SUCCESS,
    result
  })
}
