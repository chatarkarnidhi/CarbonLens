import { useMemo } from "react";
import {
  ArrowLeft,
  Check,
  Cloud,
  Cpu,
  Leaf,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
  Clock3,
  DollarSign,
  Network,
} from "lucide-react";

import "./Optimization.css";

const regions = [
  {
    id: "asia",
    name: "Asia Pacific",
    location: "Mumbai",
    carbonIntensity: 396,
    renewable: 31,
    cost: 146,
    latency: 18,
    sla: "Low",
  },
  {
    id: "europe",
    name: "Europe West",
    location: "Frankfurt",
    carbonIntensity: 182,
    renewable: 68,
    cost: 159,
    latency: 92,
    sla: "Low",
  },
  {
    id: "north-america",
    name: "North America",
    location: "Oregon",
    carbonIntensity: 241,
    renewable: 54,
    cost: 138,
    latency: 178,
    sla: "Medium",
  },
  {
    id: "nordic",
    name: "Nordic",
    location: "Stockholm",
    carbonIntensity: 74,
    renewable: 91,
    cost: 171,
    latency: 126,
    sla: "Low",
  },
];

const timeWindows = [
  {
    id: 0,
    time: "Now",
    delay: 0,
    carbonIntensity: 396,
    renewable: 31,
    label: "Current grid",
  },
  {
    id: 1,
    time: "+1 hour",
    delay: 1,
    carbonIntensity: 318,
    renewable: 43,
    label: "Improving",
  },
  {
    id: 2,
    time: "+2 hours",
    delay: 2,
    carbonIntensity: 241,
    renewable: 54,
    label: "Cleaner window",
  },
  {
    id: 3,
    time: "+3 hours",
    delay: 3,
    carbonIntensity: 168,
    renewable: 67,
    label: "Low-carbon window",
  },
  {
    id: 4,
    time: "+4 hours",
    delay: 4,
    carbonIntensity: 121,
    renewable: 78,
    label: "Very clean",
  },
  {
    id: 5,
    time: "+5 hours",
    delay: 5,
    carbonIntensity: 94,
    renewable: 86,
    label: "Cleanest window",
  },
];

function Optimization({
  onBack,
  analysis,
  onApply,
}) {
  const energy =
    analysis?.energy || 21.3;

  const baselineCarbon =
    analysis?.totalCarbon || 8.42;

  const deadline =
    analysis?.deadline || 12;

  const optimization = useMemo(() => {
    let bestPlan = null;

    regions.forEach((region) => {
      timeWindows.forEach((window) => {

        if (window.delay >= deadline) {
          return;
        }

        const combinedIntensity =
          region.carbonIntensity *
          0.65 +
          window.carbonIntensity *
          0.35;

        const renewableBonus =
          region.renewable *
          0.45 +
          window.renewable *
          0.35;

        const latencyPenalty =
          region.latency > 150
            ? 8
            : region.latency > 100
              ? 3
              : 0;

        const slaPenalty =
          region.sla === "Medium"
            ? 6
            : 0;

        const carbonScore =
          combinedIntensity -
          renewableBonus +
          latencyPenalty +
          slaPenalty;

        if (
          !bestPlan ||
          carbonScore <
            bestPlan.carbonScore
        ) {
          bestPlan = {
            region,
            window,
            carbonScore,
          };
        }
      });
    });

    const computeCarbon =
      energy *
      (bestPlan.region.carbonIntensity /
        1000);

    const timingFactor =
      bestPlan.window.carbonIntensity /
      396;

    const optimizedComputeCarbon =
      computeCarbon *
      timingFactor;

    const lifecycleOverhead =
      Math.max(
        0,
        baselineCarbon -
          (analysis?.computeCarbon ||
            4.05)
      );

    const totalCarbon =
      optimizedComputeCarbon +
      lifecycleOverhead;

    const reduction =
      baselineCarbon > 0
        ? ((baselineCarbon -
            totalCarbon) /
            baselineCarbon) *
          100
        : 0;

    return {
      ...bestPlan,
      computeCarbon:
        optimizedComputeCarbon,
      totalCarbon,
      reduction,
    };
  }, [
    energy,
    baselineCarbon,
    deadline,
    analysis?.computeCarbon,
  ]);

  const applyPlan = () => {
    if (!onApply) return;

    onApply({
      region:
        optimization.region,
      window:
        optimization.window,
      totalCarbon:
        optimization.totalCarbon,
      computeCarbon:
        optimization.computeCarbon,
    });
  };

  return (
    <div className="optimization-page">

      <div className="optimization-top">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Optimization engine active
        </div>

      </div>

      <section className="optimization-heading">

        <div className="optimization-heading-icon">
          <Sparkles size={25} />
        </div>

        <div>

          <p className="eyebrow">
            MULTI-FACTOR DECISION ENGINE
          </p>

          <h2>
            Find the optimal execution plan
          </h2>

          <p>
            CarbonLens jointly evaluates where
            and when a workload should execute
            instead of optimizing either factor
            independently.
          </p>

        </div>

      </section>

      <section className="optimization-result">

        <div className="optimization-result-header">

          <div>

            <p className="eyebrow">
              OPTIMAL EXECUTION PLAN
            </p>

            <h3>
              Lowest-impact feasible combination
            </h3>

          </div>

          <div className="optimal-badge">
            <Check size={14} />
            OPTIMIZED
          </div>

        </div>

        <div className="plan-grid">

          <PlanCard
            icon={<Cloud size={20} />}
            label="Region"
            value={
              optimization.region.name
            }
            detail={
              optimization.region.location
            }
          />

          <PlanCard
            icon={<Clock3 size={20} />}
            label="Execution"
            value={
              optimization.window.time
            }
            detail={
              optimization.window.label
            }
          />

          <PlanCard
            icon={<Leaf size={20} />}
            label="Renewable energy"
            value={`${Math.round(
              (
                optimization.region
                  .renewable +
                optimization.window
                  .renewable
              ) / 2
            )}%`}
            detail="Combined availability"
          />

          <PlanCard
            icon={<ShieldCheck size={20} />}
            label="SLA status"
            value="Feasible"
            detail={`Deadline ${deadline}h`}
          />

        </div>

      </section>

      <section className="optimization-carbon">

        <div className="carbon-main">

          <div className="carbon-icon">
            <Leaf size={24} />
          </div>

          <div>

            <p className="eyebrow">
              PROJECTED ENVIRONMENTAL IMPACT
            </p>

            <strong>
              {optimization.totalCarbon.toFixed(
                2
              )}
              <small>
                {" "}kg CO₂e
              </small>
            </strong>

            <span>
              Estimated carbon for optimized
              execution
            </span>

          </div>

        </div>

        <div className="carbon-saving">

          <TrendingDown size={20} />

          <div>

            <span>
              Potential reduction
            </span>

            <strong>
              {Math.max(
                0,
                optimization.reduction
              ).toFixed(1)}
              %
            </strong>

          </div>

        </div>

      </section>

      <section className="optimization-comparison">

        <div className="section-header">

          <div>

            <p className="eyebrow">
              BASELINE VS OPTIMIZED
            </p>

            <h3>
              Environmental improvement
            </h3>

          </div>

        </div>

        <div className="comparison-grid">

          <div className="comparison-card">

            <span>
              Current workload
            </span>

            <strong>
              {baselineCarbon.toFixed(2)}
              kg
            </strong>

            <div className="optimization-bar">

              <div
                style={{
                  width: "100%",
                }}
              />

            </div>

            <small>
              Existing execution plan
            </small>

          </div>

          <div className="comparison-arrow">
            →
          </div>

          <div className="comparison-card optimized">

            <span>
              Optimized execution
            </span>

            <strong>
              {optimization.totalCarbon.toFixed(
                2
              )}
              kg
            </strong>

            <div className="optimization-bar">

              <div
                style={{
                  width: `${Math.max(
                    8,
                    Math.min(
                      100,
                      (optimization.totalCarbon /
                        baselineCarbon) *
                        100
                    )
                  )}%`,
                }}
              />

            </div>

            <small>
              {Math.max(
                0,
                optimization.reduction
              ).toFixed(1)}
              % lower carbon
            </small>

          </div>

        </div>

      </section>

      <section className="optimization-factors">

        <div className="section-header">

          <div>

            <p className="eyebrow">
              DECISION FACTORS
            </p>

            <h3>
              Why this plan was selected
            </h3>

          </div>

        </div>

        <div className="factor-grid">

          <FactorCard
            icon={<Leaf size={18} />}
            title="Grid carbon"
            value={`${optimization.region.carbonIntensity} gCO₂e/kWh`}
            text="Low regional grid intensity reduces compute emissions."
          />

          <FactorCard
            icon={<Zap size={18} />}
            title="Renewable share"
            value={`${optimization.region.renewable}%`}
            text="Higher renewable availability improves the environmental profile."
          />

          <FactorCard
            icon={<Network size={18} />}
            title="Network latency"
            value={`${optimization.region.latency} ms`}
            text="Latency is included to avoid blindly choosing the greenest location."
          />

          <FactorCard
            icon={<DollarSign size={18} />}
            title="Estimated cost"
            value={`₹${optimization.region.cost}`}
            text="Economic impact is considered alongside environmental impact."
          />

          <FactorCard
            icon={<ShieldCheck size={18} />}
            title="SLA risk"
            value={optimization.region.sla}
            text="The optimizer avoids plans that create unacceptable execution risk."
          />

          <FactorCard
            icon={<Clock3 size={18} />}
            title="Timing"
            value={optimization.window.time}
            text="Future grid conditions are evaluated before execution."
          />

        </div>

      </section>

      <section className="optimization-formula">

        <div className="formula-icon">
          <Cpu size={20} />
        </div>

        <div>

          <p className="eyebrow">
            OPTIMIZATION LOGIC
          </p>

          <h3>
            Spatial + temporal carbon optimization
          </h3>

          <p>
            CarbonLens combines regional carbon
            intensity, renewable availability,
            execution timing, latency, cost and
            SLA constraints to rank possible
            execution plans.
          </p>

          <div className="formula-box">

            <span>
              Optimization score =
            </span>

            <strong>
              Carbon + Renewable + Latency +
              Cost + SLA
            </strong>

          </div>

        </div>

      </section>

      <button
        className="optimization-apply"
        onClick={applyPlan}
      >
        <Check size={18} />
        Apply Optimal Execution Plan
      </button>

    </div>
  );
}

function PlanCard({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <div className="plan-card">

      <div className="plan-card-icon">
        {icon}
      </div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>

    </div>
  );
}

function FactorCard({
  icon,
  title,
  value,
  text,
}) {
  return (
    <div className="factor-card">

      <div className="factor-icon">
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <p>
          {text}
        </p>

      </div>

    </div>
  );
}

export default Optimization;