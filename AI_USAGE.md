# AI-Assisted Engineering Decisions

This document tracks key decisions made with AI assistance during the design and development of **LLD Arena**. Each entry captures the context, options considered, the chosen decision, and the engineering rationale.

---

## Decision 1: Hybrid Evaluation System vs. Canonical Solution Comparison

### Context
In coding platforms (e.g., LeetCode), evaluation is binary: does the code pass test cases or not? In Low-Level Design (LLD), there are multiple valid solutions (e.g., Strategy Pattern vs. State Pattern vs. Command Pattern for an Elevator Controller or Parking Lot). The prompt specifically asked: *"What makes feedback useful when there can be more than one valid LLD solution?"*

### Options Considered
1. **Canonical Golden Master Comparison:** Compare the learner's class and method names to a pre-defined canonical solution using AST or token matching.
2. **Pure LLM Evaluation:** Send the problem and student submission directly to an LLM prompt and return the response.
3. **Hybrid Evaluation Architecture (Deterministic Rules Engine + Pluggable Semantic Evaluator):** Run deterministic graph/rule checks first, followed by qualitative semantic analysis.

### Decision
Adopted **Option 3 (Hybrid Evaluation Architecture)**.

### Rationale
- Comparing against a canonical solution produces high false-negative rates and penalizes creative, well-factored designs.
- Pure LLM evaluation is non-deterministic, hallucinates rules, provides inconsistent grading across runs, and completely breaks when offline or when rate limits are reached.
- The hybrid approach grounds the evaluation in objective, reproducible metrics (e.g., Afferent/Efferent coupling, god-class thresholds, interface segregation, dangling references) while delegating qualitative trade-off analysis to a pluggable semantic evaluator (`LLMSemanticEvaluator` with graceful fallback to `MockSemanticEvaluator`).

---

## Decision 2: Structured Modeling Schema vs. Free-Form Code Sandbox

### Context
How should learners specify their LLD solutions? Should they write full Java/C++ code, or should they model classes, interfaces, relationships, and trade-offs declaratively?

### Options Considered
1. **Full Language Code Sandbox (Java / C++ / Python):** Learner writes compilable source files in an in-browser code editor.
2. **Free-form Markdown / Text:** Learner writes a descriptive design document.
3. **Structured Domain Modeling Schema (JSON / Interactive Form):** Learner specifies classes, interfaces, attributes, methods, responsibilities, relationships, patterns, and trade-offs.

### Decision
Adopted **Option 3 (Structured Domain Modeling Schema)**.

### Rationale
- Writing full compilable code in a 45-minute design session wastes 70% of the learner's time on language syntax, import boilerplate, and basic compilation errors rather than architectural thinking.
- A structured schema allows the platform to perform graph-based metric calculations (e.g., coupling graphs, cycle detection) and render live Mermaid UML diagrams dynamically.
- It enables instant diffing between attempts (Attempt 1 vs Attempt 2) at the entity and relationship level.

---

## Decision 3: In-Process Asynchronous Pipeline vs. Distributed Job Queues

### Context
Evaluation takes time (especially with deterministic graph traversal and external semantic calls). How should the submission lifecycle be processed?

### Options Considered
1. **Distributed Queue Worker (Redis / BullMQ / Kafka):** Submissions are enqueued to a message broker and processed by separate worker processes.
2. **Synchronous Request/Response:** The HTTP submission endpoint blocks until evaluation completes.
3. **In-Process Asynchronous Execution with Polling / State Transition:** HTTP endpoint saves the frozen snapshot to SQLite immediately, transitions to `EVALUATING`, launches the evaluation promise in the background, and returns HTTP 202/200. The client polls the status endpoint.

### Decision
Adopted **Option 3 (In-Process Asynchronous Execution with Polling)**.

### Rationale
- Avoids unnecessary operational complexity (Kafka, Redis, external daemons) within a 2-day timeline.
- Guarantees zero data loss: the submission snapshot is committed to SQLite before any evaluation begins.
- Keeps client interactions responsive with live progress indicators without blocking HTTP connections.

---

## Decision 4: Deterministic Fallback Strategy for Semantic Evaluation

### Context
External LLM APIs can suffer from rate limits, network latency, high costs, or missing API keys in local evaluation environments.

### Options Considered
1. **Fail Submission on LLM Error:** Return an error if the AI API is unreachable.
2. **Require API Key at Startup:** Refuse to boot backend without an active OpenAI/Anthropic/Gemini key.
3. **Graceful Heuristic Fallback (`MockSemanticEvaluator`):** Provide a local rule-based heuristic evaluator that produces structured feedback when no API key is present or when requests fail.

### Decision
Adopted **Option 3 (Graceful Heuristic Fallback)**.

### Rationale
- Ensures the platform works immediately out-of-the-box for evaluators with `npm run dev` with zero setup.
- Evaluators can test the full user journey without providing external payment credentials or API keys.
- If an API key is provided, the platform seamlessly upgrades to `LLMSemanticEvaluator`.

---

## Decision 5: Graph-Based Structural Invariant Checking vs. Language AST Linters

### Context
To evaluate Low-Level Designs objectively, the platform needs to detect cyclic inheritance, mutual concrete coupling, and dangling references.

### Options Considered
1. **Source Code AST Parsers (e.g., Babel / TypeScript compiler API / JavaParser):** Parse freeform code into syntax trees and run linters.
2. **Ad-hoc Regex Keyword Matching:** Scan code text for keywords like `extends` or `import`.
3. **Graph-Theoretic Invariant Engine on Normalized Schemas:** Build directed adjacency graphs from normalized relationship definitions, running Cycle Detection (DFS recursion stack) and Set Intersections for bidirectional dependencies ($C_a$ and $C_e$).

### Decision
Adopted **Option 3 (Graph-Theoretic Invariant Engine)**.

### Rationale
- AST parsers require compilable code with strict syntactic correctness, failing whenever an engineer omits a semicolon or types an incomplete generic signature.
- Graph-theoretic algorithms execute in $O(V + E)$ time, providing deterministic, mathematically provable guarantees against circular inheritance and excessive Fan-out without being tied to any specific programming language syntax.

