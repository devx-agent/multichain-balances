// devx-multichain-balances: client for the hosted DevX Multichain Balances API.
// Free: native + USDC (USDT on Tron) on one chain (hosted /api/basic, no payment).
// Paid: the full 9-chain call (/v1/balances) for 0.002 USDC via x402, paid from your own wallet key.
import { paidFetch } from "./pay.js";
export { paidFetch, parseQuote, PAY_TO } from "./pay.js";
export const DEFAULT_BASE = process.env.DEVX_BALANCES_URL || "https://wallet-balances.nextill-pos.workers.dev";
export const EVM_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche", "bsc"];
export const ALL_CHAINS = [...EVM_CHAINS, "solana", "tron"];
const B58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
export const isEvm = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
export const isTron = (a) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a || "");
export const isSol = (a) => !isTron(a) && B58.test(a || "") && a.length >= 32 && a.length <= 44;
export const family = (a) => isEvm(a) ? "evm" : isTron(a) ? "tron" : isSol(a) ? "solana" : null;
export const chainFamily = (c) => c === "solana" ? "solana" : c === "tron" ? "tron" : EVM_CHAINS.includes(c) ? "evm" : null;
const UA = "devx-multichain-balances-cli/2.1.0";

/** Free: native + USDC (USDT on Tron) of one address on one chain, from the hosted free endpoint. */
export async function basicBalance(address, chain, base = DEFAULT_BASE) {
  address = String(address || "").trim(); const f = family(address);
  if (!f) throw new Error("address must be EVM 0x + 40 hex, Solana base58 or Tron T...");
  chain = String(chain || (f === "evm" ? "base" : f)).toLowerCase();
  if (!chainFamily(chain)) throw new Error("chain must be one of " + ALL_CHAINS.join(","));
  if (chainFamily(chain) !== f) throw new Error("chain " + chain + " does not match a " + f + " address");
  const u = base + "/api/basic?address=" + encodeURIComponent(address) + "&chain=" + chain;
  for (let i = 0; ; i++) { // one retry: the free tier uses public RPCs that sometimes rate-limit
    const r = await fetch(u, { headers: { "user-agent": UA } });
    const j = await r.json().catch(() => null);
    if (r.ok) return j;
    if (r.status !== 503 || i >= 1) { if (j && j.chains) return j; throw new Error((j && j.error) || "HTTP " + r.status); }
    await new Promise((s) => setTimeout(s, 1500));
  }
}

/** Paid (0.002 USDC, x402 on Base): every chain + all majors + custom tokens for up to 3 addresses. Without a key it returns the quote and does not pay. */
export async function multiBalances(addresses, { chains, tokens, maxUsd = 0.01, privateKey, base = DEFAULT_BASE } = {}) {
  const list = (Array.isArray(addresses) ? addresses : String(addresses || "").split(",")).map((s) => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("give at least one address");
  for (const a of list) if (!family(a)) throw new Error("unrecognized address: " + a);
  const q = new URLSearchParams({ address: list.join(",") });
  if (chains) q.set("chains", Array.isArray(chains) ? chains.join(",") : chains);
  if (tokens) q.set("tokens", Array.isArray(tokens) ? tokens.join(",") : tokens);
  return paidFetch(base + "/v1/balances?" + q, { maxUsd, privateKey, userAgent: UA });
}

export function paidCallInfo(base = DEFAULT_BASE) {
  return { url: base + "/v1/balances?address=<0x>,<solana>,<T...>[&chains=base,ethereum,solana,tron][&tokens=base:0xToken,solana:<mint>]", price_usdc: 0.002, protocol: "x402 exact, USDC on Base (v1 X-PAYMENT or v2 PAYMENT-SIGNATURE)", chains: ALL_CHAINS, payTo: "0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247", docs: base + "/openapi.json", pay_with_this_package: "set X402_PRIVATE_KEY (Base wallet with USDC) and run `devx-multichain-balances all <addr,...>`" };
}
