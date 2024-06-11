import cors from 'cors'
import express from 'express'
// import '~/utils/fake'
import { createServer } from 'http'

import { handleError } from './middlewares/errors.middlewares'

import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import '~/utils/config'
import bookmarkRoutes from './routes/bookmarks.routes'
import conversationRoutes from './routes/conversations.routes'
import likeRoutes from './routes/likes.routes'
import mediasRoutes from './routes/medias.routes'
import searchRoutes from './routes/search.routes'
import staticRoutes from './routes/static.routes'
import tweetRoutes from './routes/tweets.routes'
import userRoute from './routes/users.routes'
import dbService from './services/database.services'
import { initFileUpload } from './utils/file'
import { getEnvProStaging } from './utils/helper'
import initSocket from './utils/socket'

// config({
//   path: getEnvProStaging() ? `.env.${getEnvProStaging()}` : '.env'
// })
const options: swaggerJSDoc.Options = {
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Swagger Twitter Clone - OpenAPI 3.0',
      version: '1.0.0',
      description:
        "This is a sample Twitter Clone Server based on the OpenAPI 3.0 specification.  You can find out more about Swagger at [https://swagger.io](https://swagger.io). In the third iteration of the pet store, we've switched to the design first approach!\n\n Some useful links:\n- [The Twitter-Clone repository](https://github.com/swagger-api/swagger-petstore)\n- [The source API definition for the Twitter-Clone](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)"
    }
  },
  apis: ['./openapi/*.yaml']
}

const openapiSpecification = swaggerJSDoc(options)
dbService.connect().then(async () => {
  await dbService.createIndexUserCollection()
  await dbService.createIndexRefreshTokenCollection()
  await dbService.createIndexHLSVideoCollection()
  await dbService.createIndexFollowCollection()
  await dbService.createIndexTextContentTweetCollection()
  await dbService.createIndexTextHashTagCollection()
})
const app = express()
const httpServer = createServer(app)
initSocket(httpServer)

const port = process.env.PORT
// Use Helmet!
app.use(helmet())
//Cors
app.use(
  cors({
    origin: getEnvProStaging() === 'production' ? process.env.DOMAIN_CLIENT : '*'
  })
)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
})
app.use(limiter)
//Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification))
//khoi tao dir upload
initFileUpload()
app.use(express.json()) //middleware để chuyển data post lên từ kiểu json thành object
app.use('/users', userRoute)
app.use('/medias', mediasRoutes)
app.use('/static', staticRoutes)
app.use('/tweet', tweetRoutes)
app.use('/bookmark', bookmarkRoutes)
app.use('/like', likeRoutes)
app.use('/search', searchRoutes)
app.use('/conversation', conversationRoutes)
// app.use('/static/image', express.static(path.resolve('uploads')))
//default error handler
app.use(handleError)
httpServer.listen(port, () => {
  console.log('Server running on port ' + port)
})

//Insert 1000 users
// function randomAge() {
//   const number = Math.floor(Math.random() * 100)
//   return number
// }

// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@clustertwitterdb.m2uecom.mongodb.net/?retryWrites=true&w=majority&appName=ClusterTwitterDb`
// const mongoTest = new MongoClient(uri)
// const dbLover = mongoTest.db('lovers')
// const usersCollection = dbLover.collection('users')
// const usersList = []
// for (let i = 1; i <= 1000; i++) {
//   usersList.push({
//     name: `user${i}`,
//     age: randomAge(),
//     gender: i % 2 === 0 ? 'Male' : 'Female'
//   })
// }
// usersCollection.insertMany(usersList)
