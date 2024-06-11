// eslint-disable-next-line no-undef
module.exports = {
  apps: [
    {
      name: 'myapp',
      script: 'dist/index.js',
      watch: true,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
