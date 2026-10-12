import {
  Award,
  Leaf,
  ShieldCheck,
  TrendingDown,
  Zap,
} from "lucide-react";

import "./CarbonScore.css";

function CarbonScore({
  carbon = 8.42,
  baseline = 8.42,
  intensity = 396,
  renewable = 31,
}) {
  const reduction =
    baseline > 0
      ? ((baseline - carbon) / baseline) * 100
      : 0;

  let score = 100 - carbon * 7;

  score = Math.max(
    0,
    Math.min(100, score)
  );

  let grade;
  let description;

  if (score >= 75) {
    grade = "Excellent";
    description =
      "This workload has a strong environmental profile.";
  } else if (score >= 50) {
    grade = "Moderate";
    description =
      "There is meaningful room for carbon optimization.";
  } else {
    grade = "High Impact";
    description =
      "The workload has significant optimization potential.";
  }

  return (
    <section className="carbon-score">

      <div className="carbon-score-header">

        <div>

          <p className="eyebrow">
            ENVIRONMENTAL PERFORMANCE
          </p>

          <h3>
            Carbon efficiency score
          </h3>

        </div>

        <div className="score-award">
          <Award size={19} />
        </div>

      </div>

      <div className="score-layout">

        <div className="score-circle">

          <div className="score-circle-inner">

            <strong>
              {score.toFixed(0)}
            </strong>

            <span>
              / 100
            </span>

          </div>

        </div>

        <div className="score-content">

          <div className="score-grade">

            <span>
              CURRENT RATING
            </span>

            <strong>
              {grade}
            </strong>

          </div>

          <p>
            {description}
          </p>

          <div className="score-factors">

            <ScoreFactor
              icon={<Leaf size={14} />}
              label="Renewable share"
              value={`${renewable}%`}
            />

            <ScoreFactor
              icon={<Zap size={14} />}
              label="Grid intensity"
              value={`${intensity} gCO₂e/kWh`}
            />

            <ScoreFactor
              icon={<TrendingDown size={14} />}
              label="Carbon reduction"
              value={`${Math.max(
                0,
                reduction
              ).toFixed(1)}%`}
            />

            <ScoreFactor
              icon={<ShieldCheck size={14} />}
              label="Assessment"
              value="Lifecycle-aware"
            />

          </div>

        </div>

      </div>

    </section>
  );
}

function ScoreFactor({
  icon,
  label,
  value,
}) {
  return (
    <div className="score-factor">

      <div className="score-factor-icon">
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

export default CarbonScore;