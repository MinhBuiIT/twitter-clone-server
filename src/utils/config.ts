import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

const env = process.env.NODE_ENV
if (!env) {
  console.log('Vui lòng truyền NODE_ENV như production hoặc deveplopment')
  process.exit(1)
}
const fileEnvName = `.env.${env}`
if (!fs.existsSync(path.resolve(fileEnvName))) {
  console.log(`Vui lòng tạo file ${fileEnvName}, nếu ở môi trường dev thì tạo file .env.development`)
  process.exit(1)
}
console.log(`Bạn đang chạy dự án ở môi trường ${env} ở file ${fileEnvName}`)

config({
  path: fileEnvName
})
