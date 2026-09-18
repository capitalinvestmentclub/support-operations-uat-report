# Support Operations deployed defect-delivery retest

Completed: 2026-09-18T10:10:00Z

Environment: deployed development · Google Chrome · 1792x976 by default; additional sizes only for responsive findings.

This report records terminal disposition for every Support Operations entry in the 276-finding delivery batch. PASS means the deployed behavior was verified. FAIL means the deployed defect remains reproducible. PASSED_OVER means the bounded attempt could not produce trustworthy proof, commonly because an exact fixture, actor, reversible mutation, or stable protected page was unavailable. DUPLICATE_COVERAGE points to another finding that exercised the same behavior.

## Summary

| Total | PASS | FAIL | DUPLICATE_COVERAGE | PASSED_OVER |
|---:|---:|---:|---:|---:|
| 5 | 0 | 0 | 0 | 5 |

Severity inventory: MEDIUM 5. Outcome reconciliation: PASSED_OVER 5.

## Finding dispositions

| ID | Severity | Outcome | Title | Disposition | Tested |
|---|---|---|---|---|---|
| SUP-F003 | MEDIUM | PASSED_OVER | Malformed template sample JSON silently previews default data | INTERNAL_OPERATIONS_ACTOR_UNAVAILABLE | 2026-09-18T07:25:36.296Z |
| SUP-F004 | MEDIUM | PASSED_OVER | Benign markup displays literal entity text in preview | INTERNAL_OPERATIONS_ACTOR_UNAVAILABLE | 2026-09-18T07:25:36.296Z |
| SUP-F005 | MEDIUM | PASSED_OVER | Feedback launcher is absent on Admin portal pages despite enabled visibility | INTERNAL_OPERATIONS_ACTOR_UNAVAILABLE | 2026-09-18T07:25:36.296Z |
| SUP-F006 | MEDIUM | PASSED_OVER | Feedback SLA date shifts to the prior local day | INTERNAL_OPERATIONS_ACTOR_UNAVAILABLE | 2026-09-18T07:25:36.296Z |
| SUP-F007 | MEDIUM | PASSED_OVER | Support actionable count includes terminal records | INTERNAL_OPERATIONS_ACTOR_UNAVAILABLE | 2026-09-18T07:25:36.296Z |

The machine-readable companion file preserves target URLs, evidence paths, notes, browser, viewport, and API provenance for each entry.
