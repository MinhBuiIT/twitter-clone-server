import { Router } from 'express'
import {
  staticImgController,
  staticM3U8Controller,
  staticSequenceFileController,
  staticVideoController,
  staticVideoStreamController
} from '~/controllers/medias.controllers'

const staticRoutes = Router()
staticRoutes.get('/image/:filename', staticImgController)
staticRoutes.get('/video/:filename', staticVideoController)
staticRoutes.get('/video-streaming/:filename', staticVideoStreamController)
//Do khi dùng vidstack.io bên client thì nó sẽ cắt param cuối của url nên để serving hết file .ts hay file .m3u8 thì ta / thêm ở cuối lúc lấy file master.m3u8 do ta dùng idName để lưu các file trong đó
staticRoutes.get('/video-hls/:id/master.m3u8', staticM3U8Controller)
staticRoutes.get('/video-hls/:id/:v/:sequence', staticSequenceFileController)
export default staticRoutes
