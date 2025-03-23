# RTC WhatsApp Business Manager in Serverless framework

This services uses AWS Lambda functions to interact with the WhatsApp Business API. Checkout the [official documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/overview) from Facebook for more.

This service uses the [Serverless](https://www.serverless.com/framework/docs) framework to manage the Lambda function on AWS.

## Lambda Functions

### Webhook Verification Lambda

Handles the incoming webhook verification request from Facebook, when we register a new webook with them, during WhatsApp configuration.

### Webhook Handler Lambda

Handles all the incoming events from Facebook.

### Push Template Lambda

Send messages to the given recipients using the provided template.

## Local Development

### 1. Clone the repository

```shell
git@github.com:SumeetP96/rtc-wabi-manager-serverless.git
```

### 2. Install dependencies

```shell
npm install
```

### 3. Create Environment file, and add your values to all the variables.

```shell
cp example.env .env
```

### 4. Run locally (uses [serverless-offline plugin](https://www.serverless.com/plugins/serverless-offline))

```shell
npm run dev
```

## Deployment

### Full Service Deployment

Use this command if you are deploying for the first time or you have made any changes to the service configurations.

```shell
  npm run deploy:service
```

### Single Function Deployment

Use this command if you want to deploy only one lambda function. This approach is faster as it only involves dealing with one function rather than complete service.

#### Format:

`npm run deploy:fn:{functionNameAsPerPackageJson}`

#### Lambda Function: [Webhook Verification](#webhook-verification-lambda)

```shell
npm run deploy:fn:wabiWebhookVerfiy
```

#### Lambda Function: [Webhook Handler](#webhook-handler-lambda)

```shell
npm run deploy:fn:wabiWebhookEventHandler
```

#### Lambda Function: [Push Template](#push-template-lambda)

```shell
npm run deploy:fn:wabiPushTemplate
```
