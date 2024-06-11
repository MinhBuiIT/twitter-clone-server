# SET UP NODEJS PROJECT WITH TYPESCRIPT

## HƯỚNG DẪN THỰC HIỆN

* Npm init -y
* Cài đặt Typescript với Dev: 
```bash
  npm i typescript --save-dev
```
* Cài đặt type cho nodejs: 
```bash
  npm i @types/node --save-dev
```
* Cài các package config: 
```bash
  npm install eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser ts-node tsc-alias tsconfig-paths rimraf nodemon --save-dev
```
* Cấu hình tsconfig.json
  ```bash
  {
  "compilerOptions": {
  "module": "NodeNext", // Quy định output module được sử dụng
  "moduleResolution": "NodeNext",
  "target": "ES2022", // Target output cho code
  "outDir": "dist", // Đường dẫn output cho thư mục build
  "esModuleInterop": true,
  "strict": true /_ Enable all strict type-checking options. _/,
  "skipLibCheck": true /_ Skip type checking all .d.ts files. _/,
  "baseUrl": ".", // Đường dẫn base cho các import
  "paths": {
  "~/_": ["src/_"] // Đường dẫn tương đối cho các import (alias)
  }
  },
  "ts-node": {
  "require": ["tsconfig-paths/register"]
  },
  "files": ["src/type.d.ts"], // Các file dùng để defined global type cho dự án
  "include": ["src/**/*"] // Đường dẫn include cho các file cần build
  }
  ```
* Cấu hình file config cho ESLint .eslintrc
  ```bash
  {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "eslint-config-prettier", "prettier"],
  "rules": {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "prettier/prettier": [
  "warn",
  {
  "arrowParens": "always",
  "semi": false,
  "trailingComma": "none",
  "tabWidth": 2,
  "endOfLine": "auto",
  "useTabs": false,
  "singleQuote": true,
  "printWidth": 120,
  "jsxSingleQuote": true
  }
  ]
  }
  }
  ```
* .eslintignore .prettierignore
```bash
  node_modules/
  dist/
```
* .prettierrc
  ```bash
  {
  "arrowParens": "always",
  "semi": false,
  "trailingComma": "none",
  "tabWidth": 2,
  "endOfLine": "auto",
  "useTabs": false,
  "singleQuote": true,
  "printWidth": 120,
  "jsxSingleQuote": true
  }
  ```
* .editorconfig
```bash
  [*]
  indent_size = 2
  indent_style = space
```
* nodemon.json
```bash
  {
  "watch": ["src"],
  "ext": ".ts,.js",
  "ignore": [],
  "exec": "npx ts-node ./src/index.ts"
  }
```
* Add script into package.json
```bash
  "scripts": {
    "dev": "npx nodemon",
    "build": "rimraf ./dist && tsc && tsc-alias",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "prettier": "prettier --check .",
    "prettier:fix": "prettier --write ."
  }
```
* Create file src/index.js and src/type.d.ts
