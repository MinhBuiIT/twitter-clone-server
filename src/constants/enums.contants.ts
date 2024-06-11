export enum TokenType {
  AccessToken,
  RefreshToken,
  EmailVerifiedToken,
  ForgotPasswordToken
}
export enum UserStatus {
  Unverified,
  Verified,
  Banned
}
export enum MediaType {
  Image,
  Video
}
export enum MediaQueryType {
  Image = 'image',
  Video = 'video'
}
export enum HLSVideoStatus {
  WAITING, //ĐỢi xử lý
  PENDING, //Đang xử lý
  SUCCESS, //Xử lý thành công
  FAILED
}
export enum TweetType {
  Tweet,
  ReTweet,
  Comment,
  QuoteTweet
}
export enum AudienceType {
  EveryOne,
  TwitterCircle
}
