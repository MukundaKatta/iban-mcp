#!/usr/bin/env node
/**
 * iban MCP server. Two tools: `validate`, `format`.
 *
 * IBAN per ISO 13616. Validation runs the mod-97 checksum after the
 * standard letter-to-number transform and verifies the country-specific
 * length. No external deps.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const VERSION = '0.1.0';

// IBAN length per ISO 13616 (most-used; cover the SEPA zone + common others).
const LENGTH: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22,
  BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22,
  DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27,
  GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28,
  IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24,
  ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24,
  PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SC: 31,
  SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24,
  TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export interface ValidationResult {
  iban: string;
  valid: boolean;
  country?: string;
  reason?: string;
}

function normalize(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

function mod97(s: string): number {
  // Process in chunks to avoid BigInt for performance, RFC-style.
  let remainder = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    let n: number;
    if (c >= '0' && c <= '9') n = c.charCodeAt(0) - 48;
    else if (c >= 'A' && c <= 'Z') n = c.charCodeAt(0) - 55; // A=10
    else throw new Error('invalid IBAN character: ' + c);
    remainder = (remainder * (n >= 10 ? 100 : 10) + n) % 97;
  }
  return remainder;
}

export function validate(input: string): ValidationResult {
  const iban = normalize(input);
  if (iban.length < 5) return { iban, valid: false, reason: 'too short' };
  const country = iban.slice(0, 2);
  const expected = LENGTH[country];
  if (!expected) return { iban, valid: false, country, reason: 'unknown country' };
  if (iban.length !== expected) {
    return { iban, valid: false, country, reason: `expected ${expected} chars, got ${iban.length}` };
  }
  // Move first 4 chars to the end, then mod 97 should be 1.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  try {
    const r = mod97(rearranged);
    if (r !== 1) return { iban, valid: false, country, reason: 'checksum failed' };
  } catch (e) {
    return { iban, valid: false, country, reason: (e as Error).message };
  }
  return { iban, valid: true, country };
}

/** Format an IBAN as space-separated 4-char groups (the print convention). */
export function format(input: string): string {
  const iban = normalize(input);
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

const server = new Server({ name: 'iban', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'validate',
    description: 'Validate an IBAN: country, length, and mod-97 checksum.',
    inputSchema: {
      type: 'object',
      properties: { iban: { type: 'string' } },
      required: ['iban'],
    },
  },
  {
    name: 'format',
    description: 'Format an IBAN as space-separated 4-char groups (the print convention).',
    inputSchema: {
      type: 'object',
      properties: { iban: { type: 'string' } },
      required: ['iban'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'validate') {
      const a = args as unknown as { iban: string };
      return jsonResult(validate(a.iban));
    }
    if (name === 'format') {
      const a = args as unknown as { iban: string };
      return jsonResult({ formatted: format(a.iban) });
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('iban failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`iban MCP server v${VERSION} ready on stdio\n`);
}
