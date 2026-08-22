---
name: review
description: Strengthen implementation completion and evidence-based code review for gpt-oss-20b.
---
# Implementation and review

Inspect relevant code and dependencies before editing. Preserve conventions, scope changes narrowly, and verify behavior with relevant tests and build checks. For nontrivial work, perform one concise adversarial pass over the final diff.

In review mode, search for correctness bugs, regressions, stale assumptions, missing edge cases, error-handling gaps, ineffective tests, unnecessary complexity, security implications, and relevant performance problems. Tie every finding to concrete code or observed behavior. Do not manufacture findings; say when no material issue is found.
