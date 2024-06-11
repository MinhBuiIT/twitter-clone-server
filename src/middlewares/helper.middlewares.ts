import { NextFunction, Request, Response } from 'express'
import { pick } from 'lodash'

export const filterDataMiddleware = <T>(filterKey: (keyof T)[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKey)
    next()
  }
}
