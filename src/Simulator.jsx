import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Cpu,
  Leaf,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import "./Simulator.css";

function Simulator({
  onBack,
  analysis,
  onApply,
}) {
  const [delay, setDelay] = useState(0);
  const [gpuReduction, setGpuReduction] =
    useState(0);
  const [checkpointOptimization, setCheckpointOptimization] =
    useState(0);

  const baseline = {
    carbon: analysis?.totalCarbon ?? 8.42,
    energy: analysis?.energy ?? 21.3,
    cost: 146,
  };

  const scenarios = useMemo(() => {
    const delayReduction =
      delay * 0.085;

    const gpuReductionRate =
      gpuReduction * 0.12;

    const checkpointReductionRate =
      checkpointOptimization * 0.055;

    const delayScenario = {
      id: "delay",
      title:
        delay === 0
          ? "Run Now"
          : `Delay ${delay} hours`,
      description:
        delay === 0
          ? "Execute immediately using current grid conditions."
          : "Shift execution toward a potentially cleaner grid window.",
      carbon: Math.max(
        0.1,
        baseline.carbon *
          (1 - delayReduction)
      ),
      energy: baseline.energy,
      cost: Math.max(
        1,
        baseline.cost - delay * 3
      ),
      sla:
        delay <= 3
          ? "Low"
          : delay <= 5
            ? "Medium"
            : "High",
      icon: <Clock3 size={18} />,
    };

    const gpuScenario = {
      id: "gpu",
      title:
        gpuReduction === 0
          ? "Current GPU Allocation"
          : `Reduce GPU allocation by ${gpuReduction}`,
      description:
        "Trade compute capacity for lower energy consumption.",
      carbon: Math.max(
        0.1,
        baseline.carbon *
          (1 - gpuReductionRate)
      ),
      energy: Math.max(
        1,
        baseline.energy *
          (1 - gpuReduction * 0.11)
      ),
      cost: Math.max(
        1,
        baseline.cost *
          (1 - gpuReduction * 0.1)
      ),
      sla:
        gpuReduction === 0
          ? "Low"
          : gpuReduction === 1
            ? "Medium"
            : "High",
      icon: <Cpu size={18} />,
    };

    const checkpointScenario = {
      id: "checkpoint",
      title:
        checkpointOptimization === 0
          ? "Current Checkpointing"
          : "Optimize Checkpointing",
      description:
        "Reduce checkpoint overhead while considering recovery risk.",
      carbon: Math.max(
        0.1,
        baseline.carbon *
          (1 - checkpointReductionRate)
      ),
      energy: Math.max(
        1,
        baseline.energy *
          (1 -
            checkpointOptimization *
              0.05)
      ),
      cost: Math.max(
        1,
        baseline.cost *
          (1 -
            checkpointOptimization *
              0.035)
      ),
      sla:
        checkpointOptimization <= 1
          ? "Low"
          : "Medium",
      icon: <RefreshCw size={18} />,
    };

    return [
      delayScenario,
      gpuScenario,
      checkpointScenario,
    ];
  }, [
    delay,
    gpuReduction,
    checkpointOptimization,
    baseline.carbon,
    baseline.energy,
    baseline.cost,
  ]);

  const recommended = scenarios.reduce(
    (best, scenario) => {
      const scenarioPenalty =
        scenario.sla === "High"
          ? 4
          : scenario.sla === "Medium"
            ? 1.5
            : 0;

      const bestPenalty =
        best.sla === "High"
          ? 4
          : best.sla === "Medium"
            ? 1.5
            : 0;

      const scenarioScore =
        scenario.carbon +
        scenarioPenalty;

      const bestScore =
        best.carbon +
        bestPenalty;

      return scenarioScore <
        bestScore
        ? scenario
        : best;
    }
  );

  const saving =
    baseline.carbon > 0
      ? ((baseline.carbon -
          recommended.carbon) /
          baseline.carbon) *
        100
      : 0;

  const resetSimulation = () => {
    setDelay(0);
    setGpuReduction(0);
    setCheckpointOptimization(0);
  };

  const applyRecommendedScenario = () => {
    if (!onApply) return;

    const newComputeCarbon =
      recommended.id === "gpu"
        ? Math.max(
            0.1,
            (analysis?.computeCarbon ??
              4.05) *
              (1 -
                gpuReduction *
                  0.11)
          )
        : recommended.id === "delay"
          ? Math.max(
              0.1,
              (analysis?.computeCarbon ??
                4.05) *
                (1 -
                  delay * 0.085)
            )
          : Math.max(
              0.1,
              (analysis?.computeCarbon ??
                4.05) *
                (1 -
                  checkpointOptimization *
                    0.055)
            );

    const lifecycleOverhead =
      baseline.carbon -
      (analysis?.computeCarbon ??
        4.05);

    const adjustedLifecycleOverhead =
      Math.max(
        0,
        lifecycleOverhead
      );

    const newTotalCarbon =
      recommended.carbon;

    onApply({
      scenario: recommended,
      totalCarbon: newTotalCarbon,
      computeCarbon: Math.min(
        newComputeCarbon,
        newTotalCarbon
      ),
      lifecycleOverhead:
        adjustedLifecycleOverhead,
    });
  };

  return (
    <div className="simulator-page">

      <div className="simulator-top">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Scenario engine active
        </div>

      </div>

      <section className="simulator-heading">

        <div className="simulator-heading-icon">
          <Sparkles size={24} />
        </div>

        <div>

          <p className="eyebrow">
            DECISION INTELLIGENCE
          </p>

          <h2>
            What-If Carbon Simulator
          </h2>

          <p>
            Explore how different cloud
            decisions could change the
            environmental impact of a
            workload.
          </p>

        </div>

      </section>

      <section className="baseline-banner">

        <div>
          <span>
            BASELINE WORKLOAD
          </span>

          <strong>
            {analysis?.workloadType ??
              "AI Model Training"}
          </strong>
        </div>

        <div className="baseline-number">

          <span>
            Current estimated impact
          </span>

          <strong>
            {baseline.carbon.toFixed(2)}
            <small>
              {" "}kg CO₂e
            </small>
          </strong>

        </div>

      </section>

      <div className="simulator-layout">

        <section className="panel controls-panel">

          <div className="panel-heading">

            <div>

              <p className="eyebrow">
                DECISION CONTROLS
              </p>

              <h3>
                Change the workload strategy
              </h3>

            </div>

          </div>

          <SimulatorSlider
            icon={<Clock3 size={17} />}
            label="Execution delay"
            value={delay}
            min={0}
            max={6}
            suffix=" hours"
            description="Shift the workload into a potentially cleaner grid window."
            onChange={setDelay}
          />

          <SimulatorSlider
            icon={<Cpu size={17} />}
            label="GPU reduction"
            value={gpuReduction}
            min={0}
            max={3}
            suffix=" GPUs"
            description="Reduce allocated compute resources to lower energy demand."
            onChange={setGpuReduction}
          />

          <SimulatorSlider
            icon={<RefreshCw size={17} />}
            label="Checkpoint optimization"
            value={checkpointOptimization}
            min={0}
            max={3}
            suffix=" level"
            description="Reduce checkpoint overhead while monitoring recovery risk."
            onChange={setCheckpointOptimization}
          />

          <button
            className="reset-button"
            onClick={resetSimulation}
          >
            <RefreshCw size={15} />
            Reset scenarios
          </button>

        </section>

        <section className="scenario-section">

          <div className="scenario-header">

            <div>

              <p className="eyebrow">
                SCENARIO COMPARISON
              </p>

              <h3>
                Compare possible decisions
              </h3>

            </div>

            <div className="comparison-badge">
              <Network size={14} />
              Multi-factor analysis
            </div>

          </div>

          <div className="scenario-grid">

            {scenarios.map(
              (scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  baseline={baseline}
                  recommended={
                    scenario.id ===
                    recommended.id
                  }
                />
              )
            )}

          </div>

        </section>

      </div>

      <section className="decision-result">

        <div className="decision-icon">
          <Leaf size={21} />
        </div>

        <div className="decision-content">

          <p className="eyebrow">
            CARBONLENS RECOMMENDATION
          </p>

          <h3>
            {recommended.title}
          </h3>

          <p>
            This scenario currently provides
            the best balance between estimated
            carbon reduction and execution
            risk.
          </p>

          <div className="decision-stats">

            <DecisionStat
              icon={<Leaf size={15} />}
              label="Estimated impact"
              value={`${recommended.carbon.toFixed(
                2
              )} kg`}
            />

            <DecisionStat
              icon={<ArrowRight size={15} />}
              label="Potential reduction"
              value={`${Math.max(
                0,
                saving
              ).toFixed(1)}%`}
            />

            <DecisionStat
              icon={<Zap size={15} />}
              label="Energy"
              value={`${recommended.energy.toFixed(
                1
              )} kWh`}
            />

            <DecisionStat
              icon={<ShieldCheck size={15} />}
              label="SLA risk"
              value={recommended.sla}
            />

          </div>

          <button
            className="scheduler-primary-button"
            onClick={
              applyRecommendedScenario
            }
          >
            <Check size={17} />
            Apply Recommended Scenario
          </button>

        </div>

      </section>

      <div className="simulator-method-note">

        <strong>
          Prototype methodology:
        </strong>{" "}

        Scenario values are generated using
        transparent simulation coefficients.
        These coefficients will later be
        validated against real workload-energy
        measurements and carbon-intensity data.

      </div>

    </div>
  );
}

function SimulatorSlider({
  icon,
  label,
  value,
  min,
  max,
  suffix,
  description,
  onChange,
}) {
  return (
    <div className="sim-control">

      <div className="sim-control-header">

        <div className="sim-control-label">

          <span>
            {icon}
          </span>

          <div>

            <strong>
              {label}
            </strong>

            <small>
              {description}
            </small>

          </div>

        </div>

        <strong className="sim-control-value">
          {value}
          {suffix}
        </strong>

      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
      />

    </div>
  );
}

function ScenarioCard({
  scenario,
  baseline,
  recommended,
}) {
  const reduction =
    baseline.carbon > 0
      ? ((baseline.carbon -
          scenario.carbon) /
          baseline.carbon) *
        100
      : 0;

  return (
    <div
      className={`scenario-card ${
        recommended
          ? "scenario-recommended"
          : ""
      }`}
    >

      {recommended && (
        <div className="recommended-tag">
          <Check size={12} />
          RECOMMENDED
        </div>
      )}

      <div className="scenario-icon">
        {scenario.icon}
      </div>

      <h4>
        {scenario.title}
      </h4>

      <p>
        {scenario.description}
      </p>

      <div className="scenario-carbon">

        <span>
          Estimated carbon
        </span>

        <strong>
          {scenario.carbon.toFixed(2)}
          <small>
            {" "}kg
          </small>
        </strong>

      </div>

      <div className="scenario-details">

        <div>

          <span>
            Energy
          </span>

          <strong>
            {scenario.energy.toFixed(1)}
            {" "}kWh
          </strong>

        </div>

        <div>

          <span>
            Cost
          </span>

          <strong>
            ₹{scenario.cost.toFixed(0)}
          </strong>

        </div>

        <div>

          <span>
            SLA Risk
          </span>

          <strong
            className={`risk-${scenario.sla.toLowerCase()}`}
          >
            {scenario.sla}
          </strong>

        </div>

      </div>

      <div className="scenario-reduction">

        <ArrowDownRight size={14} />

        {reduction > 0
          ? `${reduction.toFixed(
              1
            )}% lower carbon`
          : "Baseline scenario"}

      </div>

    </div>
  );
}

function DecisionStat({
  icon,
  label,
  value,
}) {
  return (
    <div className="decision-stat">

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

export default Simulator;