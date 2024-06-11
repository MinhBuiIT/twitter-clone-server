import '~/utils/config'
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')

const client = new SESClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})
const createSendMailRequest = ({ fromAddress, ToAddresses, CcAddresses = [], subject, body, replyAddress = [] }) => {
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
const sendMail = async ({ subject, body, ToAddresses }) => {
  await client.send(
    createSendMailRequest({
      fromAddress: process.env.FROM_SEND_MAIL_ADDRESS,
      subject,
      body,
      ToAddresses
    })
  )
}
sendMail({ subject: 'Gửi Mail', body: '<h1>Test Gửi Mail AWS SES</h1>', ToAddresses: 'buikhaminh2003@gmail.com' }).then(
  () => console.log('Gửi mail thành công')
)
