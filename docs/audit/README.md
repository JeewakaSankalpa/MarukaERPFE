# Maruka frontend audit foundation

The audit suite is intentionally separate from `tests/e2e`, whose legacy stories mutate business data.

Required variables before any application audit:

```text
MARUKA_AUDIT_BASE_URL=http://localhost:3000
MARUKA_AUDIT_API_URL=http://localhost:8080/api
MARUKA_AUDIT_ENVIRONMENT=isolated
MARUKA_AUDIT_MODE=read-only
MARUKA_AUDIT_CONFIRM_NON_PRODUCTION=YES_I_CONFIRMED_NON_PRODUCTION
```

These values are examples, not a safety assertion. Confirm that the backend and its database are isolated before setting the confirmation variable. Remote read-only staging APIs additionally require `MARUKA_AUDIT_ALLOW_REMOTE_READ_ONLY=YES`. Known production targets are denied unconditionally.

Commands:

- `npm run audit:manifest` regenerates route and complete component-file inventories without launching a browser. Existing route evidence is preserved by stable row ID.
- `npm run audit:list` discovers only read-only audit tests; global safety validation still runs before test execution.
- `npm run audit:verify-browser` launches blank local pages without contacting Maruka services.
- `npm run audit:read-only` executes the safe audit configuration after environment validation.

Generated evidence lives under ignored `output/playwright/`. Authentication state belongs only under ignored `playwright/.auth/`. Do not copy credentials into tests, reports, screenshots, or traces.

The legacy `tests/e2e` workflow is mutation-capable and separately guarded. It requires explicit loopback frontend/API targets, `MARUKA_WORKFLOW_ENVIRONMENT=isolated`, a mutation acknowledgement, and confirmation that the backend database itself is isolated. The audit setup never supplies those values automatically.

Coverage statuses are `MOCK-VERIFIED`, `STAGING-VERIFIED`, `FAILED`, `BLOCKED`, and `NOT TESTED`. Mock and staging evidence are never interchangeable. A rendered page is not verified until its expected state or interaction, geometry, console/network health, and applicable accessibility behavior are checked.
