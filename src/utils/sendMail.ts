import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import fs from 'fs'
import path from 'path'
import '~/utils/config'

interface MailParam {
  fromAddress: string
  ToAddresses: string | string[]
  CcAddresses?: string | string[]
  subject: string
  body: string
  replyAddress?: string | string[]
}
const client = new SESClient({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string
  }
})
const createSendMailRequest = ({
  fromAddress,
  ToAddresses,
  CcAddresses = [],
  subject,
  body,
  replyAddress = []
}: MailParam) => {
  return new SendEmailCommand({
    Source: fromAddress,
    Destination: {
      ToAddresses: ToAddresses instanceof Array ? ToAddresses : [ToAddresses],
      CcAddresses: CcAddresses instanceof Array ? CcAddresses : [CcAddresses]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: body, // required
          Charset: 'UTF-8'
        }
      }
    },
    ReplyToAddresses: replyAddress instanceof Array ? replyAddress : [replyAddress]
  })
}
export const sendMail = ({
  subject,
  body,
  ToAddresses
}: {
  subject: string
  body: string
  ToAddresses: string | string[]
}) => {
  return client.send(
    createSendMailRequest({
      fromAddress: process.env.FROM_SEND_MAIL_ADDRESS as string,
      subject,
      body,
      ToAddresses
    })
  )
}
const htmlTemplate = fs.readFileSync(path.resolve('src/templates/mail.html'), 'utf8')

export const sendVerifiedEmail = ({ name, url, ToAddresses }: { name: string; url: string; ToAddresses: string }) => {
  const body = htmlTemplate
    .replace('{{title}}', 'Please click to verify your email')
    .replace('{{name}}', name)
    .replace('{{content}}', 'Click the button below to verify your email')
    .replace('{{url}}', url)
    .replace('{{button}}', 'Verify Email')

  return sendMail({ subject: 'Verify Email', body, ToAddresses })
}
export const sendForgotPasswordMail = ({
  name,
  url,
  ToAddresses
}: {
  name: string
  url: string
  ToAddresses: string
}) => {
  const body = htmlTemplate
    .replace('{{title}}', 'Please click to reset password')
    .replace('{{name}}', name)
    .replace('{{content}}', 'Click the button below to verify your email to reset your password')
    .replace('{{url}}', url)
    .replace('{{button}}', 'Reset Password')
  return sendMail({ subject: 'Forgot Password', body, ToAddresses })
}
