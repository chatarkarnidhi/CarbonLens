import { useState, useEffect } from "react";
import {
  Activity,
  ArrowDownRight,
  CalendarClock,
  Check,
  Clock3,
  Cloud,
  Cpu,
  Gauge,
  History,
  Leaf,
  Network,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import "./App.css";

import Analyzer from "./Analyzer";
import Simulator from "./Simulator";
import Resources from "./Resources";
import Scheduler from "./Scheduler";
import OptimizationEngine from "./OptimizationEngine";
import DecisionHistory from "./DecisionHistory";
import CarbonSummary from "./CarbonSummary";
import CarbonScore from "./CarbonScore";
import ReportExport from "./ReportExport";
import OptimizationConfidence from "./OptimizationConfidence";

const STORAGE_KEY = "carbonlens_decision_history";

function getStoredHistory() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem("carbonlens_history") ||
      window.localStorage.getItem("decision_history");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item === "object");
  } catch (error) {
    console.warn("Failed to read decision history from localStorage:", error);
    return [];
  }
}

function saveStoredHistory(records) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const data = JSON.stringify(Array.isArray(records) ? records : []);
      window.localStorage.setItem(STORAGE_KEY, data);
    }
  } catch (error) {
    console.warn("Failed to save decision history to localStorage:", error);
  }
}


function getInitialAppliedPlan(savedHistory) {
  if (!Array.isArray(savedHistory) || savedHistory.length === 0) return null;
  const latest = savedHistory[0];
  if (!latest || typeof latest !== "object") return null;

  const rawBaseline = Number(latest.baselineCarbon || defaultAnalysis.totalCarbon);
  const baseline = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : defaultAnalysis.totalCarbon;

  const rawOpt = Number(latest.optimizedCarbon ?? latest.totalCarbon);
  const optCarbon = !isNaN(rawOpt) && rawOpt > 0 ? Number(rawOpt.toFixed(2)) : baseline;

  const saved = Number(Math.max(0, baseline - optCarbon).toFixed(2));
  const reduction = baseline > 0 ? Number(((saved / baseline) * 100).toFixed(1)) : 0;

  return {
    region: {
      name: latest.regionName || latest.region || "Nordic",
      location: latest.location || "Stockholm",
      carbonIntensity: Number(latest.carbonIntensity ?? 74),
      renewable: Number(latest.renewable ?? 91),
      cost: Number(latest.cost ?? 171),
      latency: Number(latest.latency ?? 126),
      sla: latest.slaStatus || latest.sla || "Low",
    },
    window: {
      time: latest.executionWindow || latest.execution || "+5 hours",
      label: "Optimized window",
      carbonIntensity: Number(latest.carbonIntensity ?? 74),
      renewable: Number(latest.renewable ?? 91),
    },
    score: latest.score ?? latest.optimizationScore ?? 85,
    slaStatus: latest.slaStatus || latest.sla || "Low",
    computeCarbon: Number(latest.computeCarbon ?? (optCarbon * 0.4)),
    totalCarbon: optCarbon,
    optimizedCarbon: optCarbon,
    baselineCarbon: baseline,
    carbonSaved: saved,
    carbonReduction: reduction,
  };
}


const defaultAnalysis = {
  workloadType: "AI Model Training",
  gpus: 4,
  runtime: 8,
  dataset: 250,
  checkpoint: 30,
  deadline: 12,
  gridIntensity: 396,
  energy: 21.3,
  computeCarbon: 4.05,
  checkpointCarbon: 1.18,
  transferCarbon: 0.91,
  storageCarbon: 0.76,
  totalCarbon: 8.42,
  slaRisk: "Low",
};


function App() {

  const [page, setPage] =
    useState("dashboard");

  const [history, setHistory] =
    useState(() => getStoredHistory());

  const initialPlan = history.length > 0 ? getInitialAppliedPlan(history) : null;

  const [optimizedPlan, setOptimizedPlan] =
    useState(() => initialPlan);

  const [baselineCarbon, setBaselineCarbon] =
    useState(() => (initialPlan?.baselineCarbon ? Number(initialPlan.baselineCarbon) : defaultAnalysis.totalCarbon));

  const [analysis, setAnalysis] =
    useState(() => {
      if (initialPlan) {
        return {
          ...defaultAnalysis,
          gridIntensity: initialPlan.region.carbonIntensity,
          computeCarbon: initialPlan.computeCarbon,
          totalCarbon: initialPlan.totalCarbon,
        };
      }
      return defaultAnalysis;
    });

  const [selectedRegion, setSelectedRegion] =
    useState(() => (initialPlan ? initialPlan.region : null));

  const [scheduledWindow, setScheduledWindow] =
    useState(() => (initialPlan ? initialPlan.window : null));

  useEffect(() => {
    saveStoredHistory(history);
  }, [history]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (
        e.key === STORAGE_KEY ||
        e.key === "carbonlens_history" ||
        e.key === "decision_history"
      ) {
        setHistory(getStoredHistory());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);


  const updateAnalysis = (newResult) => {
    setAnalysis(newResult);
    setBaselineCarbon(newResult.totalCarbon);
    setSelectedRegion(null);
    setScheduledWindow(null);
    setOptimizedPlan(null);
    setPage("dashboard");
  };


  const updateRegion = (region) => {
    const newIntensity =
      region.carbonIntensity;

    const newComputeCarbon =
      analysis.energy *
      (newIntensity / 1000);

    const lifecycleOverhead =
      analysis.totalCarbon -
      analysis.computeCarbon;

    const newTotalCarbon =
      newComputeCarbon +
      lifecycleOverhead;

    setAnalysis({
      ...analysis,
      gridIntensity: newIntensity,
      computeCarbon: newComputeCarbon,
      totalCarbon: newTotalCarbon,
    });

    setSelectedRegion(region);
    setScheduledWindow(null);
    setOptimizedPlan(null);
    setPage("dashboard");
  };


  const applyScheduledWindow = (
    window,
    totalCarbon,
    computeCarbon
  ) => {
    setAnalysis({
      ...analysis,
      gridIntensity:
        window.carbonIntensity,
      computeCarbon:
        computeCarbon,
      totalCarbon:
        totalCarbon,
    });

    setScheduledWindow(window);
    setSelectedRegion(null);
    setOptimizedPlan(null);
    setPage("dashboard");
  };


  const updateSimulator = (result) => {
    setAnalysis((previous) => ({
      ...previous,
      totalCarbon:
        result.totalCarbon,
      computeCarbon:
        result.computeCarbon,
      energy:
        result.scenario.energy,
      slaRisk:
        result.scenario.sla,
    }));

    setSelectedRegion(null);
    setScheduledWindow(null);
    setOptimizedPlan(null);
    setPage("dashboard");
  };


  const applyOptimization = (plan) => {
    const rawBaseline = Number(baselineCarbon ?? analysis?.baselineCarbon ?? 8.42);
    const baseline = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

    const rawOptimized = typeof plan.totalCarbon === "number" && !isNaN(plan.totalCarbon)
      ? plan.totalCarbon
      : (typeof plan.optimizedCarbon === "number" && !isNaN(plan.optimizedCarbon)
          ? plan.optimizedCarbon
          : (plan.computeCarbon || baseline));
    const optCarbon = Number(Number(rawOptimized).toFixed(2));

    const saved = Number(Math.max(0, baseline - optCarbon).toFixed(2));
    const reduction = baseline > 0
      ? Number(((saved / baseline) * 100).toFixed(1))
      : 0;

    const normalizedPlan = {
      ...plan,
      baselineCarbon: baseline,
      totalCarbon: optCarbon,
      optimizedCarbon: optCarbon,
      carbonSaved: saved,
      carbonReduction: reduction,
    };

    setAnalysis((previous) => ({
      ...previous,
      gridIntensity:
        plan.region.carbonIntensity,
      computeCarbon:
        plan.computeCarbon,
      totalCarbon:
        optCarbon,
    }));

    setOptimizedPlan(normalizedPlan);
    setSelectedRegion(plan.region);
    setScheduledWindow(plan.window);

    const historyItem = {
      id: Date.now(),
      timestamp:
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      region:
        plan.region.name,
      regionName:
        plan.region.name,
      location:
        plan.region.location,
      executionWindow:
        plan.window.time,
      execution:
        plan.window.time,
      baselineCarbon:
        baseline,
      optimizedCarbon:
        optCarbon,
      totalCarbon:
        optCarbon,
      carbonSaved:
        saved,
      carbonReduction:
        reduction,
      reductionPercentage:
        reduction,
      carbonIntensity:
        plan.region.carbonIntensity,
      slaStatus:
        plan.slaStatus || "Low",
      sla:
        plan.slaStatus || "Low",
      cost:
        plan.region.cost,
      latency:
        plan.region.latency,
      renewable:
        plan.region.renewable,
      score:
        plan.score,
      optimizationScore:
        plan.score,
    };

    setHistory((previous) => {
      const prevList = Array.isArray(previous) ? previous : [];
      const updated = [historyItem, ...prevList];
      saveStoredHistory(updated);
      return updated;
    });

    setPage("dashboard");
  };


  /* =========================
     ANALYZER
     ========================= */

  if (page === "analyzer") {
    return (
      <Analyzer
        onBack={() =>
          setPage("dashboard")
        }
        onResult={updateAnalysis}
        analysis={analysis}
        onNavigate={setPage}
      />
    );
  }


  /* =========================
     SIMULATOR
     ========================= */

  if (page === "simulator") {
    return (
      <Simulator
        onBack={() =>
          setPage("dashboard")
        }
        analysis={analysis}
        onApply={updateSimulator}
      />
    );
  }


  /* =========================
     CLOUD RESOURCES
     ========================= */

  if (page === "resources") {
    return (
      <Resources
        onBack={() =>
          setPage("dashboard")
        }
        analysis={analysis}
        onRegionSelect={
          updateRegion
        }
        onNavigate={setPage}
      />
    );
  }


  /* =========================
     CARBON SCHEDULER
     ========================= */

  if (page === "scheduler") {
    return (
      <Scheduler
        onBack={() =>
          setPage("dashboard")
        }
        analysis={analysis}
        onApply={
          applyScheduledWindow
        }
        onNavigate={setPage}
      />
    );
  }


  /* =========================
     OPTIMIZATION ENGINE
     ========================= */

  if (page === "optimization") {
    return (
      <OptimizationEngine
        onBack={() =>
          setPage("dashboard")
        }
        analysis={analysis}
        baselineCarbon={baselineCarbon}
        onApply={
          applyOptimization
        }
      />
    );
  }


  /* =========================
     DECISION HISTORY
     ========================= */

  if (page === "history") {
    return (
      <DecisionHistory
        history={history}
        onBack={() =>
          setPage("dashboard")
        }
      />
    );
  }


  /* =========================
     DASHBOARD
     ========================= */

  const carbonChange =
    baselineCarbon > 0
      ? ((baselineCarbon - analysis.totalCarbon) /
          baselineCarbon) *
        100
      : 0;


  return (

    <div className="app-shell">


      {/* SIDEBAR */}

      <aside className="sidebar">


        <div className="brand">

          <div className="brand-mark">

            <Leaf size={20} />

          </div>


          <div>

            <h1>
              CarbonLens
            </h1>

            <span>
              Cloud Intelligence
            </span>

          </div>

        </div>


        <nav className="navigation">


          <button
            className={`nav-item ${
              page === "dashboard"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("dashboard")
            }
          >

            <Gauge size={18} />

            Dashboard

          </button>


          <button
            className={`nav-item ${
              page === "analyzer"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("analyzer")
            }
          >

            <Cpu size={18} />

            Workload Analyzer

          </button>


          <button
            className={`nav-item ${
              page === "simulator"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("simulator")
            }
          >

            <Activity size={18} />

            What-If Simulator

          </button>


          <button
            className={`nav-item ${
              page === "resources"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("resources")
            }
          >

            <Cloud size={18} />

            Cloud Resources

          </button>


          <button
            className={`nav-item ${
              page === "scheduler"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("scheduler")
            }
          >

            <CalendarClock size={18} />

            Carbon Scheduler

          </button>


          <button
            className={`nav-item ${
              page === "optimization"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("optimization")
            }
          >

            <Sparkles size={18} />

            Optimization Engine

          </button>


          <button
            className={`nav-item ${
              page === "history"
                ? "active"
                : ""
            }`}

            onClick={() =>
              setPage("history")
            }
          >

            <History size={18} />

            Decision History

          </button>


        </nav>


        <div className="sidebar-footer">

          <div className="status-dot" />


          <div>

            <strong>
              System Online
            </strong>

            <span>
              Carbon engine active
            </span>

          </div>

        </div>


      </aside>


      {/* MAIN CONTENT */}

      <main className="main-content">


        <header className="topbar">

          <div>

            <p className="eyebrow">
              CLOUD SUSTAINABILITY
            </p>

            <h2>
              Carbon Intelligence Dashboard
            </h2>

          </div>


          <div className="header-status">

            <span className="live-dot" />

            Live analysis

          </div>

        </header>


        {/* HERO */}

        <section className="hero-card">


          <div className="hero-content">


            <div className="hero-icon">

              <Sparkles size={22} />

            </div>


            <div>

              <p className="eyebrow">
                CURRENT WORKLOAD
              </p>


              <h3>
                {analysis.workloadType}
              </h3>


              <p className="hero-description">

                Lifecycle-aware analysis of
                compute, storage, transfer and
                checkpoint emissions.

              </p>


              {optimizedPlan && (

                <p
                  style={{
                    marginTop: "8px",
                    color: "#7dde9f",
                    fontSize: "10px",
                  }}
                >

                  ⚡ Optimized plan ·{" "}

                  <strong>
                    {optimizedPlan.region.name}
                  </strong>

                  {" "}·{" "}

                  {optimizedPlan.window.time}

                </p>

              )}


              {!optimizedPlan &&
                selectedRegion && (

                  <p
                    style={{
                      marginTop: "8px",
                      color: "#7dde9f",
                      fontSize: "10px",
                    }}
                  >

                    🌱 Running in{" "}

                    <strong>
                      {selectedRegion.name}
                    </strong>

                    {" "}·{" "}

                    {selectedRegion.location}

                  </p>

                )}


              {!optimizedPlan &&
                scheduledWindow && (

                  <p
                    style={{
                      marginTop: "8px",
                      color: "#7dde9f",
                      fontSize: "10px",
                    }}
                  >

                    🕐 Scheduled for{" "}

                    <strong>
                      {scheduledWindow.time}
                    </strong>

                    {" "}·{" "}

                    {scheduledWindow.label}

                  </p>

                )}

            </div>

          </div>


          <div className="hero-impact">

            <span>
              Estimated impact
            </span>


            <strong>
              {analysis.totalCarbon.toFixed(2)}
            </strong>


            <small>
              kg CO₂e
            </small>


            <div className="impact-change">

              <ArrowDownRight size={15} />

              {Math.abs(
                carbonChange
              ).toFixed(1)}

              % vs initial model

            </div>

          </div>


        </section>


        {/* CURRENT OPTIMIZATION STATE BANNER */}
        {optimizedPlan && (
          <section className="current-optimization-banner">
            <div className="current-opt-badge-row">
              <span className="current-opt-pill">
                <Sparkles size={14} /> OPTIMIZED EXECUTION
              </span>
              <span className="current-opt-tag">
                <Check size={12} /> Active Optimization Plan
              </span>
            </div>

            <div className="current-opt-body">
              <div className="current-opt-identity">
                <h3>
                  {optimizedPlan.region.name} · {optimizedPlan.region.location}
                </h3>
                <div className="current-opt-details">
                  <span>
                    <Clock3 size={13} /> {optimizedPlan.window.time}
                  </span>
                  <span>
                    <Zap size={13} /> {optimizedPlan.region.carbonIntensity} gCO₂e/kWh
                  </span>
                  <span>
                    <Leaf size={13} /> {optimizedPlan.region.renewable}% renewable
                  </span>
                  <span>
                    <ShieldCheck size={13} /> SLA: {optimizedPlan.slaStatus} Risk
                  </span>
                </div>
              </div>

              <div className="current-opt-savings">
                <span>Carbon saved:</span>
                <strong>{optimizedPlan.carbonSaved.toFixed(2)} kg CO₂e</strong>
                <small>{optimizedPlan.carbonReduction.toFixed(1)}% reduction vs baseline</small>
              </div>

              <div className="current-opt-actions">
                <button
                  className="current-opt-btn"
                  onClick={() => setPage("optimization")}
                >
                  <Sparkles size={14} /> Re-optimize Plan
                </button>
                <button
                  className="current-opt-btn secondary"
                  onClick={() => setPage("history")}
                >
                  <History size={14} /> Decision History
                </button>
              </div>
            </div>
          </section>
        )}


        {/* METRICS */}

        <section className="metrics-grid">


          <MetricCard
            icon={
              <Zap size={19} />
            }

            label="Energy Consumption"

            value={
              analysis.energy.toFixed(1)
            }

            unit="kWh"

            detail="Estimated workload energy"
          />


          <MetricCard
            icon={
              <Cloud size={19} />
            }

            label="Carbon Intensity"

            value={
              analysis.gridIntensity
            }

            unit="gCO₂e/kWh"

            detail="Selected grid intensity"
          />


          <MetricCard
            icon={
              <Server size={19} />
            }

            label="Compute Footprint"

            value={
              analysis.computeCarbon.toFixed(2)
            }

            unit="kg"

            detail="GPU computation emissions"
          />


          <MetricCard
            icon={
              <ShieldCheck size={19} />
            }

            label="SLA Risk"

            value={
              analysis.slaRisk
            }

            unit=""

            detail="Based on workload deadline"
          />


        </section>


        {/* CARBON SCORE */}

        <CarbonScore
          carbon={
            analysis.totalCarbon
          }

          baseline={baselineCarbon}

          intensity={
            analysis.gridIntensity
          }

          renewable={
            selectedRegion?.renewable ||
            (optimizedPlan ? optimizedPlan.region.renewable : 31)
          }
        />


        {/* CARBON SUMMARY */}

        <CarbonSummary
          baseline={baselineCarbon}

          current={
            analysis.totalCarbon
          }

          region={
            selectedRegion || (optimizedPlan ? optimizedPlan.region : null)
          }

          window={
            scheduledWindow || (optimizedPlan ? optimizedPlan.window : null)
          }

          decisions={
            history.length
          }
        />


        {/* OPTIMIZATION CONFIDENCE */}

        <OptimizationConfidence
          region={
            selectedRegion || (optimizedPlan ? optimizedPlan.region : null)
          }

          window={
            scheduledWindow || (optimizedPlan ? optimizedPlan.window : null)
          }

          analysis={
            analysis
          }
        />


        {/* REPORT EXPORT */}

        <ReportExport
          analysis={
            analysis
          }

          region={
            selectedRegion || (optimizedPlan ? optimizedPlan.region : null)
          }

          window={
            scheduledWindow || (optimizedPlan ? optimizedPlan.window : null)
          }

          history={
            history
          }

          optimizedPlan={
            optimizedPlan
          }

          baselineCarbon={
            baselineCarbon
          }
        />


        {/* CONTENT GRID */}

        <section className="content-grid">


          {/* IMPACT BREAKDOWN */}

          <div className="panel">


            <div className="panel-heading">


              <div>

                <p className="eyebrow">
                  IMPACT BREAKDOWN
                </p>

                <h3>
                  Where the carbon comes from
                </h3>

              </div>


              <span className="panel-badge">
                Lifecycle
              </span>


            </div>


            <div className="impact-list">


              <ImpactRow
                icon={
                  <Cpu size={17} />
                }

                label="GPU Computation"

                value={`${analysis.computeCarbon.toFixed(
                  2
                )} kg`}

                percentage={
                  analysis.computeCarbon
                }

                total={
                  analysis.totalCarbon
                }
              />


              <ImpactRow
                icon={
                  <Activity size={17} />
                }

                label="Checkpointing"

                value={`${analysis.checkpointCarbon.toFixed(
                  2
                )} kg`}

                percentage={
                  analysis.checkpointCarbon
                }

                total={
                  analysis.totalCarbon
                }
              />


              <ImpactRow
                icon={
                  <Network size={17} />
                }

                label="Data Transfer"

                value={`${analysis.transferCarbon.toFixed(
                  2
                )} kg`}

                percentage={
                  analysis.transferCarbon
                }

                total={
                  analysis.totalCarbon
                }
              />


              <ImpactRow
                icon={
                  <Cloud size={17} />
                }

                label="Storage"

                value={`${analysis.storageCarbon.toFixed(
                  2
                )} kg`}

                percentage={
                  analysis.storageCarbon
                }

                total={
                  analysis.totalCarbon
                }
              />


            </div>


          </div>


          {/* RECOMMENDATION */}

          <div className="panel recommendation-panel">


            <div className="panel-heading">


              <div>

                <p className="eyebrow">
                  DECISION ENGINE
                </p>

                <h3>
                  Recommended action
                </h3>

              </div>


              <div className="recommendation-icon">

                <Sparkles size={18} />

              </div>


            </div>


            <div className="recommendation-main">


              <span className="recommendation-label">

                {optimizedPlan
                  ? "OPTIMAL EXECUTION PLAN"
                  : scheduledWindow
                    ? "CARBON-AWARE SCHEDULE"
                    : selectedRegion
                      ? "REGIONAL PLACEMENT"
                      : "CURRENT PROFILE"}

              </span>


              <h4>

                {optimizedPlan

                  ? `${optimizedPlan.region.name} · ${optimizedPlan.window.time}`

                  : scheduledWindow

                    ? `Workload scheduled for ${scheduledWindow.time}.`

                    : selectedRegion

                      ? `Workload placed in ${selectedRegion.name}.`

                      : analysis.slaRisk === "Low"

                        ? "Workload is ready for optimization."

                        : "Review workload scheduling."}

              </h4>


              <p>

                {optimizedPlan

                  ? `CarbonLens selected ${optimizedPlan.region.location} with ${optimizedPlan.region.renewable}% renewable energy and a ${optimizedPlan.window.label.toLowerCase()} execution window.`

                  : scheduledWindow

                    ? `The selected window has ${scheduledWindow.carbonIntensity} gCO₂e/kWh grid intensity and ${scheduledWindow.renewable}% renewable energy.`

                    : selectedRegion

                      ? `Carbon intensity is now ${selectedRegion.carbonIntensity} gCO₂e/kWh with ${selectedRegion.renewable}% renewable energy share.`

                      : "CarbonLens has calculated the current lifecycle footprint. Use the available intelligence modules to optimize execution."}

              </p>


            </div>


            <div className="recommendation-stats">


              <div>

                <span>
                  Current impact
                </span>

                <strong>
                  {analysis.totalCarbon.toFixed(
                    2
                  )} kg
                </strong>

              </div>


              <div>

                <span>
                  Decisions
                </span>

                <strong>
                  {history.length}
                </strong>

              </div>


            </div>


            <button
              className="primary-button"
              onClick={() =>
                setPage("optimization")
              }
            >
              <Sparkles size={17} />
              {optimizedPlan ? "Re-optimize Plan" : "Run Optimization Decision Engine"}
            </button>


          </div>


        </section>


        {/* BOTTOM GRID */}

        <section className="bottom-grid">


          {/* WORKLOAD PROFILE */}

          <div className="panel workload-panel">


            <div className="panel-heading">


              <div>

                <p className="eyebrow">
                  WORKLOAD PROFILE
                </p>

                <h3>
                  Current configuration
                </h3>

              </div>


            </div>


            <div className="profile-grid">


              <ProfileItem
                label="Workload"

                value={
                  analysis.workloadType
                }
              />


              <ProfileItem
                label="Compute"

                value={`${analysis.gpus} × GPU`}
              />


              <ProfileItem
                label="Runtime"

                value={`${analysis.runtime} hours`}
              />


              <ProfileItem
                label="Dataset"

                value={`${analysis.dataset} GB`}
              />


              <ProfileItem
                label="Checkpoint"

                value={`${analysis.checkpoint} min`}
              />


              <ProfileItem
                label="Deadline"

                value={`${analysis.deadline} hours`}
              />


            </div>


          </div>


          {/* INSIGHT */}

          <div className="panel insight-panel">


            <div className="insight-icon">

              <Leaf size={20} />

            </div>


            <div>


              <p className="eyebrow">
                CARBON INSIGHT
              </p>


              <h3>
                Carbon is a placement
                and timing decision.
              </h3>


              <p>

                CarbonLens combines workload
                demand, grid carbon intensity,
                renewable energy and lifecycle
                overhead instead of treating
                compute emissions as the only
                source of environmental impact.

              </p>


            </div>


          </div>


        </section>


      </main>


    </div>
  );
}


/* =========================
   METRIC CARD
   ========================= */

function MetricCard({
  icon,
  label,
  value,
  unit,
  detail,
}) {

  return (

    <div className="metric-card">


      <div className="metric-icon">

        {icon}

      </div>


      <span className="metric-label">

        {label}

      </span>


      <div className="metric-value">


        <strong>
          {value}
        </strong>


        {unit && (

          <small>
            {unit}
          </small>

        )}


      </div>


      <span className="metric-detail">

        {detail}

      </span>


    </div>

  );
}


/* =========================
   IMPACT ROW
   ========================= */

function ImpactRow({
  icon,
  label,
  value,
  percentage,
  total,
}) {

  const width =
    total > 0
      ? `${Math.min(
          (percentage / total) *
            100,
          100
        )}%`
      : "0%";


  return (

    <div className="impact-row">


      <div className="impact-row-top">


        <div className="impact-label">


          <span className="impact-icon">

            {icon}

          </span>


          {label}


        </div>


        <div className="impact-number">


          <strong>
            {value}
          </strong>


          <span>

            {total > 0
              ? (
                  (percentage /
                    total) *
                  100
                ).toFixed(0)
              : 0}

            %

          </span>


        </div>


      </div>


      <div className="progress-track">


        <div
          className="progress-fill"

          style={{
            width,
          }}
        />


      </div>


    </div>

  );
}


/* =========================
   PROFILE ITEM
   ========================= */

function ProfileItem({
  label,
  value,
}) {

  return (

    <div className="profile-item">


      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>


    </div>

  );
}


export default App;