# EventGo Deployment Architecture

## Suggested AWS Stack
- API: API Gateway + Lambda or ECS
- DB: DynamoDB (EventGo_Main)
- Auth: Cognito
- Files: S3 + CloudFront
- Notifications: SES + SNS
- Queue: SQS for heavy tasks
- Observability: CloudWatch + X-Ray

## Environments
- dev, staging, production
- Separate AWS accounts or isolated VPCs
