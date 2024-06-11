import { Server as ServerHttp } from 'http'
import { Server } from 'socket.io'
import { UserStatus } from '~/constants/enums.contants'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { USER_MSG } from '~/constants/messages.contants'
import { ErrorMessage } from '~/models/Errors'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import Conversation from '~/models/schemas/conversations.schemas'
import dbService from '~/services/database.services'
import { verifyAccessToken } from '~/utils/helper'

const initSocket = (httpServer: ServerHttp) => {
  //Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000'
    }
  })
  //Khởi tạo biến chung cho các user khi kết nối socket
  const users: {
    [key: string]: {
      [key: string]: string
    }
  } = {}
  //Middleware Socket io -> chạy một lần lúc kết nối
  io.use(async (socket, next) => {
    const authorization = socket.handshake.auth.Authorization

    try {
      const decoded_authorization = (await verifyAccessToken(authorization)) as JwtPayloadExtension
      if (decoded_authorization.status_user === UserStatus.Unverified) {
        throw new ErrorMessage({ message: USER_MSG.USER_NOT_VERIFIED_EMAIL, status: HTTP_STATUS.UNAUTHORIZED })
      }
      socket.handshake.auth.decoded_authorization = decoded_authorization
      next() //tiếp tục kết nối
    } catch (error) {
      next({
        name: 'Unauthorization',
        message: 'Unauthorization',
        data: error
      })
    }
  })
  io.on('connection', (socket) => {
    const { user_id } = socket.handshake.auth.decoded_authorization as JwtPayloadExtension
    const authorization = socket.handshake.auth.Authorization
    // console.log(user_id)
    //Middleware chạy mỗi lần kết nối
    socket.use(async ([event, ...args], next) => {
      try {
        await verifyAccessToken(authorization)
        next()
      } catch (error) {
        next(new Error('JWT Expire'))
      }
    })
    socket.on('error', (err) => {
      if (err && err.message === 'JWT Expire') {
        socket.disconnect()
      }
    })
    if (!user_id) return
    users[user_id] = {
      socket_id: socket.id
    }
    console.log(users)

    socket.on('private_message', async (data) => {
      const { message, sender_id, receiver_id } = data.payload

      const date = new Date()
      const conversationObj = new Conversation({
        message: message,
        sender_id: sender_id,
        receiver_id: receiver_id,
        created_at: date,
        updated_at: date
      })
      const { insertedId } = await dbService.ConversationCollection().insertOne(conversationObj)
      conversationObj._id = insertedId
      if (!users[receiver_id]) return //Nếu không có bên B kết nối vào thì ko emit nhưng vẫn lưu message bên A nhắn
      const socket_id_received = users[receiver_id].socket_id
      socket.to(socket_id_received).emit('private_message_receive', {
        payload: conversationObj
      })
    })
    socket.on('disconnect', () => {
      delete users[user_id]
      console.log('Disconnect ', socket.id)
      console.log(users)
    })
  })
}
export default initSocket
