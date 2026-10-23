import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";

export const DEFAULT_INSTANCE_ID =
  process.env.EC2_INSTANCE_ID || "i-03ab13867b4511011";
export const DEFAULT_INSTANCE_NAME =
  process.env.EC2_INSTANCE_NAME || "CarbonLens-Test-Workload";
export const DEFAULT_INSTANCE_TYPE =
  process.env.EC2_INSTANCE_TYPE || "t3.micro";
export const DEFAULT_REGION =
  process.env.AWS_REGION || "eu-north-1";
export const METRIC_NAME = "CPUUtilization";
export const METRIC_NAMESPACE = "AWS/EC2";
export const DEFAULT_PERIOD_SECONDS = 300; // 5 minutes standard basic monitoring
export const DEFAULT_HOURS = 2; // 2 hours historical window

// Allowed regions whitelist to constrain inputs safely
const VALID_REGION_REGEX = /^[a-z]{2}(?:-[a-z]+)+-\d+$/;
const VALID_INSTANCE_REGEX = /^i-[0-9a-f]{8,17}$/;
const ALLOWED_PERIODS = [60, 300, 900, 1800, 3600];

// Cache client instances per region to optimize performance and prevent leakages
const clientCache = new Map();

function getCloudWatchClient(region) {
  if (!clientCache.has(region)) {
    clientCache.set(
      region,
      new CloudWatchClient({
        region,
        maxAttempts: 3,
      })
    );
  }
  return clientCache.get(region);
}

/**
 * Validates and sanitizes query input parameters
 */
export function validateQueryParams(params = {}) {
  const instanceId = (params.instanceId || DEFAULT_INSTANCE_ID).trim();
  if (!VALID_INSTANCE_REGEX.test(instanceId)) {
    throw new ValidationError(
      `Invalid instance ID format. Expected format like 'i-03ab13867b4511011'.`
    );
  }

  const region = (params.region || DEFAULT_REGION).trim();
  if (!VALID_REGION_REGEX.test(region)) {
    throw new ValidationError(
      `Invalid AWS region format. Expected format like 'eu-north-1'.`
    );
  }

  const rawHours = params.hours !== undefined ? Number(params.hours) : DEFAULT_HOURS;
  if (isNaN(rawHours) || rawHours < 1 || rawHours > 24) {
    throw new ValidationError(
      `Query parameter 'hours' must be an integer between 1 and 24.`
    );
  }
  const hours = Math.round(rawHours);

  const rawPeriod = params.period !== undefined ? Number(params.period) : DEFAULT_PERIOD_SECONDS;
  if (!ALLOWED_PERIODS.includes(rawPeriod)) {
    throw new ValidationError(
      `Query parameter 'period' must be one of [${ALLOWED_PERIODS.join(", ")}] seconds.`
    );
  }
  const period = rawPeriod;

  return { instanceId, region, hours, period };
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

/**
 * Fetches real EC2 CPUUtilization metrics from AWS CloudWatch
 *
 * @param {Object} options
 * @param {string} [options.instanceId]
 * @param {string} [options.region]
 * @param {number} [options.hours]
 * @param {number} [options.period]
 * @param {CloudWatchClient} [options.client] - Optional injectable client for testing
 * @returns {Promise<Object>}
 */
export async function getEc2CpuMetrics(options = {}) {
  const { instanceId, region, hours, period } = validateQueryParams(options);

  const client = options.client || getCloudWatchClient(region);

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const command = new GetMetricStatisticsCommand({
    Namespace: METRIC_NAMESPACE,
    MetricName: METRIC_NAME,
    Dimensions: [
      {
        Name: "InstanceId",
        Value: instanceId,
      },
    ],
    StartTime: startTime,
    EndTime: endTime,
    Period: period,
    Statistics: ["Average", "Maximum", "Minimum"],
    Unit: "Percent",
  });

  // Safe timeout handling (8 seconds)
  const timeoutMs = 8000;
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const err = new Error("AWS CloudWatch request timed out after 8 seconds");
      err.name = "TimeoutError";
      reject(err);
    }, timeoutMs);
    if (timer.unref) timer.unref();
  });

  try {
    const response = await Promise.race([
      client.send(command),
      timeoutPromise,
    ]);

    const rawDatapoints = Array.isArray(response?.Datapoints)
      ? response.Datapoints
      : [];

    // Chronologically sort datapoints (CloudWatch returns datapoints unordered)
    const sortedDatapoints = [...rawDatapoints].sort(
      (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
    );

    const formattedDatapoints = sortedDatapoints.map((dp) => ({
      timestamp:
        dp.Timestamp instanceof Date
          ? dp.Timestamp.toISOString()
          : new Date(dp.Timestamp).toISOString(),
      average: Number((dp.Average ?? 0).toFixed(2)),
      maximum:
        dp.Maximum !== undefined ? Number(dp.Maximum.toFixed(2)) : undefined,
      minimum:
        dp.Minimum !== undefined ? Number(dp.Minimum.toFixed(2)) : undefined,
      unit: dp.Unit || "Percent",
    }));

    const latest = formattedDatapoints[formattedDatapoints.length - 1] || null;
    const latestValue = latest ? latest.average : null;
    const latestTimestamp = latest ? latest.timestamp : null;

    // Evaluate data staleness
    // Basic EC2 monitoring runs every 300 seconds (5 min) with ~2-5 min propagation delay.
    // If the latest point is older than 15 minutes (or 2.5 periods), flag as stale.
    const staleThresholdMs = Math.max(period * 2.5 * 1000, 15 * 60 * 1000);
    const now = Date.now();
    let isStale = false;
    let staleReason = null;

    if (formattedDatapoints.length === 0) {
      isStale = true;
      staleReason = "No metric datapoints returned in the requested time window.";
    } else if (latestTimestamp) {
      const ageMs = now - new Date(latestTimestamp).getTime();
      if (ageMs > staleThresholdMs) {
        isStale = true;
        const ageMinutes = Math.round(ageMs / (60 * 1000));
        staleReason = `Latest datapoint is ${ageMinutes} minutes old (expected within ~10-15 minutes for basic monitoring).`;
      }
    }

    return {
      statusCode: 200,
      data: {
        instanceId,
        instanceName: DEFAULT_INSTANCE_NAME,
        instanceType: DEFAULT_INSTANCE_TYPE,
        region,
        metricName: METRIC_NAME,
        unit: "Percent",
        periodSeconds: period,
        windowHours: hours,
        hasDatapoints: formattedDatapoints.length > 0,
        latestValue,
        latestTimestamp,
        datapoints: formattedDatapoints,
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
        isStale,
        staleReason,
        message:
          formattedDatapoints.length === 0
            ? "No CloudWatch CPU metrics found for this instance in the requested window. The instance may be newly started or inactive."
            : null,
      },
    };
  } catch (error) {
    return handleAwsError(error);
  }
}

/**
 * Sanitizes and maps AWS SDK and network errors into safe client responses
 */
function handleAwsError(error) {
  const errorName = error.name || error.code || "UnknownError";

  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      data: {
        error: "Bad Request",
        message: error.message,
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  if (errorName === "TimeoutError") {
    return {
      statusCode: 504,
      data: {
        error: "Gateway Timeout",
        message: "The request to AWS CloudWatch timed out. Please try again.",
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  if (
    errorName === "AccessDeniedException" ||
    errorName === "UnauthorizedOperation"
  ) {
    return {
      statusCode: 403,
      data: {
        error: "Forbidden",
        message:
          "AWS IAM permissions check failed. The execution role requires 'cloudwatch:GetMetricStatistics' on AWS/EC2.",
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  if (
    errorName === "CredentialsProviderError" ||
    errorName === "UnrecognizedClientException" ||
    errorName === "InvalidSignatureException"
  ) {
    return {
      statusCode: 502,
      data: {
        error: "AWS Authentication Error",
        message:
          "AWS credentials or IAM execution role not configured or expired on the backend.",
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  if (errorName === "ResourceNotFoundException") {
    return {
      statusCode: 404,
      data: {
        error: "Not Found",
        message: "Specified EC2 instance or metric was not found in this region.",
        source: "AWS CloudWatch",
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  // Generic fallback: never expose stack traces or account details
  return {
    statusCode: 502,
    data: {
      error: "CloudWatch Integration Error",
      message:
        "Unable to retrieve CloudWatch metrics from AWS. Check backend connectivity and AWS region settings.",
      source: "AWS CloudWatch",
      fetchedAt: new Date().toISOString(),
    },
  };
}
