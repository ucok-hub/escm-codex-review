# Graph Report - .  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 371 nodes · 504 edges · 28 communities (19 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.69)
- Token cost: 1,037 input · 270 output

## Graph Freshness
- Built from commit: `d29965d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Control Risk Assessment
- Rulebook UI Components
- API Request Handling
- Ground Truth Validation
- Frontend Framework Dependencies
- TypeScript Compiler Settings
- UAT Progress Components
- Run History and Reporting
- Server and CLI Scripts
- UAT Demographics Input
- Risk Report Generation
- Graphify Knowledge Graph Tools
- Detection Evaluation Metrics
- Codex Review GUI
- File Viewer Components
- PrismJS Syntax Highlighting
- Dropdown UI Components
- UAT Consent Components
- Graphify Agent Documentation
- Graphify Claude Documentation
- Oracle Setup Script
- Update Script
- GUI Report Page
- Graphify Project Guide
- Claude Graphify Guide

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `buildReport()` - 12 edges
3. `graphify` - 8 edges
4. `scripts` - 7 edges
5. `collectControlIdsFromIssue()` - 7 edges
6. `reviewSource()` - 7 edges
7. `HANDOVER — Codex Review GUI (WISE/ESCM)` - 6 edges
8. `parseJsonSafe()` - 5 edges
9. `RulebookEntry` - 5 edges
10. `matchDetections()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `SUS In-App UAT ("Red Carpet") — Implementation Plan` --references--> `HANDOVER — Codex Review GUI (WISE/ESCM)`  [INFERRED]
  docs/superpowers/plans/2026-06-26-sus-inapp-uat.md → HANDOVER.md
- `Codex Merge Request Diff Review Prompt — WISE/ESCM` --references--> `HANDOVER — Codex Review GUI (WISE/ESCM)`  [INFERRED]
  prompts/codex_diff_review.md → HANDOVER.md
- `Codex Full Repository Assessment Prompt — WISE/ESCM` --references--> `HANDOVER — Codex Review GUI (WISE/ESCM)`  [INFERRED]
  prompts/codex_full_scan.md → HANDOVER.md
- `Codex Security-Only Review — WISE/ESCM` --references--> `HANDOVER — Codex Review GUI (WISE/ESCM)`  [INFERRED]
  prompts/codex_security_only.md → HANDOVER.md
- `buildReport()` --calls--> `collectControlIdsFromIssue()`  [EXTRACTED]
  server/report.mjs → scripts/reviewEngine.mjs

## Import Cycles
- None detected.

## Communities (28 total, 9 thin omitted)

### Community 0 - "Control Risk Assessment"
Cohesion: 0.06
Nodes (42): applySeverityFloorFromControls(), batchPieces(), buildSyntheticDiffFromFiles(), callOpenAI(), chunkText(), codeToSyntheticDiff(), collectControlIdsFromIssue(), collectControlIdsFromText() (+34 more)

### Community 1 - "Rulebook UI Components"
Cohesion: 0.05
Nodes (34): getRulebook(), InfoHint(), DomBar(), SEV_LABEL, SEV_SHORT, contohPelanggaran(), Props, RulebookModal() (+26 more)

### Community 2 - "API Request Handling"
Cohesion: 0.08
Nodes (33): accessHeaders(), ApiHttpError, checkUatEmail(), clearAccessCode(), getHealth(), getHistory(), getHistoryRun(), parseJsonSafe() (+25 more)

### Community 3 - "Ground Truth Validation"
Cohesion: 0.07
Nodes (27): getGroundTruth(), GROUND_TRUTH, OFFICIAL_METRICS, getLeadDevValidation(), LEAD_DEV_VALIDATION, ACCESS_CODE, ALLOWED_UPLOAD_EXTENSIONS, app (+19 more)

### Community 4 - "Frontend Framework Dependencies"
Cohesion: 0.07
Nodes (29): framer-motion, dependencies, framer-motion, prismjs, react, react-dom, description, devDependencies (+21 more)

### Community 5 - "TypeScript Compiler Settings"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+13 more)

### Community 6 - "UAT Progress Components"
Cohesion: 0.14
Nodes (13): Props, SusItem(), Props, SusScale(), Props, UatProgress(), UatThankYou(), STEP_BY_INDEX (+5 more)

### Community 7 - "Run History and Reporting"
Cohesion: 0.17
Nodes (14): BULAN, formatWIB(), getRun(), HARI, listRuns(), recordRun(), SEV_RANK, sha256() (+6 more)

### Community 8 - "Server and CLI Scripts"
Cohesion: 0.12
Nodes (15): express, dependencies, express, description, name, private, scripts, cli:diff (+7 more)

### Community 9 - "UAT Demographics Input"
Cohesion: 0.21
Nodes (11): COMMON_DOMAIN_TYPOS, DemoValue, FREQ_OPTS, normalizeEmail(), PENGALAMAN_OPTS, PERAN_OPTS, Props, UatDemographics() (+3 more)

### Community 10 - "Risk Report Generation"
Cohesion: 0.35
Nodes (9): buildReport(), cleanCheck(), domainOfRuleId(), emptyCounts(), groupComponent(), groupType(), isSCA(), overallRiskOf() (+1 more)

### Community 11 - "Graphify Knowledge Graph Tools"
Cohesion: 0.22
Nodes (9): graphify reference: add a URL and watch a folder, graphify reference: extra exports and benchmark, graphify reference: extraction subagent prompt (compact), graphify reference: GitHub clone and cross-repo merge, graphify reference: commit hook and native CLAUDE.md integration, graphify reference: query, path, explain, graphify reference: transcribe video and audio, graphify reference: incremental update and cluster-only (+1 more)

### Community 12 - "Detection Evaluation Metrics"
Cohesion: 0.42
Nodes (6): basename(), computeMetrics(), evaluate(), matchDetections(), ruleIdOf(), rules

### Community 13 - "Codex Review GUI"
Cohesion: 0.25
Nodes (8): Deploy ke Oracle Cloud Always Free (VM), SUS In-App UAT ("Red Carpet") — Implementation Plan, HANDOVER — Codex Review GUI (WISE/ESCM), Codex Merge Request Diff Review Prompt — WISE/ESCM, Codex Full Repository Assessment Prompt — WISE/ESCM, Codex Security-Only Review — WISE/ESCM, README.md — Codex Review GUI — WISE/ESCM, Render Blueprint — Codex Review GUI

### Community 14 - "File Viewer Components"
Cohesion: 0.60
Nodes (4): baseName(), FileTab, SeededViewer(), splitFiles()

### Community 15 - "PrismJS Syntax Highlighting"
Cohesion: 0.40
Nodes (4): prismjs, prismjs/components/*, prismjs/plugins/*, prismjs/themes/*

## Knowledge Gaps
- **160 isolated node(s):** `oracle-setup.sh script`, `update.sh script`, `Option`, `Props`, `SEV_LABEL` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `loadControlRiskCatalog()` connect `Control Risk Assessment` to `Ground Truth Validation`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `buildReport()` connect `Risk Report Generation` to `Control Risk Assessment`, `Ground Truth Validation`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `listRuns()` connect `Run History and Reporting` to `Ground Truth Validation`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `oracle-setup.sh script`, `update.sh script`, `Option` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Control Risk Assessment` be split into smaller, more focused modules?**
  _Cohesion score 0.05731523378582202 - nodes in this community are weakly interconnected._
- **Should `Rulebook UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._
- **Should `API Request Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.07641196013289037 - nodes in this community are weakly interconnected._