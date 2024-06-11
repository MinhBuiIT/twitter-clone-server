import 'express'
import { JwtPayloadExtension } from './models/requests/users.requests'
declare module 'express' {
  interface Request {
    user?: User
    tweet?: Tweet
    decoded_authorization?: JwtPayloadExtension
    decoded_refresh_token?: JwtPayloadExtension
    decoded_verify_email_token?: JwtPayloadExtension
    decoded_forgot_password_token?: JwtPayloadExtension
  }
}
