# Support Operations UAT Report

Published report: https://capitalinvestmentclub.github.io/support-operations-uat-report/

This repository contains the sanitized public report for the five-scenario Support Operations campaign executed in deployed Google Chrome across six viewport sizes. Private evidence and credentials are intentionally excluded.

## Targeted deployed retest — 14 September 2026

The dated section on the existing report and `targeted-run.json` record the user-approved risk-based retest. Functional journeys are executed once; responsive checks reuse records at six exact Google Chrome CSS viewports. This is not six independent executions of every complete journey.

The run distinguishes PASS, FAIL, BLOCKED, PARTIAL and NOT RUN, supplies exact deployed commit/version identifiers, and links sanitized evidence. PARTIAL is supporting evidence or incomplete original acceptance, not closure. Historical campaign data, findings and scores in `data.js` remain unchanged. The old exhaustive matrix/strict closure adapter in `retest.js` does not convert targeted results into an unsupported full-campaign pass.

Run `node --test report.test.cjs targeted-run.test.cjs` after installing the declared development dependencies. No raw Gmail pages, verification-token URLs, complete mailbox addresses, IP/location logs or non-synthetic financial details are included in this update.
