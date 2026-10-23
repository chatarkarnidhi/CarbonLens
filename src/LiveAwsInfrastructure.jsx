import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  Cpu,
  Info,
  RefreshCw,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchEc2CpuMetrics } from "./services/awsMetricsService";
import "./LiveAwsInfrastructure.css";

const REFRESH_INTERVAL_MS = 60000; // 60 seconds auto-refresh

function formatTime(isoString) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes === 1) return "1 min ago";
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
}

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="aws-chart-tooltip">
        <p className="aws-tooltip-time">{label}</p>
        <div className="aws-tooltip-row">
          <span className="aws-tooltip-dot" />
          <span>Average CPU:</span>
          <strong>{data.average.toFixed(2)}%</strong>
        </div>
        {data.maximum !== undefined && (
          <div className="aws-tooltip-sub">
            <span>Peak: {data.maximum.toFixed(2)}%</span>
            {data.minimum !== undefined && (
              <span> · Min: {data.minimum.toFixed(2)}%</span>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function LiveAwsInfrastructure() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Prevent overlapping concurrent requests
  const isRequestInFlight = useRef(false);
  const isMounted = useRef(true);
  const hasDataRef = useRef(false);

  const loadMetrics = useCallback(async (isManualRefresh = false) => {
    if (isRequestInFlight.current) {
      return;
    }
    isRequestInFlight.current = true;

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading((prev) => (!hasDataRef.current && !prev ? true : prev));
    }

    try {
      const response = await fetchEc2CpuMetrics({ hours: 2, period: 300 });
      if (!isMounted.current) return;

      setData(response);
      hasDataRef.current = true;
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isMounted.current) return;
      console.error("[CarbonLens Live AWS] Metrics fetch error:", err);
      setError({
        message: err.message || "Failed to connect to AWS CloudWatch backend.",
        status: err.status,
        isTimeout: err.isTimeout,
        isNetworkError: err.isNetworkError,
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isRequestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadMetrics();

    const intervalId = setInterval(() => {
      loadMetrics(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [loadMetrics]);

  // Chart data formatting
  const chartData = (data?.datapoints || []).map((dp) => ({
    time: formatTime(dp.timestamp),
    average: dp.average,
    maximum: dp.maximum,
    minimum: dp.minimum,
  }));

  return (
    <section className="live-aws-section">
      <div className="live-aws-header">
        <div className="live-aws-title-area">
          <div className="live-aws-icon-wrapper">
            <Server size={22} />
          </div>
          <div>
            <div className="live-aws-tag-row">
              <span className="live-aws-eyebrow">AWS CLOUD METRICS</span>
              <span className="live-aws-source-badge">
                <Cloud size={11} /> AWS CloudWatch
              </span>
            </div>
            <h3 className="live-aws-heading">Live AWS Infrastructure</h3>
          </div>
        </div>

        <div className="live-aws-header-actions">
          {/* Connection Status Badge */}
          <div
            className={`live-aws-status-pill ${
              loading && !data
                ? "status-loading"
                : error
                ? "status-error"
                : data?.isStale
                ? "status-stale"
                : "status-connected"
            }`}
          >
            <span className="live-aws-pulse-dot" />
            <span>
              {loading && !data
                ? "Connecting..."
                : error
                ? "Connection Error"
                : data?.isStale
                ? "Connected (Stale Data)"
                : "Connected to CloudWatch"}
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            className={`live-aws-refresh-btn ${refreshing ? "is-spinning" : ""}`}
            onClick={() => loadMetrics(true)}
            disabled={loading || refreshing}
            title="Refresh CloudWatch metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="live-aws-error-banner">
          <div className="live-aws-error-icon">
            <ShieldAlert size={20} />
          </div>
          <div className="live-aws-error-content">
            <h4>AWS CloudWatch Connection Error</h4>
            <p className="live-aws-error-msg">{error.message}</p>
            <div className="live-aws-error-tip">
              <Info size={13} />
              <span>
                {error.isNetworkError
                  ? "Backend server is not running locally. Run 'npm run server' in a terminal to start the CloudWatch bridge."
                  : error.status === 403
                  ? "IAM permission denied. Ensure the execution role has 'cloudwatch:GetMetricStatistics' on AWS/EC2."
                  : "Verify that the backend service is deployed or local server is running on port 3001."}
              </span>
            </div>
          </div>
          <button
            className="live-aws-retry-btn"
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* STALE DATA WARNING */}
      {!error && data?.isStale && data?.hasDatapoints && (
        <div className="live-aws-stale-banner">
          <AlertTriangle size={16} />
          <div>
            <strong>Stale CloudWatch Metrics:</strong>{" "}
            <span>
              {data.staleReason ||
                "Latest datapoint is older than 15 minutes. EC2 basic monitoring aggregates metrics every 5 minutes."}
            </span>
          </div>
        </div>
      )}

      {/* METRICS BODY (Always visible to keep infrastructure telemetry visible even on transient errors) */}
      <div className="live-aws-body">
        {/* TOP METRICS STRIP */}
        <div className="live-aws-card-grid">
          {/* Instance Identity */}
          <div className="live-aws-metric-card">
            <div className="live-card-top">
              <span className="live-card-label">TARGET INSTANCE</span>
              <span className="live-card-badge">EC2 Running</span>
            </div>
            <div className="live-instance-name">
              {data?.instanceName || "CarbonLens-Test-Workload"}
            </div>
            <div className="live-instance-sub">
              <code>{data?.instanceId || "i-03ab13867b4511011"}</code>
              <span className="live-dot-sep">·</span>
              <span>{data?.instanceType || "t3.micro"}</span>
            </div>
          </div>

          {/* AWS Region */}
          <div className="live-aws-metric-card">
            <div className="live-card-top">
              <span className="live-card-label">AWS REGION</span>
              <span className="live-card-badge region-badge">Nordic</span>
            </div>
            <div className="live-region-name">
              {data?.region || "eu-north-1"}
            </div>
            <div className="live-instance-sub">
              <span>Stockholm (Europe)</span>
              <span className="live-dot-sep">·</span>
              <span>Low-carbon grid</span>
            </div>
          </div>

          {/* Current CPU Utilization */}
          <div className="live-aws-metric-card highlight">
            <div className="live-card-top">
              <span className="live-card-label">LIVE CPU UTILIZATION</span>
              <Cpu size={14} className="live-metric-icon" />
            </div>
            <div className="live-cpu-value">
              {data && typeof data.latestValue === "number" ? (
                <>
                  <strong>{data.latestValue.toFixed(2)}</strong>
                  <span className="live-unit">%</span>
                </>
              ) : (
                <span className="live-no-val">--</span>
              )}
            </div>
            <div className="live-instance-sub">
              {data?.latestTimestamp ? (
                <>
                  <Clock size={11} />
                  <span>
                    {formatTime(data.latestTimestamp)} (
                    {formatRelativeTime(data.latestTimestamp)})
                  </span>
                </>
              ) : loading && !data ? (
                <span>Connecting to CloudWatch...</span>
              ) : error ? (
                <span>Connection paused</span>
              ) : (
                <span>No recent activity</span>
              )}
            </div>
          </div>

          {/* Pipeline Status */}
          <div className="live-aws-metric-card">
            <div className="live-card-top">
              <span className="live-card-label">METRIC RESOLUTION</span>
              <Zap size={14} className="live-metric-icon" />
            </div>
            <div className="live-resolution-val">
              <strong>{data?.periodSeconds ? data.periodSeconds / 60 : 5}m</strong>
              <span className="live-unit">Period</span>
            </div>
            <div className="live-instance-sub">
              <span>{data?.windowHours || 2}h history</span>
              <span className="live-dot-sep">·</span>
              <span>{data?.datapoints?.length || 0} points</span>
            </div>
          </div>
        </div>

        {/* HISTORICAL CPU CHART OR NO DATA / ERROR STATE */}
        <div className="live-aws-chart-container">
          <div className="live-chart-header">
            <div>
              <h4 className="live-chart-title">
                Real-Time CloudWatch CPU Utilization Timeline
              </h4>
              <p className="live-chart-desc">
                Metric: <code>AWS/EC2 CPUUtilization</code> (Average) · Window: Last{" "}
                {data?.windowHours || 2} hours
              </p>
            </div>

            <div className="live-chart-legend">
              <span className="legend-indicator" />
              <span>CPU % (5-min average)</span>
            </div>
          </div>

          {data?.hasDatapoints && chartData.length > 0 ? (
            <div className="live-chart-render-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="cpuGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#55c284"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="#55c284"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(145, 181, 162, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#64796f"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(145, 181, 162, 0.15)" }}
                  />
                  <YAxis
                    stroke="#64796f"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, (dataMax) => Math.max(1, Math.ceil(dataMax * 1.5))]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="#66db92"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : data && (!data.hasDatapoints || chartData.length === 0) ? (
            /* NO DATA STATE */
            <div className="live-aws-no-data-state">
              <Info size={28} />
              <div className="no-data-text">
                <h5>No CloudWatch Datapoints in Range</h5>
                <p>
                  {data.message ||
                    "CloudWatch has not recorded any CPU datapoints for this instance in the last 2 hours. If this instance was just started, CloudWatch basic monitoring may take 5–10 minutes to populate the first datapoints."}
                </p>
              </div>
            </div>
          ) : error && !data ? (
            /* CHART OFFLINE / ERROR STATE */
            <div className="live-aws-no-data-state">
              <AlertTriangle size={28} style={{ color: "#ff7b72" }} />
              <div className="no-data-text">
                <h5>CloudWatch Connection Offline</h5>
                <p>
                  {error.message ||
                    "Unable to stream real-time datapoints. Click Retry to re-establish connection."}
                </p>
              </div>
              <button
                className="live-aws-retry-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => loadMetrics(true)}
                disabled={refreshing}
              >
                <RefreshCw size={13} /> Retry Connection
              </button>
            </div>
          ) : (
            /* INITIAL LOADING SKELETON */
            <div className="live-aws-skeleton-card wide" />
          )}

          {/* FOOTER AUDIT BAR */}
          <div className="live-aws-footer-bar">
            <div className="live-footer-left">
              <CheckCircle2 size={13} className="live-check-icon" />
              <span>
                Authenticated via Server-Side IAM · Instance{" "}
                <code>{data?.instanceId || "i-03ab13867b4511011"}</code> in{" "}
                <code>{data?.region || "eu-north-1"}</code>
              </span>
            </div>
            <div className="live-footer-right">
              <span>
                Last API sync:{" "}
                <strong>{lastUpdated ? formatTime(lastUpdated) : (loading ? "Syncing..." : "Pending")}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
