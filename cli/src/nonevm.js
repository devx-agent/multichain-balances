// Solana (SOL + SPL USDC/USDT + custom mints) and Tron (TRX + TRC-20 USDT/USDC + custom) via free public RPCs.
import { base58 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { ed25519 } from "@noble/curves/ed25519";

const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
export function fmtU(raw, dec) { const s = raw.toString().padStart(dec + 1, "0"); const i = s.slice(0, s.length - dec), f = s.slice(s.length - dec).replace(/0+$/, ""); return f ? i + "." + f : i; }

// ---------- Solana ----------
export const SOL_RPCS = ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com", "https://solana-mainnet.gateway.tatum.io", "https://solana.lavenderfive.com"];
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EnQjhr4jrvG4LGkWpqwh8", ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const SOL_TOKENS = [["USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 6, 1], ["USDT", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", 6, 1]];
export function isSol(a) { if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a || "")) return false; try { return base58.decode(a).length === 32; } catch { return false; } }
function onCurve(b) { try { ed25519.ExtendedPoint.fromHex(b); return true; } catch { return false; } }
export function ata(owner, mint, program = TOKEN_PROGRAM) {
  const seeds = [base58.decode(owner), base58.decode(program), base58.decode(mint)], pid = base58.decode(ATA_PROGRAM), tag = new TextEncoder().encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump--) {
    const buf = new Uint8Array(seeds.reduce((n, s) => n + s.length, 0) + 1 + 32 + tag.length); let o = 0;
    for (const s of seeds) { buf.set(s, o); o += s.length; } buf[o++] = bump; buf.set(pid, o); o += 32; buf.set(tag, o);
    const h = sha256(buf); if (!onCurve(h)) return base58.encode(h);
  }
  throw new Error("no PDA");
}
async function post(u, body, ms) {
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal }); if (!r.ok) throw new Error("http " + r.status); return await r.json(); } finally { clearTimeout(tm); }
}
const byId = (j) => { if (!Array.isArray(j)) throw new Error("non-batch reply"); const o = []; for (const x of j) o[x.id] = x; return o; };
// Balances of the owner's associated token accounts (ATA) via getMultipleAccounts (non-indexed, works on free public RPCs).
export async function solana(owner, customMints = [], opts = {}) {
  const ms = opts.ms || 3000, only = opts.only;
  const toks = (only ? SOL_TOKENS.filter((t) => only.includes(t[0])) : SOL_TOKENS).map(([symbol, mint, decimals, st]) => ({ symbol, mint, decimals, stable: !!st, custom: false }));
  for (const m of customMints) if (!toks.some((t) => t.mint === m)) toks.push({ symbol: null, mint: m, decimals: null, stable: false, custom: true });
  const errs = [];
  for (const u of SOL_RPCS) try {
    const accs = []; for (const t of toks) { accs.push([t, ata(owner, t.mint, TOKEN_PROGRAM)]); if (t.custom) accs.push([t, ata(owner, t.mint, TOKEN_2022)]); }
    const mints = toks.filter((t) => t.custom).map((t) => t.mint);
    // one non-batch call: owner account (lamports) + ATAs + custom mints
    const j = await post(u, { jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [[owner, ...accs.map((a) => a[1]), ...mints], { encoding: "base64", commitment: "confirmed" }] }, ms);
    if (j.error || !j.result) throw new Error(((j.error && j.error.message) || "bad reply").slice(0, 60));
    const slot = j.result.context.slot, all = j.result.value, lam = BigInt(all[0]?.lamports || 0), vals = all.slice(1);
    const raws = new Map(); accs.forEach(([t], i) => { const v = vals[i]; if (!v) return; const d = Uint8Array.from(atob(v.data[0]), (c) => c.charCodeAt(0)); if (d.length < 72 || ![TOKEN_PROGRAM, TOKEN_2022].includes(v.owner)) return;
      if (base58.encode(d.slice(0, 32)) !== t.mint || base58.encode(d.slice(32, 64)) !== owner) return; // ATA must hold this mint for this owner
      let x = 0n; for (let k = 71; k >= 64; k--) x = (x << 8n) | BigInt(d[k]); raws.set(t, (raws.get(t) || 0n) + x); });
    const tokens = []; let stableUsd = 0;
    for (const t of toks) {
      let dec = t.decimals; if (t.custom) { const v = vals[accs.length + mints.indexOf(t.mint)]; const d = v ? Uint8Array.from(atob(v.data[0]), (c) => c.charCodeAt(0)) : null;
        if (!d || d.length < 45 || ![TOKEN_PROGRAM, TOKEN_2022].includes(v.owner)) { tokens.push({ symbol: null, mint: t.mint, custom: true, error: "not an SPL token mint" }); continue; } dec = d[44]; }
      const raw = raws.get(t) || 0n; if (raw === 0n && !t.custom) continue;
      const row = { symbol: t.symbol, mint: t.mint, raw: raw.toString(), decimals: dec, balance: fmtU(raw, dec) };
      if (t.custom) row.custom = true; if (t.stable) { row.stablecoin = true; stableUsd += Number(row.balance); }
      tokens.push(row);
    }
    return { chain_id: "solana-mainnet", slot, rpc: new URL(u).host, native: { symbol: "SOL", raw: lam.toString(), balance: fmtU(lam, 9) }, tokens, stablecoins_usd_face_value: Math.round(stableUsd * 1e6) / 1e6, ok: true };
  } catch (e) { errs.push(new URL(u).host + ": " + String(e.message || e).slice(0, 40)); }
  return { chain_id: "solana-mainnet", ok: false, error: "rpc unavailable: " + errs.join("; ").slice(0, 300) };
}

// ---------- Tron ----------
export const TRON_RPCS = ["https://tron-rpc.publicnode.com/jsonrpc", "https://api.trongrid.io/jsonrpc"];
export const TRON_TOKENS = [["USDT", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", 6, 1], ["USDC", "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8", 6, 1]];
export function tronHex(a) { // base58check -> 0x + 20 bytes, or null
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a || "")) return null;
  try { const d = base58.decode(a); if (d.length !== 25 || d[0] !== 0x41) return null; const c = sha256(sha256(d.slice(0, 21)));
    for (let i = 0; i < 4; i++) if (c[i] !== d[21 + i]) return null; return "0x" + hex(d.slice(1, 21)); } catch { return null; }
}
export const isTron = (a) => !!tronHex(a);
function decStr(h) { h = (h || "0x").slice(2); if (h.length < 128) return null; try { const len = parseInt(h.slice(64, 128), 16); const d = h.slice(128, 128 + len * 2); return new TextDecoder().decode(Uint8Array.from((d.match(/../g) || []).map((b) => parseInt(b, 16)))).replace(/[^\x20-\x7e]/g, "").slice(0, 24) || null; } catch { return null; } }
export async function tron(owner, customTokens = [], opts = {}) {
  const ms = opts.ms || 3000, only = opts.only, oh = tronHex(owner), data = "0x70a08231" + oh.slice(2).padStart(64, "0");
  const toks = (only ? TRON_TOKENS.filter((t) => only.includes(t[0])) : TRON_TOKENS).map(([symbol, address, decimals, st]) => ({ symbol, address, decimals, stable: !!st, custom: false }));
  for (const a of customTokens) if (!toks.some((t) => t.address === a)) toks.push({ symbol: null, address: a, decimals: null, stable: false, custom: true });
  const calls = [{ jsonrpc: "2.0", id: 0, method: "eth_blockNumber", params: [] }, { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [oh, "latest"] }];
  toks.forEach((t) => calls.push({ jsonrpc: "2.0", id: calls.length, method: "eth_call", params: [{ to: tronHex(t.address), data }, "latest"] }));
  const cust = toks.filter((t) => t.custom); for (const t of cust) { calls.push({ jsonrpc: "2.0", id: calls.length, method: "eth_call", params: [{ to: tronHex(t.address), data: "0x313ce567" }, "latest"] }); calls.push({ jsonrpc: "2.0", id: calls.length, method: "eth_call", params: [{ to: tronHex(t.address), data: "0x95d89b41" }, "latest"] }); }
  let lastErr;
  for (const u of TRON_RPCS) {
    try {
      const r = byId(await post(u, calls, ms)); if (!r[0]?.result || !r[1]?.result) throw new Error("bad reply");
      const sun = BigInt(r[1].result); const tokens = []; let stableUsd = 0, ci = 2 + toks.length;
      toks.forEach((t, i) => { const x = r[2 + i]; let dec = t.decimals, sym = t.symbol;
        if (t.custom) { const d = r[ci], s = r[ci + 1]; ci += 2; dec = d?.result && d.result !== "0x" ? Number(BigInt(d.result)) : null; sym = decStr(s?.result); }
        if (!x || x.error || !x.result || x.result === "0x") { if (t.custom) tokens.push({ symbol: sym, address: t.address, custom: true, error: "balanceOf failed (not a TRC-20?)" }); return; }
        const raw = BigInt(x.result.slice(0, 66)); if (raw === 0n && !t.custom) return;
        const row = { symbol: sym, address: t.address, raw: raw.toString(), decimals: dec, balance: dec != null && dec <= 36 ? fmtU(raw, dec) : null };
        if (t.custom) { row.custom = true; row.note = "symbol/decimals read from the contract itself; unverified token"; }
        if (t.stable) { row.stablecoin = true; stableUsd += Number(row.balance); }
        tokens.push(row); });
      return { chain_id: "tron-mainnet", block: parseInt(r[0].result, 16), rpc: new URL(u).host, native: { symbol: "TRX", raw: sun.toString(), balance: fmtU(sun, 6) }, tokens, stablecoins_usd_face_value: Math.round(stableUsd * 1e6) / 1e6, ok: true };
    } catch (e) { lastErr = e; }
  }
  return { chain_id: "tron-mainnet", ok: false, error: "rpc unavailable: " + String(lastErr?.message || lastErr).slice(0, 80) };
}
