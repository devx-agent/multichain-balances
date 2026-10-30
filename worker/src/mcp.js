// Minimal stateless MCP (Streamable HTTP, JSON responses): free single-chain balance + paid-route info.
import { multiBalances, ALL_CHAINS as CHAIN_NAMES, family, chainFamily } from "./all.js";
const TOOLS = [
  { name: "basic_balance", description: "Free, read-only: native coin + USDC (USDT on Tron) balance of one address on one chain (" + CHAIN_NAMES.join(", ") + "), live at the latest block. Address: EVM 0x, Solana base58 or Tron T...",
    inputSchema: { type: "object", properties: { address: { type: "string", description: "EVM 0x, Solana base58 or Tron T... address" }, chain: { type: "string", enum: CHAIN_NAMES, description: "default: base for 0x, solana or tron otherwise" } }, required: ["address"] }, annotations: { readOnlyHint: true, openWorldHint: true } },
  { name: "multichain_balances_info", description: "How to buy the full call (native + USDC/USDT/DAI/EURC/bridged USDC/WETH/WBTC on 7 EVM chains, SOL + USDC/USDT on Solana, TRX + USDT on Tron, + custom tokens) via x402 for 0.002 USDC. Does not pay.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
];
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
async function handle(m, origin) {
  const { id, method, params } = m || {};
  if (id === undefined || id === null) return null;
  if (method === "initialize") return ok(id, { protocolVersion: (params && params.protocolVersion) || "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "devx-wallet-balances", version: "1.1.0" }, instructions: "Wallet balances on 7 EVM chains, Solana and Tron. Read-only; never asks for keys." });
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: TOOLS });
  if (method === "tools/call") {
    const name = params && params.name, a = (params && params.arguments) || {};
    if (name === "multichain_balances_info") return ok(id, { content: [{ type: "text", text: `GET ${origin}/v1/balances?address=<0x>,<solana>,<T...>[&chains=base,ethereum,solana,tron][&tokens=base:0xToken,solana:<mint>] answers HTTP 402 (x402 v1 body + v2 PAYMENT-REQUIRED header): exact, Base USDC, 2000 units = 0.002 USDC. Settled only after a result is produced. Docs ${origin}/openapi.json` }] });
    if (name === "basic_balance") {
      const address = String(a.address || "").trim(), f = family(address), chain = String(a.chain || (f === "evm" ? "base" : f || "")).toLowerCase();
      if (!f || chainFamily(chain) !== f) return ok(id, { isError: true, content: [{ type: "text", text: "address must be EVM 0x, Solana base58 or Tron T..., and chain (one of " + CHAIN_NAMES.join(",") + ") must match its type" }] });
      const r = await multiBalances({ [f]: address }, [chain], [], { only: [chain === "tron" ? "USDT" : "USDC"] });
      return ok(id, { content: [{ type: "text", text: JSON.stringify(r) }], structuredContent: r });
    }
    return err(id, -32602, "unknown tool");
  }
  return err(id, -32601, "method not found");
}
export async function mcp(req, origin) {
  const H = { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "mcp-session-id" };
  if (req.method === "GET") return new Response(JSON.stringify({ name: "devx-wallet-balances", transport: "streamable-http (POST JSON-RPC)", tools: TOOLS.map((t) => t.name) }), { status: 200, headers: H });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: H });
  let body; try { body = await req.json(); } catch { return new Response(JSON.stringify(err(null, -32700, "parse error")), { status: 400, headers: H }); }
  if (Array.isArray(body)) { const out = (await Promise.all(body.map((m) => handle(m, origin)))).filter(Boolean); return out.length ? new Response(JSON.stringify(out), { headers: H }) : new Response(null, { status: 202, headers: H }); }
  const r = await handle(body, origin);
  return r ? new Response(JSON.stringify(r), { headers: H }) : new Response(null, { status: 202, headers: H });
}
