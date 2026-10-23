import { getEc2CpuMetrics } from "./cloudwatchService.js";

/**
 * Resolves CORS headers safely based on ALLOWED_ORIGIN or the incoming request origin
 */
function getCorsHeaders(event) {
  // If AWS Lambda Function URL has built-in CORS enabled and you want Function URL to handle it,
  // set Lambda environment variable DISABLE_LAMBDA_CORS=true to prevent duplicate headers.
  if (process.env.DISABLE_LAMBDA_CORS === "true") {
    return {};
  }

  const allowedOriginEnv = process.env.ALLOWED_ORIGIN;
  const requestOrigin =
    event?.headers?.origin ||
    event?.headers?.Origin ||
    event?.headers?.["x-forwarded-host"] ||
    "*";

  let allowOrigin = "*";
  if (allowedOriginEnv && allowedOriginEnv.trim() !== "*") {
    const origins = allowedOriginEnv.split(",").map((o) => o.trim());
    if (origins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      allowOrigin = origins[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * AWS Lambda handler compatible with:
 * - AWS Lambda Function URL (direct HTTPS endpoint)
 * - AWS API Gateway HTTP API (payload format 2.0)
 * - AWS API Gateway REST API (payload format 1.0)
 */
export async function handler(event) {
  const corsHeaders = getCorsHeaders(event);

  // Determine HTTP method
  const httpMethod =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    event?.method ||
    "GET";

  // Handle CORS preflight OPTIONS request
  if (httpMethod.toUpperCase() === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (httpMethod.toUpperCase() !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: "Method Not Allowed",
        message: `HTTP method ${httpMethod} is not supported. Use GET.`,
      }),
    };
  }

  // Determine path
  const path =
    event?.rawPath ||
    event?.path ||
    event?.requestContext?.http?.path ||
    "/";

  // Health check route
  if (path === "/health" || path === "/api/health") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...corsHeaders,
      },
      body: JSON.stringify({
        status: "healthy",
        service: "CarbonLens AWS Integration Lambda",
        region: process.env.AWS_REGION || "eu-north-1",
        time: new Date().toISOString(),
      }),
    };
  }

  // Extract query parameters safely
  const queryParams = event?.queryStringParameters || {};

  try {
    const result = await getEc2CpuMetrics(queryParams);

    return {
      statusCode: result.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
      body: JSON.stringify(result.data),
    };
  } catch (unexpectedError) {
    console.error("[Lambda] Unexpected error processing request:", unexpectedError);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing the request.",
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      }),
    };
  }
}
