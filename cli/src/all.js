// Combines EVM (core.js) + Solana + Tron, with a short-lived per-isolate cache.
import { balances as evmBalances, CHAINS, CHAIN_NAMES as EVM_CHAINS, isAddr } from "./core.js";
import { solana, tron, isSol, isTron, SOL_TOKENS, TRON_TOKENS } from "./nonevm.js";
export { EVM_CHAINS, CHAINS, isAddr, isSol, isTron, SOL_TOKENS, TRON_TOKENS };
export const ALL_CHAINS = [...EVM_CHAINS, "solana", "tron"];
export const family = (a) => isAddr(a) ? "evm" : isTron(a) ? "tron" : isSol(a) ? "solana" : null;
export const chainFamily = (c) => c === "solana" ? "solana" : c === "tron" ? "tron" : CHAINS[c] ? "evm" : null;
export const CACHE_TTL_MS = 20000;
const cache = new Map();
// addrs: {evm?, solana?, tron?}; chains: list; custom: [{chain, address}]
export async function multiBalances(addrs, chains, custom = [], opts = {}) {
  const key = JSON.stringify([addrs, chains, custom, opts.only || null]), now = Date.now(), hit = cache.get(key);
  if (hit && now - hit.t < CACHE_TTL_MS) return { ...hit.v, cache: { hit: true, age_s: Math.round((now - hit.t) / 1000), ttl_s: CACHE_TTL_MS / 1000 } };
  const t0 = Date.now(), evmCh = chains.filter((c) => CHAINS[c]), jobs = [];
  if (evmCh.length) jobs.push(evmBalances(addrs.evm, evmCh, custom.filter((c) => CHAINS[c.chain]), opts).then((r) => Object.entries(r.chains)));
  if (chains.includes("solana")) jobs.push(solana(addrs.solana, custom.filter((c) => c.chain === "solana").map((c) => c.address), opts).then((r) => [["solana", r]]));
  if (chains.includes("tron")) jobs.push(tron(addrs.tron, custom.filter((c) => c.chain === "tron").map((c) => c.address), opts).then((r) => [["tron", r]]));
  const out = (await Promise.all(jobs)).flat(), per = Object.fromEntries(out);
  const tot = out.reduce((s, [, r]) => s + (r.stablecoins_usd_face_value || 0), 0);
  const nonzero = out.filter(([, r]) => r.ok && ((r.native.raw && r.native.raw !== "0") || r.tokens.some((t) => t.raw && t.raw !== "0"))).map(([c]) => c);
  const v = { address: addrs.evm || addrs.solana || addrs.tron, addresses: addrs, chains: per,
    summary: { stablecoins_usd_face_value_total: Math.round(tot * 1e6) / 1e6, chains_with_funds: nonzero, chains_failed: out.filter(([, r]) => !r.ok).map(([c]) => c),
      checked_tokens: "native + USDC/USDT/DAI/EURC/bridged USDC/WETH/WBTC-style majors per EVM chain; SOL + USDC/USDT (SPL); TRX + USDT/USDC (TRC-20); plus your custom tokens",
      note: "Live reads via free public RPCs. EVM/Tron: eth_getBalance/balanceOf at the latest block. Solana: SOL + the owner's associated token accounts (classic SPL Token program; Token-2022 too for custom mints). Stablecoin total is face value, not a market price. Tokens outside the list are not discovered; pass them via tokens=." },
    elapsed_ms: Date.now() - t0 };
  if (out.some(([, r]) => r.ok)) { cache.set(key, { t: now, v }); if (cache.size > 500) cache.delete(cache.keys().next().value); }
  return { ...v, cache: { hit: false, ttl_s: CACHE_TTL_MS / 1000 } };
}
