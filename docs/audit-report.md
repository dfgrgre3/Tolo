# Thanawy Project Audit Report

Generated: 2026-05-22T18:35:59.083Z
Mode: check

## Summary

- Passed: 0
- Warnings: 3
- Failed: 4

## FAIL TypeScript type-check
Command exited with a non-zero status.
Command: `npx tsc --noEmit`
Duration: 2ms

## WARN ESLint
Command exited with a non-zero status.
Command: `npx eslint .`
Duration: 0ms

## FAIL Frontend tests
Command exited with a non-zero status.
Command: `npm test`
Duration: 1ms

## FAIL Next production build
Command exited with a non-zero status.
Command: `npm run build`
Duration: 1ms

## FAIL Go tests
Command exited with a non-zero status.
Command: `go test ./...`
Duration: 1ms

## WARN Secret and credential scan
4 possible secret references found.
Duration: 765ms

<details>
<summary>Output</summary>

```text
.claude\settings.local.json:4 - OpenAI API key
backend\.env:35 - OpenAI API key
backend\scripts\reset-admin-password\main.go:38 - Likely hard-coded secret
src\__tests__\integration\websocket.test.ts:33 - Likely hard-coded secret
```

</details>

## WARN npm dependency audit
Command exited with a non-zero status.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 0ms
