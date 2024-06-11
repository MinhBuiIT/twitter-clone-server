import { ObjectId } from 'mongodb'

interface ConversationsConstruc {
  _id?: ObjectId
  sender_id: string
  receiver_id: string
  message: string
  created_at?: Date
  updated_at?: Date
}

export default class Conversation {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  message: string
  created_at: Date
  updated_at: Date
  constructor({ _id, sender_id, receiver_id, message, created_at, updated_at }: ConversationsConstruc) {
    const date = new Date()
    this._id = _id
    this.sender_id = new ObjectId(sender_id)
    this.receiver_id = new ObjectId(receiver_id)
    this.message = message
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
