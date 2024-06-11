import { NextFunction, Request, Response } from 'express'
import { ParamSchema, checkSchema } from 'express-validator'
import { TokenExpiredError, VerifyErrors } from 'jsonwebtoken'
import { capitalize, omit } from 'lodash'
import { ObjectId } from 'mongodb'
import { UserStatus } from '~/constants/enums.contants'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { USER_MSG } from '~/constants/messages.contants'
import { REGEX_USERNAME } from '~/constants/regex.contants'
import { ErrorMessage } from '~/models/Errors'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import User from '~/models/schemas/users.schemas'
import userService from '~/services/users.services'
import { hashPassword } from '~/utils/hashPassword'
import { verifyAccessToken } from '~/utils/helper'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

const passwordSchema: ParamSchema = {
  notEmpty: true,
  isStrongPassword: {
    errorMessage: USER_MSG.PASSWORD_STRONG,
    options: {
      minLength: 6,
      minSymbols: 1,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1
    }
  }
}
const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USER_MSG.CONFIRM_PASSWORD_REQUIRE
  },
  isStrongPassword: {
    errorMessage: USER_MSG.CONFIRM_PASSWORD_STRONG,
    options: {
      minLength: 6,
      minSymbols: 1,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1
    }
  },
  custom: {
    errorMessage: USER_MSG.CONFIRM_PASSWORD_MATCHED,
    options: (value, { req }) => {
      return value == req.body.password
    }
  }
}
const verifyForgotPasswordToken: ParamSchema = {
  custom: {
    options: async (val, { req }) => {
      if (!val) {
        throw new ErrorMessage({
          message: USER_MSG.FORGOT_PASSWORD_VERIFY_TOKEN_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }
      try {
        const decoded_forgot_password_token = await verifyToken(
          val,
          process.env.SECRET_KEY_FORGOT_PASSWORD_TOKEN as string
        )
        ;(req as Request).decoded_forgot_password_token = decoded_forgot_password_token
      } catch (error) {
        if (error instanceof TokenExpiredError && error.expiredAt) {
          await userService.forgotPasswordTokenEmpty(val)
          throw new ErrorMessage({
            message: USER_MSG.FORGOT_PASSWORD_VERIFY_TOKEN_EXPIRED,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }
        const message = (error as VerifyErrors).message
        throw new ErrorMessage({ message, status: HTTP_STATUS.UNAUTHORIZED })
      }
    }
  }
}
const nameSchema = {
  notEmpty: {
    errorMessage: USER_MSG.NAME_IS_REQUIRE
  },
  isString: {
    errorMessage: USER_MSG.NAME_STRING
  },
  isLength: {
    errorMessage: USER_MSG.NAME_LENGTH,
    options: {
      min: 1,
      max: 255
    }
  },
  trim: true
}
const dateOfBirthSchema = {
  isISO8601: {
    errorMessage: USER_MSG.DATE_OF_BIRTH,
    options: {
      strict: true,
      strictSeparator: true
    }
  }
}
const userIdSchema: ParamSchema = {
  custom: {
    options: async (val, { req }) => {
      if (!ObjectId.isValid(val)) {
        throw new ErrorMessage({ message: USER_MSG.INVALID_FOLLOWED_USER_ID, status: HTTP_STATUS.NOT_FOUND })
      }
      const user_id = new ObjectId(val)
      const user = await userService.findOneUser('_id', user_id)
      if (user === null) {
        throw new ErrorMessage({ message: USER_MSG.FOLLOWED_USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
      }
      ;(req as Request).user = user
      return true
    }
  }
}

const imgSchema = {
  optional: true,
  isString: {
    errorMessage: USER_MSG.IMG_STRING
  },
  isLength: {
    options: {
      min: 1,
      max: 400
    },
    errorMessage: USER_MSG.IMG_LENGTH
  },
  trim: true
}
export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USER_MSG.EMAIL_IS_REQUIRE
        },
        isEmail: {
          errorMessage: USER_MSG.EMAIL_FORMAT
        },
        custom: {
          options: async (val, { req }) => {
            const user = await userService.checkUserAuth(val, req.body.password)
            if (user != null) {
              req.user = user
            } else {
              throw new ErrorMessage({ message: USER_MSG.LOGIN_FAILED, status: HTTP_STATUS.UNAUTHORIZED })
            }
          }
        }
      }
    },
    ['body']
  )
)
export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        notEmpty: {
          errorMessage: USER_MSG.EMAIL_IS_REQUIRE
        },
        isEmail: {
          errorMessage: USER_MSG.EMAIL_FORMAT
        },
        custom: {
          options: async (value) => {
            const user = await userService.findOneUser('email', value)
            if (user) {
              throw new ErrorMessage({ message: USER_MSG.EMAIL_EXIST, status: HTTP_STATUS.BAD_REQUEST })
            }
          }
        },
        trim: true
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        custom: {
          options: async (val: string, { req }) => {
            return await verifyAccessToken(val, req as Request)
          }
        }
      }
    },
    ['headers']
  )
)
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (val, { req }) => {
            if (!val) {
              throw new ErrorMessage({ message: USER_MSG.REFRESH_TOKEN_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
            }
            try {
              const decoded_refresh_token = await verifyToken(val, process.env.SECRET_KEY_REFRESH_TOKEN as string)
              const resultRTExist = await userService.checkRefreshToken(val)

              if (resultRTExist == null) {
                throw new ErrorMessage({ message: USER_MSG.REFRESH_TOKEN_EXIST })
              }
              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              //khi refreshtoken hết hạn xóa khỏi db và gửi về cho client
              if (error instanceof TokenExpiredError && error.expiredAt) {
                await userService.deleteRefreshToken(val)
                throw new ErrorMessage({ message: 'Refresh Token hết hạn ', status: HTTP_STATUS.UNAUTHORIZED })
              }
              const message = capitalize((error as VerifyErrors).message)

              throw new ErrorMessage({ message, status: HTTP_STATUS.UNAUTHORIZED })
            }
          }
        }
      }
    },
    ['body']
  )
)
export const verifyEmailValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (val: string, { req }) => {
            if (!val) {
              throw new ErrorMessage({
                message: USER_MSG.EMAIL_VERIFY_TOKEN_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            let decode_verify_email_token
            try {
              decode_verify_email_token = await verifyToken(val, process.env.SECRET_KEY_EMAIL_VERIFY_TOKEN as string)
              ;(req as Request).decoded_verify_email_token = decode_verify_email_token
            } catch (error) {
              if (error instanceof TokenExpiredError && error.expiredAt) {
                await userService.verifyEmailTokenEmpty(val)
                throw new ErrorMessage({
                  message: USER_MSG.EMAIL_VERIFY_TOKEN_EXPIRED,
                  status: HTTP_STATUS.BAD_REQUEST
                })
              }
              const message = capitalize((error as VerifyErrors).message)

              throw new ErrorMessage({ message, status: HTTP_STATUS.UNAUTHORIZED })
            }
          }
        }
      }
    },
    ['body']
  )
)
export const isUserLoggedValidator = (func: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authen = req.headers.authorization

    if (authen) {
      return func(req, res, next)
    }
    next()
  }
}
export const resendVerifiedEmailValidator = validate(
  checkSchema(
    {
      user_id: {
        custom: {
          options: (val: string) => {
            if (val === '') {
              throw new ErrorMessage({ message: USER_MSG.USER_ID_REQUIRED, status: HTTP_STATUS.BAD_REQUEST })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const forgotPasswordValidator = validate(
  checkSchema({
    email: {
      notEmpty: {
        errorMessage: USER_MSG.EMAIL_IS_REQUIRE
      },
      isEmail: {
        errorMessage: USER_MSG.EMAIL_FORMAT
      },
      custom: {
        options: async (val, { req }) => {
          const user = await userService.findOneUser('email', val)
          if (user == null) {
            throw new ErrorMessage({ message: USER_MSG.EMAIL_EXIST, status: HTTP_STATUS.NOT_FOUND })
          }
          ;(req as Request).user = user
          return true
        }
      }
    }
  })
)
export const verifyForgotPasswordValidator = validate(
  checkSchema(
    {
      verify_forgot_password: verifyForgotPasswordToken
    },
    ['body']
  )
)
export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      verify_forgot_password: verifyForgotPasswordToken
    },
    ['body']
  )
)
export const verifiedUserAccountValidator = (req: Request, res: Response, next: NextFunction) => {
  const decode = (req as Request).decoded_authorization

  if (decode?.status_user === UserStatus.Unverified) {
    next(new ErrorMessage({ message: USER_MSG.USER_NOT_VERIFIED_EMAIL, status: HTTP_STATUS.UNAUTHORIZED }))
  }

  return next()
}
export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        optional: true,
        ...omit(nameSchema, ['notEmpty'])
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USER_MSG.USERNAME_STRING
        },
        custom: {
          options: async (val) => {
            if (!REGEX_USERNAME.test(val)) {
              throw new Error(USER_MSG.USERNAME_REGEX)
            }
            const user = await userService.findOneUser('username', val)
            if (user) {
              throw new Error(USER_MSG.USERNAME_EXISTING)
            }
            return true
          }
        }
      },
      date_of_birth: {
        optional: true,
        ...dateOfBirthSchema
      },
      location: {
        optional: true,
        isString: {
          errorMessage: USER_MSG.LOCATION_STRING
        },
        isLength: {
          options: {
            min: 3
          },
          errorMessage: USER_MSG.LOCATION_LENGTH
        },
        trim: true
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: USER_MSG.BIO_STRING
        },
        isLength: {
          options: {
            min: 1,
            max: 255
          },
          errorMessage: USER_MSG.BIO_LENGTH
        },
        trim: true
      },
      website: {
        optional: true,
        isString: {
          errorMessage: USER_MSG.WEB_STRING
        },
        isLength: {
          options: {
            min: 1,
            max: 255
          },
          errorMessage: USER_MSG.WEB_LENGTH
        },
        trim: true
      },
      avatar: imgSchema,
      cover_photo: imgSchema
    },
    ['body']
  )
)
export const followedUserIdValidator = validate(
  checkSchema(
    {
      followed_user_id: userIdSchema
    },
    ['body']
  )
)
export const unfollowedUserIdValidator = validate(
  checkSchema(
    {
      followed_user_id: userIdSchema
    },
    ['params']
  )
)
export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        custom: {
          options: async (val, { req }) => {
            const { user_id } = (req as Request).decoded_authorization as JwtPayloadExtension
            const user = await userService.findOneUser('_id', new ObjectId(user_id))
            if (user === null) {
              throw new ErrorMessage({ message: USER_MSG.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
            }
            const { password } = user
            if (hashPassword(val) !== password) {
              throw new Error(USER_MSG.PASSWORD_NOT_MATCHED)
            }
            return true
          }
        }
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)
export const userCircleValidator = validate(
  checkSchema({
    user_circle: {
      custom: {
        options: async (val: string[], { req }) => {
          //Kiểm tra số lượng ds circle ko quá 150
          const SL_DS_CIRCL = 150
          const { user_id } = (req as Request).decoded_authorization as JwtPayloadExtension
          const { cicrle_user } = (await userService.findOneUser('_id', new ObjectId(user_id))) as User
          if (val.length + cicrle_user.length > SL_DS_CIRCL) {
            throw new ErrorMessage({ message: USER_MSG.LIST_CIRCLE_OVER, status: HTTP_STATUS.BAD_REQUEST })
          }
          //check các người dùng trong ds gửi lên hợp lệ ko
          await Promise.all(
            val.map(async (item) => {
              if (!ObjectId.isValid(item)) {
                throw new ErrorMessage({ message: USER_MSG.USER_ID_INVALID, status: HTTP_STATUS.BAD_REQUEST })
              }
              const user = await userService.findOneUser('_id', new ObjectId(item))
              if (user === null) {
                throw new ErrorMessage({ message: USER_MSG.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
              }
              if ([UserStatus.Unverified, UserStatus.Banned].includes(user.status)) {
                throw new ErrorMessage({ message: USER_MSG.USER_ACCOUNT_INVALID, status: HTTP_STATUS.FORBIDDEN })
              }
            })
          )
          return true
        }
      }
    }
  })
)
export const receiverIdValidator = validate(
  checkSchema(
    {
      receiverId: userIdSchema
    },
    ['params']
  )
)
