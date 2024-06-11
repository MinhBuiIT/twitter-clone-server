import { Query } from 'express-serve-static-core'
import { MediaQueryType } from '~/constants/enums.contants'
export interface SearchQuery extends Query, PaginationQuery {
  content: string
  media_type?: MediaQueryType
  people_follow?: 'on'
}
export interface PaginationQuery extends Query {
  page: string
  limit: string
}
