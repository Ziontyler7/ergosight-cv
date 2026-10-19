# 🦾📹 AWS & OpenCV Edge Ergonomic Safety Monitor — Complete Devpost Submission Package

**Project Title:** ErgoSight CV — Privacy-First OpenCV Pose, REBA/NIOSH & AWS IoT Greengrass Safety Monitor  
**Tagline (<= 60 chars):** Privacy-first edge CV ergonomics (REBA/NIOSH) on AWS IoT.  
**Competition:** AWS CDS Agentic AI / OpenCV AI Competition 2026 (`$40,000` / `$20,250` Tracks)  
**Local Studio Port:** `http://127.0.0.1:5183` (`strictPort: true`)

---

## 1. Inspiration

Over-exertion, lumbar trunk flexion, overhead shoulder abduction, and repetitive wrist deviation cause over 30% of lost-workday industrial injuries. Yet streaming workplace video to the cloud fails because workers rightly reject facial surveillance, and raw 2D pose skeletons do not give safety engineers actionable **RULA (`1–7`)**, **REBA (`1–15`)**, or **Revised NIOSH Lifting Equation (`RWL` & `LI`)** metrics. We built **ErgoSight CV** to run privacy-redacted 17-keypoint kinematics at the edge via **AWS IoT Greengrass V2** and orchestrate ergonomic interventions via **Amazon Bedrock AgentCore**.

---

## 2. What It Does

1. **17-Keypoint OpenCV Pose Kinematics & Edge Face Redaction (`PoseKinematicsEngine`)**:
   - Projects 17 anatomical keypoints onto an `880×420` SVG HUD with verified zero callout-card overlap (`verifyZeroHudOverlap`) and mandatory edge cranial/facial redaction (`Face-Redacted Shield` or `Skeleton-Only Wireframe`).
2. **Real-Time RULA (`1–7`), REBA (`1–15`) & Revised NIOSH Lifting Equation (`BiomechanicalRiskEngine`)**:
   - Computes trunk flexion, neck flexion, shoulder abduction, wrist deviation, L5/S1 lumbar disc compression (Newtons), NIOSH Recommended Weight Limit (`RWL`), and Lifting Index (`LI = Load / RWL`) across 4 industrial and clinical workstation presets.
3. **Shift Repetition Fatigue & ISO 11226 Micro-Break Scheduler (`RepetitionFatigueEngine`)**:
   - Models cumulative 8-hour shift strain across 6 monotonic checkpoints (`verifyMonotonicFatigueCurve`) and prescribes recovery micro-breaks.
4. **AWS CloudWatch EMF, Greengrass V2 Recipe (`2020-01-25`) & Bedrock AgentCore OpenAPI `3.0.1` (`AwsEdgeCoachAdapter`)**:
   - Exports anonymized **AWS CloudWatch Embedded Metric Format (EMF)** payloads (`BiometricPiiRedacted: true`), **AWS IoT Greengrass V2 component recipes (`aws.greengrass.ipc.mqttproxy`)**, and **Amazon Bedrock AgentCore OpenAPI `3.0.1` Action Group schemas** (`/ergo/intervene`, `/ergo/engineering-control`).

---

## 3. How We Built It

- **4 Pure-Math TypeScript Engines (`src/lib/`)**: `pose-kinematics-engine.ts`, `biomechanical-risk-engine.ts`, `repetition-fatigue-engine.ts`, and `aws-edge-coach-adapter.ts`.
- **6 Automated Verification Gates (`npm test`)**: Verifies vector angle clamping `[0°, 180°]`, zero HUD overlaps, RULA/REBA/NIOSH bounds, monotonic fatigue curves, zero biometric PII leakage, and strict Port `5183` isolation.

---

## 4. Challenges We Ran Into & Accomplishments

- **Zero-PII Guarantee in CloudWatch EMF Telemetry**: We built `verifyPrivacyCompliantTelemetry()` to inspect every serialized CloudWatch EMF packet and guarantee that raw cranial coordinates (`nose`, `left_eye`, `right_eye`, `left_ear`, `right_ear`) and worker names never leave the edge node.

---

## 5. "Built With" Tags

`aws-iot-greengrass`, `amazon-bedrock`, `aws-cloudwatch`, `opencv`, `computer-vision`, `biomechanics`, `ergonomics`, `typescript`, `react`, `openapi-3`

---

## 6. 90-Second Demo Video Narration Script

- **`0:00 – 0:25` · Privacy-First Edge CV & Live RULA/REBA/NIOSH Math**:
  - *Visual*: Open `http://127.0.0.1:5183`. Switch across `STATION-WH-04` (*Fulfillment Pallet Lift*) and `STATION-FAB-12` (*Semiconductor Wafer Reach*), toggling **Skeleton-Only Wireframe** mode and dragging the **Load Mass (kg)** and **Trunk Flexion** sliders to watch REBA (`1–15`), L5/S1 Newtons, and NIOSH Lifting Index update live.
- **`0:25 – 0:55` · Shift Fatigue Accumulation & OSHA Engineering Controls**:
  - *Visual*: Inspect the 8-hour Shift Fatigue Curve and OSHA Hierarchy of Controls recommendations (scissor lift table, counterbalanced tool balancers, ISO 11226 micro-breaks).
- **`0:55 – 1:30` · AWS CloudWatch EMF, Greengrass V2 Recipe & Bedrock OpenAPI 3.0**:
  - *Visual*: Click through the 3 AWS Inspector tabs (**CloudWatch EMF Telemetry**, **Greengrass V2 Recipe `2020-01-25`**, and **Bedrock Action Group OpenAPI `3.0.1`**) and verify the green **0 Biometric PII Leaks** seal.
