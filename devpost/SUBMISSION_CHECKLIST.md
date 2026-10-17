# Devpost Submission Checklist — ErgoSight CV (OpenCV AI Competition 2026)

- [x] **Standalone Repository**: `/Users/zion/Desktop/ergosight-cv`
- [x] **Strict Local Port**: `http://127.0.0.1:5183` (`strictPort: true`)
- [x] **Gate 1 — PoseKinematicsEngine**: Verifies 17-keypoint generation, vector dot-product angle bounds `[0°, 180°]`, and `0` HUD callout card overlaps on the `880x420` SVG canvas.
- [x] **Gate 2 — BiomechanicalRiskEngine**: Verifies RULA `[1, 7]`, REBA `[1, 15]`, L5/S1 compression force, and NIOSH `RWL` / `LI` calculations across all 4 industrial & clinical CV scenarios.
- [x] **Gate 3 — RepetitionFatigueEngine**: Verifies strictly monotonic shift fatigue accumulation curves and ISO 11226 micro-break intervals.
- [x] **Gate 4 — AwsEdgeCoachAdapter**: Verifies AWS CloudWatch EMF JSON schema compliance, `0` biometric PII leaks, and `4.5s` `AbortController` fallback resilience.
- [x] **Gate 5 & Gate 6 — Port 5183 & Clean-Room Audit**: Verifies zero proprietary terminology leakage and clean TypeScript + Vite production build (`dist/`).
