# LLD Arena — Low-Level Design Practice Platform

[![Node.js](https://img.shields.io/badge/Node.js-v22.17.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-orange.svg)](https://sqlite.org/)

**LLD Arena** is an interactive, deliberate-practice platform for mastering Low-Level Design (LLD) and Object-Oriented Design (OOD).

Unlike generic LMS platforms or unstructured code sandboxes, LLD Arena guides engineers through a structured design workflow:
```
Select Problem → Model Entities & Relationships → Document Trade-offs → Submit → Hybrid Evaluation → Review Actionable Feedback → Revise & Improve
```

---

## 🚀 Key Features

1. **Curated Problem Library:** Classic, interview-standard LLD challenges (*Multi-Floor Automated Parking Lot*, *Smart Multi-Car Elevator Dispatcher*, *State-Driven Smart Vending Machine*, and *On-Demand Ride Matching Service*).
2. **Structured Architectural Modeler:** Dedicated workbench for defining Classes, Interfaces, Attributes, Methods, Single Responsibilities (SRP), and UML Relationships (Inheritance, Realization, Composition, Aggregation, Dependency).
3. **Live UML Visualization:** Automated, dynamic class diagram rendering powered by Mermaid.js.
4. **Hybrid Evaluation Engine (Deterministic + Semantic):**
   - **Deterministic Rules Engine:** Structural linting, cyclomatic coupling, god class detection, interface segregation, and functional requirements coverage.
   - **Semantic Evaluator:** Abstraction quality, design pattern appropriateness, trade-off depth, and extensibility analysis.
   - **Offline Resilient:** Operates 100% deterministically with `MockSemanticEvaluator` when no external AI API key is configured.
5. **Iterative Attempt Tracking & Diffing:** Compare Attempt $N$ vs Attempt $N+1$ side-by-side to visualize architectural improvements and metric shifts.

---

## 🏛️ Architecture Overview

The system is built as a **clean, modular TypeScript monolith**:

- **Frontend:** React 18+ with Vite, responsive modern CSS design system (dark-mode first, glassmorphism, responsive tokens), Mermaid.js diagramming, and Lucide icons.
- **Backend:** Node.js + Express with TypeScript, following Clean Architecture (Domain Entities, Evaluation Pipeline, Use Cases, Repositories).
- **Database:** SQLite in WAL mode via `better-sqlite3` — zero setup, zero external daemons, transactional and file-backed.
- **Testing:** Vitest for comprehensive unit and integration test coverage across domain rules and evaluation pipeline.

### Architectural Documents
- 📖 [docs/research.md](docs/research.md) — Learner problem, analysis of existing approaches, and product direction.
- 📐 [docs/design.md](docs/design.md) — Domain model, evaluation pipeline, state machine, persistence schema, and trade-offs.
- 🤖 [AI_USAGE.md](AI_USAGE.md) — 5 meaningful AI-assisted decisions and engineering rationales.

---

## 💻 Quickstart & Running Locally

### Prerequisites
- Node.js >= 18.x (v22.x recommended)
- npm >= 9.x

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally (Single Command)
You can run the fully compiled application on a single port (`http://localhost:3000`):
```bash
npm start
```
*The database automatically initializes and seeds all 4 problems on first launch.*

Alternatively, for active frontend development with hot-module reloading:
```bash
npm run dev
```
- Client active on `http://localhost:5173`
- Backend API active on `http://localhost:3000`

### 3. Run Automated Tests
```bash
npm test
```
Runs 28 comprehensive unit and integration tests covering:
- Attempt lifecycle and state machine transitions (`DRAFT` -> `SUBMITTED` -> `EVALUATING` -> `EVALUATED` / `EVALUATION_FAILED`)
- Deterministic rules (`RelationshipIntegrityRule`, `ClassSizeAndCohesionRule`, `CouplingMetricsRule`, `RequirementsCoverageRule`, `SolidPrinciplesRule`)
- Edge case invariants (empty models receiving 0 score, circular inheritance hierarchies rejected, single-class god class failure)
- Multiple valid solutions evaluation without canonical naming bias (State pattern vs Strategy pattern)
- Failure handling and evaluation recovery with preserved submission snapshots
- Attempt comparison and improvement metric diffing

---

## 🛡️ Evaluation Philosophy

> **"What makes feedback useful when there can be more than one valid LLD solution?"**

In software architecture, there is rarely a single "correct" solution. A design that uses the Strategy Pattern for dispatching elevators might be cleaner, while a design using the State Pattern might be more explicit for door and movement transitions. 

LLD Arena **does NOT grade against a single canonical solution**. Instead, it evaluates:
- **Coupling & Cohesion:** Does the design follow Single Responsibility and minimize tight coupling?
- **Requirements Coverage:** Are all functional requirements mapped to identifiable responsibilities?
- **Contract Integrity:** Are relationships valid, acyclic, and using appropriate abstractions?
- **Trade-off Justification:** Did the learner understand *why* they chose their approach over alternatives?

---

## ⚙️ Environment Variables (Optional)

The application works 100% out of the box with zero environment variables needed (using `Dynamic Heuristic Evaluator`).

If you wish to enable the live Gemini qualitative analysis:
```env
GEMINI_API_KEY=your_google_gemini_api_key
# or
OPENAI_API_KEY=your_openai_api_key
```
*Note: If an external key is configured, `LLMSemanticEvaluator` automatically queries the external model with a 6-second timeout and structured output validation, and falls back gracefully to `Dynamic Heuristic Evaluator` if an error or timeout occurs.*

---

## 🎬 Recommended 5-Minute Demo Flow

1. **Problem Library (`/`):** Open `http://localhost:3000`. Browse the 4 curated LLD challenges (Parking Lot, Elevator Controller, Vending Machine, Ride Matching).
2. **Problem Detail:** Click **Inspect Spec** on *Multi-Floor Automated Parking Lot*. Review the Functional Requirements (with weights), Architectural Guidelines, Constraints, and Evaluation Rubric.
3. **Launch Workspace:** Click **Start Designing Now**.
4. **Structured Modeling:**
   - Review prefilled starter entities in the **Classes** tab.
   - Switch to **Interfaces** tab and notice the clean contract builder.
   - Switch to **Relationships** tab and inspect connections.
   - In the right pane, observe the **Live Mermaid UML Diagram** rendering dynamically!
5. **Submit for Evaluation:** Click **Submit Design**. Watch the non-blocking 4-stage pipeline overlay execute.
6. **Inspect Diagnostic Scorecard:**
   - Inspect the Overall Score circular gauge and Qualitative Level (`EXEMPLARY` / `PROFICIENT`).
   - Review the 5 Score Dimensions (Coverage, Responsibility, Coupling, Integrity, Extensibility).
   - Read actionable findings with specific **Evidence** and **Recommendations**.
   - Read the **Alternative Solutions** tab to see how senior architects compare Strategy vs State patterns for this problem.
7. **Iterative Refinement ("Try Again"):** Click **Revise in Attempt #2**. Notice that Attempt #2 is prefilled with your Attempt #1 design, preserving Attempt #1 intact in the database.
8. **Attempt Comparison:** Click **Compare with Attempt #1** to view the side-by-side progression diff showing score changes, coupling delta, and detected improvements!

---

## ⚠️ Known Limitations & Future Scope

- **Multiplayer Collaboration:** Currently single-user / local profile. Future versions can introduce collaborative real-time whiteboarding via WebSockets.
- **Code Generation:** Currently generates standard Mermaid UML class diagrams and JSON schemas. Future versions can export boilerplate Java / C++ / TypeScript project skeletons.
- **Dynamic Interactive Interviewer:** Future mode can simulate an interviewer introducing mid-interview curveballs ("Now scale this to 10,000 requests/sec").
