import {
  buildPoseKinematicsFrame,
  type JointAngleParams,
  type PoseKinematicsFrame,
  type PrivacyMode,
} from '../pose/pose-kinematics-engine.ts';
import {
  evaluateBiomechanicalRisk,
  type BiomechanicalRiskAssessment,
  type ErgonomicScenarioPreset,
} from '../ergonomics/biomechanical-risk-engine.ts';
import {
  evaluateRepetitionFatigue,
  type RepetitionFatigueReport,
} from '../fatigue/repetition-fatigue-engine.ts';

export type EdgeInferenceMode = 'local-opencv-deterministic' | 'aws-bedrock-byok';

export interface EngineeringControlRecommendation {
  category: 'ENGINEERING_CONTROL' | 'WORKSTATION_ADJUSTMENT' | 'MICRO_BREAK_PROTOCOL';
  title: string;
  actionDetail: string;
  expectedRiskReductionPct: number;
}

export interface AwsGreengrassTelemetryPacket {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: string[][];
      Metrics: Array<{ Name: string; Unit: string }>;
    }>;
  };
  StationId: string;
  FacilityZone: string;
  EdgeDevice: string;
  PrivacyMode: PrivacyMode;
  BiometricPiiRedacted: boolean;
  RULAScore: number;
  REBAScore: number;
  NIOSHLiftingIndex: number;
  RecommendedWeightLimitKg: number;
  LumbarCompressionNewtons: number;
  CumulativeFatigueScore: number;
  ActionLevel: string;
}

export interface AwsGreengrassV2ComponentRecipe {
  RecipeFormatVersion: '2020-01-25';
  ComponentName: string;
  ComponentVersion: string;
  ComponentDescription: string;
  ComponentPublisher: string;
  ComponentConfiguration: {
    DefaultConfiguration: {
      StationId: string;
      FacilityZone: string;
      PrivacyMode: PrivacyMode;
      EnforceZeroBiometricRetention: boolean;
      NIOSHLiftingIndexAlertThreshold: number;
      REBAImmediateInterventionThreshold: number;
      accessControl: Record<
        string,
        {
          policyDescription: string;
          operations: string[];
          resources: string[];
        }
      >;
    };
  };
  Manifests: Array<{
    Platform: { os: string; architecture: string };
    Lifecycle: {
      Install: string;
      Run: string;
      Recover: string;
    };
  }>;
}

export interface ErgoSightCompleteBundle {
  modeUsed: EdgeInferenceMode;
  fallbackUsed: boolean;
  latencyMs: number;
  fallbackReason?: string;
  poseFrame: PoseKinematicsFrame;
  biomechanicalRisk: BiomechanicalRiskAssessment;
  fatigueReport: RepetitionFatigueReport;
  recommendations: EngineeringControlRecommendation[];
  coachExecutiveNote: string;
  awsTelemetryPacket: AwsGreengrassTelemetryPacket;
  awsTelemetryJson: string;
  greengrassV2RecipeYaml: string;
  bedrockAgentActionGroupJson: string;
}

export function synthesizeEngineeringControls(
  angles: JointAngleParams,
  risk: BiomechanicalRiskAssessment,
  fatigue: RepetitionFatigueReport
): EngineeringControlRecommendation[] {
  const controls: EngineeringControlRecommendation[] = [];

  if (angles.trunkFlexionDeg > 25 || risk.niosh.liftingIndex > 1.0) {
    controls.push({
      category: 'ENGINEERING_CONTROL',
      title: 'Deploy Pneumatic Scissor-Lift Pallet Turntable',
      actionDetail: `Raise vertical lift origin V toward 75cm knuckle height and eliminate ${angles.asymmetryTwistDeg}° axial trunk twist via 360° rotating pallet ring (reduces NIOSH LI from ${risk.niosh.liftingIndex} toward <0.95).`,
      expectedRiskReductionPct: 46,
    });
  }

  if (angles.shoulderAbductionDeg > 60) {
    controls.push({
      category: 'WORKSTATION_ADJUSTMENT',
      title: 'Lower Overhead Fixture & Add Zero-Gravity Tool Balancer',
      actionDetail: `Reduce shoulder abduction from ${angles.shoulderAbductionDeg}° to <40° neutral envelope and suspend carrier mass on overhead spring retractor.`,
      expectedRiskReductionPct: 38,
    });
  }

  if (angles.wristDeviationDeg > 16 || fatigue.cyclesPerMinute >= 20) {
    controls.push({
      category: 'WORKSTATION_ADJUSTMENT',
      title: 'Angled Hands-Free Presentation Scanner & Tilted Tote Chute',
      actionDetail: `Replace pistol-grip wrist flexion (${angles.wristDeviationDeg}° deviation at ${fatigue.cyclesPerMinute} cycles/min) with 30°-tilted chute and overhead fixed barcode array.`,
      expectedRiskReductionPct: 41,
    });
  }

  controls.push({
    category: 'MICRO_BREAK_PROTOCOL',
    title: `ISO 11226 Active Micro-Break (${fatigue.microBreakDurationSeconds}s every ${fatigue.microBreakIntervalMinutes}m)`,
    actionDetail: fatigue.recoveryPrescription,
    expectedRiskReductionPct: 24,
  });

  return controls;
}

export function buildAwsGreengrassTelemetryPacket(params: {
  scenario: ErgonomicScenarioPreset;
  privacyMode: PrivacyMode;
  risk: BiomechanicalRiskAssessment;
  fatigue: RepetitionFatigueReport;
}): AwsGreengrassTelemetryPacket {
  return {
    _aws: {
      Timestamp: 1793059200000,
      CloudWatchMetrics: [
        {
          Namespace: 'ErgoSightCV/IndustrialSafety',
          Dimensions: [['StationId', 'FacilityZone', 'PrivacyMode']],
          Metrics: [
            { Name: 'RULAScore', Unit: 'Count' },
            { Name: 'REBAScore', Unit: 'Count' },
            { Name: 'NIOSHLiftingIndex', Unit: 'None' },
            { Name: 'LumbarCompressionNewtons', Unit: 'None' },
            { Name: 'CumulativeFatigueScore', Unit: 'Percent' },
          ],
        },
      ],
    },
    StationId: params.scenario.stationId,
    FacilityZone: params.scenario.facilityZone,
    EdgeDevice: params.scenario.edgeDevice,
    PrivacyMode: params.privacyMode,
    BiometricPiiRedacted: true,
    RULAScore: params.risk.rulaScore,
    REBAScore: params.risk.rebaScore,
    NIOSHLiftingIndex: params.risk.niosh.liftingIndex,
    RecommendedWeightLimitKg: params.risk.niosh.recommendedWeightLimitKg,
    LumbarCompressionNewtons: params.risk.estimatedLumbarCompressionN,
    CumulativeFatigueScore: params.fatigue.cumulativeFatigueScore,
    ActionLevel: params.risk.actionLevel,
  };
}

export function buildAwsGreengrassV2RecipeYaml(params: {
  scenario: ErgonomicScenarioPreset;
  privacyMode: PrivacyMode;
  risk: BiomechanicalRiskAssessment;
}): string {
  return [
    `---`,
    `RecipeFormatVersion: "2020-01-25"`,
    `ComponentName: "com.ergosight.cv.EdgePoseSafetyMonitor"`,
    `ComponentVersion: "1.2.0"`,
    `ComponentDescription: "Privacy-first OpenCV 17-keypoint RULA/REBA/NIOSH edge safety monitor for ${params.scenario.stationId} (${params.scenario.facilityZone})."`,
    `ComponentPublisher: "ErgoSight CV Safety Engineering"`,
    `ComponentDependencies:`,
    `  aws.greengrass.Nucleus:`,
    `    VersionRequirement: ">=2.12.0 <3.0.0"`,
    `  aws.greengrass.StreamManager:`,
    `    VersionRequirement: ">=2.1.0 <3.0.0"`,
    `ComponentConfiguration:`,
    `  DefaultConfiguration:`,
    `    StationId: "${params.scenario.stationId}"`,
    `    FacilityZone: "${params.scenario.facilityZone}"`,
    `    PrivacyMode: "${params.privacyMode}"`,
    `    EnforceZeroBiometricRetention: true`,
    `    CurrentREBAScore: ${params.risk.rebaScore}`,
    `    CurrentNIOSHLiftingIndex: ${params.risk.niosh.liftingIndex}`,
    `    accessControl:`,
    `      aws.greengrass.ipc.mqttproxy:`,
    `        "com.ergosight.cv.EdgePoseSafetyMonitor:mqttproxy:1":`,
    `          policyDescription: "Publish anonymized RULA/REBA/NIOSH EMF metrics to AWS IoT Core"`,
    `          operations:`,
    `            - "aws.greengrass#PublishToIoTCore"`,
    `          resources:`,
    `            - "ergosight/telemetry/${params.scenario.stationId}/emf"`,
    `Manifests:`,
    `  - Platform:`,
    `      os: "linux"`,
    `      architecture: "aarch64"`,
    `    Lifecycle:`,
    `      Install: "python3 -m pip install --user opencv-python-headless numpy awsiotsdk"`,
    `      Run: "python3 -u {artifacts:path}/ergosight_edge_worker.py --station {configuration:/StationId} --privacy {configuration:/PrivacyMode}"`,
    `      Recover: "echo 'Recovering ErgoSight OpenCV worker in deterministic skeleton-only fallback mode'"`,
  ].join('\n');
}

export function buildBedrockAgentActionGroupSpec(params: {
  scenario: ErgonomicScenarioPreset;
  risk: BiomechanicalRiskAssessment;
  fatigue: RepetitionFatigueReport;
}): string {
  const spec = {
    openapi: '3.0.1',
    info: {
      title: 'ErgoSightBedrockAgentSafetyActionGroup',
      version: '1.0.0',
      description:
        'Amazon Bedrock AgentCore Action Group for autonomous OSHA/NIOSH ergonomic workstation intervention and ISO 11226 micro-break scheduling.',
    },
    paths: {
      '/ergonomics/evaluate-station': {
        post: {
          operationId: 'evaluateWorkstationBiomechanics',
          description:
            'Evaluates 17-keypoint anonymized joint angles using RULA (1-7), REBA (1-15), and the 1991 Revised NIOSH Lifting Equation (RWL = 23kg * HM * VM * DM * AM * FM * CM).',
          x_currentStationSnapshot: {
            stationId: params.scenario.stationId,
            rulaScore: params.risk.rulaScore,
            rebaScore: params.risk.rebaScore,
            nioshRwlKg: params.risk.niosh.recommendedWeightLimitKg,
            nioshLiftingIndex: params.risk.niosh.liftingIndex,
            lumbarCompressionNewtons: params.risk.estimatedLumbarCompressionN,
            actionLevel: params.risk.actionLevel,
          },
        },
      },
      '/ergonomics/schedule-iso11226-microbreak': {
        post: {
          operationId: 'scheduleIso11226MicroBreak',
          description:
            'Dispatches an automated workstation micro-break alert and scissor-lift height adjustment when REBA >= 8 or NIOSH LI > 1.0.',
          x_activeSchedule: {
            stationId: params.scenario.stationId,
            intervalMinutes: params.fatigue.microBreakIntervalMinutes,
            durationSeconds: params.fatigue.microBreakDurationSeconds,
            cumulativeFatiguePct: params.fatigue.cumulativeFatigueScore,
          },
        },
      },
    },
  };
  return JSON.stringify(spec, null, 2);
}

export function verifyPrivacyCompliantTelemetry(payloadJson: string): {
  validEmfSchema: boolean;
  zeroBiometricPiiLeak: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let validEmfSchema = false;

  try {
    const parsed = JSON.parse(payloadJson) as Partial<AwsGreengrassTelemetryPacket>;
    if (
      parsed._aws &&
      Array.isArray(parsed._aws.CloudWatchMetrics) &&
      parsed._aws.CloudWatchMetrics[0]?.Namespace === 'ErgoSightCV/IndustrialSafety' &&
      parsed.BiometricPiiRedacted === true &&
      typeof parsed.RULAScore === 'number' &&
      typeof parsed.REBAScore === 'number'
    ) {
      validEmfSchema = true;
    } else {
      errors.push('Missing required AWS CloudWatch EMF fields or BiometricPiiRedacted flag.');
    }
  } catch {
    errors.push('Invalid JSON in AWS telemetry packet.');
  }

  const forbiddenPiiKeys = [
    'kp-nose',
    'kp-leye',
    'kp-reye',
    'kp-lear',
    'kp-rear',
    'rawFrameBase64',
    'faceEmbedding',
    'workerName',
  ];

  const leakedPii = forbiddenPiiKeys.filter((k) => payloadJson.includes(k));
  if (leakedPii.length > 0) {
    errors.push(`Biometric PII leaked into cloud telemetry: ${leakedPii.join(', ')}`);
  }

  return {
    validEmfSchema,
    zeroBiometricPiiLeak: leakedPii.length === 0,
    errors,
  };
}

export async function runErgoSightPipeline(params: {
  scenario: ErgonomicScenarioPreset;
  privacyMode?: PrivacyMode;
  mode?: EdgeInferenceMode;
  apiKey?: string;
  endpointUrl?: string;
  timeoutMs?: number;
}): Promise<ErgoSightCompleteBundle> {
  const startMs = performance.now();
  const privacyMode = params.privacyMode ?? 'face-redacted';
  const mode = params.mode ?? 'local-opencv-deterministic';

  const poseFrame = buildPoseKinematicsFrame(params.scenario.angles, privacyMode);
  const biomechanicalRisk = evaluateBiomechanicalRisk(
    params.scenario.angles,
    params.scenario.lifting
  );
  const fatigueReport = evaluateRepetitionFatigue({
    cyclesPerMinute: params.scenario.cyclesPerMinute,
    staticHoldSeconds: params.scenario.staticHoldSeconds,
    shiftDurationMinutes: params.scenario.shiftDurationMinutes,
    biomechanicalRisk,
  });
  const recommendations = synthesizeEngineeringControls(
    params.scenario.angles,
    biomechanicalRisk,
    fatigueReport
  );

  const awsTelemetryPacket = buildAwsGreengrassTelemetryPacket({
    scenario: params.scenario,
    privacyMode,
    risk: biomechanicalRisk,
    fatigue: fatigueReport,
  });
  const awsTelemetryJson = JSON.stringify(awsTelemetryPacket, null, 2);
  const greengrassV2RecipeYaml = buildAwsGreengrassV2RecipeYaml({
    scenario: params.scenario,
    privacyMode,
    risk: biomechanicalRisk,
  });
  const bedrockAgentActionGroupJson = buildBedrockAgentActionGroupSpec({
    scenario: params.scenario,
    risk: biomechanicalRisk,
    fatigue: fatigueReport,
  });

  const defaultCoachNote = `${params.scenario.stationId}: RULA ${biomechanicalRisk.rulaScore}/7 · REBA ${biomechanicalRisk.rebaScore}/15 · NIOSH LI ${biomechanicalRisk.niosh.liftingIndex} (RWL ${biomechanicalRisk.niosh.recommendedWeightLimitKg}kg). ${biomechanicalRisk.actionSummary}`;

  if (mode === 'local-opencv-deterministic' || !params.apiKey?.trim()) {
    const latencyMs = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));
    return {
      modeUsed: 'local-opencv-deterministic',
      fallbackUsed: false,
      latencyMs,
      poseFrame,
      biomechanicalRisk,
      fatigueReport,
      recommendations,
      coachExecutiveNote: defaultCoachNote,
      awsTelemetryPacket,
      awsTelemetryJson,
      greengrassV2RecipeYaml,
      bedrockAgentActionGroupJson,
    };
  }

  const timeoutMs = params.timeoutMs ?? 4500;
  const endpoint =
    params.endpointUrl?.trim() || 'https://api.openai.com/v1/chat/completions';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are ErgoSight CV, an OSHA/NIOSH industrial ergonomics safety coach. Summarize the highest-leverage intervention in 1 concise sentence.',
          },
          {
            role: 'user',
            content: defaultCoachNote,
          },
        ],
        max_tokens: 100,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const enhancedNote = data.choices?.[0]?.message?.content?.trim() || defaultCoachNote;
    const latencyMs = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));

    return {
      modeUsed: 'aws-bedrock-byok',
      fallbackUsed: false,
      latencyMs,
      poseFrame,
      biomechanicalRisk,
      fatigueReport,
      recommendations,
      coachExecutiveNote: enhancedNote,
      awsTelemetryPacket,
      awsTelemetryJson,
      greengrassV2RecipeYaml,
      bedrockAgentActionGroupJson,
    };
  } catch (err) {
    clearTimeout(timer);
    const reason =
      err instanceof Error ? err.message : 'External endpoint unreachable';
    const latencyMs = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));

    return {
      modeUsed: 'local-opencv-deterministic',
      fallbackUsed: true,
      fallbackReason: `Circuit breaker fallback (${timeoutMs}ms guard): ${reason}`,
      latencyMs,
      poseFrame,
      biomechanicalRisk,
      fatigueReport,
      recommendations,
      coachExecutiveNote: defaultCoachNote,
      awsTelemetryPacket,
      awsTelemetryJson,
      greengrassV2RecipeYaml,
      bedrockAgentActionGroupJson,
    };
  }
}
