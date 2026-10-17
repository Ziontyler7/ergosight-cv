import {
  clampNumber,
  type JointAngleParams,
} from '../pose/pose-kinematics-engine.ts';

export type ErgoActionLevel =
  | 'LEVEL_1_ACCEPTABLE'
  | 'LEVEL_2_INVESTIGATE'
  | 'LEVEL_3_CHANGE_SOON'
  | 'LEVEL_4_IMMEDIATE_INTERVENTION';

export interface NioshLiftingParams {
  loadMassKg: number; // Actual object weight in kg
  horizontalDistanceCm: number; // H: 25cm (optimal) to 63cm
  verticalHeightCm: number; // V: hand height from floor (0 to 175cm)
  verticalTravelCm: number; // D: vertical travel distance (25 to 175cm)
  liftsPerMinute: number; // F: lift frequency (0.2 to 15 lifts/min)
  couplingQuality: 'GOOD' | 'FAIR' | 'POOR';
}

export interface ErgonomicScenarioPreset {
  id: string;
  stationId: string;
  facilityZone: string;
  title: string;
  taskDescription: string;
  cameraModel: string;
  edgeDevice: string;
  angles: JointAngleParams;
  lifting: NioshLiftingParams;
  cyclesPerMinute: number;
  staticHoldSeconds: number;
  shiftDurationMinutes: number;
}

export interface BiomechanicalRiskAssessment {
  rulaScore: number; // 1 to 7
  rebaScore: number; // 1 to 15
  actionLevel: ErgoActionLevel;
  actionSummary: string;
  niosh: {
    loadConstantKg: number;
    horizontalMultiplier: number;
    verticalMultiplier: number;
    distanceMultiplier: number;
    asymmetryMultiplier: number;
    frequencyMultiplier: number;
    couplingMultiplier: number;
    recommendedWeightLimitKg: number;
    liftingIndex: number;
    isExceedingSafeLimit: boolean;
  };
  estimatedLumbarCompressionN: number; // L5/S1 disc compression force in Newtons (NIOSH action limit 3400 N)
  primaryHazardDrivers: string[];
}

export const SHOWCASE_CV_SCENARIOS: ErgonomicScenarioPreset[] = [
  {
    id: 'cv-warehouse-pallet',
    stationId: 'STATION-WH-04',
    facilityZone: 'Fulfillment Inbound Dock B',
    title: 'Warehouse Heavy Pallet Lift — Asymmetric 24kg Floor-to-Rack Twist',
    taskDescription:
      'Worker lifts 24kg tote from low pallet tier (V=28cm) with 52° lumbar trunk flexion and 42° axial twist toward conveyor.',
    cameraModel: 'OpenCV OAK-D Pro PoE (Stereo Depth + 17-KP Pose)',
    edgeDevice: 'AWS Panorama Appliance · Greengrass v2',
    angles: {
      trunkFlexionDeg: 52,
      neckFlexionDeg: 28,
      shoulderAbductionDeg: 68,
      elbowFlexionDeg: 75,
      wristDeviationDeg: 22,
      kneeFlexionDeg: 38,
      asymmetryTwistDeg: 42,
    },
    lifting: {
      loadMassKg: 24,
      horizontalDistanceCm: 48,
      verticalHeightCm: 28,
      verticalTravelCm: 55,
      liftsPerMinute: 4.5,
      couplingQuality: 'FAIR',
    },
    cyclesPerMinute: 9,
    staticHoldSeconds: 14,
    shiftDurationMinutes: 185,
  },
  {
    id: 'cv-cleanroom-wirebond',
    stationId: 'STATION-FAB-12',
    facilityZone: 'Semiconductor Packaging Bay 3',
    title: 'Cleanroom Overhead Wafer Carrier Reach — Sustained >98° Shoulder Abduction',
    taskDescription:
      'Technician performs sustained overhead cassette transfer with 104° shoulder abduction and 32° neck extension/flexion strain.',
    cameraModel: 'OpenCV OAK-D S2 Edge Camera',
    edgeDevice: 'AWS IoT Greengrass Core (Jetson Orin Nano)',
    angles: {
      trunkFlexionDeg: 24,
      neckFlexionDeg: 34,
      shoulderAbductionDeg: 104,
      elbowFlexionDeg: 62,
      wristDeviationDeg: 26,
      kneeFlexionDeg: 12,
      asymmetryTwistDeg: 18,
    },
    lifting: {
      loadMassKg: 8.5,
      horizontalDistanceCm: 42,
      verticalHeightCm: 148,
      verticalTravelCm: 40,
      liftsPerMinute: 3.0,
      couplingQuality: 'GOOD',
    },
    cyclesPerMinute: 14,
    staticHoldSeconds: 48,
    shiftDurationMinutes: 210,
  },
  {
    id: 'cv-conveyor-scan',
    stationId: 'STATION-PACK-09',
    facilityZone: 'High-Velocity Small-Parcel Sortation',
    title: 'Fulfillment Conveyor High-Speed Scanning — 28/min Wrist Ulnar Deviation',
    taskDescription:
      'Rapid repetitive barcode orientation and carton taping at 28 cycles/min with 31° wrist ulnar deviation and 46° shoulder abduction.',
    cameraModel: 'OpenCV OAK-1 PoE (60 FPS Global Shutter)',
    edgeDevice: 'AWS Panorama Edge Node',
    angles: {
      trunkFlexionDeg: 26,
      neckFlexionDeg: 29,
      shoulderAbductionDeg: 54,
      elbowFlexionDeg: 108,
      wristDeviationDeg: 31,
      kneeFlexionDeg: 10,
      asymmetryTwistDeg: 25,
    },
    lifting: {
      loadMassKg: 4.2,
      horizontalDistanceCm: 36,
      verticalHeightCm: 88,
      verticalTravelCm: 30,
      liftsPerMinute: 11.0,
      couplingQuality: 'FAIR',
    },
    cyclesPerMinute: 28,
    staticHoldSeconds: 19,
    shiftDurationMinutes: 240,
  },
  {
    id: 'cv-surgical-microscope',
    stationId: 'STATION-LAB-02',
    facilityZone: 'Clinical Micro-Assembly & Inspection Suite',
    title: 'Precision Bench Inspection — Optimal Ergonomic Reference vs Static Neck Hold',
    taskDescription:
      'Seated/standing hybrid bench station with light 1.5kg payload and neutral trunk, demonstrating low-to-moderate static cervical monitoring.',
    cameraModel: 'OpenCV DepthAI USB3 Vision Sensor',
    edgeDevice: 'AWS IoT Greengrass Local Container',
    angles: {
      trunkFlexionDeg: 12,
      neckFlexionDeg: 18,
      shoulderAbductionDeg: 28,
      elbowFlexionDeg: 90,
      wristDeviationDeg: 8,
      kneeFlexionDeg: 8,
      asymmetryTwistDeg: 6,
    },
    lifting: {
      loadMassKg: 1.5,
      horizontalDistanceCm: 26,
      verticalHeightCm: 78,
      verticalTravelCm: 25,
      liftsPerMinute: 1.0,
      couplingQuality: 'GOOD',
    },
    cyclesPerMinute: 6,
    staticHoldSeconds: 22,
    shiftDurationMinutes: 95,
  },
];

export function evaluateBiomechanicalRisk(
  angles: JointAngleParams,
  lifting: NioshLiftingParams
): BiomechanicalRiskAssessment {
  // 1. Revised NIOSH Lifting Equation (1994 standard)
  const LC = 23.0; // Load Constant in kg
  const H = clampNumber(lifting.horizontalDistanceCm, 25, 63);
  const V = clampNumber(lifting.verticalHeightCm, 0, 175);
  const D = clampNumber(lifting.verticalTravelCm, 25, 175);
  const A = clampNumber(angles.asymmetryTwistDeg, 0, 135);
  const F = clampNumber(lifting.liftsPerMinute, 0.2, 15);

  const HM = Number(clampNumber(25 / H, 0.15, 1.0).toFixed(3));
  const VM = Number(clampNumber(1 - 0.003 * Math.abs(V - 75), 0.15, 1.0).toFixed(3));
  const DM = Number(clampNumber(0.82 + 4.5 / D, 0.15, 1.0).toFixed(3));
  const AM = Number(clampNumber(1 - 0.0032 * A, 0.15, 1.0).toFixed(3));

  // Frequency Multiplier (FM) continuous approximation of NIOSH table
  const FM = Number(clampNumber(1 - F * 0.048, 0.18, 1.0).toFixed(3));

  const CM =
    lifting.couplingQuality === 'GOOD'
      ? 1.0
      : lifting.couplingQuality === 'FAIR'
      ? 0.95
      : 0.9;

  const rawRwl = LC * HM * VM * DM * AM * FM * CM;
  const recommendedWeightLimitKg = Number(Math.max(1.5, rawRwl).toFixed(2));
  const liftingIndex = Number(
    (Math.max(0, lifting.loadMassKg) / recommendedWeightLimitKg).toFixed(2)
  );

  // 2. RULA Score (1 to 7) — Upper limb, neck, trunk, wrist, load
  let rulaRaw = 1;
  if (angles.shoulderAbductionDeg > 90) rulaRaw += 3;
  else if (angles.shoulderAbductionDeg > 45) rulaRaw += 2;
  else if (angles.shoulderAbductionDeg > 20) rulaRaw += 1;

  if (angles.wristDeviationDeg > 25) rulaRaw += 2;
  else if (angles.wristDeviationDeg > 12) rulaRaw += 1;

  if (angles.neckFlexionDeg > 25) rulaRaw += 2;
  else if (angles.neckFlexionDeg > 15) rulaRaw += 1;

  if (angles.trunkFlexionDeg > 40) rulaRaw += 2;
  else if (angles.trunkFlexionDeg > 20) rulaRaw += 1;

  if (lifting.loadMassKg > 10 || angles.asymmetryTwistDeg > 25) {
    rulaRaw += 1;
  }
  const rulaScore = Math.round(clampNumber(rulaRaw, 1, 7));

  // 3. REBA Score (1 to 15) — Whole-body postural + force + coupling + twist
  let rebaRaw = 1;
  if (angles.trunkFlexionDeg > 45) rebaRaw += 4;
  else if (angles.trunkFlexionDeg > 20) rebaRaw += 2;
  else if (angles.trunkFlexionDeg > 10) rebaRaw += 1;

  if (angles.asymmetryTwistDeg > 20) rebaRaw += 2;
  else if (angles.asymmetryTwistDeg > 10) rebaRaw += 1;

  if (angles.neckFlexionDeg > 25) rebaRaw += 2;
  else if (angles.neckFlexionDeg > 15) rebaRaw += 1;

  if (angles.kneeFlexionDeg > 45) rebaRaw += 2;
  else if (angles.kneeFlexionDeg > 25) rebaRaw += 1;

  if (angles.shoulderAbductionDeg > 90) rebaRaw += 3;
  else if (angles.shoulderAbductionDeg > 45) rebaRaw += 2;

  if (angles.wristDeviationDeg > 20) rebaRaw += 2;
  else if (angles.wristDeviationDeg > 10) rebaRaw += 1;

  if (lifting.loadMassKg > 20) rebaRaw += 3;
  else if (lifting.loadMassKg > 10) rebaRaw += 2;
  else if (lifting.loadMassKg > 5) rebaRaw += 1;

  const rebaScore = Math.round(clampNumber(rebaRaw, 1, 15));

  // 4. L5/S1 Disc Compression Estimation (Newtons; NIOSH Action Limit = 3400 N)
  const trunkSin = Math.sin((angles.trunkFlexionDeg * Math.PI) / 180);
  const estimatedLumbarCompressionN = Math.round(
    950 +
      trunkSin * 1850 +
      lifting.loadMassKg * (H / 25) * 48 +
      angles.asymmetryTwistDeg * 11
  );

  // 5. Action Level & Primary Hazard Drivers
  let actionLevel: ErgoActionLevel = 'LEVEL_1_ACCEPTABLE';
  let actionSummary = 'Posture and load within ISO 11226 & NIOSH acceptable ergonomic bounds.';

  if (rebaScore >= 11 || rulaScore >= 7 || liftingIndex >= 2.0 || estimatedLumbarCompressionN >= 3400) {
    actionLevel = 'LEVEL_4_IMMEDIATE_INTERVENTION';
    actionSummary =
      'CRITICAL MSD HAZARD: Immediate engineering control or mechanical lift intervention required.';
  } else if (rebaScore >= 8 || rulaScore >= 5 || liftingIndex >= 1.3) {
    actionLevel = 'LEVEL_3_CHANGE_SOON';
    actionSummary =
      'HIGH STRAIN RISK: Workstation height, tool counterbalance, or micro-break schedule adjustment required soon.';
  } else if (rebaScore >= 4 || rulaScore >= 3 || liftingIndex >= 1.0) {
    actionLevel = 'LEVEL_2_INVESTIGATE';
    actionSummary =
      'MODERATE STRAIN: Monitor cumulative repetition fatigue and encourage periodic posture reset.';
  }

  const primaryHazardDrivers: string[] = [];
  if (angles.trunkFlexionDeg > 30) {
    primaryHazardDrivers.push(
      `Excessive lumbar trunk flexion (${angles.trunkFlexionDeg}° > 20° OSHA neutral zone)`
    );
  }
  if (angles.asymmetryTwistDeg > 20) {
    primaryHazardDrivers.push(
      `Asymmetric axial trunk rotation (${angles.asymmetryTwistDeg}° > 15° threshold)`
    );
  }
  if (angles.shoulderAbductionDeg > 60) {
    primaryHazardDrivers.push(
      `Elevated shoulder abduction / overhead reach (${angles.shoulderAbductionDeg}° > 45° RULA ceiling)`
    );
  }
  if (angles.wristDeviationDeg > 18) {
    primaryHazardDrivers.push(
      `High ulnar/radial wrist deviation (${angles.wristDeviationDeg}° > 15° carpal tunnel threshold)`
    );
  }
  if (liftingIndex > 1.0) {
    primaryHazardDrivers.push(
      `NIOSH Lifting Index LI=${liftingIndex} exceeds 1.0 (Load ${lifting.loadMassKg}kg > RWL ${recommendedWeightLimitKg}kg)`
    );
  }
  if (estimatedLumbarCompressionN >= 3400) {
    primaryHazardDrivers.push(
      `Estimated L5/S1 disc compression (${estimatedLumbarCompressionN} N) exceeds 3,400 N NIOSH Action Limit`
    );
  }
  if (primaryHazardDrivers.length === 0) {
    primaryHazardDrivers.push('All primary anatomical joints operating within neutral safety envelope.');
  }

  return {
    rulaScore,
    rebaScore,
    actionLevel,
    actionSummary,
    niosh: {
      loadConstantKg: LC,
      horizontalMultiplier: HM,
      verticalMultiplier: VM,
      distanceMultiplier: DM,
      asymmetryMultiplier: AM,
      frequencyMultiplier: FM,
      couplingMultiplier: CM,
      recommendedWeightLimitKg,
      liftingIndex,
      isExceedingSafeLimit: liftingIndex > 1.0,
    },
    estimatedLumbarCompressionN,
    primaryHazardDrivers,
  };
}

export function verifyBiomechanicalBounds(
  assessment: BiomechanicalRiskAssessment
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (assessment.rulaScore < 1 || assessment.rulaScore > 7) {
    errors.push(`RULA score ${assessment.rulaScore} outside [1, 7]`);
  }
  if (assessment.rebaScore < 1 || assessment.rebaScore > 15) {
    errors.push(`REBA score ${assessment.rebaScore} outside [1, 15]`);
  }
  if (assessment.niosh.recommendedWeightLimitKg <= 0 || assessment.niosh.recommendedWeightLimitKg > 23) {
    errors.push(`NIOSH RWL ${assessment.niosh.recommendedWeightLimitKg}kg outside (0, 23]`);
  }
  if (assessment.niosh.liftingIndex < 0 || Number.isNaN(assessment.niosh.liftingIndex)) {
    errors.push(`Invalid NIOSH Lifting Index: ${assessment.niosh.liftingIndex}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
