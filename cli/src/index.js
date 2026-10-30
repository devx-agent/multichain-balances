// devx-multichain-balances: free local balance reads over public RPCs, and info for the hosted x402 multichain call.
export { multiBalances, ALL_CHAINS, EVM_CHAINS, family, chainFamily, isSol, isTron, isAddr, SOL_TOKENS, TRON_TOKENS, CHAINS } from "./all.js";
import { multiBalances, family, chainFamily, ALL_CHAINS } from "./all.js";
export const DEFAULT_BASE = "https://wallet-balances.nextill-pos.workers.dev";
/** Free: native + USDC (USDT on Tron) of one address on one chain, read directly from public RPCs on your machine. */
export async function basicBalance(address, chain) {
  address = String(address || "").trim(); const f = family(address);
  if (!f) throw new Error("address must be EVM 0x + 40 hex, Solana base58 or Tron T...");
  chain = String(chain || (f === "evm" ? "base" : f)).toLowerCase();
  if (!chainFamily(chain)) throw new Error("chain must be one of " + ALL_CHAINS.join(","));
  if (chainFamily(chain) !== f) throw new Error("chain " + chain + " does not match a " + f + " address");
  return multiBalances({ [f]: address }, [chain], [], { only: [chain === "tron" ? "USDT" : "USDC"] });
}
export function paidCallInfo(base = DEFAULT_BASE) {
  return { url: base + "/v1/balances?address=<0x>,<solana>,<T...>[&chains=base,ethereum,solana,tron][&tokens=base:0xToken,solana:<mint>]", price_usdc: 0.002, protocol: "x402 exact, USDC on Base (v1 X-PAYMENT or v2 PAYMENT-SIGNATURE)", chains: ALL_CHAINS, payTo: "0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247", docs: base + "/openapi.json", note: "This package does not pay. Use any x402 client (e.g. @x402/fetch) with your own wallet." };
}
