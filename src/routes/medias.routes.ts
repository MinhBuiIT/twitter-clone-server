import { Router } from 'express'
import {
  getStatusVideoHLSController,
  uploadImageController,
  uploadVideoController,
  uploadVideoHLSController
} from '~/controllers/medias.controllers'
import { accessTokenValidator, verifiedUserAccountValidator } from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const mediasRoutes = Router()

mediasRoutes.post(
  '/upload-image',
  accessTokenValidator,
  verifiedUserAccountValidator,
  wrapErrorHandler(uploadImageController)
)
mediasRoutes.post(
  '/upload-video',
  accessTokenValidator,
  verifiedUserAccountValidator,
  wrapErrorHandler(uploadVideoController)
)
mediasRoutes.post(
  '/upload-hls-video',
  accessTokenValidator,
  verifiedUserAccountValidator,
  wrapErrorHandler(uploadVideoHLSController)
)

//Kiểm tra trạng thái của video hls coi encode nó như thế nào
//param: nameIdFileVideo
mediasRoutes.get(
  '/status-hls-video/:id',
  accessTokenValidator,
  verifiedUserAccountValidator,
  wrapErrorHandler(getStatusVideoHLSController)
)
export default mediasRoutes
