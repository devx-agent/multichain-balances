import test from "node:test"; import assert from "node:assert/strict";
import { family, isSol, isTron, paidCallInfo, basicBalance } from "../src/index.js";
import { ata, tronHex } from "../src/nonevm.js";
const SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
test("address families", () => { assert.equal(family("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"), "evm"); assert.equal(family(SOL), "solana"); assert.equal(family("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "tron"); assert.equal(family("nope"), null); assert.ok(!isTron("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u")); assert.ok(!isSol("0x00")); });
test("tron hex + solana ATA derivation", () => { assert.equal(tronHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "0xa614f803b6fd780986a42c78ec9c7f77e6ded13c"); assert.equal(ata(SOL, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B"); });
test("paid info", () => { const i = paidCallInfo(); assert.equal(i.price_usdc, 0.002); assert.ok(i.chains.includes("solana") && i.chains.includes("tron")); });
test("mismatched chain rejected offline", async () => { await assert.rejects(basicBalance(SOL, "base"), /does not match/); });
