# SUP-F002 deployed delivery observation
Run: 2026-09-14 targeted Chrome retest.

One synthetic delivery test was sent through the deployed Admin Notifications UI to the controlled existing test recipient. The channels were in-app plus email.

Observed evidence:
- The admin UI reported the event sent, in-app delivered, and email sent through SendGrid.
- Event correlation: admin-test-1789360714405.
- The controlled recipient's authenticated Gmail exact-subject search returned one matching message.
- Opening that message and clicking Open notification navigated to the deployed HTTPS /notifications route without a TLS warning.
- The original admin-result screenshot was visually inspected but excluded from this public report because it exposes the full controlled mailbox address and provider message metadata.
- No second test email was sent.

Recipient application persistence was verified after normal logout/login and reload. The exact subject and message persisted. All six calibrated recipient-display screenshots were visually inspected; each shows the same notification, not a separate send. Six-size composer evidence was not completed and is not represented as passed.
