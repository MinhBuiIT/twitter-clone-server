import { Request } from 'express'
import fs from 'fs'
import { VerifyErrors } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import minimist from 'minimist'
import HTTP_STATUS from '~/constants/httpStatus.contants'
import { USER_MSG } from '~/constants/messages.contants'
import { ErrorMessage } from '~/models/Errors'
import { verifyToken } from './jwt'

export function generateRandomPassword() {
  const length = 6 // Minimum length of the password
  const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz'
  const numberChars = '0123456789'
  const symbolChars = '!@#$%^&*()_+[]{}|;:,.<>?'

  function getRandomChar(charSet: string) {
    const randomIndex = Math.floor(Math.random() * charSet.length)
    return charSet[randomIndex]
  }

  // Ensure the password contains at least one character from each required set
  let password = ''
  password += getRandomChar(upperCaseChars)
  password += getRandomChar(lowerCaseChars)
  password += getRandomChar(numberChars)
  password += getRandomChar(symbolChars)

  // Generate the rest of the password
  const allChars = upperCaseChars + lowerCaseChars + numberChars + symbolChars
  for (let i = password.length; i < length; i++) {
    password += getRandomChar(allChars)
  }

  // Shuffle the password to ensure random order of characters
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')

  return password
}
export const getNameFile = (filename: string) => {
  const arrName = filename.split('.')
  arrName.pop()
  return arrName.join('')
}
export const checkEnv = () => {
  const argv = minimist(process.argv.slice(2))
  return argv.env === 'production' || argv.env === 'staging'
}

export const getEnvProStaging = () => {
  const argv = minimist(process.argv.slice(2))
  if (argv.env === 'production' || argv.env === 'staging') return argv.env
  return null
}
export const getExtension = (file: string) => {
  const arrNameFilePart = file.split('.')
  return arrNameFilePart[arrNameFilePart.length - 1]
}
export const convertEnumToArray = (enums: object) => {
  return Object.values(enums).filter((item) => {
    return typeof item === 'number'
  })
}
// Recursive function to get files
export function getFiles(dir: string, files: string[] = []) {
  // Get an array of all files and directories in the passed directory using fs.readdirSync
  const fileList = fs.readdirSync(dir)
  // Create the full path of the file/directory by concatenating the passed directory and file/directory name
  for (const file of fileList) {
    const name = `${dir}/${file}`
    // Check if the current file/directory is a directory using fs.statSync
    if (fs.statSync(name).isDirectory()) {
      // If it is a directory, recursively call the getFiles function with the directory path and the files array
      getFiles(name, files)
    } else {
      // If it is a file, push the full path to the files array
      files.push(name)
    }
  }
  return files
}
export const verifyAccessToken = async (val: string, req?: Request) => {
  if (!val) {
    throw new ErrorMessage({ message: USER_MSG.ACCESS_TOKEN_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
  }
  if (val.includes('Bearer ')) {
    val = val.replace('Bearer ', '')
  } else {
    throw new ErrorMessage({ message: USER_MSG.ACCESS_TOKEN_FORMAT, status: HTTP_STATUS.UNAUTHORIZED })
  }
  try {
    const decoded_authorization = await verifyToken(val, process.env.SECRET_KEY_ACCESS_TOKEN as string)
    if (req) {
      ;(req as Request).decoded_authorization = decoded_authorization
      return true
    }
    return decoded_authorization
  } catch (error) {
    const message = capitalize((error as VerifyErrors).message)

    throw new ErrorMessage({ message, status: HTTP_STATUS.UNAUTHORIZED })
  }
}
