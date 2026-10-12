import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Cloud,
  Cpu,
  DollarSign,
  Eye,
  Info,
  Leaf,
  Network,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";

import "./OptimizationEngine.css";
import {
  REGIONS,
  TIME_WINDOWS,
  evaluateOptimalPlan,
  calculateMultiFactorScore,
  evaluateTopExecutionPlans,
  generateExplainableComparison,
} from "./optimizationData";

function OptimizationEngine({
  onBack,
  analysis,
  onApply,
  baselineCarbon,
}) {
  const [selectedRegionOverride, setSelectedRegionOverride] = useState(null);
  const [selectedWindowOverride, setSelectedWindowOverride] = useState(null);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [carbonBudgetInput, setCarbonBudgetInput] = useState("");

  // Current real workload values from state
  const workloadType = analysis?.workloadType || "AI Model Training";
  const gpus = Number(analysis?.gpus) || 4;
  const runtime = Number(analysis?.runtime) || 8;
  const dataset = Number(analysis?.dataset) || 250;
  const checkpoint = Number(analysis?.checkpoint) || 30;
  const deadline = Number(analysis?.deadline) || 12;
  const currentIntensity = Number(analysis?.gridIntensity) || 396;
  const energy = Number(analysis?.energy) || 21.3;

  const rawBaseline = Number(baselineCarbon ?? analysis?.baselineCarbon ?? 8.42);
  const baselineTotalCarbon = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

  const baselineComputeCarbon = typeof analysis?.computeCarbon === "number" && !isNaN(analysis.computeCarbon)
    ? analysis.computeCarbon
    : (energy * (currentIntensity / 1000));
  const lifecycleOverhead = Math.max(0, baselineTotalCarbon - baselineComputeCarbon);

  // Evaluate the algorithmic combined optimal plan using canonical baseline
  const defaultPlan = useMemo(() => {
    return evaluateOptimalPlan(analysis, baselineTotalCarbon);
  }, [analysis, baselineTotalCarbon]);

  // Active plan (either optimal or user-inspected candidate)
  const activePlan = useMemo(() => {
    const region = selectedRegionOverride || defaultPlan.region;
    const window = selectedWindowOverride || defaultPlan.window;

    const { totalScore, slaStatus, breakdown } = calculateMultiFactorScore({
      region,
      window,
      analysis,
    });

    const computeCarbon = Number((energy * (region.carbonIntensity / 1000)).toFixed(2));
    const totalCarbon = Number((computeCarbon + lifecycleOverhead).toFixed(2));
    const carbonSaved = Number(Math.max(0, baselineTotalCarbon - totalCarbon).toFixed(2));
    const carbonReduction = baselineTotalCarbon > 0
      ? Number(((carbonSaved / baselineTotalCarbon) * 100).toFixed(1))
      : 0;

    return {
      region,
      window,
      score: totalScore,
      slaStatus,
      breakdown,
      energy,
      computeCarbon,
      lifecycleOverhead,
      totalCarbon,
      optimizedCarbon: totalCarbon,
      baselineCarbon: baselineTotalCarbon,
      carbonSaved,
      carbonReduction,
    };
  }, [selectedRegionOverride, selectedWindowOverride, defaultPlan, analysis, energy, lifecycleOverhead, baselineTotalCarbon]);

  const handleApply = () => {
    if (onApply) {
      onApply(activePlan);
      setAppliedNotice(true);
    }
  };

  const handleApplyCandidate = (plan) => {
    if (onApply) {
      onApply(plan);
      setAppliedNotice(true);
    }
  };

  // Top 3 feasible execution plans evaluated across cloud regions and execution windows
  const decisionLabData = useMemo(() => {
    const budget = carbonBudgetInput !== "" && !isNaN(Number(carbonBudgetInput))
      ? Number(carbonBudgetInput)
      : null;
    return evaluateTopExecutionPlans({
      analysis,
      baselineCarbon: baselineTotalCarbon,
      carbonBudget: budget,
      windowOverride: null,
    });
  }, [analysis, baselineTotalCarbon, carbonBudgetInput]);

  // Explainable multi-factor trade-offs and plain-language ranking rationale
  const explainableComparison = useMemo(() => {
    const budget = carbonBudgetInput !== "" && !isNaN(Number(carbonBudgetInput))
      ? Number(carbonBudgetInput)
      : null;
    return generateExplainableComparison({
      topPlans: decisionLabData.topPlans,
      baselineCarbon: baselineTotalCarbon,
      carbonBudget: budget,
      runtime,
      deadline,
    });
  }, [decisionLabData.topPlans, baselineTotalCarbon, carbonBudgetInput, runtime, deadline]);

  // Current region display name (e.g. baseline Mumbai or previous selected)
  const currentRegionLabel = currentIntensity === 396
    ? "Asia Pacific (Mumbai)"
    : currentIntensity === 74
      ? "Nordic (Stockholm)"
      : currentIntensity === 182
        ? "Europe West (Frankfurt)"
        : currentIntensity === 241
          ? "North America (Oregon)"
          : `Current Grid (${currentIntensity} gCO₂e/kWh)`;

  return (
    <div className="optimization-page">
      {/* TOP NAVIGATION & STATUS */}
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
          Optimization decision engine active
        </div>
      </div>

      {/* PAGE HEADING */}
      <section className="optimization-heading">
        <div className="optimization-heading-icon">
          <Sparkles size={25} />
        </div>

        <div>
          <p className="eyebrow">
            MULTI-FACTOR OPTIMIZATION DECISION ENGINE
          </p>

          <h2>
            Unified Execution Decision Plan
          </h2>

          <p>
            Synthesizes workload characteristics, real-time regional grid intensities,
            renewable availability and scheduling forecasts into one actionable execution plan.
          </p>
        </div>
      </section>

      {/* WORKLOAD PROFILE SUMMARY: CONNECTED TO REAL STATE */}
      <section className="workload-context-bar">
        <div className="context-bar-header">
          <span className="context-badge">
            <Cpu size={14} /> ACTIVE WORKLOAD PROFILE
          </span>
          <span className="context-note">
            Inputs synchronized from Workload Analyzer
          </span>
        </div>

        <div className="context-grid">
          <div className="context-item">
            <span>Workload</span>
            <strong>{workloadType}</strong>
          </div>
          <div className="context-item">
            <span>Compute</span>
            <strong>{gpus} × GPU</strong>
          </div>
          <div className="context-item">
            <span>Runtime</span>
            <strong>{runtime} hrs</strong>
          </div>
          <div className="context-item">
            <span>Energy Demand</span>
            <strong>{energy.toFixed(1)} kWh</strong>
          </div>
          <div className="context-item">
            <span>Dataset</span>
            <strong>{dataset} GB</strong>
          </div>
          <div className="context-item">
            <span>Checkpoint</span>
            <strong>{checkpoint} min</strong>
          </div>
          <div className="context-item">
            <span>Deadline</span>
            <strong>{deadline} hrs</strong>
          </div>
          <div className="context-item">
            <span>Current Grid</span>
            <strong>{currentIntensity} gCO₂e/kWh</strong>
          </div>
          <div className="context-item highlight">
            <span>Current Footprint</span>
            <strong>{baselineTotalCarbon.toFixed(2)} kg CO₂e</strong>
          </div>
        </div>
      </section>

      {/* MAIN RECOMMENDATION HERO */}
      <section className="optimization-hero">
        <div className="optimization-hero-icon">
          <Leaf size={27} />
        </div>

        <div className="optimization-hero-content">
          <div className="hero-top-row">
            <p className="eyebrow">
              RECOMMENDED COMBINED EXECUTION PLAN
            </p>
            {activePlan.region.id === defaultPlan.region.id && activePlan.window.delay === defaultPlan.window.delay && (
              <span className="best-badge">
                <Check size={12} /> Optimal Selection
              </span>
            )}
          </div>

          <h3>
            Run in {activePlan.region.name} at {activePlan.window.time}
          </h3>

          <p>
            CarbonLens evaluates cloud region and execution window jointly.
            Placing this workload in <strong>{activePlan.region.location}</strong> scheduled for{" "}
            <strong>{activePlan.window.time}</strong> yields maximum carbon reduction while strictly satisfying the {deadline}-hour SLA deadline.
          </p>

          <div className="optimization-tags">
            <span>
              <Cloud size={14} />
              {activePlan.region.location}
            </span>

            <span>
              <Clock3 size={14} />
              {activePlan.window.time} ({activePlan.window.label})
            </span>

            <span>
              <Leaf size={14} />
              {activePlan.region.renewable}% renewable
            </span>

            <span>
              <Zap size={14} />
              {activePlan.region.carbonIntensity} gCO₂e/kWh
            </span>

            <span>
              <ShieldCheck size={14} />
              SLA: {activePlan.slaStatus} Risk
            </span>
          </div>

          {/* INTERACTIVE TIME WINDOW SELECTOR */}
          <div className="window-selector-row">
            <span className="selector-label">
              <Clock3 size={12} /> Candidate Execution Windows (within {deadline}h deadline):
            </span>
            <div className="window-pills">
              {TIME_WINDOWS.filter((w) => w.delay < deadline).map((w) => {
                const isSelected = activePlan.window.delay === w.delay;
                const isBest = defaultPlan.window.delay === w.delay;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`window-pill ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedWindowOverride(w)}
                  >
                    <span>{w.time}</span>
                    {isBest && <span className="pill-tag">Optimal</span>}
                  </button>
                );
              })}
              {(selectedRegionOverride || selectedWindowOverride) && (
                <button
                  type="button"
                  className="reset-override-btn"
                  onClick={() => {
                    setSelectedRegionOverride(null);
                    setSelectedWindowOverride(null);
                  }}
                >
                  ↺ Reset to Optimal
                </button>
              )}
            </div>
          </div>

          {/* ACTION BUTTON: APPLY OPTIMIZATION */}
          <div className="optimization-actions">
            <button
              className="primary-button apply-optimization-button"
              onClick={handleApply}
            >
              <Sparkles size={18} />
              Apply Optimization
            </button>

            {appliedNotice && (
              <span className="apply-confirmation">
                <CheckCircle2 size={16} /> Applied! Dashboard and Decision History updated.
              </span>
            )}
          </div>
        </div>

        <div className="optimization-score">
          <span>
            Optimization Score
          </span>

          <strong>
            {activePlan.score}
          </strong>

          <small>
            / 100
          </small>

          <div className="score-label">
            Multi-factor Rating
          </div>
        </div>
      </section>

      {/* KEY METRICS GRID */}
      <section className="optimization-grid">
        <div className="optimization-card">
          <div className="optimization-card-icon">
            <TrendingDown size={19} />
          </div>
          <span>Carbon reduction</span>
          <strong>{activePlan.carbonReduction.toFixed(1)}%</strong>
          <small>Total lifecycle reduction</small>
        </div>

        <div className="optimization-card">
          <div className="optimization-card-icon">
            <Leaf size={19} />
          </div>
          <span>Carbon intensity</span>
          <strong>{activePlan.region.carbonIntensity}</strong>
          <small>gCO₂e/kWh regional grid</small>
        </div>

        <div className="optimization-card">
          <div className="optimization-card-icon">
            <Zap size={19} />
          </div>
          <span>Optimized carbon</span>
          <strong>{activePlan.totalCarbon.toFixed(2)}</strong>
          <small>kg CO₂e (Compute: {activePlan.computeCarbon.toFixed(2)} kg)</small>
        </div>

        <div className="optimization-card">
          <div className="optimization-card-icon">
            <Clock3 size={19} />
          </div>
          <span>Carbon saved</span>
          <strong>{activePlan.carbonSaved.toFixed(2)}</strong>
          <small>kg CO₂e avoided</small>
        </div>
      </section>

      {/* WHY THIS RECOMMENDATION WAS SELECTED: DECISION FACTORS */}
      <section className="factor-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              DECISION FACTORS
            </p>
            <h3>
              Why CarbonLens selected this strategy
            </h3>
            <p className="panel-subtext">
              Calculated using a transparent, multi-factor deterministic scoring model.
            </p>
          </div>

          <span className="comparison-badge">
            Explainable AI Engine
          </span>
        </div>

        <div className="factor-grid">
          <Factor
            icon={<Leaf size={18} />}
            title="Environmental impact"
            value={`${activePlan.region.carbonIntensity} gCO₂e/kWh`}
            detail="Lowest carbon intensity available"
          />

          <Factor
            icon={<Zap size={18} />}
            title="Renewable energy"
            value={`${activePlan.region.renewable}%`}
            detail="High hydro/wind grid penetration"
          />

          <Factor
            icon={<Clock3 size={18} />}
            title="Execution timing"
            value={`${activePlan.window.time}`}
            detail={`${activePlan.window.label} (${activePlan.window.delay}h delay)`}
          />

          <Factor
            icon={<DollarSign size={18} />}
            title="Estimated cost"
            value={`₹${activePlan.region.cost}`}
            detail="Competitive cloud GPU instance tier"
          />

          <Factor
            icon={<Network size={18} />}
            title="Latency"
            value={`${activePlan.region.latency} ms`}
            detail="Acceptable round-trip network time"
          />

          <Factor
            icon={<ShieldCheck size={18} />}
            title="SLA feasibility"
            value={`${activePlan.slaStatus} Risk`}
            detail={`Runtime (${runtime}h) + Delay (${activePlan.window.delay}h) ≤ Deadline (${deadline}h)`}
          />
        </div>

        {/* FACTOR SCORE BREAKDOWN */}
        <div className="factor-breakdown-bar">
          <div className="breakdown-title">
            <span>Score Factor Contribution (Deterministic Weights):</span>
          </div>
          <div className="breakdown-chips">
            <span className="chip">Carbon Impact (40%): <strong>{activePlan.breakdown.carbonFactor}</strong>/100</span>
            <span className="chip">Renewables (25%): <strong>{activePlan.breakdown.renewableFactor}</strong>/100</span>
            <span className="chip">Cost (15%): <strong>{activePlan.breakdown.costFactor}</strong>/100</span>
            <span className="chip">Latency (10%): <strong>{activePlan.breakdown.latencyFactor}</strong>/100</span>
            <span className="chip">SLA Feasibility (10%): <strong>{activePlan.breakdown.slaFactor}</strong>/100</span>
          </div>
        </div>
      </section>

      {/* SMART DECISION LAB: EXPLAINABLE MULTI-PLAN OPTIMIZATION */}
      <section className="decision-lab-section">
        <div className="decision-lab-header">
          <div className="decision-lab-title-area">
            <div className="lab-badge-row">
              <span className="lab-badge">
                <Sliders size={14} /> SMART DECISION LAB
              </span>
              <span className="lab-tag">
                <Award size={12} /> Explainable Multi-Plan Optimization
              </span>
            </div>
            <h3>Top Feasible Execution Plans & Comparative Trade-Off Analysis</h3>
            <p>
              Simultaneously evaluates region and time-window permutations against your workload runtime ({runtime}h)
              and SLA deadline ({deadline}h). Ranks the best feasible candidates using deterministic multi-factor scoring
              and validates against your target carbon budget.
            </p>
          </div>
        </div>

        {/* CARBON BUDGET CONTROLS */}
        <div className="decision-lab-budget-bar">
          <div className="budget-bar-label">
            <Target size={18} />
            <div>
              <strong>Target Carbon Budget (kg CO₂e)</strong>
              <span>Optional threshold to evaluate lifecycle emissions compliance</span>
            </div>
          </div>

          <div className="budget-controls">
            <div className="budget-input-wrapper">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                placeholder="e.g. 6.00"
                value={carbonBudgetInput}
                onChange={(e) => setCarbonBudgetInput(e.target.value)}
                className="budget-number-input"
              />
              <span className="budget-unit">kg CO₂e</span>
            </div>

            <div className="budget-presets">
              <span className="presets-label">Presets:</span>
              <button
                type="button"
                className={`budget-preset-btn ${carbonBudgetInput === "6.0" ? "active" : ""}`}
                onClick={() => setCarbonBudgetInput("6.0")}
              >
                6.0 kg (Strict)
              </button>
              <button
                type="button"
                className={`budget-preset-btn ${carbonBudgetInput === "7.5" ? "active" : ""}`}
                onClick={() => setCarbonBudgetInput("7.5")}
              >
                7.5 kg (Moderate)
              </button>
              <button
                type="button"
                className={`budget-preset-btn ${carbonBudgetInput === "9.0" ? "active" : ""}`}
                onClick={() => setCarbonBudgetInput("9.0")}
              >
                9.0 kg (Relaxed)
              </button>
              {carbonBudgetInput !== "" && (
                <button
                  type="button"
                  className="budget-clear-btn"
                  onClick={() => setCarbonBudgetInput("")}
                >
                  Clear Budget
                </button>
              )}
            </div>
          </div>

          <div className="budget-status-pill">
            {carbonBudgetInput !== "" && !isNaN(Number(carbonBudgetInput)) ? (
              <span>
                Budget: <strong>{Number(carbonBudgetInput).toFixed(2)} kg CO₂e</strong> ({
                  decisionLabData.topPlans.filter((p) => p.meetsBudget).length
                } of {decisionLabData.topPlans.length} plans satisfy target)
              </span>
            ) : (
              <span>
                Budget: <em>Unconstrained</em> (evaluated solely by multi-factor score)
              </span>
            )}
          </div>
        </div>

        {/* TOP CANDIDATE CARDS */}
        {decisionLabData.topPlans.length === 0 ? (
          <div className="decision-lab-empty">
            <AlertTriangle size={24} />
            <div>
              <strong>No Feasible Execution Plans Found</strong>
              <p>
                Workload runtime ({runtime}h) combined with scheduling delay exceeds the {deadline}-hour SLA deadline.
                Adjust the deadline in the Workload Analyzer to explore candidate plans.
              </p>
            </div>
          </div>
        ) : (
          <>
            {decisionLabData.topPlans.length < 3 && (
              <div className="decision-lab-notice">
                <Info size={16} />
                <span>
                  Showing {decisionLabData.topPlans.length} feasible plan{decisionLabData.topPlans.length > 1 ? "s" : ""}.
                  Remaining combinations were rejected because delay + runtime exceeds the {deadline}-hour deadline.
                </span>
              </div>
            )}

            <div className="decision-plans-grid">
              {decisionLabData.topPlans.map((plan) => {
                const isSelectedInHero =
                  activePlan.region.id === plan.region.id &&
                  activePlan.window.delay === plan.window.delay;

                return (
                  <div
                    key={plan.id}
                    className={`decision-plan-card rank-${plan.rank} ${isSelectedInHero ? "previewing-hero" : ""}`}
                  >
                    {/* CARD HEADER */}
                    <div className="plan-card-top">
                      <div className="plan-rank-badge-group">
                        <span className={`plan-rank-badge ${plan.badgeClass}`}>
                          {plan.rankTitle}
                        </span>
                        <span className="plan-role-label">
                          {plan.roleDescription}
                        </span>
                      </div>
                      <div className="plan-score-badge">
                        <span>Score</span>
                        <strong>{plan.score}</strong>
                        <small>/100</small>
                      </div>
                    </div>

                    {/* REGION & LOCATION */}
                    <div className="plan-identity">
                      <h4>{plan.region.name}</h4>
                      <p className="plan-location">
                        <Cloud size={13} /> {plan.region.location}
                      </p>
                      <div className="plan-timing-tag">
                        <Clock3 size={13} />
                        <strong>{plan.window.time}</strong>
                        <span>({plan.window.delay}h delay · {plan.totalExecutionTime}h total)</span>
                      </div>
                    </div>

                    {/* CONSTRAINT FEASIBILITY BADGES */}
                    <div className="plan-constraints-row">
                      <span className={`constraint-badge ${plan.isDeadlineFeasible ? "feasible" : "infeasible"}`}>
                        <ShieldCheck size={12} />
                        {plan.isDeadlineFeasible
                          ? `Meets SLA (${plan.totalExecutionTime}h ≤ ${deadline}h)`
                          : `Violates SLA (${plan.totalExecutionTime}h > ${deadline}h)`}
                      </span>

                      {plan.meetsBudget !== null && (
                        <span className={`constraint-badge ${plan.meetsBudget ? "budget-pass" : "budget-fail"}`}>
                          <Target size={12} />
                          {plan.meetsBudget
                            ? `Meets Budget (${plan.totalCarbon.toFixed(2)} ≤ ${Number(carbonBudgetInput).toFixed(2)} kg)`
                            : `Exceeds Budget (+${plan.budgetDifference > 0 ? plan.budgetDifference.toFixed(2) : 0} kg)`}
                        </span>
                      )}

                      <span className={`constraint-badge ${plan.isFullyFeasible ? "fully-feasible" : "partially-feasible"}`}>
                        {plan.isFullyFeasible ? (
                          <>
                            <Check size={12} /> Fully Feasible
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} /> Budget Constrained
                          </>
                        )}
                      </span>
                    </div>

                    {/* METRIC CHIPS */}
                    <div className="plan-metrics-grid">
                      <div className="plan-metric-box highlight">
                        <span>Total Carbon</span>
                        <strong>{plan.totalCarbon.toFixed(2)} kg</strong>
                        <small>CO₂e lifecycle</small>
                      </div>

                      <div className="plan-metric-box highlight-green">
                        <span>Carbon Saved</span>
                        <strong>{plan.carbonSaved.toFixed(2)} kg</strong>
                        <small>{plan.carbonReduction.toFixed(1)}% reduction</small>
                      </div>

                      <div className="plan-metric-box">
                        <span>Grid Intensity</span>
                        <strong>{plan.region.carbonIntensity}</strong>
                        <small>gCO₂e/kWh</small>
                      </div>

                      <div className="plan-metric-box">
                        <span>Renewable Share</span>
                        <strong>{plan.region.renewable}%</strong>
                        <small>Clean grid energy</small>
                      </div>

                      <div className="plan-metric-box">
                        <span>Estimated Cost</span>
                        <strong>₹{plan.region.cost}</strong>
                        <small>Instance tier</small>
                      </div>

                      <div className="plan-metric-box">
                        <span>Network Latency</span>
                        <strong>{plan.region.latency} ms</strong>
                        <small>Round-trip time</small>
                      </div>
                    </div>

                    {/* CARD ACTIONS */}
                    <div className="plan-card-actions">
                      <button
                        type="button"
                        className="plan-apply-btn"
                        onClick={() => handleApplyCandidate(plan)}
                      >
                        <Sparkles size={14} />
                        Apply Plan
                      </button>

                      <button
                        type="button"
                        className={`plan-inspect-btn ${isSelectedInHero ? "active" : ""}`}
                        onClick={() => {
                          setSelectedRegionOverride(plan.region);
                          setSelectedWindowOverride(plan.window);
                        }}
                      >
                        <Eye size={14} />
                        {isSelectedInHero ? "Previewing Above" : "Inspect in Engine"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* EXPLAINABLE COMPARISON PANEL */}
        <div className="explainable-ranking-panel">
          <div className="explainable-heading">
            <Award size={20} />
            <div>
              <h4>Explainable Ranking & Multi-Factor Rationale</h4>
              <p>Transparent evaluation breakdown based on deterministic weights (Carbon 40%, Renewables 25%, Cost 15%, Latency 10%, SLA 10%)</p>
            </div>
          </div>

          {/* WINNER SUMMARY BANNER */}
          <div className="winner-summary-card">
            <div className="winner-summary-icon">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <strong>Why the Recommended Plan Ranks #1:</strong>
              <p>{explainableComparison.winnerSummary}</p>
            </div>
          </div>

          {/* BUDGET SUMMARY BANNER */}
          <div className="budget-summary-card">
            <div className="budget-summary-icon">
              <Target size={18} />
            </div>
            <div>
              <strong>Carbon Budget Assessment:</strong>
              <p>{explainableComparison.budgetSummary}</p>
            </div>
          </div>

          {/* TRADE-OFF COMPARISONS */}
          {explainableComparison.tradeOffs.length > 0 && (
            <div className="trade-offs-container">
              <h5>Head-to-Head Candidate Trade-Offs</h5>
              <div className="trade-offs-list">
                {explainableComparison.tradeOffs.map((tradeOff, index) => (
                  <div key={index} className="trade-off-card">
                    <div className="trade-off-header">
                      <h6>{tradeOff.versus}</h6>
                    </div>
                    <p className="trade-off-text">{tradeOff.explanation}</p>

                    <div className="trade-off-table-wrapper">
                      <table className="trade-off-table">
                        <thead>
                          <tr>
                            <th>Factor Metric</th>
                            <th>{decisionLabData.topPlans[0]?.rankTitle}</th>
                            <th>{decisionLabData.topPlans[index + 1]?.rankTitle}</th>
                            <th>Winner Advantage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tradeOff.keyDifferences.map((diff, dIdx) => (
                            <tr key={dIdx}>
                              <td>{diff.label}</td>
                              <td className={diff.better === 1 ? "cell-better" : ""}>
                                {diff.v1} {diff.better === 1 && "✓"}
                              </td>
                              <td className={diff.better === 2 ? "cell-better" : ""}>
                                {diff.v2} {diff.better === 2 && "✓"}
                              </td>
                              <td>
                                {diff.better === 1 ? (
                                  <span className="diff-pill p1-win">Rank #1 Advantage</span>
                                ) : (
                                  <span className="diff-pill alt-win">Alternative Advantage</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BEFORE VS AFTER SECTION */}
      <section className="comparison-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              BEFORE VS AFTER
            </p>
            <h3>
              Optimization impact comparison
            </h3>
          </div>
        </div>

        <div className="before-after">
          <div className="before-column">
            <span>CURRENT EXECUTION</span>
            <h4>{baselineTotalCarbon.toFixed(2)} kg</h4>
            <p>{currentRegionLabel}</p>

            <div className="impact-bar">
              <div style={{ width: "100%" }} />
            </div>

            <div className="before-metrics">
              <div>
                <span>Grid intensity:</span>
                <strong>{currentIntensity} gCO₂e/kWh</strong>
              </div>
              <div>
                <span>Compute carbon:</span>
                <strong>{baselineComputeCarbon.toFixed(2)} kg</strong>
              </div>
            </div>
          </div>

          <div className="optimization-arrow">
            →
          </div>

          <div className="after-column">
            <span>OPTIMIZED EXECUTION</span>
            <h4>{activePlan.totalCarbon.toFixed(2)} kg</h4>
            <p>{activePlan.region.name} ({activePlan.region.location}) · {activePlan.window.time}</p>

            <div className="impact-bar">
              <div
                style={{
                  width: `${Math.max(
                    8,
                    (activePlan.totalCarbon / baselineTotalCarbon) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="before-metrics">
              <div>
                <span>Grid intensity:</span>
                <strong>{activePlan.region.carbonIntensity} gCO₂e/kWh</strong>
              </div>
              <div>
                <span>Compute carbon:</span>
                <strong>{activePlan.computeCarbon.toFixed(2)} kg</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="saving-banner">
          <div>
            <Leaf size={20} />
            <div>
              <span>Estimated carbon saving</span>
              <strong>{activePlan.carbonSaved.toFixed(2)} kg CO₂e saved</strong>
            </div>
          </div>

          <div className="saving-right">
            <span className="reduction-pill">
              {activePlan.carbonReduction.toFixed(1)}% reduction
            </span>
            <button
              className="secondary-button"
              onClick={handleApply}
            >
              Apply to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* CANDIDATE EVALUATION MATRIX */}
      <section className="strategy-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              REGION EVALUATION MATRIX
            </p>
            <h3>
              Compare all candidate cloud regions
            </h3>
          </div>
          <span className="comparison-badge">
            4 Regions Analyzed
          </span>
        </div>

        <div className="candidate-table-wrapper">
          <table className="candidate-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Location</th>
                <th>Carbon Intensity</th>
                <th>Renewable Share</th>
                <th>Cost</th>
                <th>Latency</th>
                <th>SLA Risk</th>
                <th>Optimization Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((region) => {
                const isOptimal = region.id === defaultPlan.region.id;
                const isSelected = region.id === activePlan.region.id;
                const { totalScore, slaStatus } = calculateMultiFactorScore({
                  region,
                  window: activePlan.window,
                  analysis,
                });

                return (
                  <tr
                    key={region.id}
                    className={`${isOptimal ? "row-optimal" : ""} ${isSelected ? "row-selected" : ""}`}
                    onClick={() => setSelectedRegionOverride(region)}
                  >
                    <td>
                      <strong>{region.name}</strong>
                      {isOptimal && <span className="table-tag">Recommended</span>}
                    </td>
                    <td>{region.location}</td>
                    <td>
                      <span className="cell-intensity">
                        {region.carbonIntensity} gCO₂e/kWh
                      </span>
                    </td>
                    <td>{region.renewable}%</td>
                    <td>₹{region.cost}</td>
                    <td>{region.latency} ms</td>
                    <td>
                      <span className={`sla-tag sla-${slaStatus.toLowerCase()}`}>
                        {slaStatus}
                      </span>
                    </td>
                    <td>
                      <strong>{totalScore}</strong>/100
                    </td>
                    <td>
                      <button
                        className={`table-select-btn ${isSelected ? "selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRegionOverride(region);
                        }}
                      >
                        {isSelected ? "Selected" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLOUD-AGNOSTIC PROTOTYPE NOTE */}
      <section className="optimization-insight">
        <div className="optimization-insight-icon">
          <Info size={20} />
        </div>

        <div>
          <p className="eyebrow">
            ARCHITECTURE NOTICE
          </p>

          <h3>
            Cloud-Agnostic Prototype Architecture
          </h3>

          <p>
            CarbonLens operates on a cloud-agnostic simulation layer utilizing regional carbon intensity models.
            The modular engine is designed for plug-and-play integration with real cloud provider carbon APIs
            (e.g., AWS Customer Carbon Footprint Tool, Google Cloud Carbon Sense Suite, Microsoft Azure Emissions Impact Dashboard)
            and live grid telemetry sources (Electricity Maps, WattTime).
          </p>
        </div>
      </section>
    </div>
  );
}

function Factor({
  icon,
  title,
  value,
  detail,
}) {
  return (
    <div className="factor-item">
      <div className="factor-icon">
        {icon}
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

export default OptimizationEngine;