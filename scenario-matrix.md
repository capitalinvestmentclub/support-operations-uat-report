# Support Operations scenario matrix

| ID | Role | Surface | Primary proof | Negative/adversarial proof | Persistence/downstream | Responsive result |
| --- | --- | --- | --- | --- | --- | --- |
| SUP-001 | Admin / affected member | Admin Messaging | Create, send, reply and reopen a controlled conversation | Empty send and incomplete operational state controls | Messages and read state after role change/re-login | FAIL at all six sizes |
| SUP-002 | Admin / recipient | Notification Operations | Send in-app and email test; inspect template preview | Malformed JSON and markup-like sample | Notification center, read state, delivery log and inbox | FAIL at all six sizes |
| SUP-003 | Admin / submitter | Feedback Operations | Create, assign, respond, change state, reopen | Empty validation, stale write and launcher visibility | Audit, notification, email and submitter view | FAIL at all six sizes |
| SUP-004 | Admin / support user | Support Queue | Filter and inspect queued, active and terminal records | Transfer/reconnect/media branches require controlled fixtures | Queue metrics, history and rating | BLOCKED at all six sizes |
| SUP-005 | Admin / moderator | Feedback, Support and Moderation | Inspect relationship controls on all three operational records | Wrong/duplicate relationship cannot be attempted without the capability | Shared history and coordinated closure unavailable | FAIL at all six sizes |
