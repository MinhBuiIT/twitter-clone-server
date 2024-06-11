import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { ErrorMessage } from '~/models/Errors'
export const handleError = (err: any, req: Request, res: Response, next: NextFunction) => {
  try {
    if (err instanceof ErrorMessage) {
      return res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(err, 'status'))
    }

    Object.getOwnPropertyNames(err).forEach((key) => {
      if (
        Object.getOwnPropertyDescriptor(err, key)?.configurable &&
        Object.getOwnPropertyDescriptor(err, key)?.writable
      )
        Object.defineProperty(err, key, { enumerable: true })
    })

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(err, 'stack'))
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Internal Server Error',
      error: error
    })
  }
  //khi trong object có property được set enumable là false thì ta không thể chuyển nó thành string hay lấy key nó được bằng Object.keys và Error Object thì object kiểu vậy
}
