import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { basicBalance, multiBalances, paidCallInfo, ALL_CHAINS, DEFAULT_BASE } from "./index.js";
export const VERSION = "2.1.0";
const out = (r) => ({ structuredContent: r, content: [{ type: "text", text: JSON.stringify(r) }] });
const err = (e) => ({ isError: true, content: [{ type: "text", text: String(e.message || e) }] });
const ADDR_DESC = "EVM address (0x + 40 hex), Solana address (base58, 32-44 chars) or Tron address (T + 33 base58 chars)";

export function createServer() {
  const server = new McpServer({ name: "devx-multichain-balances", version: VERSION }, {
    instructions: "Read wallet balances on 7 EVM chains (" + ALL_CHAINS.slice(0, 7).join(", ") + "), Solana and Tron through the hosted DevX API (" + DEFAULT_BASE + "). Addresses you query are sent to that API. Use basic_balance (free) for one chain's native coin + main stablecoin. Use multichain_balances (paid, 0.002 USDC per call via x402 on Base) for every chain and major token at once. multichain_balances pays only when X402_PRIVATE_KEY (or EVM_PRIVATE_KEY) is set in this server's environment, and never above 0.01 USDC per call; without a key it returns the price quote and pays nothing. multichain_balances_info returns payment details without paying.",
  });

  server.registerTool("basic_balance", {
    title: "Free balance on one chain",
    description: [
      "Free: returns the native coin balance and the main stablecoin balance (USDC; USDT on Tron) of one address on one chain.",
      "Use it for a quick 'does this wallet hold funds on chain X' check, before sending or after a payment. For all chains and tokens at once, use multichain_balances.",
      "Read-only. The address is sent to the hosted DevX API, which reads public RPCs at the latest block (one retry if the RPC rate-limits). No key, no payment.",
      "Returns: address, chains.<chain> with chain_id, block, rpc, native {symbol, raw, balance}, tokens [{symbol, address, raw, decimals, balance, stablecoin}], stablecoins_usd_face_value and ok, plus summary (stablecoin total at face value, chains_with_funds, chains_failed, note) and full (URL of the paid all-chains call).",
      "Balances are decimal strings. The stablecoin total is face value, not a market price.",
    ].join(" "),
    inputSchema: {
      address: z.string().min(26).max(60).describe(ADDR_DESC + "."),
      chain: z.enum(ALL_CHAINS).optional().describe("Chain to read; must match the address family. Default: base for a 0x address, solana for a Solana address, tron for a Tron address."),
    },
    outputSchema: z.object({ address: z.string(), chains: z.record(z.any()).describe("one entry per chain read"), summary: z.object({}).passthrough().optional(), full: z.string().optional() }).passthrough(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ address, chain }) => { try { return out(await basicBalance(address, chain)); } catch (e) { return err(e); } });

  server.registerTool("multichain_balances", {
    title: "All-chain balances (paid, 0.002 USDC)",
    description: [
      "Returns native and major-token balances of up to 3 addresses (at most one EVM, one Solana, one Tron) across every matching chain in one call.",
      "Coverage: native coin + USDC, USDT, DAI, EURC, bridged USDC, WETH and WBTC where they exist on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche and BNB Chain; SOL + USDC/USDT on Solana; TRX + USDT/USDC on Tron; plus up to 10 custom tokens. Each chain includes the block number read and the response includes a stablecoin face-value total.",
      "Cost and side effects: this calls the hosted paid endpoint and costs 0.002 USDC per call via x402 on Base. It pays only if X402_PRIVATE_KEY (or EVM_PRIVATE_KEY) is set in this server's environment. It checks that the quote is USDC on Base, goes to the DevX wallet and is at most 0.01 USDC before signing. Without a key it pays nothing and returns {payment_required: true, url, quote, how_to_pay}.",
      "Use it when you need a full portfolio view or several chains at once. For one chain's native + stablecoin, basic_balance is free.",
      "Returns (paid): per-address, per-chain native and token balances with blocks, a summary and a _payment receipt.",
    ].join(" "),
    inputSchema: {
      addresses: z.array(z.string().min(26).max(60)).min(1).max(3).describe("1-3 addresses, at most one per family: " + ADDR_DESC + "."),
      chains: z.array(z.enum(ALL_CHAINS)).optional().describe("Limit to these chains. Default: every chain that matches the given address families."),
      tokens: z.array(z.string()).max(10).optional().describe("Up to 10 extra tokens as chain:address, e.g. base:0x4ed4e862860bed51a9570b96d89af5e1b0efefed or solana:<mint>. Tokens outside the built-in list are not discovered automatically."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ addresses, chains, tokens }) => { try { return out(await multiBalances(addresses, { chains, tokens })); } catch (e) { return err(e); } });

  server.registerTool("multichain_balances_info", {
    title: "Price and payment details of the paid call",
    description: "Returns the URL template, price (0.002 USDC), protocol (x402 exact, USDC on Base), supported chains, payee address and docs link of the paid multichain_balances endpoint, so an agent with its own x402 client can call it directly. Makes no network request and does not pay. Returns: url, price_usdc, protocol, chains, payTo, docs, pay_with_this_package.",
    inputSchema: {},
    outputSchema: { url: z.string(), price_usdc: z.number(), protocol: z.string(), chains: z.array(z.string()), payTo: z.string(), docs: z.string(), pay_with_this_package: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => out(paidCallInfo()));
  return server;
}
