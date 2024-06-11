import { ObjectId } from 'mongodb'
import dbService from './database.services'

class ConversationService {
  async getConversationHandle({
    sender_id,
    receiver_id,
    limit,
    page
  }: {
    sender_id: string
    receiver_id: string
    limit: number
    page: number
  }) {
    const match = {
      $or: [
        {
          sender_id: new ObjectId(sender_id),
          receiver_id: new ObjectId(receiver_id)
        },
        {
          sender_id: new ObjectId(receiver_id),
          receiver_id: new ObjectId(sender_id)
        }
      ]
    }

    const conversations = await dbService
      .ConversationCollection()
      .find(match)
      .sort({ created_at: -1 })
      .skip(limit * (page - 1))
      .limit(limit)
      .toArray()
    const total = await dbService.ConversationCollection().countDocuments(match)

    return {
      conversations,
      total
    }
  }
}
const conversationService = new ConversationService()
export default conversationService
