import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { URL } from "node:url";
import { getEc2CpuMetrics } from "../cloudwatchService.js";

function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const pathname = parsedUrl.pathname;

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

      if (pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy" }));
        return;
      }

      if (pathname === "/api/aws/ec2/metrics") {
        const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
        const result = await getEc2CpuMetrics(queryParams);
        res.writeHead(result.statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.data));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

test("Integration: Local HTTP server responds to /api/health", async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "healthy");
  } finally {
    server.close();
  }
});

test("Integration: Local HTTP server returns safe response for /api/aws/ec2/metrics when AWS credentials not configured", async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/aws/ec2/metrics?instanceId=i-03ab13867b4511011&region=eu-north-1`);
    // Without active AWS credentials in test environment, it returns 502/503/403 with safe JSON error
    const data = await res.json();
    assert.ok(data.source === "AWS CloudWatch" || data.error);
    // Never leak secrets or stack traces
    assert.equal(typeof data.message, "string");
    assert.ok(!JSON.stringify(data).includes("AccessKey"));
  } finally {
    server.close();
  }
});
