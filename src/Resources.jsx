import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Cloud,
  DollarSign,
  Globe2,
  Leaf,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import "./Resources.css";

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

function Resources({ onBack, analysis, onRegionSelect }) {
  const [priority, setPriority] = useState("balanced");

  const scoredRegions = useMemo(() => {
    return regions
      .map((region) => {
        const carbonScore =
          1 - region.carbonIntensity / 800;

        const renewableScore =
          region.renewable / 100;

        const costScore =
          1 - Math.min(region.cost / 250, 1);

        const latencyScore =
          1 - Math.min(region.latency / 250, 1);

        let score;

        if (priority === "carbon") {
          score =
            carbonScore * 0.55 +
            renewableScore * 0.30 +
            costScore * 0.10 +
            latencyScore * 0.05;
        } else if (priority === "cost") {
          score =
            costScore * 0.55 +
            carbonScore * 0.20 +
            renewableScore * 0.15 +
            latencyScore * 0.10;
        } else if (priority === "latency") {
          score =
            latencyScore * 0.55 +
            carbonScore * 0.20 +
            renewableScore * 0.15 +
            costScore * 0.10;
        } else {
          score =
            carbonScore * 0.35 +
            renewableScore * 0.25 +
            costScore * 0.20 +
            latencyScore * 0.20;
        }

        if (region.sla === "Low") {
          score += 0.03;
        }

        return {
          ...region,
          score: score * 100,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [priority]);

  const recommended = scoredRegions[0];

  const currentRegion =
    regions.find(
      (region) =>
        region.carbonIntensity ===
        analysis?.gridIntensity
    ) || regions[0];

  const carbonReduction =
    currentRegion.carbonIntensity > 0
      ? ((currentRegion.carbonIntensity -
          recommended.carbonIntensity) /
          currentRegion.carbonIntensity) *
        100
      : 0;

  const applyRegion = (region) => {
    onRegionSelect(region);
  };

  return (
    <div className="resources-page">

      <div className="resources-top">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Regional intelligence active
        </div>

      </div>

      <section className="resources-heading">

        <div className="resources-heading-icon">
          <Globe2 size={24} />
        </div>

        <div>

          <p className="eyebrow">
            CLOUD RESOURCE INTELLIGENCE
          </p>

          <h2>
            Where should this workload run?
          </h2>

          <p>
            Compare cloud regions using carbon
            intensity, renewable share, cost,
            latency and SLA risk.
          </p>

        </div>

      </section>

      <section className="resource-recommendation">

        <div className="recommendation-symbol">
          <Sparkles size={22} />
        </div>

        <div className="resource-recommendation-content">

          <p className="eyebrow">
            CARBONLENS PLACEMENT RECOMMENDATION
          </p>

          <h3>
            {recommended.name}
          </h3>

          <p>
            {recommended.location} currently provides
            the strongest multi-factor score for this
            workload.
          </p>

          <div className="recommendation-mini-stats">

            <div>
              <span>Carbon reduction</span>
              <strong>
                {Math.max(
                  0,
                  carbonReduction
                ).toFixed(1)}%
              </strong>
            </div>

            <div>
              <span>Carbon intensity</span>
              <strong>
                {recommended.carbonIntensity}
                <small> gCO₂e/kWh</small>
              </strong>
            </div>

            <div>
              <span>Renewable share</span>
              <strong>
                {recommended.renewable}%
              </strong>
            </div>

            <div>
              <span>Placement score</span>
              <strong>
                {recommended.score.toFixed(0)}
              </strong>
            </div>

          </div>

          <button
            className="primary-button"
            style={{ marginTop: "15px" }}
            onClick={() =>
              applyRegion(recommended)
            }
          >
            <Leaf size={17} />
            Apply Recommended Region
          </button>

        </div>

      </section>

      <section className="priority-panel">

        <div>
          <p className="eyebrow">
            DECISION PRIORITY
          </p>

          <h3>
            What matters most?
          </h3>
        </div>

        <div className="priority-buttons">

          <PriorityButton
            active={priority === "balanced"}
            onClick={() =>
              setPriority("balanced")
            }
          >
            Balanced
          </PriorityButton>

          <PriorityButton
            active={priority === "carbon"}
            onClick={() =>
              setPriority("carbon")
            }
          >
            Lowest Carbon
          </PriorityButton>

          <PriorityButton
            active={priority === "cost"}
            onClick={() =>
              setPriority("cost")
            }
          >
            Lowest Cost
          </PriorityButton>

          <PriorityButton
            active={priority === "latency"}
            onClick={() =>
              setPriority("latency")
            }
          >
            Lowest Latency
          </PriorityButton>

        </div>

      </section>

      <section className="region-section">

        <div className="region-section-header">

          <div>
            <p className="eyebrow">
              REGIONAL COMPARISON
            </p>

            <h3>
              Available cloud regions
            </h3>
          </div>

          <span className="comparison-badge">
            {scoredRegions.length} regions evaluated
          </span>

        </div>

        <div className="region-grid">

          {scoredRegions.map(
            (region, index) => (
              <RegionCard
                key={region.id}
                region={region}
                rank={index + 1}
                recommended={
                  region.id ===
                  recommended.id
                }
                onApply={() =>
                  applyRegion(region)
                }
              />
            )
          )}

        </div>

      </section>

      <section className="methodology-panel">

        <div className="methodology-icon">
          <Leaf size={20} />
        </div>

        <div>

          <p className="eyebrow">
            WHY THIS IS DIFFERENT
          </p>

          <h3>
            Carbon is treated as a placement decision.
          </h3>

          <p>
            Instead of reporting carbon emissions after
            a workload runs, CarbonLens evaluates
            possible execution regions before placement.
            The prototype combines environmental,
            operational and economic factors to identify
            a more suitable execution location.
          </p>

        </div>

      </section>

    </div>
  );
}

function PriorityButton({
  children,
  active,
  onClick,
}) {
  return (
    <button
      className={`priority-button ${
        active ? "priority-active" : ""
      }`}
      onClick={onClick}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}

function RegionCard({
  region,
  rank,
  recommended,
  onApply,
}) {
  return (
    <div
      className={`region-card ${
        recommended
          ? "region-recommended"
          : ""
      }`}
    >

      {recommended && (
        <div className="region-recommended-tag">
          <Check size={12} />
          BEST MATCH
        </div>
      )}

      <div className="region-card-top">

        <div className="region-icon">
          <Cloud size={19} />
        </div>

        <div>

          <span className="region-rank">
            RANK #{rank}
          </span>

          <h4>
            {region.name}
          </h4>

          <p>
            {region.location}
          </p>

        </div>

      </div>

      <div className="region-carbon">

        <span>
          Grid carbon intensity
        </span>

        <strong>
          {region.carbonIntensity}
          <small>
            gCO₂e/kWh
          </small>
        </strong>

      </div>

      <RegionMetric
        icon={<Leaf size={15} />}
        label="Renewable share"
        value={`${region.renewable}%`}
      />

      <RegionMetric
        icon={<DollarSign size={15} />}
        label="Estimated cost"
        value={`₹${region.cost}`}
      />

      <RegionMetric
        icon={<Network size={15} />}
        label="Latency"
        value={`${region.latency} ms`}
      />

      <RegionMetric
        icon={<ShieldCheck size={15} />}
        label="SLA risk"
        value={region.sla}
      />

      <div className="region-score">

        <div>
          <span>
            Multi-factor score
          </span>

          <strong>
            {region.score.toFixed(0)}
          </strong>
        </div>

        <div className="score-track">

          <div
            className="score-fill"
            style={{
              width: `${region.score}%`,
            }}
          />

        </div>

      </div>

      <button
        className="region-apply-button"
        onClick={onApply}
      >
        <Check size={14} />
        Use this region
      </button>

    </div>
  );
}

function RegionMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="region-metric">

      <div className="region-metric-label">
        {icon}
        <span>{label}</span>
      </div>

      <strong>{value}</strong>

    </div>
  );
}

export default Resources;