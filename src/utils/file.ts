import { Request } from 'express'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR_IMG_TEMP, UPLOAD_DIR_VIDEO, UPLOAD_DIR_VIDEO_TEMP } from '~/constants/var.contants'
import { getExtension } from './helper'

export const initFileUpload = () => {
  ;[UPLOAD_DIR_IMG_TEMP, UPLOAD_DIR_VIDEO_TEMP].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      })
    }
  })
}
export const formidableImgHandle = (req: Request) => {
  return new Promise<File[]>((resolve, reject) => {
    const uploadsDirPath = path.resolve(UPLOAD_DIR_IMG_TEMP)

    const form = formidable({
      keepExtensions: true,
      maxFiles: 5,
      maxFieldsSize: 500 * 1024, //500KB
      maxTotalFileSize: 5 * 500 * 1024,
      uploadDir: uploadsDirPath,
      filter: function ({ name, originalFilename, mimetype }) {
        //check chỉ có key là avatar và loại image mới được upload lên
        const isValid = name === 'avatar' && Boolean(mimetype?.includes('image/'))
        if (!isValid) {
          form.emit('error' as any, new Error('File is invalid') as any)
        }
        // keep only images
        return isValid
      }
    })
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)

        return
      }
      //Nếu upload rỗng thì reject
      if (!files.avatar) {
        reject(new Error('File is empty'))
        return
      }
      resolve(files.avatar as File[])
    })
  })
}
export const formiableVideoHandler = async (req: Request) => {
  //Tạo id cho folder video upload lên
  const nanoid = (await import('nanoid')).nanoid
  const _idName = nanoid()
  const _idDirPath = path.resolve('uploads/videos/' + _idName)
  if (!fs.existsSync(_idDirPath)) {
    fs.mkdirSync(_idDirPath)
  }
  const form = formidable({
    uploadDir: path.resolve(_idDirPath),
    maxFiles: 2,
    maxFieldsSize: 50 * 1024 * 1024, //50MB
    maxTotalFileSize: 2 * 50 * 1024 * 1024,
    filter: function ({ name, originalFilename, mimetype }) {
      const isValid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!isValid) {
        form.emit('error' as any, new Error('File is invalid') as any)
      }

      return isValid
    },
    filename: () => {
      return _idName
    }
  })
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      if (!files.video) {
        reject(new Error('File is empty'))
        return
      }
      const videos = files.video as File[]
      videos.forEach((video) => {
        const ext = getExtension(video.originalFilename as string)
        fs.renameSync(video.filepath, video.filepath + `.${ext}`)
        video.newFilename = video.newFilename + `.${ext}`
        video.filepath = video.filepath + `.${ext}`
      })
      resolve(files.video as File[])
    })
  })
}
export const formiableVideoHLSHandler = async (req: Request) => {
  const nanoid = (await import('nanoid')).nanoid
  const _idName = nanoid()
  const pathDirVideo = path.resolve(UPLOAD_DIR_VIDEO, _idName)
  if (!fs.existsSync(pathDirVideo)) {
    fs.mkdirSync(pathDirVideo)
  }
  const form = formidable({
    uploadDir: pathDirVideo,
    maxFiles: 1,
    maxFieldsSize: 50 * 1024 * 1024, //50MB
    maxTotalFileSize: 1 * 50 * 1024 * 1024,
    filter: function ({ name, originalFilename, mimetype }) {
      const isValid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!isValid) {
        form.emit('error' as any, new Error('File is invalid') as any)
      }

      return isValid
    },
    filename: () => {
      return _idName
    }
  })
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      if (!files.video) {
        reject(new Error('File is empty'))
        return
      }
      const videos = files.video as File[]
      videos.forEach((video) => {
        const ext = getExtension(video.originalFilename as string)
        fs.renameSync(video.filepath, video.filepath + `.${ext}`)
        video.newFilename = video.newFilename + `.${ext}`
        video.filepath = video.filepath + `.${ext}`
      })
      resolve(files.video as File[])
    })
  })
}
