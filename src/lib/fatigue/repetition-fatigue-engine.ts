import { clampNumber } from '../pose/pose-kinematics-engine.ts';
import type { BiomechanicalRiskAssessment } from '../ergonomics/biomechanical-risk-engine.ts';

export interface FatigueCheckpoint {
  shiftMinute: number;
  cumulativeFatigueScore: number; // 0 to 100
  recommendedMicroBreakSeconds: number;
}

export interface RepetitionFatigueReport {
  cyclesPerMinute: number;
  staticHoldSeconds: number;
  shiftDurationMinutes: number;
  repetitionStrainIndex: number; // 0 to 100
  staticHoldStrainIndex: number; // 0 to 100
  cumulativeFatigueScore: number; // 0 to 100
  fatigueSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  microBreakIntervalMinutes: number;
  microBreakDurationSeconds: number;
  nextMicroBreakCountdownSec: number;
  recoveryPrescription: string;
  shiftCurve: FatigueCheckpoint[];
}

export function evaluateRepetitionFatigue(params: {
  cyclesPerMinute: number;
  staticHoldSeconds: number;
  shiftDurationMinutes: number;
  biomechanicalRisk: BiomechanicalRiskAssessment;
}): RepetitionFatigueReport {
  const cpm = clampNumber(params.cyclesPerMinute, 0, 60);
  const holdSec = clampNumber(params.staticHoldSeconds, 0, 300);
  const shiftMin = clampNumber(params.shiftDurationMinutes, 15, 480);

  const repetitionStrainIndex = Math.round(
    clampNumber(
      cpm * 2.4 + (params.biomechanicalRisk.rulaScore - 1) * 5.5,
      4,
      100
    )
  );

  // ISO 11226 static hold threshold starts rising sharply past 20 seconds
  const staticHoldStrainIndex = Math.round(
    clampNumber(
      holdSec * 1.35 + (params.biomechanicalRisk.rebaScore - 1) * 4.2,
      4,
      100
    )
  );

  const postureWeight =
    (params.biomechanicalRisk.rebaScore / 15) * 42 +
    Math.min(25, params.biomechanicalRisk.niosh.liftingIndex * 12);

  const timeFactor = clampNumber(shiftMin / 240, 0.25, 1.35);
  const cumulativeFatigueScore = Math.round(
    clampNumber(
      (repetitionStrainIndex * 0.34 +
        staticHoldStrainIndex * 0.28 +
        postureWeight) *
        timeFactor,
      8,
      99
    )
  );

  const fatigueSeverity =
    cumulativeFatigueScore >= 78
      ? 'CRITICAL'
      : cumulativeFatigueScore >= 55
      ? 'HIGH'
      : cumulativeFatigueScore >= 32
      ? 'MODERATE'
      : 'LOW';

  const microBreakIntervalMinutes =
    fatigueSeverity === 'CRITICAL'
      ? 20
      : fatigueSeverity === 'HIGH'
      ? 30
      : fatigueSeverity === 'MODERATE'
      ? 45
      : 60;

  const microBreakDurationSeconds =
    fatigueSeverity === 'CRITICAL'
      ? 90
      : fatigueSeverity === 'HIGH'
      ? 60
      : fatigueSeverity === 'MODERATE'
      ? 40
      : 25;

  const nextMicroBreakCountdownSec = Math.max(
    45,
    microBreakIntervalMinutes * 60 - ((shiftMin * 60) % (microBreakIntervalMinutes * 60))
  );

  const recoveryPrescription =
    fatigueSeverity === 'CRITICAL'
      ? `Trigger immediate ${microBreakDurationSeconds}s active decompression micro-break every ${microBreakIntervalMinutes}m + rotate worker off high-load station.`
      : fatigueSeverity === 'HIGH'
      ? `Schedule ${microBreakDurationSeconds}s shoulder/lumbar extension micro-break every ${microBreakIntervalMinutes}m.`
      : `Maintain standard ${microBreakDurationSeconds}s posture reset every ${microBreakIntervalMinutes}m.`;

  // Build strictly monotonic 6-point shift fatigue accumulation curve
  const checkpoints = [30, 60, 120, 180, 240, 300];
  let prevScore = 0;
  const shiftCurve: FatigueCheckpoint[] = checkpoints.map((minuteMark, idx) => {
    const progress = (idx + 1) / checkpoints.length;
    const rawPoint = Math.round(
      clampNumber(cumulativeFatigueScore * (0.32 + progress * 0.78), 6, 99)
    );
    const monotonicScore = Math.max(prevScore + 2, Math.min(99, rawPoint));
    prevScore = monotonicScore;
    return {
      shiftMinute: minuteMark,
      cumulativeFatigueScore: monotonicScore,
      recommendedMicroBreakSeconds: Math.round(
        microBreakDurationSeconds * (0.7 + progress * 0.4)
      ),
    };
  });

  return {
    cyclesPerMinute: cpm,
    staticHoldSeconds: holdSec,
    shiftDurationMinutes: shiftMin,
    repetitionStrainIndex,
    staticHoldStrainIndex,
    cumulativeFatigueScore,
    fatigueSeverity,
    microBreakIntervalMinutes,
    microBreakDurationSeconds,
    nextMicroBreakCountdownSec,
    recoveryPrescription,
    shiftCurve,
  };
}

export function verifyMonotonicFatigueCurve(report: RepetitionFatigueReport): boolean {
  if (report.shiftCurve.length < 2) return false;
  for (let i = 1; i < report.shiftCurve.length; i++) {
    if (
      report.shiftCurve[i].shiftMinute <= report.shiftCurve[i - 1].shiftMinute ||
      report.shiftCurve[i].cumulativeFatigueScore <
        report.shiftCurve[i - 1].cumulativeFatigueScore
    ) {
      return false;
    }
  }
  return true;
}
