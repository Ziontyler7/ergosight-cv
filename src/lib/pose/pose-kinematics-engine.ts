export type PrivacyMode = 'skeleton-only' | 'face-redacted';

export type JointRiskLevel = 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface JointAngleParams {
  trunkFlexionDeg: number; // 0 (upright) to 90 (horizontal bend)
  neckFlexionDeg: number; // 0 (neutral) to 60 (chin-to-chest / hyperextension)
  shoulderAbductionDeg: number; // 0 (arms down) to 150 (overhead reach)
  elbowFlexionDeg: number; // 30 to 135 (90 optimal)
  wristDeviationDeg: number; // 0 (neutral) to 40 (ulnar/radial deviation)
  kneeFlexionDeg: number; // 0 (straight) to 90 (deep squat)
  asymmetryTwistDeg: number; // 0 (sagittal) to 60 (axial trunk twist)
}

export interface Keypoint2D {
  id: string;
  name: string;
  x: number;
  y: number;
  confidence: number;
  isCranialBiometric: boolean;
}

export interface SkeletonBone {
  id: string;
  from: string;
  to: string;
  segment: 'spine' | 'upper_limb' | 'lower_limb' | 'head';
  riskLevel: JointRiskLevel;
}

export interface HudCalloutCard {
  id: string;
  title: string;
  angleValueText: string;
  thresholdText: string;
  riskLevel: JointRiskLevel;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export interface PoseKinematicsFrame {
  svgWidth: number;
  svgHeight: number;
  privacyMode: PrivacyMode;
  angles: JointAngleParams;
  keypoints: Keypoint2D[];
  bones: SkeletonBone[];
  hudCallouts: HudCalloutCard[];
  faceRedactionShield: {
    cx: number;
    cy: number;
    radius: number;
    active: boolean;
  };
}

export interface HudOverlapVerification {
  zeroOverlap: boolean;
  conflictPairs: Array<[string, string]>;
  withinCanvasBounds: boolean;
}

const SVG_WIDTH = 880;
const SVG_HEIGHT = 420;
const CARD_WIDTH = 216;
const CARD_HEIGHT = 68;

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function computeVectorAngleDeg(
  a: { x: number; y: number },
  vertex: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const ux = a.x - vertex.x;
  const uy = a.y - vertex.y;
  const vx = b.x - vertex.x;
  const vy = b.y - vertex.y;

  const magU = Math.hypot(ux, uy);
  const magV = Math.hypot(vx, vy);
  if (magU < 1e-6 || magV < 1e-6) {
    return 0;
  }

  const cosTheta = clampNumber((ux * vx + uy * vy) / (magU * magV), -1, 1);
  const radians = Math.acos(cosTheta);
  return clampNumber(Number(((radians * 180) / Math.PI).toFixed(2)), 0, 180);
}

function classifyAngleRisk(
  angle: number,
  moderateThreshold: number,
  highThreshold: number,
  criticalThreshold: number
): JointRiskLevel {
  if (angle >= criticalThreshold) return 'CRITICAL';
  if (angle >= highThreshold) return 'HIGH';
  if (angle >= moderateThreshold) return 'MODERATE';
  return 'OPTIMAL';
}

export function buildPoseKinematicsFrame(
  rawAngles: JointAngleParams,
  privacyMode: PrivacyMode = 'face-redacted'
): PoseKinematicsFrame {
  const angles: JointAngleParams = {
    trunkFlexionDeg: clampNumber(rawAngles.trunkFlexionDeg, 0, 90),
    neckFlexionDeg: clampNumber(rawAngles.neckFlexionDeg, 0, 65),
    shoulderAbductionDeg: clampNumber(rawAngles.shoulderAbductionDeg, 0, 160),
    elbowFlexionDeg: clampNumber(rawAngles.elbowFlexionDeg, 10, 150),
    wristDeviationDeg: clampNumber(rawAngles.wristDeviationDeg, 0, 45),
    kneeFlexionDeg: clampNumber(rawAngles.kneeFlexionDeg, 0, 95),
    asymmetryTwistDeg: clampNumber(rawAngles.asymmetryTwistDeg, 0, 65),
  };

  // Pelvis anchor in center of 880x420 viewport
  const pelvisX = 415;
  const pelvisY = 235;

  const trunkRad = (angles.trunkFlexionDeg * Math.PI) / 180;
  const spineLen = 96;
  const neckX = Math.round(pelvisX + Math.sin(trunkRad) * spineLen);
  const neckY = Math.round(pelvisY - Math.cos(trunkRad) * spineLen);

  const neckRad = ((angles.trunkFlexionDeg + angles.neckFlexionDeg * 0.7) * Math.PI) / 180;
  const headLen = 38;
  const headX = Math.round(neckX + Math.sin(neckRad) * headLen);
  const headY = Math.round(neckY - Math.cos(neckRad) * headLen);

  // Shoulders offset around neck_c7 with axial twist visual projection
  const shoulderHalfSpan = Math.max(14, Math.round(30 * Math.cos((angles.asymmetryTwistDeg * Math.PI) / 180)));
  const leftShoulderX = neckX - shoulderHalfSpan;
  const leftShoulderY = neckY + 10;
  const rightShoulderX = neckX + shoulderHalfSpan;
  const rightShoulderY = neckY + 8;

  // Right active working arm (forward/upward reach)
  const shoulderRad = ((angles.shoulderAbductionDeg - 15) * Math.PI) / 180;
  const upperArmLen = 58;
  const rightElbowX = Math.round(rightShoulderX + Math.sin(shoulderRad) * upperArmLen);
  const rightElbowY = Math.round(rightShoulderY + Math.cos(shoulderRad) * upperArmLen);

  const forearmRad =
    ((angles.shoulderAbductionDeg + (100 - angles.elbowFlexionDeg) * 0.65) * Math.PI) / 180;
  const forearmLen = 54;
  const rightWristX = Math.round(rightElbowX + Math.sin(forearmRad) * forearmLen);
  const rightWristY = Math.round(rightElbowY + Math.cos(forearmRad) * forearmLen);

  // Left assistive arm
  const leftElbowX = Math.round(leftShoulderX + Math.sin(shoulderRad * 0.85) * 54);
  const leftElbowY = Math.round(leftShoulderY + Math.cos(shoulderRad * 0.85) * 54);
  const leftWristX = Math.round(leftElbowX + Math.sin(forearmRad * 0.9) * 50);
  const leftWristY = Math.round(leftElbowY + Math.cos(forearmRad * 0.9) * 50);

  // Hips, knees, ankles
  const leftHipX = pelvisX - 20;
  const leftHipY = pelvisY + 10;
  const rightHipX = pelvisX + 20;
  const rightHipY = pelvisY + 10;

  const kneeRad = (angles.kneeFlexionDeg * 0.55 * Math.PI) / 180;
  const thighLen = 68;
  const leftKneeX = Math.round(leftHipX + Math.sin(kneeRad) * thighLen);
  const leftKneeY = Math.round(leftHipY + Math.cos(kneeRad) * thighLen);
  const rightKneeX = Math.round(rightHipX + Math.sin(kneeRad) * thighLen);
  const rightKneeY = Math.round(rightHipY + Math.cos(kneeRad) * thighLen);

  const shankLen = 66;
  const leftAnkleX = leftKneeX - Math.round(Math.sin(kneeRad * 0.4) * 18);
  const leftAnkleY = Math.min(392, leftKneeY + shankLen);
  const rightAnkleX = rightKneeX - Math.round(Math.sin(kneeRad * 0.4) * 18);
  const rightAnkleY = Math.min(392, rightKneeY + shankLen);

  const keypoints: Keypoint2D[] = [
    { id: 'kp-nose', name: 'Cranial Center (Redacted)', x: headX, y: headY, confidence: 0.99, isCranialBiometric: true },
    { id: 'kp-leye', name: 'Left Eye (Redacted)', x: headX - 8, y: headY - 5, confidence: 0.98, isCranialBiometric: true },
    { id: 'kp-reye', name: 'Right Eye (Redacted)', x: headX + 8, y: headY - 5, confidence: 0.98, isCranialBiometric: true },
    { id: 'kp-lear', name: 'Left Ear (Redacted)', x: headX - 15, y: headY - 2, confidence: 0.96, isCranialBiometric: true },
    { id: 'kp-rear', name: 'Right Ear (Redacted)', x: headX + 15, y: headY - 2, confidence: 0.96, isCranialBiometric: true },
    { id: 'kp-neck', name: 'C7 Cervical Pivot', x: neckX, y: neckY, confidence: 0.99, isCranialBiometric: false },
    { id: 'kp-lsho', name: 'Left Shoulder', x: leftShoulderX, y: leftShoulderY, confidence: 0.98, isCranialBiometric: false },
    { id: 'kp-rsho', name: 'Right Shoulder', x: rightShoulderX, y: rightShoulderY, confidence: 0.99, isCranialBiometric: false },
    { id: 'kp-lelb', name: 'Left Elbow', x: leftElbowX, y: leftElbowY, confidence: 0.97, isCranialBiometric: false },
    { id: 'kp-relb', name: 'Right Elbow', x: rightElbowX, y: rightElbowY, confidence: 0.99, isCranialBiometric: false },
    { id: 'kp-lwri', name: 'Left Wrist', x: leftWristX, y: leftWristY, confidence: 0.96, isCranialBiometric: false },
    { id: 'kp-rwri', name: 'Right Wrist', x: rightWristX, y: rightWristY, confidence: 0.98, isCranialBiometric: false },
    { id: 'kp-pelvis', name: 'L5/S1 Lumbar Disc', x: pelvisX, y: pelvisY, confidence: 0.99, isCranialBiometric: false },
    { id: 'kp-lhip', name: 'Left Hip', x: leftHipX, y: leftHipY, confidence: 0.98, isCranialBiometric: false },
    { id: 'kp-rhip', name: 'Right Hip', x: rightHipX, y: rightHipY, confidence: 0.98, isCranialBiometric: false },
    { id: 'kp-lknee', name: 'Left Knee', x: leftKneeX, y: leftKneeY, confidence: 0.97, isCranialBiometric: false },
    { id: 'kp-rknee', name: 'Right Knee', x: rightKneeX, y: rightKneeY, confidence: 0.97, isCranialBiometric: false },
    { id: 'kp-lank', name: 'Left Ankle', x: leftAnkleX, y: leftAnkleY, confidence: 0.96, isCranialBiometric: false },
    { id: 'kp-rank', name: 'Right Ankle', x: rightAnkleX, y: rightAnkleY, confidence: 0.96, isCranialBiometric: false },
  ];

  const trunkRisk = classifyAngleRisk(angles.trunkFlexionDeg, 20, 35, 50);
  const neckRisk = classifyAngleRisk(angles.neckFlexionDeg, 15, 25, 38);
  const shoulderRisk = classifyAngleRisk(angles.shoulderAbductionDeg, 45, 75, 95);
  const wristRisk = classifyAngleRisk(angles.wristDeviationDeg, 10, 18, 25);
  const kneeRisk = classifyAngleRisk(angles.kneeFlexionDeg, 25, 45, 65);
  const twistRisk = classifyAngleRisk(angles.asymmetryTwistDeg, 15, 30, 45);

  const bones: SkeletonBone[] = [
    { id: 'b-head-neck', from: 'kp-nose', to: 'kp-neck', segment: 'head', riskLevel: neckRisk },
    { id: 'b-spine', from: 'kp-neck', to: 'kp-pelvis', segment: 'spine', riskLevel: trunkRisk },
    { id: 'b-clavicle-l', from: 'kp-neck', to: 'kp-lsho', segment: 'upper_limb', riskLevel: shoulderRisk },
    { id: 'b-clavicle-r', from: 'kp-neck', to: 'kp-rsho', segment: 'upper_limb', riskLevel: shoulderRisk },
    { id: 'b-uarm-l', from: 'kp-lsho', to: 'kp-lelb', segment: 'upper_limb', riskLevel: shoulderRisk },
    { id: 'b-uarm-r', from: 'kp-rsho', to: 'kp-relb', segment: 'upper_limb', riskLevel: shoulderRisk },
    { id: 'b-farm-l', from: 'kp-lelb', to: 'kp-lwri', segment: 'upper_limb', riskLevel: wristRisk },
    { id: 'b-farm-r', from: 'kp-relb', to: 'kp-rwri', segment: 'upper_limb', riskLevel: wristRisk },
    { id: 'b-pelvis-l', from: 'kp-pelvis', to: 'kp-lhip', segment: 'lower_limb', riskLevel: trunkRisk },
    { id: 'b-pelvis-r', from: 'kp-pelvis', to: 'kp-rhip', segment: 'lower_limb', riskLevel: trunkRisk },
    { id: 'b-thigh-l', from: 'kp-lhip', to: 'kp-lknee', segment: 'lower_limb', riskLevel: kneeRisk },
    { id: 'b-thigh-r', from: 'kp-rhip', to: 'kp-rknee', segment: 'lower_limb', riskLevel: kneeRisk },
    { id: 'b-shank-l', from: 'kp-lknee', to: 'kp-lank', segment: 'lower_limb', riskLevel: kneeRisk },
    { id: 'b-shank-r', from: 'kp-rknee', to: 'kp-rank', segment: 'lower_limb', riskLevel: kneeRisk },
  ];

  // 6 non-overlapping perimeter HUD callout cards (3 Left Gutter x=24, 3 Right Gutter x=640)
  const hudCallouts: HudCalloutCard[] = [
    {
      id: 'hud-neck',
      title: 'Cervical Flexion (C7)',
      angleValueText: `${angles.neckFlexionDeg}°`,
      thresholdText: 'ISO Safe <= 20°',
      riskLevel: neckRisk,
      x: 24,
      y: 44,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: neckX,
      anchorY: neckY,
    },
    {
      id: 'hud-trunk',
      title: 'Lumbar Trunk Flexion (L5/S1)',
      angleValueText: `${angles.trunkFlexionDeg}°`,
      thresholdText: 'OSHA Safe <= 20°',
      riskLevel: trunkRisk,
      x: 24,
      y: 164,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: pelvisX,
      anchorY: pelvisY,
    },
    {
      id: 'hud-knee',
      title: 'Knee Flexion & Stance',
      angleValueText: `${angles.kneeFlexionDeg}°`,
      thresholdText: 'Balanced <= 30°',
      riskLevel: kneeRisk,
      x: 24,
      y: 284,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: rightKneeX,
      anchorY: rightKneeY,
    },
    {
      id: 'hud-shoulder',
      title: 'Shoulder Abduction / Reach',
      angleValueText: `${angles.shoulderAbductionDeg}°`,
      thresholdText: 'RULA Safe <= 45°',
      riskLevel: shoulderRisk,
      x: 640,
      y: 44,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: rightShoulderX,
      anchorY: rightShoulderY,
    },
    {
      id: 'hud-wrist',
      title: 'Wrist Ulnar / Radial Dev',
      angleValueText: `${angles.wristDeviationDeg}°`,
      thresholdText: 'Neutral <= 15°',
      riskLevel: wristRisk,
      x: 640,
      y: 164,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: rightWristX,
      anchorY: rightWristY,
    },
    {
      id: 'hud-twist',
      title: 'Axial Asymmetry Twist',
      angleValueText: `${angles.asymmetryTwistDeg}°`,
      thresholdText: 'NIOSH AM <= 15°',
      riskLevel: twistRisk,
      x: 640,
      y: 284,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      anchorX: Math.round((neckX + pelvisX) / 2),
      anchorY: Math.round((neckY + pelvisY) / 2),
    },
  ];

  return {
    svgWidth: SVG_WIDTH,
    svgHeight: SVG_HEIGHT,
    privacyMode,
    angles,
    keypoints,
    bones,
    hudCallouts,
    faceRedactionShield: {
      cx: headX,
      cy: headY,
      radius: 26,
      active: true,
    },
  };
}

export function verifyZeroHudOverlap(frame: PoseKinematicsFrame): HudOverlapVerification {
  const conflictPairs: Array<[string, string]> = [];
  let withinCanvasBounds = true;

  for (let i = 0; i < frame.hudCallouts.length; i++) {
    const a = frame.hudCallouts[i];
    if (
      a.x < 0 ||
      a.y < 0 ||
      a.x + a.width > frame.svgWidth ||
      a.y + a.height > frame.svgHeight
    ) {
      withinCanvasBounds = false;
    }

    for (let j = i + 1; j < frame.hudCallouts.length; j++) {
      const b = frame.hudCallouts[j];
      const overlapX = a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x;
      const overlapY = a.y < b.y + b.height + 8 && a.y + a.height + 8 > b.y;
      if (overlapX && overlapY) {
        conflictPairs.push([a.id, b.id]);
      }
    }
  }

  return {
    zeroOverlap: conflictPairs.length === 0 && withinCanvasBounds,
    conflictPairs,
    withinCanvasBounds,
  };
}
