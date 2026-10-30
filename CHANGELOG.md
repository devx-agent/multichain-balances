# Changelog

## 2.1.0 (2026-10-30)

- The stdio MCP server (npm package, also what the Dockerfile runs) now registers its tools with `registerTool`, with a title, a longer description (what the tool does, when to use it and when not to, what it reads or sends, what it returns, limits), clearer parameter descriptions, a JSON output schema with `structuredContent`, and tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).
- No change to the checks themselves, the hosted API, prices or payment flow. The remote MCP endpoint served by the Worker is unchanged in this release.
- The paid tool `multichain_balances` is annotated as not read-only, because it can pay 0.002 USDC when `X402_PRIVATE_KEY` is set.

## 2.0.0 (2026-10-30)

- The npm CLI and stdio MCP server became a thin client of the hosted API. The free tool uses the hosted free endpoint, and the paid tool pays through x402 from the user's own key, with a cap.

## Earlier versions

- Deprecated on npm and superseded by 2.0.0.
