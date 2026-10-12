import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Leaf,
  Zap,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  CalendarClock,
} from "lucide-react";

import "./Scheduler.css";

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

function Scheduler({
  onBack,
  analysis,
  onApply,
  onNavigate,
}) {
  const [selectedDelay, setSelectedDelay] =
    useState(2);

  const executionEnergy =
    analysis?.energy || 21.3;

  const currentIntensity =
    analysis?.gridIntensity || 396;

  const deadline =
    analysis?.deadline || 12;

  const selectedWindow =
    timeWindows.find(
      (window) =>
        window.delay === selectedDelay
    ) || timeWindows[0];

  const scheduledComputeCarbon =
    executionEnergy *
    (selectedWindow.carbonIntensity / 1000);

  const lifecycleOverhead =
    (analysis?.totalCarbon || 8.42) -
    (analysis?.computeCarbon || 4.05);

  const scheduledTotalCarbon =
    scheduledComputeCarbon +
    lifecycleOverhead;

  const carbonSaved =
    (analysis?.totalCarbon || 8.42) -
    scheduledTotalCarbon;

  const reduction =
    (analysis?.totalCarbon || 8.42) > 0
      ? (carbonSaved /
          (analysis?.totalCarbon || 8.42)) *
        100
      : 0;

  const deadlineFeasible =
    selectedDelay < deadline;

  const recommendation = useMemo(() => {
    const feasibleWindows =
      timeWindows.filter(
        (window) =>
          window.delay < deadline
      );

    if (feasibleWindows.length === 0) {
      return timeWindows[0];
    }

    return feasibleWindows.reduce(
      (best, window) => {
        if (
          window.carbonIntensity <
          best.carbonIntensity
        ) {
          return window;
        }

        return best;
      },
      feasibleWindows[0]
    );
  }, [deadline]);

  const recommendedComputeCarbon =
    executionEnergy *
    (recommendation.carbonIntensity / 1000);

  const recommendedTotalCarbon =
    recommendedComputeCarbon +
    lifecycleOverhead;

  const recommendedReduction =
    (analysis?.totalCarbon || 8.42) > 0
      ? (((analysis?.totalCarbon || 8.42) -
          recommendedTotalCarbon) /
          (analysis?.totalCarbon || 8.42)) *
        100
      : 0;

  const applySelectedWindow = () => {
    if (!onApply) return;

    onApply(
      selectedWindow,
      scheduledTotalCarbon,
      scheduledComputeCarbon
    );
  };

  const useRecommendedWindow = () => {
    setSelectedDelay(
      recommendation.delay
    );
  };

  return (
    <div className="scheduler-page">

      <div className="scheduler-top">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <div className="header-status">
          <span className="live-dot" />
          Scheduling engine active
        </div>

      </div>

      <section className="scheduler-heading">

        <div className="scheduler-heading-icon">
          <CalendarClock size={25} />
        </div>

        <div>

          <p className="eyebrow">
            CARBON-AWARE SCHEDULING
          </p>

          <h2>
            When should this workload run?
          </h2>

          <p>
            Find the best execution window by
            balancing grid carbon, renewable
            availability, cost and deadline risk.
          </p>

        </div>

      </section>

      <section className="scheduler-recommendation">

        <div className="scheduler-recommendation-icon">
          <Leaf size={23} />
        </div>

        <div className="scheduler-recommendation-content">

          <p className="eyebrow">
            CARBONLENS RECOMMENDATION
          </p>

          <h3>
            Run in {recommendation.delay} hours
          </h3>

          <p>
            High renewable availability makes this
            window the strongest carbon-aware option
            within the deadline.
          </p>

          <div className="scheduler-recommendation-stats">

            <div>
              <span>
                Carbon intensity
              </span>

              <strong>
                {recommendation.carbonIntensity}

                <small>
                  {" "}gCO₂e/kWh
                </small>
              </strong>
            </div>

            <div>
              <span>
                Renewable share
              </span>

              <strong>
                {recommendation.renewable}%
              </strong>
            </div>

            <div>
              <span>
                Potential reduction
              </span>

              <strong>
                {Math.max(
                  0,
                  recommendedReduction
                ).toFixed(1)}
                %
              </strong>
            </div>

          </div>

          <button
            className="scheduler-primary-button"
            onClick={
              useRecommendedWindow
            }
          >
            <Check size={17} />
            Use recommended window
          </button>

        </div>

      </section>

      <section className="scheduler-control-panel">

        <div>

          <p className="eyebrow">
            EXECUTION CONTROL
          </p>

          <h3>
            Delay workload execution
          </h3>

          <p>
            Shift the workload into a potentially
            cleaner grid window.
          </p>

        </div>

        <div className="delay-control">

          <div className="delay-value">

            <Clock3 size={18} />

            <strong>
              {selectedDelay === 0
                ? "Run now"
                : `Delay ${selectedDelay} hours`}
            </strong>

          </div>

          <input
            type="range"
            min="0"
            max={Math.min(
              5,
              Math.max(0, deadline - 1)
            )}
            step="1"
            value={selectedDelay}
            onChange={(event) =>
              setSelectedDelay(
                Number(event.target.value)
              )
            }
          />

          <div className="slider-labels">

            <span>
              Now
            </span>

            <span>
              Deadline: {deadline}h
            </span>

          </div>

        </div>

      </section>

      <section className="scheduler-result">

        <div className="scheduler-result-header">

          <div>

            <p className="eyebrow">
              LIVE IMPACT ESTIMATE
            </p>

            <h3>
              Selected execution window
            </h3>

          </div>

          <div className="window-status">

            <span className="live-dot" />

            {selectedWindow.label}

          </div>

        </div>

        <div className="scheduler-metrics">

          <div className="scheduler-metric">

            <Zap size={19} />

            <span>
              Grid intensity
            </span>

            <strong>
              {selectedWindow.carbonIntensity}

              <small>
                gCO₂e/kWh
              </small>
            </strong>

          </div>

          <div className="scheduler-metric">

            <Leaf size={19} />

            <span>
              Renewable share
            </span>

            <strong>
              {selectedWindow.renewable}%
            </strong>

          </div>

          <div className="scheduler-metric">

            <TrendingDown size={19} />

            <span>
              Total lifecycle carbon
            </span>

            <strong>
              {scheduledTotalCarbon.toFixed(2)}

              <small>
                {" "}kg CO₂e
              </small>
            </strong>

          </div>

          <div className="scheduler-metric">

            <ShieldCheck size={19} />

            <span>
              Deadline status
            </span>

            <strong
              className={
                deadlineFeasible
                  ? "feasible"
                  : "not-feasible"
              }
            >
              {deadlineFeasible
                ? "Feasible"
                : "At Risk"}
            </strong>

          </div>

        </div>

        <div className="carbon-comparison">

          <div className="comparison-column">

            <span>
              Run now
            </span>

            <strong>
              {(analysis?.totalCarbon ||
                8.42).toFixed(2)}
              kg
            </strong>

            <div className="comparison-bar">

              <div
                style={{
                  width: "100%",
                }}
              />

            </div>

            <small>
              {currentIntensity}
              gCO₂e/kWh
            </small>

          </div>

          <div className="comparison-arrow">
            →
          </div>

          <div className="comparison-column selected">

            <span>
              Selected window
            </span>

            <strong>
              {scheduledTotalCarbon.toFixed(2)}
              kg
            </strong>

            <div className="comparison-bar">

              <div
                style={{
                  width: `${Math.max(
                    8,
                    Math.min(
                      100,
                      (scheduledTotalCarbon /
                        Math.max(
                          analysis?.totalCarbon ||
                            8.42,
                          0.01
                        )) *
                        100
                    )
                  )}%`,
                }}
              />

            </div>

            <small>
              {selectedWindow.carbonIntensity}
              gCO₂e/kWh
            </small>

          </div>

        </div>

        <div className="saving-banner">

          <div>

            <Leaf size={18} />

            <span>
              Potential carbon saving
            </span>

          </div>

          <strong>
            {Math.max(
              0,
              carbonSaved
            ).toFixed(2)}{" "}
            kg CO₂e
          </strong>

          <span>
            (
            {Math.max(
              0,
              reduction
            ).toFixed(1)}
            % lower)
          </span>

        </div>

        <button
          className="scheduler-primary-button scheduler-apply-button"
          onClick={applySelectedWindow}
          disabled={!deadlineFeasible}
        >
          <Check size={17} />
          Apply selected window
        </button>

      </section>

      <section className="time-window-section">

        <div className="section-header">

          <div>

            <p className="eyebrow">
              GRID FORECAST
            </p>

            <h3>
              Available execution windows
            </h3>

          </div>

          <span className="comparison-badge">
            Deadline-aware
          </span>

        </div>

        <div className="time-window-grid">

          {timeWindows.map(
            (window) => {

              const feasible =
                window.delay < deadline;

              const isSelected =
                window.delay ===
                selectedDelay;

              return (
                <button
                  key={window.id}
                  className={`time-window-card ${
                    isSelected
                      ? "time-window-selected"
                      : ""
                  } ${
                    !feasible
                      ? "time-window-disabled"
                      : ""
                  }`}
                  onClick={() => {
                    if (feasible) {
                      setSelectedDelay(
                        window.delay
                      );
                    }
                  }}
                  disabled={!feasible}
                >

                  {isSelected && (
                    <div className="selected-check">
                      <Check size={13} />
                    </div>
                  )}

                  <span className="window-time">
                    {window.time}
                  </span>

                  <strong>
                    {window.carbonIntensity}
                  </strong>

                  <small>
                    gCO₂e/kWh
                  </small>

                  <div className="window-renewable">

                    <Leaf size={13} />

                    {window.renewable}%
                    renewable

                  </div>

                  <span className="window-label">
                    {window.label}
                  </span>

                </button>
              );
            }
          )}

        </div>

      </section>

      <section className="scheduler-insight">

        <div className="scheduler-insight-icon">
          <Leaf size={20} />
        </div>

        <div>

          <p className="eyebrow">
            WHY THIS IS DIFFERENT
          </p>

          <h3>
            Carbon is a timing AND placement
            decision.
          </h3>

          <p>
            CarbonLens does not assume that a
            workload must execute immediately.
            It evaluates future grid conditions
            and ranks execution windows using
            carbon intensity, renewable
            availability, workload energy,
            estimated cost, latency and deadline
            constraints.
          </p>

        </div>

      </section>

      <section className="scheduler-insight">

        <div className="scheduler-insight-icon">
          <TrendingDown size={20} />
        </div>

        <div>

          <p className="eyebrow">
            DECISION MODEL
          </p>

          <h3>
            Multi-factor carbon optimization
          </h3>

          <p>
            The scheduler compares multiple
            execution windows and identifies the
            cleanest feasible option without
            violating the workload deadline.
          </p>

        </div>

      </section>

    </div>
  );
}

export default Scheduler;