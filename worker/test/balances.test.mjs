import test from "node:test"; import assert from "node:assert/strict";
import w from "../dist/index.js";
import { multiBalances } from "../src/all.js";
import { ata, isSol, isTron, tronHex } from "../src/nonevm.js";
const EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", TRX = "TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G";
const go = async (p, init) => { const r = await w.fetch(new Request("https://wallet-balances.nextill-pos.workers.dev" + p, init), {}); return [r.status, r.headers, await r.json().catch(() => null)]; };
const bogus = { headers: { "X-PAYMENT": "e30=" } };
test("address detection", () => {
  assert.ok(isSol(SOL)); assert.ok(!isSol(EVM)); assert.ok(isTron(TRX)); assert.ok(!isTron(TRX.slice(0, -1) + "H")); assert.ok(!isSol(TRX));
  assert.equal(tronHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "0xa614f803b6fd780986a42c78ec9c7f77e6ded13c");
  // canonical USDC ATA of the Solana docs example wallet
  assert.equal(ata(SOL, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B");
});
test("unpaid paid route -> 402 with v1 body + v2 header, price/payTo unchanged", async () => {
  for (const q of ["/v1/balances", "/v1/balances?address=" + SOL, "/v1/balances?address=" + [EVM, SOL, TRX].join(",")]) {
    const [st, h, b] = await go(q); assert.equal(st, 402); assert.equal(b.x402Version, 1); assert.equal(b.accepts[0].maxAmountRequired, "2000"); assert.equal(b.accepts[0].network, "base");
    assert.equal(b.accepts[0].payTo, "0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247");
    const pr = JSON.parse(Buffer.from(h.get("PAYMENT-REQUIRED"), "base64").toString()); assert.equal(pr.x402Version, 2); assert.equal(pr.accepts[0].network, "eip155:8453"); assert.equal(pr.accepts[0].amount, "2000");
  }
  const [st] = await go("/v1/balances", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: SOL }) }); assert.equal(st, 402);
});
test("input validation before payment", async () => {
  const cases = [["?address=nope", /unrecognized address/], ["?address=" + SOL + "&chains=base", /needs a 0x address/], ["?address=" + EVM + "&chains=tron", /needs a tron address/],
    ["?address=" + EVM + "," + EVM.toLowerCase(), /only one evm/], ["?address=" + SOL + "&tokens=tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", /not among the selected chains/],
    ["?address=" + EVM + "&tokens=solana:" + SOL, /not among the selected chains/]];
  for (const [q, re] of cases) { const [st, , b] = await go("/v1/balances" + q, bogus); assert.equal(st, 400, q); assert.match(b.error, re, q); }
});
test("free basic on solana and tron", async () => {
  const [s1, , b1] = await go("/api/basic?address=" + SOL); assert.equal(s1, 200); assert.equal(b1.chains.solana.native.symbol, "SOL"); assert.ok(b1.chains.solana.slot > 0);
  const [s2, , b2] = await go("/api/basic?address=" + TRX + "&chain=trx"); assert.equal(s2, 200); assert.equal(b2.chains.tron.native.symbol, "TRX"); assert.ok(b2.chains.tron.tokens.every((t) => t.symbol === "USDT"));
  const [s3, , b3] = await go("/api/basic?address=" + SOL + "&chain=base"); assert.equal(s3, 400); assert.match(b3.error, /0x address/);
});
test("multi-family call + cache", async () => {
  const addrs = { evm: EVM, solana: SOL, tron: TRX }, chains = ["base", "solana", "tron"], custom = [{ chain: "solana", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }, { chain: "tron", address: "TXL6rJbvmjD46zeN1JssfgxvSo99qC8MRT" }];
  const a = await multiBalances(addrs, chains, custom); assert.equal(a.cache.hit, false);
  assert.deepEqual(Object.keys(a.chains).sort(), ["base", "solana", "tron"]); for (const c of chains) assert.ok(a.chains[c].ok, c);
  assert.ok(a.chains.solana.tokens.some((t) => t.custom && t.decimals === 5)); assert.ok(a.chains.tron.tokens.some((t) => t.custom && t.symbol === "SUNDOG"));
  const b = await multiBalances(addrs, chains, custom); assert.equal(b.cache.hit, true); assert.equal(b.chains.solana.slot, a.chains.solana.slot);
});
test("mcp tools", async () => {
  const [st, , b] = await go("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "basic_balance", arguments: { address: TRX } } }) });
  assert.equal(st, 200); assert.equal(b.result.structuredContent.chains.tron.ok, true);
  const [, , l] = await go("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) });
  assert.ok(l.result.tools[0].inputSchema.properties.chain.enum.includes("solana"));
});
