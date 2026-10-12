/**
 * CarbonLens Shared Optimization & Regional Telemetry Model
 *
 * NOTE: Cloud-agnostic prototype architecture with simulated regional telemetry.
 * Ready for future real cloud API integration (e.g. AWS Customer Carbon Footprint Tool,
 * Google Cloud Carbon Footprint, Azure Carbon Optimization, Electricity Maps).
 */

export const REGIONS = [
  {
    id: "nordic",
    name: "Nordic",
    location: "Stockholm",
    carbonIntensity: 74,
    renewable: 91,
    cost: 171,
    latency: 126,
    sla: "Low",
    description: "Hydro- and wind-dominant Nordic grid with ultra-low carbon intensity.",
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
    description: "Balanced Central European grid with steady wind/solar mix and moderate latency.",
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
    description: "Pacific Northwest grid with hydro power access and lower infrastructure cost.",
  },
  {
    id: "asia",
    name: "Asia Pacific",
    location: "Mumbai",
    carbonIntensity: 396,
    renewable: 31,
    cost: 146,
    latency: 18,
    sla: "Low",
    description: "Current baseline region with minimal local network latency and fossil-heavy grid mix.",
  },
];

export const TIME_WINDOWS = [
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

/**
 * Calculates a transparent, deterministic multi-factor score (0-100)
 * Weighted factors:
 * - Carbon Impact (40%): Strongest factor, rewards lowest carbon intensity
 * - Renewable Energy (25%): Rewards high clean-energy generation share
 * - Cost (15%): Normalized against standard cloud GPU compute tiers
 * - Network Latency (10%): Evaluates network transfer overhead
 * - SLA Feasibility (10%): Validates runtime + delay within workload deadline
 */
export function calculateMultiFactorScore({ region, window, analysis }) {
  const deadline = analysis?.deadline ?? 12;
  const runtime = analysis?.runtime ?? 8;
  const delay = window?.delay ?? 0;

  // 1. Carbon factor (0-100): Lower intensity = higher score
  const carbonFactor = Math.max(0, Math.min(100, (1 - region.carbonIntensity / 500) * 100));

  // 2. Renewable factor (0-100): Direct renewable share percentage
  const renewableFactor = Math.max(0, Math.min(100, region.renewable));

  // 3. Cost factor (0-100): Lower cost = higher score (benchmark scale 250)
  const costFactor = Math.max(0, Math.min(100, (1 - region.cost / 250) * 100));

  // 4. Latency factor (0-100): Lower latency = higher score (benchmark scale 250ms)
  const latencyFactor = Math.max(0, Math.min(100, (1 - region.latency / 250) * 100));

  // 5. SLA Feasibility (0-100): Evaluates deadline constraint
  let slaFactor = 100;
  let slaStatus = "Low";

  if (delay + runtime <= deadline * 0.8) {
    slaFactor = 100;
    slaStatus = "Low";
  } else if (delay + runtime <= deadline) {
    slaFactor = 85;
    slaStatus = "Low";
  } else if (delay < deadline) {
    slaFactor = 55;
    slaStatus = "Medium";
  } else {
    slaFactor = 20;
    slaStatus = "High";
  }

  // Combine weighted factors
  const totalScore = Math.round(
    carbonFactor * 0.40 +
    renewableFactor * 0.25 +
    costFactor * 0.15 +
    latencyFactor * 0.10 +
    slaFactor * 0.10
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    slaStatus,
    breakdown: {
      carbonFactor: Math.round(carbonFactor),
      renewableFactor: Math.round(renewableFactor),
      costFactor: Math.round(costFactor),
      latencyFactor: Math.round(latencyFactor),
      slaFactor: Math.round(slaFactor),
    },
  };
}

/**
 * Evaluates all candidate regions and execution windows to determine
 * the combined optimal execution plan for the active workload.
 */
export function evaluateOptimalPlan(analysis, customBaseline) {
  const deadline = Number(analysis?.deadline) || 12;
  const energy = Number(analysis?.energy) || 21.3;
  const rawBaseline = Number(customBaseline ?? analysis?.baselineCarbon ?? analysis?.totalCarbon ?? 8.42);
  const baselineCarbon = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

  const baselineCompute = typeof analysis?.computeCarbon === "number" && !isNaN(analysis.computeCarbon)
    ? analysis.computeCarbon
    : (energy * ((Number(analysis?.gridIntensity) || 396) / 1000));
  const lifecycleOverhead = Math.max(0, baselineCarbon - baselineCompute);

  // Filter feasible execution windows based on deadline
  const feasibleWindows = TIME_WINDOWS.filter(
    (w) => w.delay < deadline
  );
  const candidateWindows = feasibleWindows.length > 0 ? feasibleWindows : [TIME_WINDOWS[0]];

  // Evaluate candidate combinations
  let bestPlan = null;
  let highestScore = -1;

  for (const region of REGIONS) {
    for (const window of candidateWindows) {
      const { totalScore, slaStatus, breakdown } = calculateMultiFactorScore({
        region,
        window,
        analysis,
      });

      // Tie-breaker: prioritize lowest carbon intensity
      if (totalScore > highestScore || (totalScore === highestScore && region.carbonIntensity < (bestPlan?.region?.carbonIntensity ?? 999))) {
        highestScore = totalScore;

        const computeCarbon = Number((energy * (region.carbonIntensity / 1000)).toFixed(2));
        const totalCarbon = Number((computeCarbon + lifecycleOverhead).toFixed(2));
        const carbonSaved = Number(Math.max(0, baselineCarbon - totalCarbon).toFixed(2));
        const carbonReduction = baselineCarbon > 0
          ? Number(((carbonSaved / baselineCarbon) * 100).toFixed(1))
          : 0;

        bestPlan = {
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
          baselineCarbon,
          carbonSaved,
          carbonReduction,
        };
      }
    }
  }

  return bestPlan;
}

/**
 * Evaluates combinations of cloud regions and feasible execution windows,
 * ranking the top 3 execution plans based on the multi-factor scoring model.
 * Also evaluates budget and deadline feasibility constraints.
 */
export function evaluateTopExecutionPlans({ analysis, baselineCarbon, carbonBudget, windowOverride }) {
  const deadline = Number(analysis?.deadline) || 12;
  const runtime = Number(analysis?.runtime) || 8;
  const energy = Number(analysis?.energy) || 21.3;
  const rawBaseline = Number(baselineCarbon ?? analysis?.baselineCarbon ?? analysis?.totalCarbon ?? 8.42);
  const validBaseline = !isNaN(rawBaseline) && rawBaseline > 0 ? rawBaseline : 8.42;

  const baselineCompute = typeof analysis?.computeCarbon === "number" && !isNaN(analysis.computeCarbon)
    ? analysis.computeCarbon
    : (energy * ((Number(analysis?.gridIntensity) || 396) / 1000));
  const lifecycleOverhead = Math.max(0, validBaseline - baselineCompute);

  const budgetNum = carbonBudget != null && !isNaN(Number(carbonBudget)) && Number(carbonBudget) > 0
    ? Number(carbonBudget)
    : null;

  // Evaluate candidate combinations for each region
  const allCandidates = [];

  for (const region of REGIONS) {
    // If windowOverride is provided, evaluate that specific window.
    // Otherwise evaluate feasible windows where execution delay + runtime <= deadline.
    const windowsToTest = windowOverride
      ? [windowOverride]
      : TIME_WINDOWS.filter((w) => (w.delay + runtime) <= deadline);

    if (windowsToTest.length === 0) {
      // If no window satisfies delay + runtime <= deadline, test window 0 for infeasibility tracking
      const fallbackWindow = TIME_WINDOWS[0];
      const scoreData = calculateMultiFactorScore({ region, window: fallbackWindow, analysis });
      const computeCarbon = Number((energy * (region.carbonIntensity / 1000)).toFixed(2));
      const totalCarbon = Number((computeCarbon + lifecycleOverhead).toFixed(2));
      const carbonSaved = Number(Math.max(0, validBaseline - totalCarbon).toFixed(2));
      const carbonReduction = validBaseline > 0 ? Number(((carbonSaved / validBaseline) * 100).toFixed(1)) : 0;

      allCandidates.push({
        id: `${region.id}-${fallbackWindow.id}`,
        region,
        window: fallbackWindow,
        score: scoreData.totalScore,
        slaStatus: scoreData.slaStatus,
        breakdown: scoreData.breakdown,
        energy,
        computeCarbon,
        lifecycleOverhead,
        totalCarbon,
        optimizedCarbon: totalCarbon,
        baselineCarbon: validBaseline,
        carbonSaved,
        carbonReduction,
        totalExecutionTime: fallbackWindow.delay + runtime,
        isDeadlineFeasible: false,
        meetsBudget: budgetNum !== null ? totalCarbon <= budgetNum : null,
        budgetDifference: budgetNum !== null ? Number((totalCarbon - budgetNum).toFixed(2)) : null,
        isFullyFeasible: false,
        infeasibleReason: `Execution runtime (${runtime}h) + delay (${fallbackWindow.delay}h) exceeds deadline (${deadline}h)`,
      });
      continue;
    }

    // Find the best window for this region
    let bestWindowForRegion = windowsToTest[0];
    let highestScoreForRegion = -1;
    let bestScoreData = null;

    for (const window of windowsToTest) {
      const scoreData = calculateMultiFactorScore({ region, window, analysis });
      if (scoreData.totalScore > highestScoreForRegion) {
        highestScoreForRegion = scoreData.totalScore;
        bestWindowForRegion = window;
        bestScoreData = scoreData;
      }
    }

    if (!bestScoreData) continue;

    const computeCarbon = Number((energy * (region.carbonIntensity / 1000)).toFixed(2));
    const totalCarbon = Number((computeCarbon + lifecycleOverhead).toFixed(2));
    const carbonSaved = Number(Math.max(0, validBaseline - totalCarbon).toFixed(2));
    const carbonReduction = validBaseline > 0
      ? Number(((carbonSaved / validBaseline) * 100).toFixed(1))
      : 0;

    const totalExecutionTime = bestWindowForRegion.delay + runtime;
    const isDeadlineFeasible = totalExecutionTime <= deadline;
    const meetsBudget = budgetNum !== null ? totalCarbon <= budgetNum : null;
    const budgetDifference = budgetNum !== null ? Number((totalCarbon - budgetNum).toFixed(2)) : null;
    const isFullyFeasible = isDeadlineFeasible && (meetsBudget === null || meetsBudget === true);

    allCandidates.push({
      id: `${region.id}-${bestWindowForRegion.id}`,
      region,
      window: bestWindowForRegion,
      score: bestScoreData.totalScore,
      slaStatus: bestScoreData.slaStatus,
      breakdown: bestScoreData.breakdown,
      energy,
      computeCarbon,
      lifecycleOverhead,
      totalCarbon,
      optimizedCarbon: totalCarbon,
      baselineCarbon: validBaseline,
      carbonSaved,
      carbonReduction,
      totalExecutionTime,
      isDeadlineFeasible,
      meetsBudget,
      budgetDifference,
      isFullyFeasible,
      infeasibleReason: !isDeadlineFeasible
        ? `Execution runtime (${runtime}h) + delay (${bestWindowForRegion.delay}h) exceeds deadline (${deadline}h)`
        : (!isFullyFeasible ? `Exceeds carbon budget by ${Math.abs(budgetDifference)} kg CO₂e` : null),
    });
  }

  // Filter feasible candidates meeting deadline
  const feasiblePlans = allCandidates.filter((p) => p.isDeadlineFeasible);
  const infeasiblePlans = allCandidates.filter((p) => !p.isDeadlineFeasible);

  // Deterministically sort feasible plans: highest score first, tie-breaker: lower carbonIntensity, then lower totalCarbon
  feasiblePlans.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.region.carbonIntensity !== b.region.carbonIntensity) return a.region.carbonIntensity - b.region.carbonIntensity;
    return a.totalCarbon - b.totalCarbon;
  });

  // Assign rankings to top 3 feasible plans (or fewer if fewer feasible)
  const topThree = feasiblePlans.slice(0, 3).map((plan, index) => {
    let rankTitle = `#${index + 1} Alternative`;
    let badgeClass = "badge-alt";
    let roleDescription = "Alternative execution profile";

    if (index === 0) {
      rankTitle = "#1 Recommended Plan";
      badgeClass = "badge-recommended";
      roleDescription = "Optimal balance of emissions, clean energy, and feasibility";
    } else if (index === 1) {
      rankTitle = "#2 Runner-Up";
      badgeClass = "badge-runnerup";
      roleDescription = "Balanced alternative with lower latency and competitive cost";
    } else if (index === 2) {
      rankTitle = "#3 Low-Cost Alternative";
      badgeClass = "badge-third";
      roleDescription = "Cost-optimized option with moderate clean energy share";
    }

    return {
      ...plan,
      rank: index + 1,
      rankTitle,
      badgeClass,
      roleDescription,
    };
  });

  return {
    topPlans: topThree,
    feasibleCount: feasiblePlans.length,
    infeasibleCount: infeasiblePlans.length,
    infeasiblePlans,
    allCandidates,
  };
}

/**
 * Generates plain-language, explainable comparisons between the winning plan
 * and the alternative feasible candidates, including carbon budget analysis.
 */
export function generateExplainableComparison({ topPlans, baselineCarbon, carbonBudget, runtime, deadline }) {
  if (!topPlans || topPlans.length === 0) {
    return {
      winnerSummary: `No feasible execution plans can complete within the ${deadline}-hour deadline with a ${runtime}-hour workload runtime.`,
      tradeOffs: [],
      budgetSummary: carbonBudget ? `Carbon budget (${carbonBudget} kg CO₂e) could not be evaluated due to deadline infeasibility.` : "No budget active.",
    };
  }

  const p1 = topPlans[0];
  const p2 = topPlans.length > 1 ? topPlans[1] : null;
  const p3 = topPlans.length > 2 ? topPlans[2] : null;

  const tradeOffs = [];

  // Compare #1 vs #2
  if (p2) {
    const carbonDelta = Number((p2.totalCarbon - p1.totalCarbon).toFixed(2));
    const intensityPct = Math.round(((p2.region.carbonIntensity - p1.region.carbonIntensity) / p2.region.carbonIntensity) * 100);
    const renewDelta = p1.region.renewable - p2.region.renewable;
    const costDelta = p1.region.cost - p2.region.cost;
    const latencyDelta = p1.region.latency - p2.region.latency;

    let text = `${p1.rankTitle} (${p1.region.name}) outranks ${p2.rankTitle} (${p2.region.name}) with an overall score of ${p1.score}/100 vs. ${p2.score}/100. `;
    if (intensityPct > 0) {
      text += `It delivers a ${intensityPct}% cleaner regional grid (${p1.region.carbonIntensity} vs. ${p2.region.carbonIntensity} gCO₂e/kWh) and ${renewDelta > 0 ? `+${renewDelta}%` : `${renewDelta}%`} higher renewable generation share, achieving ${carbonDelta > 0 ? `${carbonDelta} kg greater lifecycle carbon reduction` : 'comparable emissions'}. `;
    }
    if (costDelta > 0 || latencyDelta > 0) {
      text += `Under the deterministic 40% carbon weighting, this emissions advantage significantly outweighs ${p2.region.name}'s advantage in ${costDelta > 0 ? `compute cost (₹${Math.abs(costDelta)} cheaper)` : ''}${costDelta > 0 && latencyDelta > 0 ? ' and ' : ''}${latencyDelta > 0 ? `network latency (${Math.abs(latencyDelta)}ms faster)` : ''}.`;
    }

    tradeOffs.push({
      versus: `Rank #1 (${p1.region.name}) vs. Rank #2 (${p2.region.name})`,
      explanation: text,
      keyDifferences: [
        { label: "Carbon Intensity", v1: `${p1.region.carbonIntensity} g/kWh`, v2: `${p2.region.carbonIntensity} g/kWh`, better: 1 },
        { label: "Renewable Share", v1: `${p1.region.renewable}%`, v2: `${p2.region.renewable}%`, better: 1 },
        { label: "Total Emissions", v1: `${p1.totalCarbon.toFixed(2)} kg`, v2: `${p2.totalCarbon.toFixed(2)} kg`, better: 1 },
        { label: "Cloud Cost", v1: `₹${p1.region.cost}`, v2: `₹${p2.region.cost}`, better: p1.region.cost <= p2.region.cost ? 1 : 2 },
        { label: "Network Latency", v1: `${p1.region.latency} ms`, v2: `${p2.region.latency} ms`, better: p1.region.latency <= p2.region.latency ? 1 : 2 },
      ],
    });
  }

  // Compare #1 vs #3
  if (p3) {
    const carbonDelta = Number((p3.totalCarbon - p1.totalCarbon).toFixed(2));
    const costDelta = p1.region.cost - p3.region.cost;
    let text = `${p1.rankTitle} (${p1.region.name}) outperforms ${p3.rankTitle} (${p3.region.name}) with score ${p1.score} vs. ${p3.score}. `;
    text += `Although ${p3.region.name} offers lower infrastructure cost (₹${p3.region.cost} vs. ₹${p1.region.cost}${costDelta > 0 ? `, ₹${costDelta} cheaper` : ''}), its fossil-heavier grid (${p3.region.carbonIntensity} gCO₂e/kWh) produces ${carbonDelta > 0 ? `${carbonDelta} kg more lifecycle carbon` : 'higher emissions'} and higher latency (${p3.region.latency}ms).`;

    tradeOffs.push({
      versus: `Rank #1 (${p1.region.name}) vs. Rank #3 (${p3.region.name})`,
      explanation: text,
      keyDifferences: [
        { label: "Carbon Intensity", v1: `${p1.region.carbonIntensity} g/kWh`, v2: `${p3.region.carbonIntensity} g/kWh`, better: 1 },
        { label: "Renewable Share", v1: `${p1.region.renewable}%`, v2: `${p3.region.renewable}%`, better: 1 },
        { label: "Total Emissions", v1: `${p1.totalCarbon.toFixed(2)} kg`, v2: `${p3.totalCarbon.toFixed(2)} kg`, better: 1 },
        { label: "Cloud Cost", v1: `₹${p1.region.cost}`, v2: `₹${p3.region.cost}`, better: p1.region.cost <= p3.region.cost ? 1 : 2 },
        { label: "Network Latency", v1: `${p1.region.latency} ms`, v2: `${p3.region.latency} ms`, better: p1.region.latency <= p3.region.latency ? 1 : 2 },
      ],
    });
  }

  // Budget Summary
  let budgetSummary = "No carbon budget configured. Plans are evaluated strictly on deterministic multi-factor optimization score and deadline feasibility.";
  if (carbonBudget && !isNaN(Number(carbonBudget))) {
    const b = Number(carbonBudget);
    const meetingPlans = topPlans.filter((p) => p.totalCarbon <= b);
    if (meetingPlans.length === topPlans.length) {
      budgetSummary = `All ${topPlans.length} feasible plans successfully meet your target carbon budget of ${b.toFixed(2)} kg CO₂e.`;
    } else if (meetingPlans.length > 0) {
      const names = meetingPlans.map((p) => `${p.rankTitle} (${p.region.name})`).join(", ");
      budgetSummary = `${meetingPlans.length} of ${topPlans.length} plans (${names}) meet your target carbon budget of ${b.toFixed(2)} kg CO₂e. The other candidate plans exceed this budget threshold.`;
    } else {
      budgetSummary = `None of the feasible execution plans meet your strict target carbon budget of ${b.toFixed(2)} kg CO₂e. Plan #1 (${p1.region.name} at ${p1.totalCarbon.toFixed(2)} kg) comes closest (exceeds by ${(p1.totalCarbon - b).toFixed(2)} kg CO₂e). Consider reducing GPU count or runtime in Workload Analyzer.`;
    }
  }

  return {
    winnerSummary: `${p1.rankTitle} (${p1.region.name} · ${p1.window.time}) is the optimal choice with the highest deterministic score (${p1.score}/100), delivering the greatest net carbon reduction (${p1.carbonReduction}% reduction vs. ${Number(baselineCarbon || 8.42).toFixed(2)} kg baseline) while meeting all SLA constraints.`,
    tradeOffs,
    budgetSummary,
  };
}
