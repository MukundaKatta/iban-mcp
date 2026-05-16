# iban-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/iban-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/iban-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: validate and format IBAN bank-account numbers. No external deps
— pure implementation of the ISO 13616 mod-97 check.

## Tools

### `validate`

```json
{ "iban": "DE89 3704 0044 0532 0130 00" }
```

→

```json
{ "iban": "DE89370400440532013000", "valid": true, "country": "DE" }
```

Failure cases report `reason` (`too short` / `unknown country` / `expected
N chars, got M` / `checksum failed`).

### `format`

```json
{ "iban": "de89370400440532013000" }
```

→ `{ "formatted": "DE89 3704 0044 0532 0130 00" }`

Covers ~85 countries currently in the IBAN registry.

## Configure

```json
{ "mcpServers": { "iban": { "command": "npx", "args": ["-y", "@mukundakatta/iban-mcp"] } } }
```

## License

MIT.
