// x402 client for the hosted DevX API. Pays only when you give it a key, only on Base USDC,
// only to the expected payTo, and never more than the cap (default 0.01 USDC).
export const PAY_TO = "0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247";
export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const keyFromEnv = () => process.env.X402_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY || "";

/** Read the 402 quote of a paid URL (does not pay). */
export function parseQuote(res, body) {
  let opts = [];
  const h = res.headers.get("payment-required");
  if (h) { try { const j = JSON.parse(Buffer.from(h, "base64").toString("utf8")); opts = (j.accepts || []).map((a) => ({ v: 2, network: a.network, asset: a.asset, amount: a.amount ?? a.maxAmountRequired, payTo: a.payTo })); } catch {} }
  if (!opts.length && body && Array.isArray(body.accepts)) opts = body.accepts.map((a) => ({ v: 1, network: a.network, asset: a.asset, amount: a.maxAmountRequired ?? a.amount, payTo: a.payTo }));
  const base = opts.find((o) => (o.network === "eip155:8453" || o.network === "base") && String(o.asset).toLowerCase() === BASE_USDC);
  return base ? { network: "eip155:8453", asset: BASE_USDC, amount_atomic: String(base.amount), price_usdc: Number(base.amount) / 1e6, payTo: base.payTo } : null;
}

/**
 * GET/POST a paid hosted endpoint.
 * - No key: returns { payment_required: true, quote, how_to_pay } and does not pay.
 * - Key (opts.privateKey or env X402_PRIVATE_KEY / EVM_PRIVATE_KEY): pays the x402 quote in USDC on Base
 *   if price <= maxUsd and payTo is the expected DevX wallet, then returns the JSON result plus `_payment`.
 */
export async function paidFetch(url, { method = "GET", body, maxUsd = 0.01, privateKey = keyFromEnv(), userAgent = "devx-cli" } = {}) {
  const init = { method, headers: { accept: "application/json", "user-agent": userAgent, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) };
  const r0 = await fetch(url, init);
  const j0 = await r0.json().catch(() => null);
  if (r0.status !== 402) { if (!r0.ok) throw new Error((j0 && (j0.error || j0.message)) || "HTTP " + r0.status); return j0; }
  const quote = parseQuote(r0, j0);
  if (!quote) throw new Error("402 without a Base USDC x402 option");
  if (quote.payTo.toLowerCase() !== PAY_TO.toLowerCase()) throw new Error("unexpected payTo " + quote.payTo + " (expected " + PAY_TO + "); refusing to pay");
  if (!(quote.price_usdc <= maxUsd)) throw new Error("price " + quote.price_usdc + " USDC is above your cap " + maxUsd + " (raise with --max-usd)");
  if (!privateKey) return { payment_required: true, url, quote, how_to_pay: "Set X402_PRIVATE_KEY (or EVM_PRIVATE_KEY) to the private key of a Base wallet holding a little USDC and re-run; the call costs " + quote.price_usdc + " USDC (x402, gasless EIP-3009 signature, settled only after a result is produced). Or call the URL with any x402 client." };
  const [{ wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader }, { ExactEvmScheme }, { privateKeyToAccount }] = await Promise.all([import("@x402/fetch"), import("@x402/evm"), import("viem/accounts")]);
  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : "0x" + privateKey);
  const pay = wrapFetchWithPaymentFromConfig(fetch, { schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }], spendControls: { maxAmountPerPayment: "$" + maxUsd } });
  const r = await pay(url, init);
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error("payment/call failed: HTTP " + r.status + " " + JSON.stringify(j && (j.error || j.reason || j)).slice(0, 300));
  let receipt = null; const ph = r.headers.get("payment-response") || r.headers.get("x-payment-response");
  if (ph) { try { receipt = decodePaymentResponseHeader(ph); } catch { try { receipt = JSON.parse(Buffer.from(ph, "base64").toString("utf8")); } catch {} } }
  return { ...j, _payment: { payer: account.address, price_usdc: quote.price_usdc, tx: receipt && (receipt.transaction || receipt.txHash) || null } };
}
