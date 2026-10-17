import { useState, useMemo, useEffect } from 'react';
import {
  buildPoseKinematicsFrame,
  verifyZeroHudOverlap,
  type JointAngleParams,
  type JointRiskLevel,
  type PrivacyMode,
} from './lib/pose/pose-kinematics-engine.ts';
import {
  SHOWCASE_CV_SCENARIOS,
  evaluateBiomechanicalRisk,
  type ErgonomicScenarioPreset,
} from './lib/ergonomics/biomechanical-risk-engine.ts';
import { evaluateRepetitionFatigue } from './lib/fatigue/repetition-fatigue-engine.ts';
import {
  synthesizeEngineeringControls,
  buildAwsGreengrassTelemetryPacket,
  verifyPrivacyCompliantTelemetry,
} from './lib/aws/aws-edge-coach-adapter.ts';

const STORAGE_KEY = 'ergosight_cv_state_v1';

function CameraVisionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function riskColorHex(level: JointRiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return '#f43f5e';
    case 'HIGH':
      return '#f59e0b';
    case 'MODERATE':
      return '#06b6d4';
    default:
      return '#10b981';
  }
}

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { scenarioId?: string };
        if (
          parsed.scenarioId &&
          SHOWCASE_CV_SCENARIOS.some((s) => s.id === parsed.scenarioId)
        ) {
          return parsed.scenarioId;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return SHOWCASE_CV_SCENARIOS[0].id;
  });

  const activePreset: ErgonomicScenarioPreset = useMemo(
    () =>
      SHOWCASE_CV_SCENARIOS.find((s) => s.id === selectedScenarioId) ??
      SHOWCASE_CV_SCENARIOS[0],
    [selectedScenarioId]
  );

  const [angles, setAngles] = useState<JointAngleParams>(activePreset.angles);
  const [loadMassKg, setLoadMassKg] = useState<number>(
    activePreset.lifting.loadMassKg
  );
  const [cyclesPerMinute, setCyclesPerMinute] = useState<number>(
    activePreset.cyclesPerMinute
  );
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('face-redacted');
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  useEffect(() => {
    setAngles(activePreset.angles);
    setLoadMassKg(activePreset.lifting.loadMassKg);
    setCyclesPerMinute(activePreset.cyclesPerMinute);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scenarioId: activePreset.id })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [activePreset]);

  const poseFrame = useMemo(
    () => buildPoseKinematicsFrame(angles, privacyMode),
    [angles, privacyMode]
  );

  const hudOverlapAudit = useMemo(
    () => verifyZeroHudOverlap(poseFrame),
    [poseFrame]
  );

  const biomechanicalRisk = useMemo(
    () =>
      evaluateBiomechanicalRisk(angles, {
        ...activePreset.lifting,
        loadMassKg,
      }),
    [angles, activePreset.lifting, loadMassKg]
  );

  const fatigueReport = useMemo(
    () =>
      evaluateRepetitionFatigue({
        cyclesPerMinute,
        staticHoldSeconds: activePreset.staticHoldSeconds,
        shiftDurationMinutes: activePreset.shiftDurationMinutes,
        biomechanicalRisk,
      }),
    [cyclesPerMinute, activePreset, biomechanicalRisk]
  );

  const recommendations = useMemo(
    () =>
      synthesizeEngineeringControls(angles, biomechanicalRisk, fatigueReport),
    [angles, biomechanicalRisk, fatigueReport]
  );

  const awsPacket = useMemo(
    () =>
      buildAwsGreengrassTelemetryPacket({
        scenario: activePreset,
        privacyMode,
        risk: biomechanicalRisk,
        fatigue: fatigueReport,
      }),
    [activePreset, privacyMode, biomechanicalRisk, fatigueReport]
  );

  const awsJson = useMemo(
    () => JSON.stringify(awsPacket, null, 2),
    [awsPacket]
  );

  const privacyAudit = useMemo(
    () => verifyPrivacyCompliantTelemetry(awsJson),
    [awsJson]
  );

  function handleCopyJson() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(awsJson).catch(() => {});
    }
    setCopiedBanner('AWS CloudWatch EMF Telemetry JSON');
    setTimeout(() => setCopiedBanner(null), 2200);
  }

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="topbar">
        <div className="brand-cluster">
          <div className="brand-logo" aria-hidden="true">
            <CameraVisionIcon />
          </div>
          <div>
            <h1 className="brand-title">
              ErgoSight CV
              <span className="badge-pill badge-cyan">OpenCV 17-KP Edge Pose</span>
              <span className="badge-pill badge-aws">AWS IoT Greengrass EMF</span>
              <span className="badge-pill badge-emerald">
                <ShieldCheckIcon /> 6/6 Deterministic Gates Ready
              </span>
            </h1>
            <p className="brand-subtitle">
              Real-Time Edge Posture, Repetition & Warehouse Ergonomic Safety Monitor · RULA / REBA /
              Revised NIOSH Lifting Equation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`tab-btn ${privacyMode === 'face-redacted' ? 'active' : ''}`}
            onClick={() => setPrivacyMode('face-redacted')}
          >
            Edge Privacy: Face-Redacted Shield
          </button>
          <button
            type="button"
            className={`tab-btn ${privacyMode === 'skeleton-only' ? 'active' : ''}`}
            onClick={() => setPrivacyMode('skeleton-only')}
          >
            Edge Privacy: Skeleton-Only Wireframe
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        {/* Left Column: 4 Industrial CV Streams + Interactive Joint-Angle & Load Sliders */}
        <div>
          <section className="panel-card">
            <div className="panel-header">
              <h2 className="panel-title">1. Industrial & Clinical OpenCV Streams</h2>
              <span className="badge-pill badge-cyan mono">{activePreset.stationId}</span>
            </div>

            <div className="preset-list">
              {SHOWCASE_CV_SCENARIOS.map((preset) => {
                const isSelected = preset.id === selectedScenarioId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedScenarioId(preset.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#67e8f9',
                        fontWeight: 700,
                        marginBottom: 3,
                      }}
                    >
                      <span className="mono">{preset.stationId}</span>
                      <span>{preset.facilityZone}</span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        marginBottom: 4,
                      }}
                    >
                      {preset.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                      {preset.cameraModel} · {preset.edgeDevice}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Interactive Joint-Angle & Load Simulator */}
          <section className="panel-card">
            <div className="panel-header">
              <h2 className="panel-title">2. Live Joint-Angle & Load Calibration</h2>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setAngles(activePreset.angles);
                  setLoadMassKg(activePreset.lifting.loadMassKg);
                  setCyclesPerMinute(activePreset.cyclesPerMinute);
                }}
              >
                Reset Station Preset
              </button>
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Lumbar Trunk Flexion (L5/S1)</span>
                <strong className="mono">{angles.trunkFlexionDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                value={angles.trunkFlexionDeg}
                onChange={(e) =>
                  setAngles((p) => ({ ...p, trunkFlexionDeg: Number(e.target.value) }))
                }
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Shoulder Abduction / Overhead Reach</span>
                <strong className="mono">{angles.shoulderAbductionDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={145}
                value={angles.shoulderAbductionDeg}
                onChange={(e) =>
                  setAngles((p) => ({
                    ...p,
                    shoulderAbductionDeg: Number(e.target.value),
                  }))
                }
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Cervical Neck Flexion (C7)</span>
                <strong className="mono">{angles.neckFlexionDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={55}
                value={angles.neckFlexionDeg}
                onChange={(e) =>
                  setAngles((p) => ({ ...p, neckFlexionDeg: Number(e.target.value) }))
                }
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Wrist Ulnar / Radial Deviation</span>
                <strong className="mono">{angles.wristDeviationDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={angles.wristDeviationDeg}
                onChange={(e) =>
                  setAngles((p) => ({ ...p, wristDeviationDeg: Number(e.target.value) }))
                }
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Axial Trunk Asymmetry Twist</span>
                <strong className="mono">{angles.asymmetryTwistDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={angles.asymmetryTwistDeg}
                onChange={(e) =>
                  setAngles((p) => ({ ...p, asymmetryTwistDeg: Number(e.target.value) }))
                }
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Handled Object Load Mass (kg)</span>
                <strong className="mono">{loadMassKg} kg</strong>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                step={0.5}
                value={loadMassKg}
                onChange={(e) => setLoadMassKg(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Repetition Frequency (Cycles / Min)</span>
                <strong className="mono">{cyclesPerMinute} / min</strong>
              </div>
              <input
                type="range"
                min={1}
                max={40}
                value={cyclesPerMinute}
                onChange={(e) => setCyclesPerMinute(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Live OpenCV 17-KP Vision HUD + RULA/REBA/NIOSH Dashboard + AWS Greengrass Telemetry */}
        <div>
          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  3. OpenCV 17-Keypoint Edge Kinematics & Joint-Angle HUD
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {activePreset.taskDescription}
                </div>
              </div>
              <span className="badge-pill badge-emerald">
                <ShieldCheckIcon />{' '}
                {hudOverlapAudit.zeroOverlap
                  ? '0 HUD Overlaps · Edge Anonymized'
                  : 'HUD Warning'}
              </span>
            </div>

            {/* 5 Core Biomechanical KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">RULA Score (1–7)</div>
                <div
                  className="kpi-value mono"
                  style={{
                    color:
                      biomechanicalRisk.rulaScore >= 6
                        ? '#f43f5e'
                        : biomechanicalRisk.rulaScore >= 4
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {biomechanicalRisk.rulaScore} / 7
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">REBA Score (1–15)</div>
                <div
                  className="kpi-value mono"
                  style={{
                    color:
                      biomechanicalRisk.rebaScore >= 10
                        ? '#f43f5e'
                        : biomechanicalRisk.rebaScore >= 6
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {biomechanicalRisk.rebaScore} / 15
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">NIOSH Lifting Index (LI)</div>
                <div
                  className="kpi-value mono"
                  style={{
                    color:
                      biomechanicalRisk.niosh.liftingIndex >= 1.5
                        ? '#f43f5e'
                        : biomechanicalRisk.niosh.liftingIndex > 1.0
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {biomechanicalRisk.niosh.liftingIndex}x{' '}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    (RWL {biomechanicalRisk.niosh.recommendedWeightLimitKg}kg)
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">L5/S1 Disc Compression</div>
                <div
                  className="kpi-value mono"
                  style={{
                    color:
                      biomechanicalRisk.estimatedLumbarCompressionN >= 3400
                        ? '#f43f5e'
                        : '#67e8f9',
                  }}
                >
                  {biomechanicalRisk.estimatedLumbarCompressionN} N
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">Cumulative Shift Fatigue</div>
                <div
                  className="kpi-value mono"
                  style={{
                    color:
                      fatigueReport.cumulativeFatigueScore >= 75
                        ? '#f43f5e'
                        : fatigueReport.cumulativeFatigueScore >= 50
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {fatigueReport.cumulativeFatigueScore}% ({fatigueReport.fatigueSeverity})
                </div>
              </div>
            </div>

            {/* Interactive 880x420 SVG OpenCV Vision HUD */}
            <div className="hud-canvas-box">
              <svg
                viewBox={`0 0 ${poseFrame.svgWidth} ${poseFrame.svgHeight}`}
                width="100%"
                height="375"
                role="img"
                aria-label="OpenCV 17-keypoint biomechanical pose and joint-angle telemetry canvas"
              >
                {/* Reference Floor Grid */}
                <line
                  x1="260"
                  y1="395"
                  x2="610"
                  y2="395"
                  stroke="#334155"
                  strokeWidth="2"
                />
                {/* Vertical Plumb Reference through Pelvis */}
                <line
                  x1="415"
                  y1="45"
                  x2="415"
                  y2="395"
                  stroke="#334155"
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                />

                {/* Leader Lines from HUD Callout Cards to Anatomical Joints */}
                {poseFrame.hudCallouts.map((card) => {
                  const cardEdgeX = card.x < 400 ? card.x + card.width : card.x;
                  const cardCenterY = card.y + card.height / 2;
                  const stroke = riskColorHex(card.riskLevel);
                  return (
                    <line
                      key={`leader-${card.id}`}
                      x1={cardEdgeX}
                      y1={cardCenterY}
                      x2={card.anchorX}
                      y2={card.anchorY}
                      stroke={stroke}
                      strokeWidth="1.3"
                      strokeDasharray="3,3"
                      opacity="0.7"
                    />
                  );
                })}

                {/* Skeleton Bones */}
                {poseFrame.bones.map((bone) => {
                  const fromKp = poseFrame.keypoints.find((k) => k.id === bone.from);
                  const toKp = poseFrame.keypoints.find((k) => k.id === bone.to);
                  if (!fromKp || !toKp) return null;
                  return (
                    <line
                      key={bone.id}
                      x1={fromKp.x}
                      y1={fromKp.y}
                      x2={toKp.x}
                      y2={toKp.y}
                      stroke={riskColorHex(bone.riskLevel)}
                      strokeWidth="4.2"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Face Redaction Privacy Shield */}
                {poseFrame.faceRedactionShield.active && (
                  <g>
                    <circle
                      cx={poseFrame.faceRedactionShield.cx}
                      cy={poseFrame.faceRedactionShield.cy}
                      r={poseFrame.faceRedactionShield.radius}
                      fill={
                        privacyMode === 'face-redacted'
                          ? 'rgba(6, 182, 212, 0.22)'
                          : 'rgba(15, 23, 42, 0.85)'
                      }
                      stroke="#06b6d4"
                      strokeWidth="1.8"
                      strokeDasharray="4,3"
                    />
                    <text
                      x={poseFrame.faceRedactionShield.cx}
                      y={poseFrame.faceRedactionShield.cy - 32}
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      PII REDACTED AT EDGE
                    </text>
                  </g>
                )}

                {/* Anatomical Keypoints */}
                {poseFrame.keypoints.map((kp) => {
                  if (privacyMode === 'skeleton-only' && kp.isCranialBiometric && kp.id !== 'kp-nose') {
                    return null;
                  }
                  return (
                    <circle
                      key={kp.id}
                      cx={kp.x}
                      cy={kp.y}
                      r={kp.isCranialBiometric ? 3.5 : 5.5}
                      fill="#090d16"
                      stroke="#f8fafc"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* 6 Perimeter Joint-Angle Telemetry HUD Cards */}
                {poseFrame.hudCallouts.map((card) => {
                  const stroke = riskColorHex(card.riskLevel);
                  return (
                    <g
                      key={card.id}
                      transform={`translate(${card.x}, ${card.y})`}
                    >
                      <rect
                        width={card.width}
                        height={card.height}
                        rx={9}
                        fill="#111827"
                        stroke={stroke}
                        strokeWidth="1.7"
                      />
                      <text
                        x={11}
                        y={20}
                        fill="#f8fafc"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {card.title}
                      </text>
                      <text
                        x={11}
                        y={41}
                        fill={stroke}
                        fontSize="15"
                        fontWeight="800"
                      >
                        {card.angleValueText}
                      </text>
                      <text
                        x={card.width - 11}
                        y={41}
                        textAnchor="end"
                        fill={stroke}
                        fontSize="10"
                        fontWeight="700"
                      >
                        {card.riskLevel}
                      </text>
                      <text x={11} y={57} fill="#94a3b8" fontSize="9.5">
                        {card.thresholdText}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* Panel 2: OSHA / NIOSH Engineering Controls & Micro-Break Prescription */}
          <section className="panel-card">
            <div className="panel-header">
              <h2 className="panel-title">
                4. OSHA / NIOSH Engineering Controls & Micro-Break Playbook
              </h2>
              <span
                className={
                  biomechanicalRisk.actionLevel === 'LEVEL_4_IMMEDIATE_INTERVENTION'
                    ? 'badge-pill badge-critical'
                    : 'badge-pill badge-high'
                }
              >
                {biomechanicalRisk.actionLevel}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 10,
              }}
            >
              {recommendations.map((rec, idx) => (
                <div key={idx} className="kpi-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#67e8f9',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    <span>{rec.category}</span>
                    <span>-{rec.expectedRiskReductionPct}% MSD Risk</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      marginBottom: 4,
                    }}
                  >
                    {rec.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                    {rec.actionDetail}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Panel 3: AWS IoT Greengrass / CloudWatch Embedded Metric Format (EMF) Telemetry */}
          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  5. AWS IoT Greengrass / CloudWatch EMF Anonymized Telemetry
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Verified zero cranial/facial biometric PII leaves the edge camera appliance.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge-pill badge-emerald">
                  <ShieldCheckIcon />{' '}
                  {privacyAudit.validEmfSchema && privacyAudit.zeroBiometricPiiLeak
                    ? 'Valid AWS EMF · 0 Biometric PII Leaks'
                    : 'Schema Warning'}
                </span>
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleCopyJson}
                >
                  Copy AWS EMF JSON
                </button>
              </div>
            </div>

            {copiedBanner && (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: '0.78rem',
                  color: '#6ee7b7',
                  fontWeight: 600,
                }}
              >
                ✓ Copied {copiedBanner} to clipboard!
              </div>
            )}

            <pre className="json-box mono">{awsJson}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}
