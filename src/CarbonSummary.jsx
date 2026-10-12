import {
  ArrowDownRight,
  BarChart3,
  Clock3,
  Cloud,
  Leaf,
  TrendingDown,
} from "lucide-react";

import "./CarbonSummary.css";

function CarbonSummary({
  baseline = 8.42,
  current = 8.42,
  region = null,
  window = null,
  decisions = 0,
}) {
  const saved =
    Math.max(
      0,
      baseline - current
    );

  const reduction =
    baseline > 0
      ? (saved / baseline) * 100
      : 0;

  return (
    <section className="carbon-summary">

      <div className="carbon-summary-header">

        <div>

          <p className="eyebrow">
            CARBON PERFORMANCE
          </p>

          <h3>
            Optimization impact
          </h3>

        </div>

        <div className="summary-icon">
          <BarChart3 size={19} />
        </div>

      </div>

      <div className="summary-main">

        <div className="summary-result">

          <div className="summary-leaf">
            <Leaf size={22} />
          </div>

          <div>

            <span>
              Total carbon reduction
            </span>

            <strong>
              {reduction.toFixed(1)}%
            </strong>

            <small>
              {saved.toFixed(2)} kg CO₂e saved
            </small>

          </div>

        </div>

        <div className="summary-comparison">

          <div>
            <span>
              Baseline
            </span>

            <strong>
              {baseline.toFixed(2)}
            </strong>

            <small>
              kg CO₂e
            </small>
          </div>

          <ArrowDownRight
            size={18}
          />

          <div className="summary-optimized">

            <span>
              Current
            </span>

            <strong>
              {current.toFixed(2)}
            </strong>

            <small>
              kg CO₂e
            </small>

          </div>

        </div>

      </div>

      <div className="summary-progress">

        <div
          style={{
            width: `${Math.min(
              100,
              reduction
            )}%`,
          }}
        />

      </div>

      <div className="summary-details">

        <SummaryItem
          icon={<Cloud size={15} />}
          label="Region"
          value={
            region
              ? region.location
              : "Baseline"
          }
        />

        <SummaryItem
          icon={<Clock3 size={15} />}
          label="Execution"
          value={
            window
              ? window.time
              : "Immediate"
          }
        />

        <SummaryItem
          icon={<TrendingDown size={15} />}
          label="Carbon saved"
          value={`${saved.toFixed(
            2
          )} kg`}
        />

        <SummaryItem
          icon={<BarChart3 size={15} />}
          label="Decisions"
          value={decisions}
        />

      </div>

    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="summary-item">

      <div className="summary-item-icon">
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

export default CarbonSummary;