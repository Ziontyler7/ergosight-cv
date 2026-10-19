# ErgoSight CV — OpenCV & AWS Edge Ergonomic Safety Monitor

**Built for the OpenCV AI Competition 2026 (AWS) ($20,250 Prize Pool)**

ErgoSight CV is a privacy-first edge computer vision and biomechanical safety platform that transforms 17-keypoint OpenCV pose telemetry into real-time **RULA (`1–7`)**, **REBA (`1–15`)**, and **Revised NIOSH Lifting Equation (`RWL` & Lifting Index `LI`)** assessments, shift repetition fatigue schedules, and **AWS IoT Greengrass / CloudWatch Embedded Metric Format (EMF)** telemetry.

---

## Quick Start (Port `5183`)

```bash
# Run the 6-Gate Deterministic Verification Suite
npm test

# Typecheck + Run All 6 Gates
npm run check

# Launch Interactive Studio on http://127.0.0.1:5183
npm run dev
```

---

## Core Engines & Verification Gates

- **Gate 1 (`PoseKinematicsEngine`)**: 17-keypoint COCO/OpenCV anatomical projection, clamped 2D/3D vector dot-product angle solver (`[0°, 180°]`), edge face-redaction shield, and non-overlapping `880x420` SVG HUD callouts (`verifyZeroHudOverlap`).
- **Gate 2 (`BiomechanicalRiskEngine`)**: 4 industrial & clinical CV streams (`STATION-WH-04`, `STATION-FAB-12`, `STATION-PACK-09`, `STATION-LAB-02`) with RULA (`1–7`), REBA (`1–15`), L5/S1 lumbar disc compression (Newtons), and Revised NIOSH Lifting Equation (`RWL` & `LI = Load / RWL`) verified by `verifyBiomechanicalBounds`.
- **Gate 3 (`RepetitionFatigueEngine`)**: Cycle-rate strain, ISO 11226 static hold tracking, micro-break scheduling, and strictly monotonic shift fatigue curves (`verifyMonotonicFatigueCurve`).
- **Gate 4 (`AwsEdgeCoachAdapter`)**: OSHA/NIOSH engineering control synthesis, AWS CloudWatch EMF telemetry generation with verified zero cranial/facial biometric PII leakage (`verifyPrivacyCompliantTelemetry`), and `4.5s` `AbortController` circuit-breaker resilience.
- **Gate 5 & Gate 6 (`Port 5183 & Clean-Room Audit`)**: Strict binding to `127.0.0.1:5183` (`strictPort: true`) and zero proprietary terminology leakage across all 15 project files.

## ☁️ AWS IoT Greengrass V2 (`2020-01-25`) & Amazon Bedrock AgentCore OpenAPI 3.0

- **AWS IoT Greengrass V2 Recipe (`buildAwsGreengrassV2RecipeYaml`)**: Generates deployment-ready `RecipeFormatVersion: "2020-01-25"` component YAML (`com.ergosight.edge.PoseSafetyMonitor`) with `aws.greengrass.ipc.mqttproxy` (`aws.greengrass#PublishToIoTCore` on `ergosight/telemetry/emf`).
- **Amazon Bedrock AgentCore Action Group (`buildBedrockAgentActionGroupSpec`)**: Exports an OpenAPI `3.0.1` specification (`/ergo/intervene` and `/ergo/engineering-control`) enabling autonomous AWS Bedrock supervisor agents to schedule ISO 11226 micro-breaks and OSHA engineering controls.
