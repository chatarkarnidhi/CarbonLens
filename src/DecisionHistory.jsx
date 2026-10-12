import {
  ArrowDownRight,
  Check,
  Clock3,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";

import "./DecisionHistory.css";

function DecisionHistory({
  history = [],
  onBack,
}) {
  const records = Array.isArray(history) ? history : [];

  return (
    <div className="history-page">
      <div className="history-top">
        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Decision history active · Session log
        </div>
      </div>

      <section className="history-heading">
        <div className="history-heading-icon">
          <TrendingDown size={24} />
        </div>

        <div>
          <p className="eyebrow">
            DECISION INTELLIGENCE & AUDIT TRAIL
          </p>

          <h2>
            Optimization Decision Log
          </h2>

          <p>
            Track how CarbonLens changes workload placement and execution decisions over
            time. Every applied plan is deterministically recorded with full before-and-after environmental metrics.
          </p>
        </div>
      </section>

      {records.length === 0 ? (
        <section className="history-empty">
          <div className="history-empty-icon">
            <Leaf size={25} />
          </div>

          <h3>
            No optimization decisions recorded yet
          </h3>

          <p>
            Apply an optimized execution plan from the Optimization Engine, and the complete
            audit record will appear here for the duration of this session.
          </p>
        </section>
      ) : (
        <section className="history-list">
          <div className="history-list-header">
            <div>
              <p className="eyebrow">
                AUDITED EXECUTION RECORDS
              </p>

              <h3>
                Session optimization decisions
              </h3>
            </div>

            <span className="history-count">
              {records.length} decision{records.length !== 1 ? "s" : ""} recorded
            </span>
          </div>

          {records.map((item, index) => {
            const rawBaseline = Number(item.baselineCarbon ?? 8.42);
            const baseline = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

            const rawOptimized = Number(item.optimizedCarbon ?? item.totalCarbon ?? 5.95);
            const optimized = !isNaN(rawOptimized) && rawOptimized > 0 ? rawOptimized : 5.95;

            const saved = Number(Math.max(0, baseline - optimized).toFixed(2));
            const reduction = baseline > 0 ? Number(((saved / baseline) * 100).toFixed(1)) : 0;

            const regionName = item.regionName || item.region || "Nordic";
            const location = item.location || "Stockholm";
            const executionWindow = item.executionWindow || item.execution || "+5 hours";
            const intensity = Number(item.carbonIntensity ?? 74);
            const slaStatus = item.slaStatus || item.sla || "Low";
            const score = item.score ?? item.optimizationScore;

            return (
              <div
                className="history-card"
                key={item.id || index}
              >
                <div className="history-card-main">
                  <div className="history-card-icon">
                    <Leaf size={19} />
                  </div>

                  <div>
                    <div className="history-title-row">
                      <h4>{regionName}</h4>

                      <span className="history-optimized">
                        <Check size={11} />
                        Optimized Plan
                      </span>

                      {score != null && (
                        <span style={{ fontSize: "11px", color: "#6ee7a0", marginLeft: "8px", fontWeight: 600 }}>
                          Score: {score}/100
                        </span>
                      )}
                    </div>

                    <p className="history-location">
                      <MapPin size={13} />
                      {location}
                    </p>
                  </div>
                </div>

                <div className="history-details">
                  <HistoryDetail
                    icon={<Clock3 size={14} />}
                    label="Execution window"
                    value={executionWindow}
                  />

                  <HistoryDetail
                    icon={<Leaf size={14} />}
                    label="Optimized carbon"
                    value={`${Number(optimized).toFixed(2)} kg`}
                  />

                  <HistoryDetail
                    icon={<Sparkles size={14} />}
                    label="Carbon saved"
                    value={`${Number(saved).toFixed(2)} kg`}
                  />

                  <HistoryDetail
                    icon={<TrendingDown size={14} />}
                    label="Carbon reduction"
                    value={`${Number(reduction).toFixed(1)}%`}
                  />

                  <HistoryDetail
                    icon={<Zap size={14} />}
                    label="Carbon intensity"
                    value={`${intensity} gCO₂e/kWh`}
                  />

                  <HistoryDetail
                    icon={<ShieldCheck size={14} />}
                    label="SLA status"
                    value={`${slaStatus} Risk`}
                  />
                </div>

                <div className="history-comparison">
                  <div>
                    <span>Baseline carbon</span>
                    <strong>{Number(baseline).toFixed(2)} kg</strong>
                  </div>

                  <ArrowDownRight size={18} />

                  <div className="history-after">
                    <span>Optimized carbon</span>
                    <strong>{Number(optimized).toFixed(2)} kg</strong>
                  </div>
                </div>

                <div className="history-footer">
                  <span>
                    <Clock3 size={12} />
                    Applied: {item.timestamp || "Just now"}
                  </span>

                  <span style={{ color: "#72ea9e" }}>
                    {saved.toFixed(2)} kg CO₂e avoided
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="history-insight">
        <div className="history-insight-icon">
          <Leaf size={20} />
        </div>

        <div>
          <p className="eyebrow">
            SESSION AUDIT TRAIL
          </p>

          <h3>
            Decisions are measurable, explainable, and accountable.
          </h3>

          <p>
            CarbonLens maintains an in-memory session audit record of every applied optimization decision.
            Each log entry captures regional coordinates, scheduled window, grid intensity, baseline carbon,
            optimized emissions, net savings, and SLA compliance.
          </p>
        </div>
      </section>
    </div>
  );
}

function HistoryDetail({
  icon,
  label,
  value,
}) {
  return (
    <div className="history-detail">
      <div>
        {icon}
      </div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

export default DecisionHistory;