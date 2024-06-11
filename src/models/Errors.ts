import HTTP_STATUS from '~/constants/httpStatus.contants'

type ErrorFieldType = Record<
  string,
  {
    msg: any
    [key: string]: any
  }
>
export class ErrorMessage {
  message: string
  status?: number
  constructor({ message, status }: { message: string; status?: number }) {
    this.message = message
    this.status = status
  }
}
export class ErrorEntity extends ErrorMessage {
  errors: ErrorFieldType
  constructor({
    errors,
    status = HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message = 'Validation Error'
  }: {
    errors: ErrorFieldType
    status?: number
    message?: string
  }) {
    super({ message, status })
    this.errors = errors
  }
}
