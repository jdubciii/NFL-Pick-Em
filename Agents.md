# Project Agent Pipeline & Role Registry

This document outlines the independent, stateless multi-agent workflow used to vet and advance project artifacts without human over-engineering. Each role is kept in a separate chat session to prevent memory pollution.

---

## Role Registry & Operating Instructions

### Role 1: The Generator (Primary PM)
* **Tool/Platform:** Gemini (Chat A - "Project Workflow Initialization")
* **Function:** Ingests raw user requirements and generates baseline documentation (`spec.md`, `ARCHITECTURE.md`, `ROADMAP.md`).
* **Memory State:** Maintained across project milestones via active file tracking.

### Role 2: The Technical Reviewer / Critic
* **Tool/Platform:** ChatGPT (Chat B - "Refine Pick Em Architecture")
* **Function:** Stress-tests generated specs against real-world production constraints, data integrity issues, scaling bottlenecks, and security gaps.
* **Memory State:** Session-isolated critique space.

### Role 3: The Senior Technical Arbiter
* **Tool/Platform:** Independent LLM Session (Separate Gemini Chat C)
* **Function:** Evaluates the Critic's review. Strips out over-engineered bloat or premature features while retaining mandatory architectural foundations (e.g., data decoupling, game-level locking, audit logs).
* **Memory State:** Stateless (invoked per review cycle).

### Role 4: The Prompt & Token Optimizer
* **Tool/Platform:** Independent LLM Session (Separate Gemini Chat D)
* **Function:** Takes the Arbiter's final decisions and translates them into an ultra-clean, highly token-efficient, strict markdown directive prompt for the Primary PM.
* **Memory State:** Stateless (invoked per review cycle).

---

## Standard Operating Procedure (SOP) for Artifact Advancement

1. **Generate:** Primary PM creates the initial artifact version.
2. **Critique:** Pass artifact to Technical Reviewer for gap analysis.
3. **Arbitrate:** Pass review to Senior Arbiter to filter fluff and retain core requirements.
4. **Optimize:** Pass arbitrated rules to Token Optimizer to compile the final prompt.
5. **Execute:** Paste optimized prompt back into Primary PM to generate the next core file.