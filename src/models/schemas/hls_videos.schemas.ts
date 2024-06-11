import { ObjectId } from 'mongodb'
import { HLSVideoStatus } from '~/constants/enums.contants'

interface HLSVideoType {
  _id?: ObjectId
  name: string //tên video
  status: HLSVideoStatus
  message?: string
  created_at?: Date
  updated_at?: Date
}
export class HLSVideo {
  _id?: ObjectId
  name: string //tên video
  status: HLSVideoStatus
  message: string
  created_at: Date
  updated_at: Date
  constructor({ _id, name, status, message, created_at, updated_at }: HLSVideoType) {
    const date = new Date()
    this._id = _id
    this.name = name
    this.status = status
    this.message = message || ''
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
