import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { ErrorEntity, ErrorMessage } from '~/models/Errors'

export const validate = (validator: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validator.run(req)
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    //
    const errorObjects = errors.mapped() //để khi một trường sai nhiều validate field thì nó chỉ xuất ra một validate field trường đó thôi
    const errorEntity = new ErrorEntity({ errors: {} })
    for (const key in errorObjects) {
      const { msg } = errorObjects[key]
      if (msg instanceof ErrorMessage && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      errorEntity.errors[key] = errorObjects[key]
    }
    return next(errorEntity)
  }
}
