// DevX Multichain Balances - core: native + major token balances via public JSON-RPC (batched eth_call balanceOf).
export const CHAINS = {
  ethereum: { id: 1, native: "ETH", rpcs: ["https://ethereum-rpc.publicnode.com", "https://1rpc.io/eth"], tokens: [
    ["USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, 1], ["USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, 1], ["DAI", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18, 1],
    ["EURC", "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c", 6, 0], ["WETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, 0], ["WBTC", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8, 0]] },
  base: { id: 8453, native: "ETH", rpcs: ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://1rpc.io/base"], tokens: [
    ["USDC", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, 1], ["USDbC", "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", 6, 1], ["USDT", "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", 6, 1],
    ["DAI", "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", 18, 1], ["EURC", "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", 6, 0], ["WETH", "0x4200000000000000000000000000000000000006", 18, 0], ["cbBTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8, 0]] },
  arbitrum: { id: 42161, native: "ETH", rpcs: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"], tokens: [
    ["USDC", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 6, 1], ["USDC.e", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", 6, 1], ["USDT", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 6, 1],
    ["DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 18, 1], ["WETH", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18, 0], ["WBTC", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", 8, 0]] },
  optimism: { id: 10, native: "ETH", rpcs: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"], tokens: [
    ["USDC", "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", 6, 1], ["USDC.e", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", 6, 1], ["USDT", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", 6, 1],
    ["DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 18, 1], ["WETH", "0x4200000000000000000000000000000000000006", 18, 0]] },
  polygon: { id: 137, native: "POL", rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://1rpc.io/matic"], tokens: [
    ["USDC", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", 6, 1], ["USDC.e", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", 6, 1], ["USDT", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", 6, 1],
    ["DAI", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", 18, 1], ["WETH", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", 18, 0], ["WPOL", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", 18, 0]] },
  avalanche: { id: 43114, native: "AVAX", rpcs: ["https://avalanche-c-chain-rpc.publicnode.com/ext/bc/C/rpc", "https://api.avax.network/ext/bc/C/rpc"], tokens: [
    ["USDC", "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", 6, 1], ["USDT", "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", 6, 1], ["USDC.e", "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", 6, 1],
    ["EURC", "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD", 6, 0], ["WAVAX", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", 18, 0]] },
  bsc: { id: 56, native: "BNB", rpcs: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.bnbchain.org"], tokens: [
    ["USDC", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18, 1], ["USDT", "0x55d398326f99059fF775485246999027B3197955", 18, 1], ["WBNB", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, 0]] },
};
export const CHAIN_NAMES = Object.keys(CHAINS);
export const DEFAULT_CHAINS = CHAIN_NAMES;
export const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
const pad = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
export function fmt(raw, dec) { const s = raw.toString().padStart(dec + 1, "0"); const i = s.slice(0, s.length - dec), f = s.slice(s.length - dec).replace(/0+$/, ""); return f ? i + "." + f : i; }
function decStr(hex) { // ABI string or bytes32
  const h = (hex || "0x").slice(2); if (!h) return null;
  try { if (h.length === 64) return new TextDecoder().decode(Uint8Array.from(h.match(/../g).map((b) => parseInt(b, 16))).filter((b) => b)).trim() || null;
    const off = parseInt(h.slice(0, 64), 16) * 2, len = parseInt(h.slice(off, off + 64), 16), d = h.slice(off + 64, off + 64 + len * 2);
    return new TextDecoder().decode(Uint8Array.from((d.match(/../g) || []).map((b) => parseInt(b, 16)))).replace(/[^\x20-\x7e]/g, "").slice(0, 24) || null; } catch { return null; } }
async function rpcBatch(chain, calls, ms) {
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c[0], params: c[1] })));
  let lastErr;
  for (const u of CHAINS[chain].rpcs) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body, signal: ctl.signal });
      const j = await r.json(); if (!Array.isArray(j)) throw new Error("non-batch reply");
      const out = []; for (const x of j) out[x.id] = x; if (out.some((x) => x && x.error && /rate|limit|capacity/i.test(x.error.message || ""))) throw new Error("rate limited");
      return { res: out, rpc: new URL(u).host };
    } catch (e) { lastErr = e; } finally { clearTimeout(tm); }
  }
  throw lastErr || new Error("rpc failed");
}
// custom: [{chain, address}] ; returns per-chain report
export async function balances(address, chains, custom = [], opts = {}) {
  const t0 = Date.now(), ms = opts.ms || 2500;
  const out = await Promise.all(chains.map(async (ch) => {
    const C = CHAINS[ch], data = "0x70a08231" + pad(address);
    const toks = (opts.only ? C.tokens.filter((t) => opts.only.includes(t[0])) : C.tokens).map(([sym, a, dec, stable]) => ({ symbol: sym, address: a, decimals: dec, stable: !!stable, custom: false }));
    for (const c of custom) if (c.chain === ch && !toks.some((t) => t.address.toLowerCase() === c.address.toLowerCase())) toks.push({ symbol: null, address: c.address, decimals: null, stable: false, custom: true });
    const calls = [["eth_blockNumber", []], ["eth_getBalance", [address, "latest"]]];
    for (const t of toks) calls.push(["eth_call", [{ to: t.address, data }, "latest"]]);
    const cust = toks.filter((t) => t.custom);
    for (const t of cust) { calls.push(["eth_call", [{ to: t.address, data: "0x313ce567" }, "latest"]]); calls.push(["eth_call", [{ to: t.address, data: "0x95d89b41" }, "latest"]]); calls.push(["eth_getCode", [t.address, "latest"]]); }
    try {
      const { res, rpc } = await rpcBatch(ch, calls, ms);
      const block = res[0]?.result ? parseInt(res[0].result, 16) : null;
      const nat = res[1]?.result ? BigInt(res[1].result) : null;
      const tokens = []; let stableUsd = 0, ci = 2 + toks.length;
      toks.forEach((t, i) => {
        const r = res[2 + i];
        if (t.custom) { const d = res[ci], s = res[ci + 1], code = res[ci + 2]; ci += 3;
          if (!code?.result || code.result === "0x") { tokens.push({ symbol: null, address: t.address, custom: true, error: "no contract at this address on " + ch }); return; }
          t.decimals = d?.result && d.result !== "0x" ? Number(BigInt(d.result)) : null; t.symbol = decStr(s?.result); }
        if (!r || r.error || !r.result || r.result === "0x") { if (t.custom) tokens.push({ symbol: t.symbol, address: t.address, custom: true, error: "balanceOf failed (not an ERC-20?)" }); return; }
        const raw = BigInt(r.result.slice(0, 66)); if (raw === 0n && !t.custom) return;
        const row = { symbol: t.symbol, address: t.address, raw: raw.toString(), decimals: t.decimals, balance: t.decimals != null && t.decimals <= 36 ? fmt(raw, t.decimals) : null };
        if (t.custom) { row.custom = true; row.note = "symbol/decimals read from the contract itself; unverified token"; }
        if (t.stable) { row.stablecoin = true; stableUsd += Number(row.balance); }
        tokens.push(row);
      });
      return [ch, { chain_id: C.id, block, rpc, native: { symbol: C.native, raw: nat?.toString() ?? null, balance: nat != null ? fmt(nat, 18) : null }, tokens, stablecoins_usd_face_value: Math.round(stableUsd * 1e6) / 1e6, ok: true }];
    } catch (e) { return [ch, { chain_id: C.id, ok: false, error: "rpc unavailable: " + String(e.message || e).slice(0, 80) }]; }
  }));
  const per = Object.fromEntries(out);
  const tot = out.reduce((s, [, r]) => s + (r.stablecoins_usd_face_value || 0), 0);
  const nonzero = out.filter(([, r]) => r.ok && ((r.native.raw && r.native.raw !== "0") || r.tokens.some((t) => t.raw && t.raw !== "0"))).map(([c]) => c);
  return { address, chains: per, summary: { stablecoins_usd_face_value_total: Math.round(tot * 1e6) / 1e6, chains_with_funds: nonzero, chains_failed: out.filter(([, r]) => !r.ok).map(([c]) => c), checked_tokens: "native + " + "USDC/USDT/DAI/EURC/bridged USDC/WETH/WBTC-style majors per chain + your custom tokens", note: "Live balanceOf/eth_getBalance at the latest block via public RPC. Stablecoin total is face value (1 token = 1 USD/EUR not converted), not a market price. Tokens outside the list are not discovered; pass them via tokens=." }, elapsed_ms: Date.now() - t0 };
}
