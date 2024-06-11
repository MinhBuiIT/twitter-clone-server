import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { UPLOAD_DIR_IMG, UPLOAD_DIR_VIDEO } from '~/constants/var.contants'
import mediasService from '~/services/medias.services'
import { getNameFile } from '~/utils/helper'
import { getFileFromS3Aws } from '~/utils/s3'

export const uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediasService.handleImgUploadConvert(req)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Uploading images successfully',
    result
  })
}

export const uploadVideoController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediasService.handleVideoUpload(req)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Uploading videos successfully',
    result
  })
}
export const uploadVideoHLSController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediasService.handleVideoHLSUpload(req)
  res.status(HTTP_STATUS.OK).json({
    message: 'Uploading videos successfully',
    result
  })
}

export const getStatusVideoHLSController = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params
  const result = await mediasService.getStatusHLSVideoHandler(id)
  res.status(HTTP_STATUS.OK).json({
    message: 'Getting status videos successfully',
    result
  })
}

//Static
export const staticImgController = (req: Request, res: Response, next: NextFunction) => {
  const { filename } = req.params
  return res.sendFile(path.resolve(UPLOAD_DIR_IMG, filename), (err) => {
    if (err && (err as any).status === HTTP_STATUS.NOT_FOUND) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Not Found File In Server')
    }
  })
}
export const staticVideoController = (req: Request, res: Response, next: NextFunction) => {
  const { filename } = req.params
  const nameNotExt = getNameFile(filename)
  return res.sendFile(path.resolve(UPLOAD_DIR_VIDEO, nameNotExt, filename), (err) => {
    if (err && (err as any).status === HTTP_STATUS.NOT_FOUND) {
      res.status(HTTP_STATUS.NOT_FOUND).send('Not Found File In Server')
    }
  })
}
export const staticVideoStreamController = async (req: Request, res: Response, next: NextFunction) => {
  const { range } = req.headers
  //Kiểm tra có range từ client gửi lên không
  if (!range) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Request Header Range')
  }
  const { filename } = req.params
  const pathVideoStream = path.resolve(UPLOAD_DIR_VIDEO, filename)
  //Lấy file size
  const videoSize = fs.statSync(pathVideoStream).size

  //Lấy giá trị start
  const start = Number(range.replace(/\D/g, ''))
  //Thiết lập từng đoạn streaming xuống là 15MB
  const chunkSize = 15 * 10 ** 6 // 15MB

  //Lấy giá trị end là start + đoạn nếu lớn hơn videoSize - 1 thì lấy videoSize - 1 (trừ 1 để end luôn phải nhỏ videoSize)
  const end = Math.min(start + chunkSize, videoSize - 1)

  const contentLength = end - start + 1
  const mime = (await import('mime')).default
  //Lấy extension video
  const contentType = mime.getType(pathVideoStream) || 'video/*'

  /**
   * Format của header Content-Range: bytes <start>-<end>/<videoSize>
   *
   *  ChunkSize = 50
   * videoSize = 100
   * |0----------------50|51----------------99|100 (end)
   * stream 1: start = 0, end = 50, contentLength = 51
   * stream 2: start = 51, end = 99, contentLength = 49
   */
  const headers = {
    'Content-Length': contentLength,
    'Content-Type': contentType,
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes'
  }
  res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers)
  const readStream = fs.createReadStream(pathVideoStream, { start, end })
  readStream.pipe(res)
}

export const staticM3U8Controller = async (req: Request, res: Response, next: NextFunction) => {
  //Xử lý ở S3 AWS
  const { id } = req.params
  const nameFileOnAws = `video-hls/${id}/master.m3u8`
  await getFileFromS3Aws(res, nameFileOnAws)

  //Xử lý ở static server local
  // const { id } = req.params
  // const pathM3U8 = path.resolve(UPLOAD_DIR_VIDEO, id, 'master.m3u8')
  // return res.sendFile(pathM3U8, (err) => {
  //   if (err && (err as any).status === HTTP_STATUS.NOT_FOUND) {
  //     res.status(HTTP_STATUS.NOT_FOUND).send('Not Found File In Server')
  //   }
  // })
}
export const staticSequenceFileController = async (req: Request, res: Response, next: NextFunction) => {
  //Xử lý ở S3 AWS
  const { id, v, sequence } = req.params
  const nameFileOnAws = `video-hls/${id}/${v}/${sequence}`
  await getFileFromS3Aws(res, nameFileOnAws)
  //Xử lý ở static server local
  // const { id, v, sequence } = req.params
  // const pathSequence = path.resolve(UPLOAD_DIR_VIDEO, id, v, sequence)
  // return res.sendFile(pathSequence, (err) => {
  //   if (err && (err as any).status === HTTP_STATUS.NOT_FOUND) {
  //     res.status(HTTP_STATUS.NOT_FOUND).send('Not Found File In Server')
  //   }
  // })
}
