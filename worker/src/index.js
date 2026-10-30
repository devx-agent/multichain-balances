import { facilitate, facilitatorConfig } from "../shared/facilitator.js";
import { CHAINS, isAddr } from "./core.js";
import { multiBalances, ALL_CHAINS, EVM_CHAINS, family, chainFamily, isSol, isTron, SOL_TOKENS, TRON_TOKENS, CACHE_TTL_MS } from "./all.js";
const CHAIN_NAMES = ALL_CHAINS;
import PAGE from "./page.html";
import { mcp } from "./mcp.js";

const VERSION = "1.1.0";
const SERVICE = "DevX Multichain Balances";
const PAY_TO = "0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247";
const FACILITATOR = "Coinbase CDP facilitator (api.cdp.coinbase.com/platform/v2/x402)";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE = "2000"; // 0.002 USDC per call
const ROUTE = "/v1/balances";
const SITE = "https://wallet-balances.nextill-pos.workers.dev";
const DESC = "Wallet balances in one call on 9 chains: native + USDC, USDT, DAI, EURC, bridged USDC, WETH, WBTC/cbBTC on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain; SOL + USDC/USDT on Solana; TRX + USDT on Tron. Pass 0x, Solana and/or Tron addresses, plus up to 10 custom tokens. Live reads, block numbers, stablecoin total. 0.002 USDC.";
const enc = new TextEncoder();
const b64 = (o) => btoa(String.fromCharCode(...enc.encode(JSON.stringify(o))));
const unb64 = (s) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0))));
const EXAMPLE = { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chains: { base: { chain_id: 8453, block: 53299201, native: { symbol: "ETH", balance: "3.128822813472737" }, tokens: [{ symbol: "USDC", address: USDC_BASE, raw: "79528679", decimals: 6, balance: "79.528679", stablecoin: true }], stablecoins_usd_face_value: 94.92, ok: true } }, summary: { stablecoins_usd_face_value_total: 94.92, chains_with_funds: ["base"], chains_failed: [] } };

function requirements() { return { scheme: "exact", network: "eip155:8453", amount: PRICE, asset: USDC_BASE, payTo: PAY_TO, maxTimeoutSeconds: 120, extra: { name: "USD Coin", version: "2" } }; }
function advertised(resUrl) { return { ...requirements(), maxAmountRequired: PRICE, resource: resUrl, description: DESC, mimeType: "application/json" }; }
function paymentRequired(origin, error, resUrl) {
  resUrl = resUrl || origin + ROUTE;
  return { x402Version: 2, error: error || "PAYMENT-SIGNATURE header is required",
    resource: { url: resUrl, description: DESC, mimeType: "application/json", serviceName: SERVICE, tags: ["wallet", "balances", "onchain-data", "erc20", "multichain", "solana", "tron", "usdt", "base", "agents", "x402"] },
    accepts: [advertised(resUrl)],
    extensions: { bazaar: { info: { input: { type: "http", method: "GET", discoverable: true, queryParams: { address: EXAMPLE.address, chains: "base,ethereum" } }, output: { type: "json", example: EXAMPLE } },
      schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { input: { type: "object", properties: { type: { type: "string", const: "http" }, method: { type: "string", enum: ["GET"] }, discoverable: { type: "boolean" }, queryParams: { type: "object", properties: { address: { type: "string", description: "wallet address(es), comma list, max one each: EVM 0x, Solana base58, Tron T..." }, chains: { type: "string", description: "comma list of " + CHAIN_NAMES.join(",") + " (default: all chains matching the given addresses)" }, tokens: { type: "string", description: "optional custom tokens, comma list of chain:token (ERC-20 0x, SPL mint, TRC-20 T...; max 10)" } }, required: ["address"] } }, required: ["type", "method"] }, output: { type: "object" } }, required: ["input"] } } } };
}

// X402_COMPAT_V1: serve x402 v1 body (network "base") + v2 PAYMENT-REQUIRED header; accept v1 X-PAYMENT and v2 PAYMENT-SIGNATURE; accept POST JSON.
function v1Requirements(resUrl) { return { scheme: "exact", network: "base", maxAmountRequired: PRICE, resource: resUrl, description: DESC, mimeType: "application/json", payTo: PAY_TO, maxTimeoutSeconds: 120, asset: USDC_BASE, outputSchema: { input: { type: "http", method: "GET", discoverable: true, queryParams: { address: { type: "string", required: true, description: "wallet address(es), comma list: EVM 0x, Solana base58, Tron T... (max one each)" }, chains: { type: "string", required: false, description: "comma list of 7 EVM chains, solana, tron; default all matching the addresses" }, tokens: { type: "string", required: false, description: "chain:token,... custom ERC-20/SPL mint/TRC-20 (max 10)" } } }, output: { type: "object" } }, extra: { name: "USD Coin", version: "2" } }; }
function v1Body(pr) { const resUrl = pr.resource.url; return { x402Version: 1, error: (pr.error && pr.error !== "PAYMENT-SIGNATURE header is required") ? pr.error : "X-PAYMENT header is required (x402 v1) or PAYMENT-SIGNATURE (x402 v2, see PAYMENT-REQUIRED header)", accepts: [v1Requirements(resUrl)], resource: pr.resource, extensions: pr.extensions }; }
function uaFamily(ua) { ua = (ua || "").toLowerCase(); for (const [k, re] of [["x402_sdk", /x402|coinbase|cdp|agentcash|payai/], ["monitor", /monitor|uptime|bot|crawl|spider|scan|probe|check/], ["axios", /axios/], ["python", /python|httpx|aiohttp/], ["curl", /curl|wget/], ["go", /go-http/], ["node", /node|undici/], ["browser", /mozilla/]]) if (re.test(ua)) return k; return ua ? "other" : "none"; }
async function postToParams(req, url) {
  if (req.method !== "POST") return null;
  let b; try { b = await req.json(); } catch { return { error: "POST body must be JSON, e.g. {\"address\": \"0x..\", \"chains\": \"base,ethereum\"}" }; }
  for (const [k, alts] of [["address", ["address", "wallet", "owner", "account"]], ["chains", ["chains", "chain", "networks"]], ["tokens", ["tokens"]]]) { for (const a of alts) if (b && b[a] != null) { url.searchParams.set(k, Array.isArray(b[a]) ? b[a].join(",") : String(b[a])); break; } }
  return null;
}
const H = { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-expose-headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE" };
const J = (o, status = 200, h = {}) => new Response(JSON.stringify(o, null, 2), { status, headers: { ...H, ...h } });
// CDP_SWITCH: Coinbase CDP facilitator when CDP_API_KEY_ID/SECRET secrets are set (lists in CDP x402 Bazaar), else PayAI.
let ENV = {};
async function facil(op, body) { const r = await facilitate(ENV, op, body); r._st = r._status; delete r._status; if (!r.isValid && !r.success) console.log(JSON.stringify({ ev: "facil_" + op, st: r._st, r: JSON.stringify(r).slice(0, 300) })); return r; }
const ALIAS = { eth: "ethereum", mainnet: "ethereum", arb: "arbitrum", op: "optimism", matic: "polygon", avax: "avalanche", bnb: "bsc", sol: "solana", trx: "tron" };
function parseQ(url) {
  const raw = (url.searchParams.get("address") || url.searchParams.get("wallet") || "").trim();
  const extra = ["evm", "solana", "tron"].map((k) => url.searchParams.get(k)).filter(Boolean);
  const list = raw.split(/[\s,]+/).concat(extra.join(",").split(/[\s,]+/)).filter(Boolean);
  if (!list.length) return { error: "address query parameter required (EVM 0x, Solana base58 or Tron T...; comma list allowed)" };
  if (list.length > 3) return { error: "max 3 addresses (one EVM, one Solana, one Tron)" };
  const addrs = {};
  for (const a of list) { const f = family(a); if (!f) return { error: "unrecognized address: " + a.slice(0, 60) + " (EVM 0x + 40 hex, Solana base58 32-byte key, or Tron base58check T...)" };
    if (addrs[f] && addrs[f] !== a) return { error: "only one " + f + " address per call" }; addrs[f] = a; }
  const cs = (url.searchParams.get("chains") || url.searchParams.get("chain") || "").toLowerCase().split(/[\s,]+/).filter(Boolean).map((c) => ALIAS[c] || c);
  const expanded = []; for (const c of cs) { if (c === "evm") expanded.push(...EVM_CHAINS); else expanded.push(c); }
  const chains = expanded.length ? [...new Set(expanded)] : ALL_CHAINS.filter((c) => addrs[chainFamily(c)]);
  const bad = chains.find((c) => !chainFamily(c)); if (bad) return { error: "unsupported chain: " + bad.slice(0, 30) + " (use " + CHAIN_NAMES.join(",") + ")" };
  const miss = chains.find((c) => !addrs[chainFamily(c)]); if (miss) return { error: "chain " + miss + " needs a" + (chainFamily(miss) === "evm" ? " 0x" : " " + chainFamily(miss)) + " address" };
  const custom = []; const traw = (url.searchParams.get("tokens") || "").split(/[\s,]+/).filter(Boolean);
  if (traw.length > 10) return { error: "max 10 custom tokens" };
  for (const t of traw) { const m = t.split(":"); let ch = m.length === 2 ? (ALIAS[m[0].toLowerCase()] || m[0].toLowerCase()) : null; const a = m.length === 2 ? m[1] : m[0];
    const tf = isAddr(a) ? "evm" : isTron(a) ? "tron" : isSol(a) ? "solana" : null;
    if (!tf) return { error: "invalid token: " + t.slice(0, 60) + " (use chain:token)" };
    if (ch) { if (!chainFamily(ch)) return { error: "unsupported chain in tokens: " + ch.slice(0, 30) }; if (chainFamily(ch) !== tf) return { error: "token " + a.slice(0, 50) + " is not a " + ch + " address" };
      if (!chains.includes(ch)) return { error: "token chain " + ch + " is not among the selected chains" }; custom.push({ chain: ch, address: a }); }
    else if (tf === "evm") { const ev = chains.filter((c) => CHAINS[c]); if (!ev.length) return { error: "bare 0x token needs an EVM chain selected" }; for (const c of ev) custom.push({ chain: c, address: a }); }
    else { if (!chains.includes(tf)) return { error: "token " + a.slice(0, 50) + " needs chain " + tf + " selected" }; custom.push({ chain: tf, address: a }); } }
  return { addrs, chains, custom };
}
const TERMS = `${SERVICE} - Terms of Service (v${VERSION}, effective 2026-10-30)
Operator: DevX / Made by DevX (madebydevx.com), contact madebydevx@gmail.com.
1. Service. Read-only lookup of public blockchain state. GET ${ROUTE}?address=0x..[&chains=..][&tokens=chain:0x..] (paid) returns the native balance and balances of a fixed, verified list of major tokens (USDC, USDT, DAI, EURC, bridged USDC, WETH, WBTC/cbBTC, wrapped native) on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche C-Chain and BNB Chain, SOL + USDC/USDT (SPL, associated token accounts) on Solana and TRX + USDT/USDC (TRC-20) on Tron, plus up to 10 custom tokens you name, via public RPC nodes (publicnode.com with fallbacks: api.mainnet-beta.solana.com, api.trongrid.io and others). Results may be served from a cache up to ${CACHE_TTL_MS / 1000} seconds old (marked cache.hit). Tokens outside the list are not discovered. GET /api/basic?address=..&chain=base (free) returns native + USDC (USDT on Tron) on one chain.
2. Price. 0.002 USDC per paid call, x402 "exact" on Base, paid to ${PAY_TO}, settled through ${FACILITATOR}.
3. Not charged on error. Payment is settled only after a result is produced. If every requested chain's RPC fails, you get an error and the authorization is not settled. If some chains fail they are listed in summary.chains_failed.
4. Refunds. If you were charged but got no result, email madebydevx@gmail.com with the Base tx hash within 30 days; verified cases are refunded in USDC on Base.
5. Not financial data. Stablecoin totals are face value, not market prices; custom token symbols/decimals are read from the token contract and are unverified.
6. Data. We do not store queried addresses beyond Cloudflare's standard request logs.
7. Changes. Material changes bump the version; the price in the live 402 response is authoritative.`;

function docs(origin) {
  return { openapi: "3.1.0", info: { title: SERVICE, version: VERSION, description: DESC, termsOfService: origin + "/terms", contact: { name: "DevX", email: "madebydevx@gmail.com", url: "https://madebydevx.com" } },
    servers: [{ url: origin }],
    paths: {
      "/api/basic": { get: { summary: "Free: native + USDC balance of an address on one chain", parameters: [{ name: "address", in: "query", required: true, schema: { type: "string" } }, { name: "chain", in: "query", required: false, schema: { type: "string", enum: CHAIN_NAMES, default: "base" } }], responses: { 200: { description: "result" } } } },
      [ROUTE]: { get: { summary: "Paid (0.002 USDC, x402): native + major token balances on 7 EVM chains + Solana + Tron in one call, plus custom tokens", parameters: [{ name: "address", in: "query", required: true, schema: { type: "string" }, description: "comma list, max one each: EVM 0x, Solana base58, Tron T..." }, { name: "chains", in: "query", required: false, schema: { type: "string" }, description: CHAIN_NAMES.join(",") + ", or evm (default: all chains matching the addresses)" }, { name: "tokens", in: "query", required: false, schema: { type: "string" }, description: "custom tokens: chain:token,... (ERC-20 0x, SPL mint, TRC-20 T...; max 10; bare 0x applies to all selected EVM chains)" }],
        "x-payment-info": { protocol: "x402", x402Version: 2, scheme: "exact", network: "eip155:8453", asset: USDC_BASE, amount: PRICE, price_usd: 0.002, payTo: PAY_TO, facilitator: FACILITATOR },
        responses: { 200: { description: "balances" }, 402: { description: "Payment required (x402 v1 body + v2 PAYMENT-REQUIRED header)" } } } } } };
}

const TOKENLIST = () => ({ ...Object.fromEntries(Object.entries(CHAINS).map(([c, C]) => [c, { chain_id: C.id, native: C.native, tokens: C.tokens.map(([s, a, d, st]) => ({ symbol: s, address: a, decimals: d, stablecoin: !!st })) }])),
  solana: { chain_id: "solana-mainnet", native: "SOL", tokens: SOL_TOKENS.map(([s, a, d, st]) => ({ symbol: s, mint: a, decimals: d, stablecoin: !!st })) },
  tron: { chain_id: "tron-mainnet", native: "TRX", tokens: TRON_TOKENS.map(([s, a, d, st]) => ({ symbol: s, address: a, decimals: d, stablecoin: !!st })) } });

async function basicOne(address, chain) {
  const f = chainFamily(chain), only = chain === "tron" ? ["USDT"] : ["USDC"];
  const r = await multiBalances({ [f]: address }, [chain], [], { ms: 2500, only }); r.free_tier = "native + " + only[0] + " on one chain"; delete r.summary.checked_tokens; return r;
}
export default {
  async fetch(req, env) {
    ENV = env || {};
    const url = new URL(req.url), origin = url.origin, p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { headers: { ...H, "access-control-allow-headers": "*", "access-control-allow-methods": "GET, HEAD, POST, OPTIONS" } });
    if (p === "/") return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
    if (p === "/index.json") return J({ service: SERVICE, version: VERSION, by: "Made by DevX (madebydevx.com)", free: origin + "/api/basic?address=0x...&chain=base", paid: origin + ROUTE + "?address=0x...,<solana>,<T...>[&chains=base,solana,tron][&tokens=base:0x...]", price_usdc: 0.002, chains: CHAIN_NAMES, cache_ttl_s: CACHE_TTL_MS / 1000, protocol: "x402 (v1 X-PAYMENT and v2 PAYMENT-SIGNATURE), USDC on Base", payTo: PAY_TO, docs: origin + "/openapi.json", tokens: origin + "/tokens.json", mcp: origin + "/mcp", terms: origin + "/terms", description: DESC });
    if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
    if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc><lastmod>2026-10-30</lastmod></url></urlset>`, { headers: { "content-type": "application/xml" } });
    if (p === "/llms.txt") return new Response(`# ${SERVICE}
> One call = native + major token balances (USDC, USDT, DAI, EURC, bridged USDC, WETH, WBTC/cbBTC) on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, plus SOL + USDC/USDT on Solana and TRX + USDT on Tron, plus custom tokens. 0.002 USDC via x402 on Base. Live reads at the latest block (cache up to 20 s).
- Paid API (x402): GET /v1/balances?address=0x...,<solana>,<T...>[&chains=base,ethereum,solana,tron][&tokens=base:0xToken,solana:<mint>]
- Free API: GET /api/basic?address=...&chain=base|...|solana|tron (native + USDC, or USDT on Tron, one chain)
- Token list: /tokens.json  - OpenAPI: /openapi.json  - MCP: ${SITE}/mcp
- Related: https://address-poisoning-check.nextill-pos.workers.dev (recipient lookalike check), https://tokencheck.madebydevx.com (token check)
`, { headers: { "content-type": "text/plain; charset=utf-8" } });
    if (p === "/.well-known/402index-verify.txt") return new Response("d19536bcf4042b7cdc1c77f66a9acdc7164b1ce696427ca096497f6985152614", { headers: { "content-type": "text/plain" } });
    if (p === "/terms") return new Response(TERMS, { headers: { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" } });
    if (p === "/openapi.json") return J(docs(origin));
    if (p === "/tokens.json") return J(TOKENLIST());
    if (p === "/.well-known/x402") return J({ version: 1, resources: [origin + ROUTE], description: SERVICE });
    if (p === "/.well-known/x402.json") return J({ x402Version: 2, name: SERVICE, provider: "Made by DevX (madebydevx.com)", resources: [{ url: origin + ROUTE, method: "GET", description: DESC, accepts: [requirements()] }] });
    if (p === "/mcp") return mcp(req, origin);
    if (p === "/.well-known/mcp.json" || p === "/.well-known/mcp/server-card.json") return J({ name: "devx-wallet-balances", description: "Native + major token balances on 7 EVM chains, Solana and Tron", url: origin + "/mcp", transport: "streamable-http", tools: ["basic_balance", "multichain_balances_info"], provider: "Made by DevX" });
    if (p === "/health") return J({ ok: true, version: VERSION, facilitator: facilitatorConfig(ENV).name });
    if (p === "/api/basic") {
      const address = (url.searchParams.get("address") || "").trim(); let chain = (url.searchParams.get("chain") || "").toLowerCase(); chain = ALIAS[chain] || chain;
      const f = family(address); if (!f) return J({ error: "address must be EVM 0x + 40 hex, Solana base58 or Tron T..." }, 400);
      if (!chain) chain = f === "evm" ? "base" : f;
      if (!chainFamily(chain)) return J({ error: "chain must be one of " + CHAIN_NAMES.join(",") }, 400);
      if (chainFamily(chain) !== f) return J({ error: "chain " + chain + " needs a" + (chainFamily(chain) === "evm" ? " 0x" : " " + chainFamily(chain)) + " address" }, 400);
      const r = await basicOne(address, chain); r.full = origin + ROUTE + "?address=" + address + " (all matching chains + all major tokens + custom tokens, 0.002 USDC x402)"; return J(r, r.chains[chain].ok ? 200 : 503);
    }
    if (p !== ROUTE) return J({ error: "not found", see: origin + "/index.json" }, 404);
    if (!["GET", "HEAD", "POST"].includes(req.method)) return J({ error: "use GET (or POST JSON)" }, 405);
    { const pe = await postToParams(req, url); if (pe && pe.error) return J({ error: pe.error }, 400); }
    const pr = paymentRequired(origin); // resource URL without query: buyer inputs must not end up in public Bazaar catalogs
    const parsed = parseQ(url);
    const sig = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("X-PAYMENT");
    console.log(JSON.stringify({ ev: "paid_route", m: req.method, pay: sig ? (req.headers.get("X-PAYMENT") ? "x-payment" : "payment-signature") : null, ua: uaFamily(req.headers.get("user-agent")) }));
    if (!sig) return J(v1Body(pr), 402, { "PAYMENT-REQUIRED": b64(pr) });
    if (parsed.error) return J({ error: parsed.error + " (you were not charged)" }, 400);
    let payload; try { payload = unb64(sig); } catch { return J({ ...pr, error: "malformed PAYMENT-SIGNATURE" }, 400, { "PAYMENT-REQUIRED": b64(pr) }); }
    const reqs = requirements(), isV1 = payload.x402Version === 1 || (!payload.accepted && !!payload.network);
    const acc = isV1 ? { network: (payload.network === "base" || payload.network === "eip155:8453") ? reqs.network : payload.network, payTo: payload.payload?.authorization?.to, amount: String(payload.payload?.authorization?.value ?? ""), asset: USDC_BASE } : (payload.accepted || {});
    const fReq = isV1 ? v1Requirements(pr.resource.url) : reqs, fPay = isV1 ? { ...payload, x402Version: 1, scheme: "exact", network: "base" } : payload, fv = isV1 ? 1 : 2;
    console.log(JSON.stringify({ ev: "pay_attempt", v: fv, ua: uaFamily(req.headers.get("user-agent")) }));
    if ((!isV1 && payload.x402Version !== 2) || acc.network !== reqs.network || acc.payTo?.toLowerCase() !== PAY_TO.toLowerCase() || acc.amount !== reqs.amount || acc.asset?.toLowerCase() !== USDC_BASE.toLowerCase())
      return J({ ...(isV1 ? v1Body(pr) : pr), error: "payment does not match requirements (exact, Base USDC " + PRICE + " atomic to " + PAY_TO + ")" }, 402, { "PAYMENT-REQUIRED": b64(pr) });
    const v = await facil("verify", { x402Version: fv, paymentPayload: fPay, paymentRequirements: fReq });
    if (!v.isValid) { console.log(JSON.stringify({ ev: "pay_invalid", v: fv, r: v.invalidReason || "unknown" })); return J({ ...(isV1 ? v1Body(pr) : pr), error: "payment invalid: " + (v.invalidReason || v.errorMessage || v.message || v.error || ("facilitator status " + (v._st || "?"))) }, 402, { "PAYMENT-REQUIRED": b64(pr) }); }
    let report; try { report = await multiBalances(parsed.addrs, parsed.chains, parsed.custom); if (!Object.values(report.chains).some((c) => c.ok)) throw new Error("all RPCs failed"); } catch (e) { return J({ error: "RPC error, you were not charged: " + String(e.message || e).slice(0, 120) }, 503); }
    const s = await facil("settle", { x402Version: fv, paymentPayload: fPay, paymentRequirements: fReq });
    const PRH = b64(isV1 ? { success: !!s.success, transaction: s.transaction || "", network: "base", payer: s.payer || payload.payload?.authorization?.from || "" } : s);
    console.log(JSON.stringify({ ev: s.success ? "paid" : "settle_fail", v: fv }));
    if (!s.success) return J({ ...pr, error: "settlement failed: " + (s.errorReason || "unknown") + " (result withheld, not charged)" }, 402, { "PAYMENT-REQUIRED": b64(pr), "PAYMENT-RESPONSE": PRH, "X-PAYMENT-RESPONSE": PRH });
    return J({ service: SERVICE, version: VERSION, ...report, payment: { tx: s.transaction || null, network: s.network || "eip155:8453", x402Version: fv } }, 200, { "PAYMENT-RESPONSE": PRH, "X-PAYMENT-RESPONSE": PRH });
  },
};
