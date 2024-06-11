import { S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Response } from 'express'
import fs from 'fs'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import '~/utils/config'

const s3 = new S3({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string
  }
})

export const uploadS3Aws = ({
  nameFile,
  filePath,
  contentType
}: {
  nameFile: string
  filePath: string
  contentType: string
}) => {
  const body = fs.readFileSync(filePath)
  const parallelUploads3 = new Upload({
    client: s3,
    params: {
      Bucket: process.env.MY_BUCKET,
      Key: nameFile,
      Body: body,
      ContentType: contentType
    },

    // optional tags
    tags: [
      /*...*/
    ],

    // additional optional fields show default values below:

    // (optional) concurrency configuration
    queueSize: 4,

    // (optional) size of each part, in bytes, at least 5MB
    partSize: 1024 * 1024 * 5,

    // (optional) when true, do not automatically call AbortMultipartUpload when
    // a multipart upload fails to complete. You should then manually handle
    // the leftover parts.
    leavePartsOnError: false
  })
  return parallelUploads3.done()
}
export const getFileFromS3Aws = async (res: Response, nameFile: string) => {
  try {
    const result = await s3.getObject({
      Bucket: process.env.MY_BUCKET as string,
      Key: nameFile
    })
    ;(result.Body as any).pipe(res)
  } catch (err) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: 'Not Found On S3 AWS'
    })
  }
}
