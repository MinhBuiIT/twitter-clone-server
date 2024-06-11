import { ParamsDictionary } from 'express-serve-static-core'
import { JwtPayload } from 'jsonwebtoken'
import { TokenType, UserStatus } from '~/constants/enums.contants'

export interface RegisterReqType {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}
export interface JwtPayloadExtension extends JwtPayload {
  user_id: string
  type: TokenType
  status_user: UserStatus
}

export interface ResendEmailReqType {
  user_id: string
}
export interface VerifyEmailReqType {
  email_verify_token: string
}
export interface RefreshTokenReqType {
  refresh_token: string
}
export interface ForgotPasswordReqType {
  email: string
}
export interface ForgotPasswordTokenReqType {
  verify_forgot_password: string
}
export interface ResetPasswordReqType {
  verify_forgot_password: string
  password: string
  confirm_password: string
}
export interface ChangePasswordReqType {
  old_password: string
  password: string
  confirm_password: string
}
export interface UpdateMeReqType {
  name?: string
  username?: string
  date_of_birth?: string
  avatar?: string
  cover_photo?: string
  location?: string
  bio?: string
  website?: string
}
export interface FollowReqType {
  followed_user_id: string
}
export interface FollowReqParams extends ParamsDictionary {
  followed_user_id: string
}
export interface UserCircleReqType {
  user_circle: string[]
}
