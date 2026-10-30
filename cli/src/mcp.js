import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { basicBalance, paidCallInfo, ALL_CHAINS } from "./index.js";
export function createServer() {
  const server = new McpServer({ name: "devx-multichain-balances", version: "1.1.0" }, { instructions: "Wallet balances on 7 EVM chains, Solana and Tron. Read-only; never asks for keys." });
  server.tool("basic_balance", "Free, read-only: native coin + USDC (USDT on Tron) balance of one address on one chain (" + ALL_CHAINS.join(", ") + "), live from public RPCs. Address: EVM 0x, Solana base58 or Tron T...",
    { address: z.string().min(26).max(60).describe("EVM 0x, Solana base58 or Tron T... address"), chain: z.enum(ALL_CHAINS).optional().describe("default: base for 0x, solana or tron otherwise") },
    async ({ address, chain }) => { try { const r = await basicBalance(address, chain); return { content: [{ type: "text", text: JSON.stringify(r) }] }; } catch (e) { return { isError: true, content: [{ type: "text", text: String(e.message || e) }] }; } });
  server.tool("multichain_balances_info", "How to buy the hosted full call (native + USDC/USDT/DAI/EURC/bridged USDC/WETH/WBTC on 7 EVM chains, SOL + USDC/USDT on Solana, TRX + USDT on Tron, + custom tokens, up to 3 addresses) via x402 for 0.002 USDC. Does not pay.", {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(paidCallInfo()) }] }));
  return server;
}
