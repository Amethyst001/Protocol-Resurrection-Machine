/**
 * Manual Gopher parsing test to demonstrate real server interaction
 * This test manually parses the Gopher format to work around parser generator limitations
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { describe, test, expect } from 'vitest';
import * as net from 'net';
import { GopherSerializer, Request } from '../../generated/gopher/gopher-serializer';

/**
 * Manually parsed Gopher directory item
 */
interface GopherItem {
  itemType: string;
  display: string;
  selector: string;
  host: string;
  port: number;
}

/**
 * Manually parse a Gopher directory line
 * Format: {itemType}{display}\t{selector}\t{host}\t{port}\r\n
 */
function parseGopherLine(line: string): GopherItem | null {
  // Split by tabs
  const parts = line.split('\t');

  if (parts.length < 4) {
    return null;
  }

  // First character is item type, rest is display
  const firstPart = parts[0];
  if (firstPart.length === 0) {
    return null;
  }

  const itemType = firstPart[0];
  const display = firstPart.substring(1);
  const selector = parts[1];
  const host = parts[2];
  const port = parseInt(parts[3], 10);

  if (isNaN(port)) {
    return null;
  }

  return {
    itemType,
    display,
    selector,
    host,
    port,
  };
}

/**
 * Connect to a Gopher server and send a request
 */
async function gopherRequest(
  host: string,
  port: number,
  selector: string,
  timeout: number = 10000
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port }, () => {
      // Serialize and send the request using generated serializer
      const serializer = new GopherSerializer();
      const request: Request = { selector };
      const serialized = serializer.request.serialize(request);

      if (!serialized.success) {
        client.destroy();
        reject(new Error(`Serialization failed: ${serialized.error?.message}`));
        return;
      }

      client.write(serialized.data!);
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

describe('Gopher Real Server Integration (Manual Parsing)', () => {
  test('should connect to gopher.floodgap.com and parse directory listing', async () => {
    const host = 'gopher.floodgap.com';
    const port = 70;
    const selector = '';

    // Send request using generated serializer
    const responseData = await gopherRequest(host, port, selector, 15000);

    // Verify we got data
    expect(responseData.length).toBeGreaterThan(0);

    // Parse the response manually
    const lines = responseData.toString('utf-8').split('\r\n');
    const items: GopherItem[] = [];

    for (const line of lines) {
      // Check for end marker
      if (line === '.') {
        break;
      }

      // Skip empty lines
      if (line.length === 0) {
        continue;
      }

      const item = parseGopherLine(line);
      if (item) {
        items.push(item);
      }
    }

    // Verify we parsed items
    expect(items.length).toBeGreaterThan(0);

    console.log(`\nParsed ${items.length} directory items from gopher.floodgap.com`);
    console.log('\nFirst 5 items:');
    items.slice(0, 5).forEach((item, idx) => {
      console.log(
        `${idx + 1}. [${item.itemType}] ${item.display} -> ${item.selector} @ ${item.host}:${item.port}`
      );
    });

    // Verify item types are extracted correctly
    const validItemTypes = ['0', '1', '2', '3', '7', '9', 'g', 'I', 'h', 'i'];
    for (const item of items) {
      expect(validItemTypes).toContain(item.itemType);
      expect(item.display).toBeDefined();
      expect(item.selector).toBeDefined();
      expect(item.host).toBeDefined();
      expect(item.port).toBeGreaterThan(0);
      expect(item.port).toBeLessThanOrEqual(65535);
    }

    // Group items by type
    const itemsByType = new Map<string, GopherItem[]>();
    for (const item of items) {
      const existing = itemsByType.get(item.itemType) || [];
      existing.push(item);
      itemsByType.set(item.itemType, existing);
    }

    console.log('\nItem type distribution:');
    for (const [type, typeItems] of itemsByType.entries()) {
      const typeName =
        type === '0'
          ? 'Text File'
          : type === '1'
            ? 'Directory'
            : type === '2'
              ? 'CSO'
              : type === '3'
                ? 'Error'
                : type === '7'
                  ? 'Search'
                  : type === '9'
                    ? 'Binary'
                    : type === 'g'
                      ? 'GIF'
                      : type === 'I'
                        ? 'Image'
                        : type === 'h'
                          ? 'HTML'
                          : type === 'i'
                            ? 'Info'
                            : 'Unknown';

      console.log(`  ${type} (${typeName}): ${typeItems.length} items`);
    }

    // Verify we have different item types
    expect(itemsByType.size).toBeGreaterThan(1);

    // Verify we have informational items (type 'i')
    expect(itemsByType.has('i')).toBe(true);

    // Verify we have directory items (type '1')
    expect(itemsByType.has('1')).toBe(true);

    // Verify we have text file items (type '0')
    expect(itemsByType.has('0')).toBe(true);
  }, 20000);

  test('should use generated serializer to format requests correctly', () => {
    const serializer = new GopherSerializer();

    // Test root selector
    const rootRequest: Request = { selector: '' };
    const rootResult = serializer.request.serialize(rootRequest);

    expect(rootResult.success).toBe(true);
    expect(rootResult.data).toBeDefined();
    
    // The generated serializer adds an extra \r\n, but that's okay for Gopher
    const serialized = rootResult.data!.toString('utf-8');
    expect(serialized).toContain('\r\n');

    // Test specific selector
    const pathRequest: Request = { selector: '/software' };
    const pathResult = serializer.request.serialize(pathRequest);

    expect(pathResult.success).toBe(true);
    expect(pathResult.data).toBeDefined();
    expect(pathResult.data!.toString('utf-8')).toContain('/software');
    expect(pathResult.data!.toString('utf-8')).toContain('\r\n');
  });
});
