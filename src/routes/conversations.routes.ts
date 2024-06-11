import { Router } from 'express'
import { getConversationController } from '~/controllers/conversation.controllers'
import { paginationQueryValidator } from '~/middlewares/tweets.middlewares'
import {
  accessTokenValidator,
  receiverIdValidator,
  verifiedUserAccountValidator
} from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const conversationRoutes = Router()

conversationRoutes.get(
  '/receivers/:receiverId',
  accessTokenValidator,
  verifiedUserAccountValidator,
  receiverIdValidator,
  paginationQueryValidator,
  wrapErrorHandler(getConversationController)
)

export default conversationRoutes
