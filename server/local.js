import http from "node:http";
import { URL } from "node:url";
import { getEc2CpuMetrics } from "./cloudwatchService.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Method Not Allowed",
        message: `HTTP method ${req.method} is not supported. Use GET.`,
      })
    );
    return;
  }

  // Health check
  if (pathname === "/health" || pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "CarbonLens AWS Integration Local Server",
        port: PORT,
        time: new Date().toISOString(),
      })
    );
    return;
  }

  // EC2 CloudWatch metrics endpoint
  if (
    pathname === "/api/aws/ec2/metrics" ||
    pathname === "/metrics"
  ) {
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

    try {
      const result = await getEc2CpuMetrics(queryParams);
      res.writeHead(result.statusCode, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      console.error("[Local Server] Failed to process request:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to process metrics request.",
          source: "AWS CloudWatch",
          fetchedAt: new Date().toISOString(),
        })
      );
    }
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: "Not Found",
      message: `Endpoint ${pathname} not found. Available endpoints: GET /api/aws/ec2/metrics, GET /api/health`,
    })
  );
});

server.listen(PORT, HOST, () => {
  console.log(`[CarbonLens Backend] Server running at http://${HOST}:${PORT}`);
  console.log(
    `[CarbonLens Backend] Metrics endpoint: http://${HOST}:${PORT}/api/aws/ec2/metrics`
  );
  console.log(`[CarbonLens Backend] Health endpoint:  http://${HOST}:${PORT}/api/health`);
});

process.on("SIGINT", () => {
  console.log("\n[CarbonLens Backend] Shutting down...");
  server.close(() => process.exit(0));
});
