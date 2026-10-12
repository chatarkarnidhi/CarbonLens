import {
  CheckCircle2,
  Clock3,
  Cloud,
  Cpu,
  ShieldCheck,
  Timer,
} from "lucide-react";

import "./OptimizationConfidence.css";

function OptimizationConfidence({
  region,
  window,
  analysis,
}) {
  // 1. Workload data exists (30%)
  const hasWorkload = Boolean(
    analysis?.workloadType &&
    analysis?.gpus &&
    analysis?.runtime &&
    analysis?.energy
  );

  // 2. Region data exists (25%)
  const hasRegion = Boolean(
    region?.name &&
    region?.carbonIntensity !== undefined
  );

  // 3. Scheduling data exists (25%)
  const hasScheduling = Boolean(
    window?.time
  );

  // 4. Deadline feasibility is known (20%)
  const hasDeadlineFeasibility = Boolean(
    analysis?.deadline &&
    analysis?.runtime !== undefined
  );

  let confidence = 0;
  if (hasWorkload) confidence += 30;
  if (hasRegion) confidence += 25;
  if (hasScheduling) confidence += 25;
  if (hasDeadlineFeasibility) confidence += 20;

  confidence = Math.min(100, Math.max(0, confidence));

  let level = "Moderate";
  if (confidence >= 85) {
    level = "High";
  } else if (confidence >= 60) {
    level = "Moderate";
  } else {
    level = "Preliminary";
  }

  const factors = [
    {
      icon: <Cpu size={14} />,
      label: "Workload data",
      value: hasWorkload
        ? `${analysis.workloadType} (${analysis.gpus} GPU)`
        : "Missing workload parameters",
      complete: hasWorkload,
      points: "+30%",
    },
    {
      icon: <Cloud size={14} />,
      label: "Region data",
      value: hasRegion
        ? `${region.name} (${region.carbonIntensity} gCO₂e/kWh)`
        : "No target region assigned",
      complete: hasRegion,
      points: "+25%",
    },
    {
      icon: <Clock3 size={14} />,
      label: "Scheduling data",
      value: hasScheduling
        ? `${window.time} (${window.label || "Assigned"})`
        : "No execution window selected",
      complete: hasScheduling,
      points: "+25%",
    },
    {
      icon: <Timer size={14} />,
      label: "Deadline feasibility",
      value: hasDeadlineFeasibility
        ? `Evaluated (${analysis.runtime}h runtime / ${analysis.deadline}h deadline)`
        : "Deadline unknown",
      complete: hasDeadlineFeasibility,
      points: "+20%",
    },
  ];

  return (
    <section className="optimization-confidence">
      <div className="confidence-header">
        <div>
          <p className="eyebrow">
            DECISION QUALITY & COMPLETENESS
          </p>

          <h3>
            Optimization confidence
          </h3>
        </div>

        <div className="confidence-shield">
          <ShieldCheck size={19} />
        </div>
      </div>

      <div className="confidence-main">
        <div className="confidence-score">
          <strong>
            {confidence}
          </strong>

          <span>
            %
          </span>
        </div>

        <div className="confidence-description">
          <div className="confidence-level">
            <CheckCircle2 size={15} />

            <strong>
              {level} confidence
            </strong>
          </div>

          <p>
            {confidence >= 90
              ? "All critical decision pillars (workload, region, schedule, SLA feasibility) are fully calibrated."
              : confidence >= 70
                ? "Substantial decision data available. Assigning both region and schedule achieves maximum decision fidelity."
                : "Preliminary assessment. Configure workload parameters and evaluate cloud placement to increase confidence."}
          </p>
        </div>
      </div>

      <div className="confidence-bar">
        <div
          style={{
            width: `${confidence}%`,
          }}
        />
      </div>

      <div className="confidence-factors">
        {factors.map((factor, index) => (
          <div
            className="confidence-factor"
            key={index}
          >
            <div
              className={`confidence-factor-icon ${
                factor.complete
                  ? "factor-complete"
                  : ""
              }`}
            >
              {factor.icon}
            </div>

            <div>
              <span>
                {factor.label} · <small style={{ color: factor.complete ? "#6fe7a2" : "#729283" }}>{factor.points}</small>
              </span>

              <strong>
                {factor.value}
              </strong>
            </div>
          </div>
        ))}
      </div>

      <div className="confidence-note">
        <CheckCircle2 size={15} />

        <span>
          Confidence deterministically reflects the availability of workload requirements,
          regional telemetry, scheduling forecasts, and SLA deadline feasibility.
        </span>
      </div>
    </section>
  );
}

export default OptimizationConfidence;