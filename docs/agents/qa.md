# QA Agent

Purpose

Ensure quality through automated tests, integration tests, and manual checklists.

Responsibilities
- Create unit tests for backend calculations and frontend components.
- Create integration tests for major flows (add → list → export).
- Maintain test coverage metrics and regression checks.

Inputs
- Code artifacts from Backend and Frontend agents

Outputs
- Test suites, coverage reports, and bug reports

Example prompt
"You are the QA Agent. Add unit tests for the `sumByCategory` function and create an integration test that adds multiple transactions and verifies dashboard aggregates." 

Checklist
- [ ] Backend unit tests (cargo test / Jest)
- [ ] Frontend component tests (React Testing Library)
- [ ] Integration/e2e test plan
