import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Cpu,
  Database,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";

function Analyzer({ onBack, onResult, analysis, onNavigate }) {
  const [workloadType, setWorkloadType] = useState(
    analysis?.workloadType || "AI Model Training"
  );

  const [gpus, setGpus] = useState(analysis?.gpus ?? 4);
  const [runtime, setRuntime] = useState(analysis?.runtime ?? 8);
  const [dataset, setDataset] = useState(analysis?.dataset ?? 250);
  const [checkpoint, setCheckpoint] = useState(analysis?.checkpoint ?? 30);
  const [deadline, setDeadline] = useState(analysis?.deadline ?? 12);
  const [gridIntensity, setGridIntensity] = useState(
    analysis?.gridIntensity ?? 396
  );

  const result = useMemo(() => {
    /*
      Transparent prototype calculation.

      Energy is estimated from:
      GPU demand × runtime × workload factor.

      Carbon is then influenced by:
      energy × grid carbon intensity

      Additional lifecycle overheads represent:
      checkpointing, transfer and storage.
    */

    const workloadFactor =
      workloadType === "AI Model Training"
        ? 0.72
        : workloadType === "Data Processing"
          ? 0.58
          : 0.45;

    const energy =
      gpus *
      runtime *
      workloadFactor;

    const computeCarbon =
      energy *
      (gridIntensity / 1000);

    const checkpointCarbon =
      (runtime * 60 / checkpoint) *
      0.018;

    const transferCarbon =
      (dataset / 100) *
      0.06;

    const storageCarbon =
      (dataset / 100) *
      0.032;

    const totalCarbon =
      computeCarbon +
      checkpointCarbon +
      transferCarbon +
      storageCarbon;

    const slaRisk =
      runtime <= deadline * 0.7
        ? "Low"
        : runtime <= deadline
          ? "Medium"
          : "High";

    return {
      energy,
      computeCarbon,
      checkpointCarbon,
      transferCarbon,
      storageCarbon,
      totalCarbon,
      slaRisk,
    };
  }, [
    workloadType,
    gpus,
    runtime,
    dataset,
    checkpoint,
    deadline,
    gridIntensity,
  ]);

  /*
    Send the latest analysis to the Dashboard.
  */
  const publishResult = () => {
    onResult({
      workloadType,
      gpus,
      runtime,
      dataset,
      checkpoint,
      deadline,
      gridIntensity,
      ...result,
    });
  };

  return (
    <div className="analyzer-page">

      <div className="analyzer-top">
        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Prototype analysis engine
        </div>
      </div>

      <div className="analyzer-heading">

        <div className="analyzer-icon">
          <Calculator size={23} />
        </div>

        <div>
          <p className="eyebrow">
            WORKLOAD INTELLIGENCE
          </p>

          <h2>
            Analyze a Cloud Workload
          </h2>

          <p>
            Configure the workload and generate a
            lifecycle-aware environmental profile.
          </p>
        </div>

      </div>

      <div className="analyzer-grid">

        <section className="panel analyzer-controls">

          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                WORKLOAD CONFIGURATION
              </p>

              <h3>
                Define your workload
              </h3>
            </div>
          </div>

          <label className="select-label">
            Workload type

            <select
              value={workloadType}
              onChange={(e) =>
                setWorkloadType(e.target.value)
              }
            >
              <option>
                AI Model Training
              </option>

              <option>
                Data Processing
              </option>

              <option>
                Machine Learning Inference
              </option>
            </select>
          </label>

          <AnalysisSlider
            icon={<Cpu size={17} />}
            label="GPU resources"
            value={gpus}
            min={1}
            max={16}
            suffix=" GPUs"
            onChange={setGpus}
          />

          <AnalysisSlider
            icon={<Timer size={17} />}
            label="Runtime"
            value={runtime}
            min={1}
            max={48}
            suffix=" hours"
            onChange={setRuntime}
          />

          <AnalysisSlider
            icon={<Database size={17} />}
            label="Dataset size"
            value={dataset}
            min={50}
            max={1000}
            step={50}
            suffix=" GB"
            onChange={setDataset}
          />

          <AnalysisSlider
            icon={<Network size={17} />}
            label="Checkpoint interval"
            value={checkpoint}
            min={10}
            max={120}
            step={10}
            suffix=" min"
            onChange={setCheckpoint}
          />

          <AnalysisSlider
            icon={<Timer size={17} />}
            label="Deadline"
            value={deadline}
            min={2}
            max={72}
            suffix=" hours"
            onChange={setDeadline}
          />

          <AnalysisSlider
            icon={<Zap size={17} />}
            label="Grid carbon intensity"
            value={gridIntensity}
            min={50}
            max={800}
            step={10}
            suffix=" gCO₂e/kWh"
            onChange={setGridIntensity}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              className="primary-button analyzer-apply"
              onClick={publishResult}
            >
              <CheckCircle2 size={17} />
              Apply analysis to Dashboard
            </button>

            {onNavigate && (
              <button
                type="button"
                className="secondary-button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#103322",
                  border: "1px solid #1c5e3c",
                  color: "#88f0b6",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => {
                  publishResult();
                  onNavigate("optimization");
                }}
              >
                <Sparkles size={16} />
                Run Full Optimization Pipeline →
              </button>
            )}
          </div>

        </section>

        <section className="analyzer-results">

          <div className="impact-result">

            <div>
              <p className="eyebrow">
                ESTIMATED LIFECYCLE IMPACT
              </p>

              <strong>
                {result.totalCarbon.toFixed(2)}
              </strong>

              <span>
                kg CO₂e
              </span>
            </div>

            <div className="result-note">
              Prototype estimate based on configured
              workload, infrastructure assumptions and
              grid intensity.
            </div>

          </div>

          <div className="result-metrics">

            <ResultMetric
              icon={<Zap size={18} />}
              label="Energy"
              value={`${result.energy.toFixed(1)} kWh`}
            />

            <ResultMetric
              icon={<Cpu size={18} />}
              label="Compute"
              value={`${result.computeCarbon.toFixed(2)} kg`}
            />

            <ResultMetric
              icon={<Network size={18} />}
              label="Transfer"
              value={`${result.transferCarbon.toFixed(2)} kg`}
            />

            <ResultMetric
              icon={<Database size={18} />}
              label="Storage"
              value={`${result.storageCarbon.toFixed(2)} kg`}
            />

          </div>

          <div className="panel carbon-profile">

            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  CARBON PROFILE
                </p>

                <h3>
                  Environmental hotspots
                </h3>
              </div>
            </div>

            <Hotspot
              label="GPU computation"
              value={result.computeCarbon}
              total={result.totalCarbon}
              icon={<Cpu size={16} />}
            />

            <Hotspot
              label="Checkpointing"
              value={result.checkpointCarbon}
              total={result.totalCarbon}
              icon={<RefreshCw size={16} />}
            />

            <Hotspot
              label="Data transfer"
              value={result.transferCarbon}
              total={result.totalCarbon}
              icon={<Network size={16} />}
            />

            <Hotspot
              label="Storage"
              value={result.storageCarbon}
              total={result.totalCarbon}
              icon={<Database size={16} />}
            />

          </div>

          <div className="panel analyzer-decision">

            <div className="decision-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <p className="eyebrow">
                DECISION ENGINE
              </p>

              <h3>
                {result.slaRisk === "Low"
                  ? "Workload deadline is comfortable."
                  : result.slaRisk === "Medium"
                    ? "Workload requires careful scheduling."
                    : "Workload may violate its deadline."}
              </h3>

              <p>
                Current SLA risk:
                {" "}
                <strong>
                  {result.slaRisk}
                </strong>
              </p>
            </div>

          </div>

        </section>

      </div>
    </div>
  );
}

function AnalysisSlider({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}) {
  return (
    <div className="analysis-slider">

      <div className="analysis-slider-header">

        <div>
          <span className="analysis-slider-icon">
            {icon}
          </span>

          <strong>
            {label}
          </strong>
        </div>

        <strong className="analysis-value">
          {value}
          {suffix}
        </strong>

      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
      />

    </div>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="result-metric">
      <div className="result-metric-icon">
        {icon}
      </div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function Hotspot({
  label,
  value,
  total,
  icon,
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  return (
    <div className="hotspot">

      <div className="hotspot-header">

        <div>
          <span className="hotspot-icon">
            {icon}
          </span>

          {label}
        </div>

        <strong>
          {value.toFixed(2)} kg
        </strong>

      </div>

      <div className="hotspot-track">
        <div
          className="hotspot-fill"
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />
      </div>

    </div>
  );
}

export default Analyzer;