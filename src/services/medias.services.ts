import { Request } from 'express'
import { File } from 'formidable'
import fsPromise from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { HLSVideoStatus, MediaType } from '~/constants/enums.contants'
import { UPLOAD_DIR_IMG, UPLOAD_DIR_IMG_TEMP, UPLOAD_DIR_VIDEO } from '~/constants/var.contants'
import { Media } from '~/models/Other'
import { HLSVideo } from '~/models/schemas/hls_videos.schemas'
import '~/utils/config'
import { formiableVideoHLSHandler, formiableVideoHandler, formidableImgHandle } from '~/utils/file'
import { checkEnv, getFiles, getNameFile } from '~/utils/helper'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/hls'
import { uploadS3Aws } from '~/utils/s3'
import dbService from './database.services'

class Queue {
  private items: string[]
  private isProccess: boolean
  constructor() {
    this.items = []
    this.isProccess = false
  }
  async enqueue(item: string) {
    this.items.push(item)
    //item: ...uploads/a/smmms/video
    const realNameItem = item.split('\\').pop() as string
    await dbService.HLSVideoCollection().insertOne(
      new HLSVideo({
        name: getNameFile(realNameItem),
        status: HLSVideoStatus.WAITING
      })
    )
    this.process()
  }
  async process() {
    if (this.isProccess) return
    if (this.items.length > 0) {
      this.isProccess = true
      const pathVideo = this.items[0]
      await dbService.HLSVideoCollection().updateOne(
        {
          name: getNameFile(pathVideo.split('\\').pop() as string)
        },
        {
          $set: {
            status: HLSVideoStatus.PENDING
          },
          $currentDate: {
            updated_at: true
          }
        }
      )
      try {
        //encoded video
        await encodeHLSWithMultipleVideoStreams(pathVideo)
        const pathDirVideo = path.resolve(pathVideo, '..')

        //xóa video
        await fsPromise.unlink(pathVideo)

        //Lấy tất cả các file trong thư mục video hls encode
        const allFilesDir = getFiles(pathDirVideo)
        const mime = await (await import('mime')).default
        //Upload tất cả các file lên s3 bucket
        await Promise.all(
          allFilesDir.map((filePath) => {
            const filePathConfig = filePath.replace(UPLOAD_DIR_VIDEO, '').replace('\\', '/')

            return uploadS3Aws({
              nameFile: 'video-hls' + filePathConfig,
              filePath,
              contentType: mime.getType(filePath) as string
            })
          })
        )
        //Sau khi upload lên xóa thư mục encode trong dir uploads
        await fsPromise.rm(pathDirVideo, { recursive: true, force: true })
        this.items.shift()
        this.isProccess = false
        await dbService.HLSVideoCollection().updateOne(
          {
            name: getNameFile(pathVideo.split('\\').pop() as string)
          },
          {
            $set: {
              status: HLSVideoStatus.SUCCESS
            },
            $currentDate: {
              updated_at: true
            }
          }
        )
        this.process()
      } catch (error) {
        await dbService
          .HLSVideoCollection()
          .updateOne(
            {
              name: getNameFile(pathVideo.split('\\').pop() as string)
            },
            {
              $set: {
                status: HLSVideoStatus.FAILED
              },
              $currentDate: {
                updated_at: true
              }
            }
          )
          .catch((err) => {
            console.error('Lỗi update collection hls_videos')
            console.error(error)
          })
        console.error('Lỗi Encode Video')
        console.error(error)
      }
    } else {
      return
    }
  }
}

const queue = new Queue()
class MediasService {
  async handleImgUploadConvert(req: Request) {
    const files = await formidableImgHandle(req)

    const hanleSingleImgAsync = async (file: File): Promise<Media> => {
      const nameFile = getNameFile(file.newFilename)
      const fullNameFile = `${nameFile}.jpg`
      const tempFilePath = path.resolve(UPLOAD_DIR_IMG_TEMP, file.newFilename)
      const filePathConvert = path.resolve(UPLOAD_DIR_IMG, fullNameFile)
      sharp.cache(false)
      await sharp(tempFilePath).jpeg().toFile(filePathConvert)
      const mime = (await import('mime')).default
      const result = await uploadS3Aws({
        nameFile: 'image/' + fullNameFile,
        filePath: filePathConvert,
        contentType: mime.getType(filePathConvert) as string
      })
      //Xóa hai file ảnh trong folder upload
      await Promise.all([fsPromise.unlink(tempFilePath), fsPromise.unlink(filePathConvert)])

      // const url = checkEnv()
      //   ? `${process.env.HOST}/static/image/${nameFile}.jpg`
      //   : `http://localhost:${process.env.PORT}/static/image/${nameFile}.jpg`
      return {
        url: result.Location as string,
        type: MediaType.Image
      }
    }
    const result = await Promise.all(
      files.map((file) => {
        return hanleSingleImgAsync(file)
      })
    )
    return result
  }
  async handleVideoUpload(req: Request) {
    const videos = await formiableVideoHandler(req)

    const result: Media[] = await Promise.all(
      videos.map(async (video) => {
        const nameFileNotExt = getNameFile(video.newFilename)
        const result = await uploadS3Aws({
          nameFile: `video/${nameFileNotExt}/` + video.newFilename,
          contentType: video.mimetype as string,
          filePath: video.filepath
        })
        await fsPromise.unlink(video.filepath)

        await fsPromise.rmdir(path.resolve(UPLOAD_DIR_VIDEO, nameFileNotExt))
        // const url = checkEnv()
        //   ? `${process.env.HOST}/static/video/${video.newFilename}`
        //   : `http://localhost:${process.env.PORT}/static/video/${video.newFilename}`
        return {
          url: result.Location as string,
          type: MediaType.Video
        }
      })
    )
    return result
  }

  //Xử lý khi nhiều request hls tới cùng lúc => Queue

  async handleVideoHLSUpload(req: Request) {
    const videos = await formiableVideoHLSHandler(req)
    const result: Media[] = await Promise.all(
      videos.map(async (video) => {
        //Hàng đợi
        queue.enqueue(video.filepath)
        const nameDirVideo = getNameFile(video.newFilename)
        const url = checkEnv()
          ? `${process.env.HOST}/static/video-hls/${nameDirVideo}/master.m3u8`
          : `http://localhost:${process.env.PORT}/static/video-hls/${nameDirVideo}/master.m3u8`
        return {
          url,
          type: MediaType.Video
        }
      })
    )
    return result
  }

  //Get Status
  async getStatusHLSVideoHandler(name: string) {
    const result = await dbService.HLSVideoCollection().findOne({ name: { $eq: name } })
    return result
  }
}
const mediasService = new MediasService()
export default mediasService
