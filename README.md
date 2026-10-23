# CarbonLens - Cloud Carbon Intelligence & AWS Infrastructure Integration

CarbonLens is a cloud sustainability intelligence platform that combines workload demand, grid carbon intensity, renewable energy mix, and lifecycle overhead to optimize compute placement and scheduling.

Now connected directly to **Real AWS Infrastructure via Amazon CloudWatch**.

---

## 🚀 Live AWS Infrastructure Integration

CarbonLens tracks real-time compute telemetry from your live EC2 instance:

- **Instance Name**: `CarbonLens-Test-Workload`
- **Instance ID**: `i-03ab13867b4511011`
- **Region**: `eu-north-1` (Stockholm, Europe)
- **Instance Type**: `t3.micro`
- **Operating System**: Amazon Linux 2023
- **Telemetry Source**: Amazon CloudWatch (`AWS/EC2` `CPUUtilization`, 300-second aggregation periods)

### Architecture

```
CarbonLens React Frontend (Amplify)
       │
       ▼ (HTTPS / CORS)
Secure Backend API (AWS Lambda Function URL / Node.js Server)
       │
       ▼ (IAM Least-Privilege Execution Role)
Amazon CloudWatch API (AWS SDK v3 - GetMetricStatistics)
       │
       ▼
Real EC2 CPU Telemetry (i-03ab13867b4511011)
```

---

## 🛠️ Local Development Workflow

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the CloudWatch Backend Server
Starts the local API bridge at `http://127.0.0.1:3001`:
```bash
npm run server
```

The server provides:
- `GET /api/aws/ec2/metrics` (EC2 CPU metrics from CloudWatch)
- `GET /api/health` (Service health check)

*Note: For local CloudWatch calls, the server uses standard AWS credentials from your environment (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or `~/.aws/credentials`). If credentials are not present locally, safe diagnostics are returned without leaking secrets or crashing.*

### 3. Start the Frontend
In a separate terminal:
```bash
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:3001` automatically without CORS restrictions or hardcoding ports.

### 4. Run Automated Tests
```bash
npm test
```
Runs the full suite of unit and integration tests covering parameter validation, chronological sorting, error handling, staleness detection, and Lambda routing.

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Production Deployment

### Backend: AWS Lambda Function URL
See detailed setup instructions and minimal IAM policy in [`server/deploy/README.md`](file:///server/deploy/README.md).

- **Execution Role Policy**: `cloudwatch:GetMetricStatistics` on `*` and basic CloudWatch logging.
- **Estimated Cost**: **$0.00** (covered under AWS Free Tier).
- **Endpoint**: AWS Lambda Function URL with CORS enabled.

### Frontend: AWS Amplify
In the AWS Amplify Console:
1. Navigate to **Environment variables**.
2. Add `VITE_API_BASE_URL` set to your deployed Lambda Function URL (e.g. `https://<id>.lambda-url.eu-north-1.on.aws`).
3. Trigger a redeploy.

---

## 🔒 Security Best Practices
- **No Client Secrets**: AWS access keys and secrets are never present in the React bundle or `VITE_*` variables.
- **Least Privilege**: The backend execution role only has read access to CloudWatch metric statistics.
- **Origin Protection**: Backend enforces CORS headers matching the Amplify frontend origin.
- **Data Integrity**: Never returns fabricated mock data under a "Connected" status; honest error states are surfaced if the backend is unreachable.
