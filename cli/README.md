# DevX Multichain Balances

**One call, nine chains.** Native coin plus the major tokens for an address on **Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, Solana and Tron**. It is built for AI agents and apps that need to answer "what does this wallet hold?" without running their own RPC setup.

Everything here is read-only. It never asks for keys and never moves funds.

| | What | Cost |
|---|---|---|
| **CLI / stdio MCP** `devx-multichain-balances` (v2) | Client for the hosted API below. One chain (native + USDC, USDT on Tron) is free; `all` / `multichain_balances` is the paid call, paid from **your own** wallet key | free / 0.002 USDC |
| **Remote MCP** `https://wallet-balances.nextill-pos.workers.dev/mcp` | `basic_balance` (one chain, free) + `multichain_balances_info` | free |
| **HTTP API** `GET /v1/balances` | Up to 3 addresses (one EVM, one Solana, one Tron) → native + USDC, USDT, DAI, EURC, bridged USDC, WETH, WBTC/cbBTC per EVM chain; SOL + USDC/USDT (SPL); TRX + USDT/USDC (TRC-20); plus up to 10 custom tokens (ERC-20, SPL mint, TRC-20). Block numbers/slots included, stablecoin face-value total | 0.002 USDC via [x402](https://x402.org) on Base |

Live: https://wallet-balances.nextill-pos.workers.dev · token list: [/tokens.json](https://wallet-balances.nextill-pos.workers.dev/tokens.json)

## CLI

```sh
npx devx-multichain-balances 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM          # free: SOL + USDC on Solana
npx devx-multichain-balances TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G                      # free: TRX + USDT on Tron
npx devx-multichain-balances 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain arbitrum   # free: ETH + USDC on Arbitrum

# paid, 0.002 USDC per call: every matching chain, all majors, custom tokens
export X402_PRIVATE_KEY=0x...   # a Base wallet holding a little USDC (use a dedicated low-balance wallet)
npx devx-multichain-balances all 0xd8dA...6045,9WzD...AWWM --chains base,ethereum,solana
```

How paying works: the CLI asks the API for its x402 quote, checks that it is USDC on Base, goes to `0xB3cD…f247` and is at or under `--max-usd` (default 0.01), then signs a gasless EIP-3009 authorization with your key via [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch). The key stays on your machine. Without a key, `all` prints the quote, pays nothing and exits with code 2. Since v2.0.0 the package is a thin client. It no longer ships the balance-reading code, and the addresses you query are sent to the hosted API.

## MCP

Claude Desktop / Cursor (stdio):

```json
{ "mcpServers": { "multichain-balances": { "command": "npx", "args": ["-y", "devx-multichain-balances", "mcp"], "env": { "X402_PRIVATE_KEY": "0x... (optional, enables the paid tool)" } } } }
```

Or remote (streamable HTTP): `https://wallet-balances.nextill-pos.workers.dev/mcp` (free tool + info only)

Tools: `basic_balance` (free), `multichain_balances` (0.002 USDC per call, pays only if `X402_PRIVATE_KEY` is set and never above 0.01 USDC, otherwise returns the quote), `multichain_balances_info`.

## Paid hosted call (x402)

```
GET https://wallet-balances.nextill-pos.workers.dev/v1/balances?address=0x...,<solana>,<T...>[&chains=base,ethereum,solana,tron][&tokens=base:0xToken,solana:<mint>,tron:<T...>]
```

* Answers `402` with an x402 v1 body (`X-PAYMENT`, network `base`) and a v2 `PAYMENT-REQUIRED` header (`PAYMENT-SIGNATURE`, `eip155:8453`). Both work. `POST` with a JSON body works too.
* 2000 atomic USDC (0.002 USDC) to `0xB3cDDccEe6B150c8efFD55B961afc0Ecefe7f247`, settled through the Coinbase CDP facilitator, listed in the CDP x402 Bazaar.
* Settled only **after** a result is produced. Bad input, or every chain's RPC failing, is not charged. Failed chains are listed in `summary.chains_failed`.
* `chains` defaults to every chain that matches the addresses you gave (`evm` = the 7 EVM chains).

### Limits

* It does not discover arbitrary tokens. It checks a fixed, verified list (see `/tokens.json`), and you can pass extra tokens yourself.
* On Solana it reads the owner's **associated token accounts** (where wallets normally keep tokens). Tokens held in other token accounts are not counted.
* The stablecoin total is face value (1 token = 1 unit), not a market price.
* Data comes from free public RPC nodes (publicnode.com with fallbacks: mainnet-beta / Tatum gateway for Solana, TronGrid for Tron). Identical calls within 20 s may be served from a short per-instance cache (`cache.hit`).

OpenAPI: [/openapi.json](https://wallet-balances.nextill-pos.workers.dev/openapi.json) · Terms: [/terms](https://wallet-balances.nextill-pos.workers.dev/terms)

## Related DevX tools

* [Address Poisoning Check](https://github.com/devx-agent/address-poisoning-check): is the recipient a lookalike of an address you trust?
* [7702 Sweeper Check](https://github.com/devx-agent/7702-sweeper-check): is an EIP-7702 sweeper delegation set on a wallet?
* [Crypto Link Check](https://github.com/devx-agent/crypto-link-check): is a crypto URL a phishing / drainer lookalike?

## Layout

* `cli/`: npm package `devx-multichain-balances` (CLI + stdio MCP client for the hosted API), `npm test`
* `worker/`: the Cloudflare Worker behind the hosted API (`npm run build`, `npm test`)

MIT. Made by [DevX](https://madebydevx.com) · madebydevx@gmail.com
