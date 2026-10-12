import {
  Download,
  FileText,
  CheckCircle2,
} from "lucide-react";

import "./ReportExport.css";

function ReportExport({
  analysis,
  region,
  window,
  history = [],
  optimizedPlan = null,
  baselineCarbon = 8.42,
}) {
  // Canonical baseline from state
  const rawBaseline = Number(baselineCarbon ?? analysis?.baselineCarbon ?? 8.42);
  const baseline = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

  // Active applied optimization plan (from prop or latest history record)
  const activePlan = optimizedPlan || (history.length > 0 && !region && !window ? history[0] : null);

  const activeRegion = optimizedPlan?.region || region || (activePlan ? {
    name: activePlan.regionName || activePlan.region || "Nordic",
    location: activePlan.location || "Stockholm",
    carbonIntensity: Number(activePlan.carbonIntensity ?? 74),
    renewable: Number(activePlan.renewable ?? 91),
    cost: Number(activePlan.cost ?? 171),
    latency: Number(activePlan.latency ?? 126),
    sla: activePlan.slaStatus ?? activePlan.sla ?? "Low",
  } : null);

  const activeWindow = optimizedPlan?.window || window || (activePlan ? {
    time: activePlan.executionWindow || activePlan.execution || "+5 hours",
    label: "Optimized window",
  } : null);

  const workloadName = analysis?.workloadType || "AI Model Training";

  // Canonical optimized carbon
  const rawOptimized = activePlan
    ? Number(activePlan.optimizedCarbon ?? activePlan.totalCarbon ?? analysis?.totalCarbon ?? baseline)
    : Number(analysis?.totalCarbon ?? baseline);
  const optimizedCarbon = !isNaN(rawOptimized) && rawOptimized > 0 ? rawOptimized : baseline;

  // Calculate carbonSaved = baselineCarbon - optimizedCarbon
  // Calculate reductionPercentage = baselineCarbon > 0 ? (carbonSaved / baselineCarbon) * 100 : 0
  const rawSaved = baseline - optimizedCarbon;
  const carbonSaved = Number(Math.max(0, rawSaved).toFixed(2));
  const carbonReduction = baseline > 0
    ? Number(((carbonSaved / baseline) * 100).toFixed(1))
    : 0;

  const optimizationScore = activePlan?.score ?? activePlan?.optimizationScore ?? 77;
  const slaStatus = activePlan?.slaStatus ?? activePlan?.sla ?? activeRegion?.sla ?? analysis?.slaRisk ?? "Low";

  const generateReport = () => {
    const reportDate = new Date().toLocaleString();

    const report = `================================================================================
CARBONLENS · CLOUD CARBON OPTIMIZATION REPORT
================================================================================
Generated: ${reportDate}
Status: ${activePlan ? "Applied Optimization" : "Current Workload Evaluation"}
System Architecture: Cloud-agnostic prototype with regional grid telemetry

1. WORKLOAD SPECIFICATIONS
--------------------------------------------------------------------------------
Workload: ${workloadName}
GPU Count: ${analysis?.gpus || 4} GPUs
Runtime: ${analysis?.runtime || 8} hours
Dataset Size: ${analysis?.dataset || 250} GB
Checkpoint Interval: ${analysis?.checkpoint || 30} minutes
Workload Deadline: ${analysis?.deadline || 12} hours
Energy Demand: ${analysis?.energy ? analysis.energy.toFixed(2) : "21.30"} kWh

2. CARBON FOOTPRINT AUDIT
--------------------------------------------------------------------------------
Current carbon: ${baseline.toFixed(2)} kg CO2e
Optimized carbon: ${Number(optimizedCarbon).toFixed(2)} kg CO2e
Carbon saved: ${Number(carbonSaved).toFixed(2)} kg CO2e
Carbon reduction: ${Number(carbonReduction).toFixed(1)}%
Compute Carbon: ${analysis?.computeCarbon ? analysis.computeCarbon.toFixed(2) : "0.00"} kg CO2e
Checkpoint Carbon: ${analysis?.checkpointCarbon ? analysis.checkpointCarbon.toFixed(2) : "0.00"} kg CO2e
Transfer Carbon: ${analysis?.transferCarbon ? analysis.transferCarbon.toFixed(2) : "0.00"} kg CO2e
Storage Carbon: ${analysis?.storageCarbon ? analysis.storageCarbon.toFixed(2) : "0.00"} kg CO2e

3. APPLIED OPTIMIZATION & PLACEMENT
--------------------------------------------------------------------------------
Selected region: ${activeRegion?.name || "Nordic"}
Location: ${activeRegion?.location || "Stockholm"}
Execution window: ${activeWindow?.time || "+5 hours"}
Renewable percentage: ${activeRegion?.renewable ?? 91}%
Carbon intensity: ${activeRegion?.carbonIntensity ?? 74} gCO2e/kWh
Estimated cost: ₹${activeRegion?.cost ?? 171}
Latency: ${activeRegion?.latency ?? 126} ms
SLA status: ${slaStatus}
Optimization score: ${optimizationScore}/100

4. DECISION RATIONALE
--------------------------------------------------------------------------------
CarbonLens evaluated candidate regions and execution windows using a multi-factor
deterministic algorithm weighting:
- Carbon Impact (40%)
- Renewable Energy Availability (25%)
- Cloud Compute Cost (15%)
- Network Transfer Latency (10%)
- SLA Deadline Feasibility (10%)

Total Decisions Logged in Session: ${history.length}

================================================================================
CONFIDENTIAL & AUDITABLE · GENERATED BY CARBONLENS DECISION ENGINE
================================================================================
`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CarbonLens-Optimization-Report-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="report-export">
      <div className="report-export-icon">
        <FileText size={19} />
      </div>

      <div className="report-export-content">
        <p className="eyebrow">
          AUDITABLE OUTPUT & COMPLIANCE
        </p>

        <h3>
          Export optimization report
        </h3>

        <p>
          Generate a detailed audit report containing workload parameters, baseline vs. optimized carbon emissions,
          regional placement, scheduling window, multi-factor score, and SLA status.
        </p>

        {Boolean(activePlan) && (
          <div style={{ marginTop: "6px", color: "#6fe7a2", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={13} /> Includes latest applied optimization ({activeRegion?.name || "Nordic"} · {activeWindow?.time || "+5 hours"})
          </div>
        )}
      </div>

      <button
        className="report-export-button"
        onClick={generateReport}
      >
        <Download size={16} />
        Export Report
      </button>
    </section>
  );
}

export default ReportExport;