import { ObjectId } from 'mongodb'
import Like from '~/models/schemas/likes.schemas'
import dbService from './database.services'

class LikeService {
  async findLike(user_id: string, tweet_id: string) {
    const result = await dbService
      .LikeCollection()
      .findOne({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) })
    return result
  }
  async addLike(user_id: string, tweet_id: string) {
    await dbService
      .LikeCollection()
      .insertOne(new Like({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) }))
  }
  async deleteLike(user_id: string, tweet_id: string) {
    await dbService.LikeCollection().deleteOne({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) })
  }
}
const likeService = new LikeService()
export default likeService
