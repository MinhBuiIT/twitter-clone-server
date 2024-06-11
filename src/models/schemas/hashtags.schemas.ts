import { ObjectId } from 'mongodb'

interface HashTagConstructor {
  _id?: ObjectId
  name: string
  created_at?: Date
}

export class HashTag {
  _id?: ObjectId
  name: string
  created_at: Date
  constructor({ _id, name, created_at }: HashTagConstructor) {
    this._id = _id
    this.name = name
    this.created_at = created_at || new Date()
  }
}
