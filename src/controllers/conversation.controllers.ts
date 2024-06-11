import { NextFunction, Request, Response } from 'express'
import core, { Query } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { CONSERVATION_MSG } from '~/constants/messages.contants'
import { PaginationQuery } from '~/models/requests/search.requests'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import conversationService from '~/services/conversation.services'

export const getConversationController = async (
  req: Request<core.ParamsDictionary, any, any, Query>,
  res: Response,
  next: NextFunction
) => {
  const sender_id = (req.decoded_authorization as JwtPayloadExtension).user_id
  const { receiverId: receiver_id } = req.params
  const limit = Number((req.query as PaginationQuery).limit)
  const page = Number((req.query as PaginationQuery).page)
  const { conversations, total } = await conversationService.getConversationHandle({
    receiver_id,
    sender_id,
    limit,
    page
  })
  return res.status(HTTP_STATUS.OK).json({
    message: CONSERVATION_MSG.GET_CONSERVATION_SUCCESS,
    result: {
      conversations,
      limit,
      page,
      total_page: Math.ceil(total / limit)
    }
  })
}
