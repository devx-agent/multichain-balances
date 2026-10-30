import test from "node:test"; import assert from "node:assert/strict";
import { family, paidCallInfo, basicBalance, multiBalances, parseQuote } from "../src/index.js";
const SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", VB = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
test("address families", () => { assert.equal(family(VB), "evm"); assert.equal(family(SOL), "solana"); assert.equal(family("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "tron"); assert.equal(family("nope"), null); });
test("paid info", () => { const i = paidCallInfo(); assert.equal(i.price_usdc, 0.002); assert.ok(i.chains.includes("solana")); });
test("mismatched chain rejected offline", async () => { await assert.rejects(basicBalance(SOL, "base"), /does not match/); });
test("live free basic on base", { timeout: 30000 }, async () => { const r = await basicBalance(VB, "base"); assert.ok(r.chains.base.ok); });
test("paid call without key returns quote, does not pay", { timeout: 30000 }, async () => { const r = await multiBalances([VB], { privateKey: "" }); assert.equal(r.payment_required, true); assert.equal(r.quote.amount_atomic, "2000"); assert.equal(r.quote.network, "eip155:8453"); });
test("cap below price refuses", { timeout: 30000 }, async () => { await assert.rejects(multiBalances([VB], { privateKey: "", maxUsd: 0.001 }), /above your cap/); });
