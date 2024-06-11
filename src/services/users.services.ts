import axios from 'axios'
import { FindOptions, ObjectId } from 'mongodb'
import { TokenType, UserStatus } from '~/constants/enums.contants'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { USER_MSG } from '~/constants/messages.contants'
import { ErrorMessage } from '~/models/Errors'
import { RegisterReqType, UpdateMeReqType } from '~/models/requests/users.requests'
import { Follow } from '~/models/schemas/follows.schemas'
import RefreshTokens from '~/models/schemas/refreshTokens.schemas'
import User from '~/models/schemas/users.schemas'
import '~/utils/config'
import { hashPassword } from '~/utils/hashPassword'
import { generateRandomPassword } from '~/utils/helper'
import { signToken, verifyToken } from '~/utils/jwt'
import { sendForgotPasswordMail, sendVerifiedEmail } from '~/utils/sendMail'
import dbService from './database.services'

class UserService {
  private createAccessToken({ user_id, status_user }: { user_id: string; status_user: UserStatus }) {
    return signToken({
      payload: {
        user_id,
        status_user,
        type: TokenType.AccessToken
      },
      privateKey: process.env.SECRET_KEY_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.EXPIRE_ACCESS_TOKEN
      }
    })
  }
  private createRefreshToken({
    user_id,
    exp,
    status_user
  }: {
    user_id: string
    exp?: number
    status_user: UserStatus
  }) {
    if (!exp) {
      return signToken({
        payload: {
          user_id,
          type: TokenType.RefreshToken,
          status_user
        },
        privateKey: process.env.SECRET_KEY_REFRESH_TOKEN as string,
        options: {
          expiresIn: process.env.EXPIRE_REFRESH_TOKEN
        }
      })
    } else {
      return signToken({
        payload: {
          user_id,
          type: TokenType.RefreshToken,
          status_user,
          exp
        },
        privateKey: process.env.SECRET_KEY_REFRESH_TOKEN as string
      })
    }
  }
  private createVerifyEmailToken({ user_id, status_user }: { user_id: string; status_user: UserStatus }) {
    return signToken({
      payload: {
        user_id,
        status_user,
        type: TokenType.EmailVerifiedToken
      },
      privateKey: process.env.SECRET_KEY_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.EXPIRE_VERIFY_EMAIL_TOKEN
      }
    })
  }
  private createForgotPasswordToken({ _id, status_user }: { _id: string; status_user: UserStatus }) {
    return signToken({
      payload: {
        user_id: _id,
        status_user,
        type: TokenType.ForgotPasswordToken
      },
      privateKey: process.env.SECRET_KEY_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.EXPIRE_FORGOT_PASSWORD_TOKEN
      }
    })
  }
  private async generateAccessAndRefreshToken({
    userId,
    exp,
    status_user
  }: {
    userId: string
    exp?: number
    status_user: UserStatus
  }) {
    const accessTokenPromise = this.createAccessToken({ user_id: userId, status_user })
    const refreshTokenPromise = this.createRefreshToken({ user_id: userId, status_user, exp })
    const arrTK = await Promise.all([accessTokenPromise, refreshTokenPromise])
    return arrTK
  }
  private decodedRefreshToken(refreshToken: string) {
    return verifyToken(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN as string)
  }
  //Đăng ký Service
  async register(payload: Omit<RegisterReqType, 'confirm_password'>) {
    const userId = new ObjectId()
    const email_verify_token = await this.createVerifyEmailToken({
      user_id: userId.toString(),
      status_user: UserStatus.Unverified
    })
    const result = await dbService.UsersCollection().insertOne(
      new User({
        ...payload,
        _id: userId,
        username: `user${userId}`,
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )

    //Đăng ký xong tiến hành gửi email
    //Email: với link là địa chỉ client
    //Khi user click vào thì client tiến hành post đến api verify email
    const urlVerifiedMail = `${process.env.DOMAIN_CLIENT}/verify-email?token=${email_verify_token}`

    await sendVerifiedEmail({
      url: urlVerifiedMail,
      name: payload.name,
      ToAddresses: payload.email
    })
    return {
      user_id: userId.toString()
    }
  }
  //Đăng nhập Login
  async login(_id: string, status: UserStatus) {
    const arrTK = await this.generateAccessAndRefreshToken({ userId: _id, status_user: status })
    const { exp, iat } = await this.decodedRefreshToken(arrTK[1])
    await this.addRefreshToken({ token: arrTK[1], user_id: _id, exp: exp as number, iat: iat as number })

    return {
      access_token: arrTK[0],
      refresh_token: arrTK[1]
    }
  }
  private async getTokenOauth(code: string) {
    const data = await axios.post<{ access_token: string; id_token: string }>('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.REDIRECT_URI
    })
    return data.data
  }
  private async getInfoUserOauth(accessToken: string, id_token: string) {
    const info = await axios.get<{
      email: string
      verified_email: boolean
      name: string
      picture: string
      locale: string
    }>('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: {
        access_token: accessToken,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })
    return info.data
  }
  //Login Google Oauth
  async oauthLoginGoogle(code: string) {
    const { access_token, id_token } = await this.getTokenOauth(code)
    const info = await this.getInfoUserOauth(access_token, id_token)
    if (!info.verified_email) {
      throw new ErrorMessage({ message: USER_MSG.GMAIL_NOT_VERIFIED, status: HTTP_STATUS.FORBIDDEN })
    }
    //Kiểm tra email đã tồn tại chưa => rùi: đăng nhập; chưa: đăng ký
    const user = await this.findOneUser('email', info.email)
    let _id
    if (user !== null) {
      //login
      _id = user._id as ObjectId
    } else {
      //Tạo mới user
      _id = new ObjectId()
      const password = generateRandomPassword()

      const result = await dbService.UsersCollection().insertOne(
        new User({
          _id,
          name: info.name,
          username: `user${_id}`,
          date_of_birth: new Date('1-1-2000'),
          email: info.email,
          password: hashPassword(password),
          avatar: info.picture
        })
      )
    }
    //đăng ký bằng google thì không cần verified email => gán status UserStatus.Verified
    const arrTK = await this.generateAccessAndRefreshToken({
      userId: _id.toString(),
      status_user: user != null ? (user as User).status : UserStatus.Verified
    })
    const { exp, iat } = await this.decodedRefreshToken(arrTK[1])
    await this.addRefreshToken({ token: arrTK[1], user_id: _id.toString(), exp: exp as number, iat: iat as number })
    return {
      access_token: arrTK[0],
      refresh_token: arrTK[1],
      newUser: user === null
    }
  }
  async findOneUser(key: keyof User, value: any, options?: FindOptions) {
    const resultEmailExist = await dbService.UsersCollection().findOne({ [key]: { $eq: value } }, options)
    return resultEmailExist
  }
  async checkUserAuth(email: string, password: string) {
    const user = await dbService
      .UsersCollection()
      .findOne({ email: { $eq: email }, password: { $eq: hashPassword(password) } })
    return user
  }
  async addRefreshToken({ token, user_id, exp, iat }: { token: string; user_id: string; exp: number; iat: number }) {
    const result = await dbService
      .RefreshTokenCollection()
      .insertOne(new RefreshTokens({ token, user_id: new ObjectId(user_id), exp, iat }))
    return result
  }
  //check refresh token trong db
  async checkRefreshToken(refreshToken: string) {
    const result = await dbService.RefreshTokenCollection().findOne({ token: { $eq: refreshToken } })
    return result
  }
  //xoa refresh token trong db
  async deleteRefreshToken(refreshToken: string) {
    await dbService.RefreshTokenCollection().deleteOne({ token: { $eq: refreshToken } })
  }
  //refresh token service
  async refreshTokenService(refreshToken: string, _id: string, exp: number, status_user: UserStatus) {
    await this.deleteRefreshToken(refreshToken)
    const arrTK = await this.generateAccessAndRefreshToken({ userId: _id, exp, status_user })
    if (arrTK[1]) {
      const { exp, iat } = await this.decodedRefreshToken(arrTK[1])
      await this.addRefreshToken({ token: arrTK[1], user_id: _id.toString(), exp: exp as number, iat: iat as number })
    }
    return {
      access_token: arrTK[0],
      refresh_token: arrTK[1]
    }
  }
  async verifyEmailTokenHandler(user_id: string) {
    const [token] = await Promise.all([
      this.generateAccessAndRefreshToken({ userId: user_id, status_user: UserStatus.Verified }),
      dbService.UsersCollection().updateOne(
        { _id: { $eq: new ObjectId(user_id) } },
        {
          $set: {
            email_verify_token: '',
            status: UserStatus.Verified
          },
          // set thời gian tại thời điểm mongodb update tại vì nếu updated_at ở trên thì nó tạo ra new Date() ở thời điểm chạy code
          $currentDate: {
            updated_at: true
          }
        }
      )
    ])
    const [access_token, refresh_token] = token

    const { exp, iat } = await this.decodedRefreshToken(refresh_token)
    await this.addRefreshToken({ token: refresh_token, user_id, exp: exp as number, iat: iat as number })
    return {
      access_token,
      refresh_token
    }
  }

  async resendVerifiedEmail(user_id: string, name: string, email: string) {
    const email_verify_token = await this.createVerifyEmailToken({
      user_id: user_id,
      status_user: UserStatus.Unverified
    })
    // console.log('Resend Email ', email_verify_token)
    const urlVerifiedMail = `${process.env.DOMAIN_CLIENT}/verify-email?token=${email_verify_token}`
    await sendVerifiedEmail({
      url: urlVerifiedMail,
      name: name,
      ToAddresses: email
    })

    await dbService.UsersCollection().updateOne(
      { _id: { $eq: new ObjectId(user_id) } },
      {
        $set: {
          email_verify_token
        },
        // set thời gian tại thời điểm mongodb update tại vì nếu updated_at ở trên thì nó tạo ra new Date() ở thời điểm chạy code
        $currentDate: {
          updated_at: true
        }
      }
    )
  }

  async verifyEmailTokenEmpty(emailToken: string) {
    await dbService.UsersCollection().updateOne(
      {
        email_verify_token: { $eq: emailToken }
      },
      {
        $set: {
          email_verify_token: ''
        },
        $currentDate: {
          updated_at: true
        }
      }
    )
  }
  async forgotPasswordTokenEmpty(forgotPasswordToken: string) {
    await dbService.UsersCollection().updateOne(
      {
        forgot_password_token: { $eq: forgotPasswordToken }
      },
      {
        $set: {
          forgot_password_token: ''
        },
        $currentDate: {
          updated_at: true
        }
      }
    )
  }
  async forgotPasswordService(_id: ObjectId, status: UserStatus, name: string, email: string) {
    const token = await this.createForgotPasswordToken({ _id: _id.toString(), status_user: status })
    const urlVerifiedMail = `${process.env.DOMAIN_CLIENT}/forgot-password?token=${token}`
    await sendForgotPasswordMail({
      url: urlVerifiedMail,
      name: name,
      ToAddresses: email
    })

    await dbService.UsersCollection().updateOne(
      {
        _id: _id
      },
      {
        $set: {
          forgot_password_token: token
        },
        $currentDate: {
          updated_at: true
        }
      }
    )
    return {
      message: USER_MSG.CHECK_FORGOT_PASSWORD_ON_EMAIL
    }
  }
  async resetPasswordService(_id: string, password: string) {
    await dbService.UsersCollection().updateOne(
      {
        _id: new ObjectId(_id)
      },
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: ''
        },
        $currentDate: {
          updated_at: true
        }
      }
    )
  }
  async updateMeService(_id: string, payload: UpdateMeReqType) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    const user = await dbService.UsersCollection().findOneAndUpdate(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...(_payload as UpdateMeReqType & { date_of_birth?: Date })
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user
  }
  async getUserProfile(username: string) {
    const user = await dbService.UsersCollection().findOne(
      { username: { $eq: username } },
      {
        projection: {
          password: 0,
          created_at: 0,
          updated_at: 0,
          status: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    if (user == null) {
      throw new ErrorMessage({ message: USER_MSG.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
    }
    return user
  }
  async followingUser(user_id: string, followed_user_id: string) {
    const checkFollowed = await dbService
      .FollowCollection()
      .findOne({ user_id: new ObjectId(user_id), followed_user_id: new ObjectId(followed_user_id) })
    if (checkFollowed !== null) {
      return {
        message: USER_MSG.FOLLOWED
      }
    } else {
      const result = await dbService.FollowCollection().insertOne(
        new Follow({
          user_id: new ObjectId(user_id),
          followed_user_id: new ObjectId(followed_user_id),
          created_at: new Date()
        })
      )
      return {
        message: USER_MSG.FOLLOW_SUCCESS
      }
    }
  }
  async unfollowUser(user_id: string, followed_user_id: string) {
    const result = await dbService
      .FollowCollection()
      .deleteOne({ user_id: new ObjectId(user_id), followed_user_id: new ObjectId(followed_user_id) })
    if (result.deletedCount === 1) {
      return { message: USER_MSG.UNFOLLOW_SUCCESS }
    } else {
      return { message: USER_MSG.USER_NOT_FOLLOW }
    }
  }
  async addUserCircleHandler(user_id_circle: string[], user_id: string) {
    const user_ObjectId = user_id_circle.map((item) => new ObjectId(item))
    const result = await dbService.UsersCollection().findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          cicrle_user: user_ObjectId
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    )
    return result
  }
  async getFollowedUserList(user_id: string) {
    const result = await dbService
      .FollowCollection()
      .find({ user_id: new ObjectId(user_id) })
      .toArray()
    return result
  }
}
const userService = new UserService()
export default userService
