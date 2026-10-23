
/**
 * CarbonLens: Fetch live EC2 CloudWatch metrics through Lambda.
 * No AWS credentials are stored in browser code.
 */

const API_TIMEOUT_MS = 8000;
const DEFAULT_LAMBDA_URL =
  "https://ckgxkvs7bd4i5qigdkgmqlvrem0jvlfd.lambda-url.eu-north-1.on.aws";

function resolveEndpointUrl(params = {}) {
  const envBase = (import.meta.env.VITE_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  const query = new URLSearchParams();

  if (params.hours) query.set("hours", String(params.hours));
  if (params.period) query.set("period", String(params.period));
  if (params.instanceId) query.set("instanceId", String(params.instanceId));
  if (params.region) query.set("region", String(params.region));

  const queryString = query.toString() ? `?${query.toString()}` : "";

  // In local development, use Vite proxy (/api) to route server-side to Lambda
  // This circumvents local browser CORS issues on localhost:5173 / localhost:5174
  if (import.meta.env.DEV && !import.meta.env.VITE_DIRECT_API) {
    return `/api/aws/ec2/metrics${queryString}`;
  }

  // In production, call the actual Lambda Function URL directly
  const base = envBase || DEFAULT_LAMBDA_URL;

  if (
    base.endsWith("/api/aws/ec2/metrics") ||
    base.endsWith("/metrics")
  ) {
    return `${base}${queryString}`;
  }

  return `${base}/api/aws/ec2/metrics${queryString}`;
}

export async function fetchEc2CpuMetrics(options = {}) {
  const url = resolveEndpointUrl(options);

  // Safe diagnostic: shows the exact URL in the browser console without secrets
  console.log("[CarbonLens] AWS metrics request URL:", url);

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT_MS);

  const abortHandler = () => controller.abort();

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error("Metrics request was cancelled.");
    }

    options.signal.addEventListener("abort", abortHandler, { once: true });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    console.log("[CarbonLens] AWS metrics HTTP status:", response.status);
    console.log("[CarbonLens] AWS metrics payload received:", {
      instanceId: data?.instanceId,
      metricName: data?.metricName,
      datapointsCount: Array.isArray(data?.datapoints) ? data.datapoints.length : 0,
      latestValue: data?.latestValue,
      source: data?.source,
    });

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          data?.error ||
          `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (!data || typeof data !== "object") {
      throw new Error("The metrics backend returned an invalid response.");
    }

    return {
      instanceId: data.instanceId || "i-03ab13867b4511011",
      instanceName: data.instanceName || "CarbonLens-Test-Workload",
      instanceType: data.instanceType || "t3.micro",
      region: data.region || "eu-north-1",
      metricName: data.metricName || "CPUUtilization",
      unit: data.unit || "Percent",
      periodSeconds: data.periodSeconds || 300,
      windowHours: data.windowHours || options.hours || 2,
      latestValue:
        typeof data.latestValue === "number" ? data.latestValue : null,
      latestTimestamp: data.latestTimestamp || null,
      hasDatapoints:
        Boolean(data.hasDatapoints) &&
        Array.isArray(data.datapoints) &&
        data.datapoints.length > 0,
      datapoints: Array.isArray(data.datapoints) ? data.datapoints : [],
      source: data.source || "AWS CloudWatch",
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      isStale: Boolean(data.isStale),
      staleReason: data.staleReason || null,
      message: data.message || null,
    };
  } catch (err) {
    console.error("[CarbonLens] Metrics request failed:", {
      url,
      message: err.message,
      isTimeout: timedOut || err.name === "AbortError",
      isNetworkError: err instanceof TypeError,
      status: err.status,
    });

    if (timedOut || err.name === "AbortError") {
      const error = new Error(
        "Metrics request timed out. Check the Lambda endpoint and network."
      );
      error.isTimeout = true;
      throw error;
    }

    if (err instanceof TypeError) {
      const error = new Error(
        "Unable to reach the metrics backend. Check the endpoint and CORS settings."
      );
      error.isNetworkError = true;
      throw error;
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);

    if (options.signal) {
      options.signal.removeEventListener("abort", abortHandler);
    }
  }
}

