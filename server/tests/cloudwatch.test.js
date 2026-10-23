import test from "node:test";
import assert from "node:assert/strict";
import {
  validateQueryParams,
  ValidationError,
  getEc2CpuMetrics,
} from "../cloudwatchService.js";
import { handler } from "../lambda.js";

test("validateQueryParams with defaults", () => {
  const result = validateQueryParams({});
  assert.equal(result.instanceId, "i-03ab13867b4511011");
  assert.equal(result.region, "eu-north-1");
  assert.equal(result.hours, 2);
  assert.equal(result.period, 300);
});

test("validateQueryParams accepts valid custom inputs", () => {
  const result = validateQueryParams({
    instanceId: "i-0123456789abcdef0",
    region: "us-east-1",
    hours: "3",
    period: "60",
  });
  assert.equal(result.instanceId, "i-0123456789abcdef0");
  assert.equal(result.region, "us-east-1");
  assert.equal(result.hours, 3);
  assert.equal(result.period, 60);
});

test("validateQueryParams rejects invalid instanceId", () => {
  assert.throws(
    () => validateQueryParams({ instanceId: "bad-id-123" }),
    (err) => err instanceof ValidationError && err.statusCode === 400
  );
});

test("validateQueryParams rejects invalid hours", () => {
  assert.throws(
    () => validateQueryParams({ hours: "0" }),
    (err) => err instanceof ValidationError
  );
  assert.throws(
    () => validateQueryParams({ hours: "50" }),
    (err) => err instanceof ValidationError
  );
});

test("validateQueryParams rejects invalid period", () => {
  assert.throws(
    () => validateQueryParams({ period: "123" }),
    (err) => err instanceof ValidationError
  );
});

test("getEc2CpuMetrics sorts unordered datapoints and returns latest metrics", async () => {
  const now = Date.now();
  const mockDatapoints = [
    {
      Timestamp: new Date(now - 10 * 60 * 1000), // 10 mins ago
      Average: 0.174,
      Maximum: 0.22,
      Minimum: 0.15,
      Unit: "Percent",
    },
    {
      Timestamp: new Date(now - 20 * 60 * 1000), // 20 mins ago (earlier)
      Average: 0.165,
      Maximum: 0.19,
      Minimum: 0.14,
      Unit: "Percent",
    },
    {
      Timestamp: new Date(now - 5 * 60 * 1000), // 5 mins ago (latest)
      Average: 0.188,
      Maximum: 0.25,
      Minimum: 0.16,
      Unit: "Percent",
    },
  ];

  const mockClient = {
    send: async () => ({
      Datapoints: mockDatapoints,
      Label: "CPUUtilization",
    }),
  };

  const result = await getEc2CpuMetrics({
    client: mockClient,
    instanceId: "i-03ab13867b4511011",
    region: "eu-north-1",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.data.instanceId, "i-03ab13867b4511011");
  assert.equal(result.data.region, "eu-north-1");
  assert.equal(result.data.metricName, "CPUUtilization");
  assert.equal(result.data.hasDatapoints, true);
  assert.equal(result.data.latestValue, 0.19); // 0.188 rounded to 2 decimals
  assert.equal(result.data.source, "AWS CloudWatch");
  assert.equal(result.data.isStale, false);

  // Verify chronological sorting (earliest to latest)
  assert.equal(result.data.datapoints.length, 3);
  assert.equal(result.data.datapoints[0].average, 0.17); // 20m ago
  assert.equal(result.data.datapoints[1].average, 0.17); // 10m ago
  assert.equal(result.data.datapoints[2].average, 0.19); // 5m ago
});

test("getEc2CpuMetrics handles empty datapoints safely", async () => {
  const mockClient = {
    send: async () => ({
      Datapoints: [],
      Label: "CPUUtilization",
    }),
  };

  const result = await getEc2CpuMetrics({
    client: mockClient,
    instanceId: "i-03ab13867b4511011",
    region: "eu-north-1",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.data.hasDatapoints, false);
  assert.equal(result.data.latestValue, null);
  assert.equal(result.data.latestTimestamp, null);
  assert.equal(result.data.isStale, true);
  assert.ok(result.data.message.includes("No CloudWatch CPU metrics"));
});

test("getEc2CpuMetrics handles AWS AccessDenied safely without leaking secrets", async () => {
  const mockClient = {
    send: async () => {
      const err = new Error("User arn:aws:iam::123:user/test is not authorized");
      err.name = "AccessDeniedException";
      throw err;
    },
  };

  const result = await getEc2CpuMetrics({ client: mockClient });
  assert.equal(result.statusCode, 403);
  assert.equal(result.data.error, "Forbidden");
  assert.ok(result.data.message.includes("cloudwatch:GetMetricStatistics"));
  // Ensure sensitive ARN or credentials are not in client response
  assert.ok(!JSON.stringify(result.data).includes("123:user/test"));
});

test("getEc2CpuMetrics handles missing credentials safely", async () => {
  const mockClient = {
    send: async () => {
      const err = new Error("Could not load credentials from any providers");
      err.name = "CredentialsProviderError";
      throw err;
    },
  };

  const result = await getEc2CpuMetrics({ client: mockClient });
  assert.equal(result.statusCode, 502);
  assert.equal(result.data.error, "AWS Authentication Error");
  assert.ok(result.data.message.includes("AWS credentials or IAM execution role not configured"));
});

test("Lambda handler handles OPTIONS preflight request", async () => {
  const event = {
    httpMethod: "OPTIONS",
    headers: { origin: "https://main.d123456.amplifyapp.com" },
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 204);
  assert.ok(response.headers["Access-Control-Allow-Origin"]);
  assert.ok(response.headers["Access-Control-Allow-Methods"].includes("GET"));
});

test("Lambda handler handles health check route", async () => {
  const event = {
    httpMethod: "GET",
    path: "/health",
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, "healthy");
});

test("Lambda handler rejects POST request with 405 Method Not Allowed", async () => {
  const event = {
    httpMethod: "POST",
    path: "/api/aws/ec2/metrics",
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 405);
  const body = JSON.parse(response.body);
  assert.equal(body.error, "Method Not Allowed");
});
