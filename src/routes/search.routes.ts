import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middlewares'
import { paginationQueryValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserAccountValidator } from '~/middlewares/users.middlewares'
import { wrapErrorHandler } from '~/utils/handlers'

const searchRoutes = Router()

searchRoutes.get(
  '/',
  accessTokenValidator,
  verifiedUserAccountValidator,
  paginationQueryValidator,
  searchValidator,
  wrapErrorHandler(searchController)
)

export default searchRoutes
