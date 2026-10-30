#!/usr/bin/env node
import { basicBalance, multiBalances, paidCallInfo, ALL_CHAINS } from "../src/index.js";
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (args[0] === "mcp") {
  const { createServer } = await import("../src/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  await createServer().connect(new StdioServerTransport());
} else if (!args.length || args[0] === "-h" || args[0] === "--help") {
  process.stdout.write(`Usage:
  devx-multichain-balances <address> [--chain base]     FREE: native + USDC (USDT on Tron) on one chain
  devx-multichain-balances all <addr>[,<addr>...] [--chains base,solana] [--tokens base:0x..] [--max-usd 0.01]
                                                        PAID 0.002 USDC (x402, Base): every chain, all majors, custom tokens
  devx-multichain-balances paid-info                    URL/price of the hosted paid call
  devx-multichain-balances mcp                          run as an MCP server (stdio)
Paid calls use the key in X402_PRIVATE_KEY (or EVM_PRIVATE_KEY) of a Base wallet holding USDC.
Without a key, 'all' prints the price quote and does not pay. It never pays more than --max-usd (default 0.01).
Addresses: EVM 0x, Solana base58, Tron T... Chains: ${ALL_CHAINS.join(",")}. Data comes from the hosted API
at wallet-balances.nextill-pos.workers.dev (addresses are sent there). Read-only, never moves funds except the fee.
`);
} else if (args[0] === "paid-info") {
  process.stdout.write(JSON.stringify(paidCallInfo(), null, 2) + "\n");
} else {
  try {
    const r = args[0] === "all"
      ? await multiBalances(args[1], { chains: opt("--chains"), tokens: opt("--tokens"), maxUsd: opt("--max-usd") ? Number(opt("--max-usd")) : 0.01 })
      : await basicBalance(args[0], opt("--chain"));
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    if (r && r.payment_required) process.exitCode = 2;
  } catch (e) { process.stderr.write(e.message + "\n"); process.exitCode = 1; }
}
