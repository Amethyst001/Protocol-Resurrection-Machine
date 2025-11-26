/**
 * Debug test to see actual Gopher server response format
 */

import { describe, test } from 'vitest';
import * as net from 'net';

async function gopherRequest(
  host: string,
  port: number,
  selector: string,
  timeout: number = 10000
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port }, () => {
      // Send selector + CRLF
      client.write(selector + '\r\n');
    });

    let responseData = Buffer.alloc(0);

    client.on('data', (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
    });

    client.on('end', () => {
      resolve(responseData);
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.setTimeout(timeout, () => {
      client.destroy();
      reject(new Error(`Connection timeout after ${timeout}ms`));
    });
  });
}

describe('Gopher Debug', () => {
  test('show raw response from gopher.floodgap.com', async () => {
    const host = 'gopher.floodgap.com';
    const port = 70;
    const selector = '';

    const responseData = await gopherRequest(host, port, selector, 15000);

    console.log('\n=== RAW RESPONSE (first 1000 bytes) ===');
    console.log(responseData.slice(0, 1000).toString('utf-8'));
    console.log('\n=== HEX DUMP (first 200 bytes) ===');
    console.log(responseData.slice(0, 200).toString('hex'));

    // Parse lines
    const lines = responseData.toString('utf-8').split('\r\n');
    console.log('\n=== FIRST 10 LINES ===');
    lines.slice(0, 10).forEach((line, idx) => {
      console.log(`Line ${idx}: "${line}"`);
      if (line.length > 0) {
        const parts = line.split('\t');
        console.log(`  Parts (${parts.length}):`, parts);
      }
    });
  }, 20000);
});
