import { NextFunction, Request, Response } from 'express'
import core, { Query } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { SearchQuery } from '~/models/requests/search.requests'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import searchService from '~/services/search.services'

export const searchController = async (
  req: Request<core.ParamsDictionary, any, any, Query>,
  res: Response,
  next: NextFunction
) => {
  const content = (req.query as SearchQuery).content

  const isSearchHashTag = content.includes('#')

  const limit = Number((req.query as SearchQuery).limit)
  const page = Number((req.query as SearchQuery).page)
  const media_type = (req.query as SearchQuery).media_type
  const people_follow = (req.query as SearchQuery).people_follow
  const { user_id } = req.decoded_authorization as JwtPayloadExtension
  let result
  if (!isSearchHashTag) {
    result = await searchService.searchContent({ content, limit, page, user_id, media_type, people_follow })
  } else {
    const hashTagArr = content.split('#')
    const hashTagName = hashTagArr[hashTagArr.length - 1]

    result = await searchService.searchHashTagName({ hashTagName, limit, page, user_id, media_type, people_follow })
  }
  const { tweets, totalPage } = result
  return res.status(HTTP_STATUS.OK).json({
    message: 'Search successfully',
    result: {
      tweets,
      page,
      limit,
      total_page: totalPage
    }
  })
}
