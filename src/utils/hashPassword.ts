import { createHash } from 'crypto'
import '~/utils/config'

function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}
export function hashPassword(password: string) {
  return sha256(password + process.env.KEY_HASH_PASSWORD)
}
