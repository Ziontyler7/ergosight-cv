# Product Requirements Document (PRD) — ErgoSight CV

**Competition Track**: OpenCV AI Competition 2026 (AWS)  
**Product Name**: ErgoSight CV — Real-Time Edge Posture, Repetition & Warehouse Ergonomic Safety Monitor  
**Local Runtime Port**: `http://127.0.0.1:5183` (`strictPort: true`)

---

## 1. Problem Statement

Over-exertion, awkward lumbar trunk flexion, overhead shoulder abduction, and repetitive wrist deviation cause more than 30% of lost-workday industrial injuries across fulfillment warehouses, semiconductor cleanrooms, and clinical assembly lines. However, deploying cloud video surveillance in workplaces fails for two reasons:
1. **Worker Biometric Privacy**: Streaming identifiable worker faces to the cloud violates workplace privacy standards and erodes worker trust.
2. **Lack of Biomechanical Rigor**: Generic pose estimators draw 2D skeletons without translating joint angles and load geometry into actionable **OSHA**, **RULA (`1–7`)**, **REBA (`1–15`)**, and **Revised NIOSH Lifting Equation (`RWL` & `LI`)** engineering controls.

---

## 2. Solution Overview

**ErgoSight CV** processes 17-keypoint OpenCV stereo/depth pose kinematics directly on the edge appliance (OAK-D PoE + AWS Panorama / AWS IoT Greengrass v2):
- **Edge Privacy Redaction**: Strips facial/cranial biometric identity at the edge (`Face-Redacted Shield` or `Skeleton-Only Wireframe` mode) before any metric packet leaves the local sensor node.
- **Real-Time RULA, REBA & NIOSH Lifting Math**: Computes lumbar trunk flexion, cervical flexion, shoulder abduction, wrist deviation, axial asymmetry twist, L5/S1 disc compression force (Newtons), NIOSH Recommended Weight Limit (`RWL`), and Lifting Index (`LI = Load / RWL`).
- **Temporal Repetition & Fatigue Telemetry**: Tracks cycles/minute and static hold duration to prescribe ISO 11226 decompression micro-breaks.
- **AWS IoT Greengrass & CloudWatch EMF Integration**: Emits schema-validated AWS CloudWatch Embedded Metric Format (EMF) JSON packets containing 100% anonymized station safety metrics.

- **AWS IoT Greengrass V2 Recipe & Bedrock AgentCore Action Group**: Emits `RecipeFormatVersion: "2020-01-25"` edge deployment manifests (`aws.greengrass.ipc.mqttproxy`) and OpenAPI `3.0.1` Bedrock AgentCore action schemas (`/ergo/intervene`, `/ergo/engineering-control`).
