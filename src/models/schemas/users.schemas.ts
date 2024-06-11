import { ObjectId } from 'mongodb'
import { UserStatus } from '~/constants/enums.contants'

interface UserType {
  _id?: ObjectId
  name: string
  username: string
  email: string
  password: string
  date_of_birth: Date
  cicrle_user?: ObjectId[]
  email_verify_token?: string
  forgot_password_token?: string
  created_at?: Date
  updated_at?: Date
  status?: UserStatus
  avatar?: string
  cover_photo?: string
  location?: string
  bio?: string
  website?: string
}
export default class User {
  _id?: ObjectId
  name: string
  username: string
  email: string
  password: string
  date_of_birth: Date
  email_verify_token: string
  forgot_password_token: string
  created_at: Date
  updated_at: Date
  status: UserStatus
  cicrle_user: ObjectId[]
  //option
  avatar: string
  cover_photo: string
  location: string
  bio: string
  website: string
  constructor(user: UserType) {
    const dateVar = new Date()
    ;(this._id = user._id),
      (this.name = user.name),
      (this.username = user.username || ''),
      (this.email = user.email),
      (this.password = user.password),
      (this.cicrle_user = user.cicrle_user || []),
      (this.date_of_birth = user.date_of_birth),
      (this.email_verify_token = user.email_verify_token || ''),
      (this.forgot_password_token = user.forgot_password_token || ''),
      (this.created_at = user.created_at || dateVar),
      (this.updated_at = user.updated_at || dateVar),
      (this.status = user.status || UserStatus.Unverified),
      (this.avatar = user.avatar || ''),
      (this.cover_photo = user.cover_photo || ''),
      (this.location = user.location || ''),
      (this.bio = user.bio || ''),
      (this.website = user.website || '')
  }
}
