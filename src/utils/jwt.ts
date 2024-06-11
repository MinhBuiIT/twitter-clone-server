import jwt, { SignOptions } from 'jsonwebtoken'
import { JwtPayloadExtension } from '~/models/requests/users.requests'
import '~/utils/config'

export function signToken({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | object | Buffer
  privateKey: string
  options?: SignOptions
}) {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, function (err, token) {
      if (err) {
        reject(err)
      }
      resolve(token as string)
    })
  })
}
export const verifyToken = (token: string, privateKey: string) => {
  return new Promise<JwtPayloadExtension>((resolve, reject) => {
    jwt.verify(token, privateKey, (err, decoded) => {
      if (err) {
        reject(err)
      } else {
        resolve(decoded as JwtPayloadExtension)
      }
    })
  })
}
