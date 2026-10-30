import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { basicBalance, multiBalances, paidCallInfo, ALL_CHAINS } from "./index.js";
const out = (r) => ({ content: [{ type: "text", text: JSON.stringify(r) }] });
const err = (e) => ({ isError: true, content: [{ type: "text", text: String(e.message || e) }] });
export function createServer() {
  const server = new McpServer({ name: "devx-multichain-balances", version: "2.0.0" }, { instructions: "Wallet balances on 7 EVM chains, Solana and Tron via the hosted DevX API. basic_balance is free. multichain_balances costs 0.002 USDC per call via x402 on Base and pays only if X402_PRIVATE_KEY is set in this server's environment (cap 0.01 USDC); otherwise it returns the price quote." });
  server.tool("basic_balance", "Free: native coin + USDC (USDT on Tron) balance of one address on one chain (" + ALL_CHAINS.join(", ") + "). Address: EVM 0x, Solana base58 or Tron T...",
    { address: z.string().min(26).max(60).describe("EVM 0x, Solana base58 or Tron T... address"), chain: z.enum(ALL_CHAINS).optional().describe("default: base for 0x, solana or tron otherwise") },
    async ({ address, chain }) => { try { return out(await basicBalance(address, chain)); } catch (e) { return err(e); } });
  server.tool("multichain_balances", "Paid, 0.002 USDC (x402 on Base, from the wallet in X402_PRIVATE_KEY): native + USDC/USDT/DAI/EURC/bridged USDC/WETH/WBTC on 7 EVM chains, SOL + USDC/USDT on Solana, TRX + USDT on Tron, plus custom tokens, for up to 3 addresses (one per family) in one call, with block numbers and a stablecoin total. Without a key it returns the quote and does not pay.",
    { addresses: z.array(z.string().min(26).max(60)).min(1).max(3).describe("EVM 0x, Solana and/or Tron addresses (max one each)"), chains: z.array(z.enum(ALL_CHAINS)).optional().describe("default: every chain matching the addresses"), tokens: z.array(z.string()).max(10).optional().describe("custom tokens as chain:address, e.g. base:0x...") },
    async ({ addresses, chains, tokens }) => { try { return out(await multiBalances(addresses, { chains, tokens })); } catch (e) { return err(e); } });
  server.tool("multichain_balances_info", "Price, URL and payment details of the paid hosted call. Does not pay.", {}, async () => out(paidCallInfo()));
  return server;
}
