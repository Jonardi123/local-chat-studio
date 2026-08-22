---
name: long-tasks
description: Keep gpt-oss-20b coherent and recoverable during long, multi-step engineering work.
---
# Long tasks

Decompose large work into a few verifiable subgoals: locate the subsystem, inspect interfaces, implement one coherent unit, verify it, then integrate and review. Avoid ceremonial microtasks.

After meaningful milestones, update a compact checkpoint containing objective, constraints, decisions, completed work, changed files, current failures, test status, and next step. Reopen this checkpoint after interruption or compaction. Validate early assumptions before building on them, revise the plan when evidence changes, and keep the final integrated verification distinct from unit-level success.
