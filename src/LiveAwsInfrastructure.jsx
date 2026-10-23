import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  Cpu,
  Globe,
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

const EC2_INSTANCES = [
  {
    key: "stockholm",
    instanceId: "i-03ab13867b4511011",
    name: "CarbonLens-Test-Workload",
    region: "eu-north-1",
    regionName: "Stockholm (Europe)",
    regionShort: "Stockholm",
    regionBadge: "Nordic",
    instanceType: "t3.micro",
    roleLabel: "Primary Workload",
    roleTag: "Primary",
    gridLabel: "Nordic Grid",
    benchmarkIntensity: 74, // gCO2e/kWh - CarbonLens regional benchmark (estimate)
    renewableShare: 91, // % - CarbonLens regional benchmark (estimate)
  },
  {
    key: "frankfurt",
    instanceId: "i-015a45d810c5c5104",
    name: "CarbonLens-Frankfurt-Test",
    region: "eu-central-1",
    regionName: "Frankfurt (Europe)",
    regionShort: "Frankfurt",
    regionBadge: "Central EU",
    instanceType: "t3.micro",
    roleLabel: "Comparison Workload",
    roleTag: "Comparison",
    gridLabel: "German Grid",
    benchmarkIntensity: 182, // gCO2e/kWh - CarbonLens regional benchmark (estimate)
    renewableShare: 68, // % - CarbonLens regional benchmark (estimate)
  },
];

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
  const [instances, setInstances] = useState({
    stockholm: {
      data: null,
      loading: true,
      refreshing: false,
      error: null,
      lastUpdated: null,
    },
    frankfurt: {
      data: null,
      loading: true,
      refreshing: false,
      error: null,
      lastUpdated: null,
    },
  });

  const [activeChartKey, setActiveChartKey] = useState("stockholm");

  const inFlightRef = useRef({ stockholm: false, frankfurt: false });
  const isMountedRef = useRef(true);

  const loadInstanceMetrics = useCallback(
    async (instConfig, isManual = false) => {
      const key = instConfig.key;
      if (inFlightRef.current[key]) return;
      inFlightRef.current[key] = true;

      setInstances((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: prev[key].data ? false : true,
          refreshing: isManual ? true : false,
        },
      }));

      try {
        const response = await fetchEc2CpuMetrics({
          instanceId: instConfig.instanceId,
          region: instConfig.region,
          instanceName: instConfig.name,
          hours: 2,
          period: 300,
        });

        if (!isMountedRef.current) return;

        setInstances((prev) => ({
          ...prev,
          [key]: {
            data: response,
            loading: false,
            refreshing: false,
            error: null,
            lastUpdated: new Date(),
          },
        }));
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error(
          `[CarbonLens Live AWS] Metrics fetch error for ${key}:`,
          err
        );
        setInstances((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            refreshing: false,
            error: {
              message:
                err.message ||
                `Failed to connect to ${instConfig.regionName} instance.`,
              status: err.status,
              isTimeout: err.isTimeout,
              isNetworkError: err.isNetworkError,
            },
          },
        }));
      } finally {
        inFlightRef.current[key] = false;
      }
    },
    []
  );

  const refreshAll = useCallback(
    async (isManual = false) => {
      await Promise.allSettled(
        EC2_INSTANCES.map((inst) => loadInstanceMetrics(inst, isManual))
      );
    },
    [loadInstanceMetrics]
  );

  useEffect(() => {
    isMountedRef.current = true;
    refreshAll(false);

    const intervalId = setInterval(() => {
      refreshAll(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [refreshAll]);

  // Overall status evaluation
  const stockholmState = instances.stockholm;
  const frankfurtState = instances.frankfurt;
  const anyLoading = stockholmState.loading || frankfurtState.loading;
  const anyRefreshing =
    stockholmState.refreshing || frankfurtState.refreshing;
  const bothConnected =
    Boolean(stockholmState.data) && Boolean(frankfurtState.data);
  const anyConnected =
    Boolean(stockholmState.data) || Boolean(frankfurtState.data);

  // Active instance chart telemetry
  const activeInst =
    EC2_INSTANCES.find((i) => i.key === activeChartKey) || EC2_INSTANCES[0];
  const activeState = instances[activeChartKey] || instances.stockholm;
  const activeData = activeState.data;

  const chartData = (activeData?.datapoints || []).map((dp) => ({
    time: formatTime(dp.timestamp),
    average: dp.average,
    maximum: dp.maximum,
    minimum: dp.minimum,
  }));

  // Comparison metrics calculation
  const stockholmData = stockholmState.data;
  const frankfurtData = frankfurtState.data;
  const hasBothCpu =
    typeof stockholmData?.latestValue === "number" &&
    typeof frankfurtData?.latestValue === "number";

  // Regional carbon benchmark estimates (74 vs 182 gCO2e/kWh)
  const stockholmIntensity = 74;
  const frankfurtIntensity = 182;
  const intensityDiff = frankfurtIntensity - stockholmIntensity; // 108 gCO2e/kWh
  const intensityReductionPct = Number(
    ((intensityDiff / frankfurtIntensity) * 100).toFixed(0)
  ); // ~59%

  return (
    <section className="live-aws-section">
      {/* SECTION HEADER */}
      <div className="live-aws-header">
        <div className="live-aws-title-area">
          <div className="live-aws-icon-wrapper">
            <Server size={22} />
          </div>
          <div>
            <div className="live-aws-tag-row">
              <span className="live-aws-eyebrow">
                AWS CLOUD METRICS · MULTI-REGION
              </span>
              <span className="live-aws-source-badge">
                <Cloud size={11} /> AWS CloudWatch
              </span>
            </div>
            <h3 className="live-aws-heading">Live AWS Infrastructure</h3>
          </div>
        </div>

        <div className="live-aws-header-actions">
          {/* Overall Connection Status Badge */}
          <div
            className={`live-aws-status-pill ${
              anyLoading && !anyConnected
                ? "status-loading"
                : bothConnected
                ? "status-connected"
                : anyConnected
                ? "status-connected"
                : "status-error"
            }`}
          >
            <span className="live-aws-pulse-dot" />
            <span>
              {anyLoading && !anyConnected
                ? "Connecting to CloudWatch..."
                : bothConnected
                ? "2 Regions Connected"
                : anyConnected
                ? "1 Region Connected"
                : "Connection Error"}
            </span>
          </div>

          {/* Refresh All Telemetry */}
          <button
            className={`live-aws-refresh-btn ${
              anyRefreshing ? "is-spinning" : ""
            }`}
            onClick={() => refreshAll(true)}
            disabled={anyLoading || anyRefreshing}
            title="Refresh CloudWatch metrics for all regions"
            aria-label="Refresh telemetry"
          >
            <RefreshCw
              size={14}
              className={anyRefreshing ? "spin-animation" : ""}
            />
            <span>{anyRefreshing ? "Refreshing..." : "Refresh All"}</span>
          </button>
        </div>
      </div>

      {/* COMPACT TWO-REGION COMPARISON GRID */}
      <div className="live-aws-regions-grid">
        {EC2_INSTANCES.map((instConfig) => {
          const state = instances[instConfig.key];
          const data = state.data;
          const isSelected = activeChartKey === instConfig.key;

          return (
            <div
              key={instConfig.key}
              className={`live-aws-region-card ${
                isSelected ? "is-selected" : ""
              }`}
            >
              {/* Card Top / Region Identity */}
              <div className="region-card-top">
                <div className="region-card-identity">
                  <span className="region-role-pill">
                    {instConfig.roleLabel}
                  </span>
                  <span className="region-code-badge">
                    <Globe size={11} /> {instConfig.region}
                  </span>
                </div>

                <div
                  className={`region-status-dot ${
                    state.loading && !data
                      ? "status-loading"
                      : state.error
                      ? "status-error"
                      : data?.isStale
                      ? "status-stale"
                      : "status-connected"
                  }`}
                  title={
                    state.loading && !data
                      ? "Connecting..."
                      : state.error
                      ? state.error.message
                      : data?.isStale
                      ? "Stale CloudWatch Data"
                      : "CloudWatch Connected"
                  }
                >
                  <span className="pulse-dot" />
                  <span className="status-text">
                    {state.loading && !data
                      ? "Syncing"
                      : state.error
                      ? "Offline"
                      : data?.isStale
                      ? "Stale"
                      : "Live"}
                  </span>
                </div>
              </div>

              {/* Region and Instance Header */}
              <div className="region-name-row">
                <div>
                  <h4 className="region-title">{instConfig.regionName}</h4>
                  <div className="instance-meta-row">
                    <span className="instance-name-text">
                      {data?.instanceName || instConfig.name}
                    </span>
                    <span className="live-dot-sep">·</span>
                    <code>{data?.instanceId || instConfig.instanceId}</code>
                    <span className="live-dot-sep">·</span>
                    <span className="instance-type-badge">
                      {data?.instanceType || instConfig.instanceType}
                    </span>
                  </div>
                </div>

                <button
                  className={`chart-focus-btn ${
                    isSelected ? "active" : ""
                  }`}
                  onClick={() => setActiveChartKey(instConfig.key)}
                  title={`Focus ${instConfig.regionShort} in timeline chart`}
                >
                  {isSelected ? "Active in Chart" : "View in Chart"}
                </button>
              </div>

              {/* Regional Telemetry Metrics Row */}
              <div className="region-telemetry-row">
                {/* Live CPU Utilization Metric */}
                <div className="region-metric-block highlight">
                  <div className="region-metric-label">
                    <span>LIVE CPU UTILIZATION</span>
                    <Cpu size={13} className="live-metric-icon" />
                  </div>
                  <div className="region-cpu-value">
                    {data && typeof data.latestValue === "number" ? (
                      <>
                        <strong>{data.latestValue.toFixed(2)}</strong>
                        <span className="unit">%</span>
                      </>
                    ) : (
                      <span className="no-val">--</span>
                    )}
                  </div>
                  <div className="region-freshness-sub">
                    {data?.latestTimestamp ? (
                      <>
                        <Clock size={11} />
                        <span>
                          {formatTime(data.latestTimestamp)} (
                          {formatRelativeTime(data.latestTimestamp)})
                        </span>
                      </>
                    ) : state.loading && !data ? (
                      <span>Connecting to CloudWatch...</span>
                    ) : state.error ? (
                      <span>Connection paused</span>
                    ) : (
                      <span>No recent activity</span>
                    )}
                  </div>
                </div>

                {/* Resolution & Pipeline Block */}
                <div className="region-metric-block">
                  <div className="region-metric-label">
                    <span>RESOLUTION & BUFFER</span>
                    <Zap size={13} className="live-metric-icon" />
                  </div>
                  <div className="region-resolution-value">
                    <strong>
                      {data?.periodSeconds ? data.periodSeconds / 60 : 5}m
                    </strong>
                    <span className="unit">Period</span>
                  </div>
                  <div className="region-freshness-sub">
                    <span>{data?.windowHours || 2}h window</span>
                    <span className="live-dot-sep">·</span>
                    <span>{data?.datapoints?.length || 0} datapoints</span>
                  </div>
                </div>
              </div>

              {/* Separated Regional Grid Benchmark Factor (Clearly labeled as estimate) */}
              <div className="region-benchmark-card">
                <div className="benchmark-header">
                  <span className="benchmark-tag">
                    ESTIMATED REGIONAL GRID FACTOR
                  </span>
                  <span className="benchmark-intensity">
                    {instConfig.benchmarkIntensity} gCO₂e/kWh
                  </span>
                </div>
                <div className="benchmark-footer">
                  <span>
                    {instConfig.gridLabel} · {instConfig.renewableShare}%
                    renewable mix
                  </span>
                  <span className="estimate-disclaimer">
                    * Regional benchmark estimate · Not measured server emissions
                  </span>
                </div>
              </div>

              {/* Per-Region Error Banner */}
              {state.error && (
                <div className="region-error-alert">
                  <ShieldAlert size={16} />
                  <div className="error-alert-content">
                    <strong>Connection Error:</strong> {state.error.message}
                  </div>
                  <button
                    className="region-retry-btn"
                    onClick={() => loadInstanceMetrics(instConfig, true)}
                    disabled={state.refreshing}
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              )}

              {/* Per-Region Stale Banner */}
              {!state.error && data?.isStale && data?.hasDatapoints && (
                <div className="region-stale-alert">
                  <AlertTriangle size={14} />
                  <span>
                    Stale: Latest datapoint is &gt;15m old (5-min basic EC2
                    aggregation).
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* COMPARATIVE TELEMETRY & ESTIMATE INSIGHT BANNER */}
      {hasBothCpu && (
        <div className="live-aws-compare-banner">
          <div className="compare-stat">
            <span className="compare-label">REAL MEASURED EC2 CPU</span>
            <div className="compare-value-row">
              <span>
                Stockholm:{" "}
                <strong>{stockholmData.latestValue.toFixed(2)}%</strong>
              </span>
              <span className="compare-vs">vs</span>
              <span>
                Frankfurt:{" "}
                <strong>{frankfurtData.latestValue.toFixed(2)}%</strong>
              </span>
            </div>
            <small>Live telemetry streamed via Amazon CloudWatch</small>
          </div>

          <div className="compare-divider" />

          <div className="compare-stat">
            <span className="compare-label">
              ENVIRONMENTAL DIFFERENTIAL (BENCHMARK ESTIMATE)
            </span>
            <div className="compare-value-row">
              <strong className="text-highlight">
                Stockholm grid is ~{intensityReductionPct}% lower carbon
                intensity
              </strong>
            </div>
            <small>
              Benchmark factor: 74 vs 182 gCO₂e/kWh (CarbonLens regional grid
              model estimate)
            </small>
          </div>
        </div>
      )}

      {/* HISTORICAL CPU TIMELINE CHART */}
      <div className="live-aws-chart-container">
        <div className="live-chart-header">
          <div>
            <h4 className="live-chart-title">
              Real-Time CloudWatch CPU Utilization Timeline
            </h4>
            <p className="live-chart-desc">
              Metric: <code>AWS/EC2 CPUUtilization</code> (Average) · Showing:{" "}
              <strong>{activeInst.regionName}</strong> (
              <code>{activeInst.instanceId}</code> in{" "}
              <code>{activeInst.region}</code>)
            </p>
          </div>

          {/* Region Tabs to switch timeline view */}
          <div className="live-chart-tabs">
            {EC2_INSTANCES.map((inst) => (
              <button
                key={inst.key}
                className={`live-chart-tab-btn ${
                  activeChartKey === inst.key ? "active" : ""
                }`}
                onClick={() => setActiveChartKey(inst.key)}
              >
                {inst.regionShort} ({inst.region})
              </button>
            ))}
          </div>
        </div>

        {activeData?.hasDatapoints && chartData.length > 0 ? (
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
                  domain={[
                    0,
                    (dataMax) => Math.max(1, Math.ceil(dataMax * 1.5)),
                  ]}
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
        ) : activeData &&
          (!activeData.hasDatapoints || chartData.length === 0) ? (
          /* NO DATA STATE */
          <div className="live-aws-no-data-state">
            <Info size={28} />
            <div className="no-data-text">
              <h5>No CloudWatch Datapoints in Range for {activeInst.regionName}</h5>
              <p>
                {activeData.message ||
                  `CloudWatch has not recorded any CPU datapoints for instance ${activeInst.instanceId} in the last 2 hours. If this instance was just started, CloudWatch basic monitoring may take 5–10 minutes to populate.`}
              </p>
            </div>
          </div>
        ) : activeState.error && !activeData ? (
          /* CHART OFFLINE / ERROR STATE */
          <div className="live-aws-no-data-state">
            <AlertTriangle size={28} style={{ color: "#ff7b72" }} />
            <div className="no-data-text">
              <h5>CloudWatch Telemetry Offline for {activeInst.regionName}</h5>
              <p>
                {activeState.error.message ||
                  "Unable to stream real-time datapoints. Click Retry to re-establish connection."}
              </p>
            </div>
            <button
              className="live-aws-retry-btn"
              style={{ marginLeft: "auto" }}
              onClick={() => loadInstanceMetrics(activeInst, true)}
              disabled={activeState.refreshing}
            >
              <RefreshCw size={13} /> Retry {activeInst.regionShort}
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
              Authenticated via Server-Side IAM · Showing{" "}
              <code>{activeInst.name}</code> (<code>{activeInst.instanceId}</code>) in{" "}
              <code>{activeInst.region}</code>
            </span>
          </div>
          <div className="live-footer-right">
            <span>
              Last sync:{" "}
              <strong>
                {activeState.lastUpdated
                  ? formatTime(activeState.lastUpdated)
                  : activeState.loading
                  ? "Syncing..."
                  : "Pending"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
