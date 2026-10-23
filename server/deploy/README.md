# CarbonLens AWS EC2 + CloudWatch Backend Deployment Guide

This backend connects CarbonLens to your real AWS EC2 instance (`i-03ab13867b4511011` in `eu-north-1`) by querying Amazon CloudWatch metrics using the AWS SDK for JavaScript v3.

---

## 1. Security & Least-Privilege IAM Policy

The backend execution role requires **only read-only** access to CloudWatch metric statistics. It cannot modify EC2 instances, terminate servers, or read any other services.

### Minimal IAM Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudWatchEC2MetricStatsOnly",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowLambdaCloudWatchLogging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## 2. Cost Analysis & Resource Overhead

- **AWS Lambda**: Free Tier includes 1,000,000 free requests per month. With CarbonLens polling every 60 seconds (1,440 requests/day = ~43,200 requests/month), Lambda cost is **$0.00**.
- **Amazon CloudWatch**: `GetMetricStatistics` calls are included in the CloudWatch API free tier (up to 1,000,000 requests/month). Cost is **$0.00**.
- **Lambda Function URL**: Built-in HTTPS endpoint provided by AWS Lambda. No API Gateway is required. Cost is **$0.00**.

**Total Monthly Estimated Cost: $0.00 (within AWS Free Tier).**

---

## 3. Quick Deployment Options

### Option A: AWS Lambda Console (3 Minutes)

1. Open the [AWS Lambda Console](https://eu-north-1.console.aws.amazon.com/lambda) in region `eu-north-1` (Stockholm).
2. Click **Create function**:
   - Name: `CarbonLens-EC2-CloudWatch-Metrics`
   - Runtime: `Node.js 20.x` or `Node.js 22.x`
   - Architecture: `x86_64` or `arm64`
3. Under **Permissions**, choose or create an execution role with the IAM policy above.
4. Under **Advanced settings**:
   - Enable **Function URL**.
   - Auth type: `NONE`.
   - **CRITICAL**: Leave **"Configure cross-origin resource sharing (CORS)" UNCHECKED**.
     *(Why: The Lambda handler in `lambda.js` already handles all CORS headers and OPTIONS preflights. If this box is checked in AWS, AWS injects duplicate Access-Control-Allow-Origin headers, causing browser CORS failures).*
5. Upload the code:
   - Zip the contents of the `server/` directory including `node_modules` (or install dependencies).
   - In **Runtime settings**, set the handler to: `lambda.handler`.
6. Add Environment Variables (optional, defaults are already pre-configured in code):
   - `AWS_REGION`: `eu-north-1`
   - `EC2_INSTANCE_ID`: `i-03ab13867b4511011`
   - `EC2_INSTANCE_NAME`: `CarbonLens-Test-Workload`
   - `ALLOWED_ORIGIN`: Your Amplify URL (e.g., `https://main.d123456.amplifyapp.com`)
7. Copy the generated **Function URL** (e.g., `https://abcdefg12345.lambda-url.eu-north-1.on.aws/`).
8. In AWS Amplify Console:
   - Go to your CarbonLens app -> **Environment variables**.
   - Add `VITE_API_BASE_URL` = `https://abcdefg12345.lambda-url.eu-north-1.on.aws`.
   - Redeploy the Amplify build.

---

### Option B: AWS SAM / CloudFormation Deployment

If you have the AWS CLI / SAM CLI installed:

```bash
cd server
sam build -t deploy/template.yaml
sam deploy --guided
```

---

## 4. Local Testing & Verification

1. Start the local backend:
   ```bash
   npm run server
   ```
   Outputs:
   ```
   [CarbonLens Backend] Server running at http://127.0.0.1:3001
   [CarbonLens Backend] Metrics endpoint: http://127.0.0.1:3001/api/aws/ec2/metrics
   ```

2. Start the Vite development frontend in another terminal:
   ```bash
   npm run dev
   ```
   Vite proxies `/api/aws/ec2/metrics` to `http://127.0.0.1:3001` seamlessly.
