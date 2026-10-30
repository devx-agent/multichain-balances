#!/usr/bin/env node
import { basicBalance, paidCallInfo, multiBalances, family, chainFamily, ALL_CHAINS } from "../src/index.js";
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (args[0] === "mcp") {
  const { createServer } = await import("../src/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  await createServer().connect(new StdioServerTransport());
} else if (!args.length || args[0] === "-h" || args[0] === "--help") {
  process.stdout.write(`Usage:
  devx-multichain-balances <address> [--chain base]          free: native + USDC (USDT on Tron) on one chain, via public RPCs
  devx-multichain-balances all <addr>[,<addr>...] [--chains base,solana]  all majors on every matching chain, read locally via public RPCs
  devx-multichain-balances paid-info                          URL/price of the hosted x402 call (does not pay)
  devx-multichain-balances mcp                                run as an MCP server (stdio)
Addresses: EVM 0x, Solana base58, Tron T... Chains: ${ALL_CHAINS.join(",")}. Read-only, never asks for keys.
`);
} else if (args[0] === "paid-info") {
  process.stdout.write(JSON.stringify(paidCallInfo(), null, 2) + "\n");
} else {
  try {
    let r;
    if (args[0] === "all") {
      const addrs = {}; for (const a of String(args[1] || "").split(",").filter(Boolean)) { const f = family(a); if (!f) throw new Error("unrecognized address: " + a); addrs[f] = a; }
      if (!Object.keys(addrs).length) throw new Error("give at least one address");
      const chains = opt("--chains") ? opt("--chains").split(",") : ALL_CHAINS.filter((c) => addrs[chainFamily(c)]);
      for (const c of chains) if (!addrs[chainFamily(c)]) throw new Error("chain " + c + " needs a matching address");
      r = await multiBalances(addrs, chains, []);
    } else r = await basicBalance(args[0], opt("--chain"));
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  } catch (e) { process.stderr.write(e.message + "\n"); process.exitCode = 1; }
}
