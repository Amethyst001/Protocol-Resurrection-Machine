import { test, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentationSyncEngine } from '../../src/documentation/sync-engine.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Feature: prm-phase-2, Property 25: Documentation Regeneration Trigger
 * For any protocol spec modification, documentation regenerates within 1 second
 * Validates: Requirements 19.1
 */

// Simple protocol spec arbitrary
const simpleProtocolSpecArb = fc.record({
  protocol: fc.record({
    name: fc.constantFrom('Gopher', 'Finger', 'Echo', 'Daytime', 'Quote'),
    port: fc.integer({ min: 1024, max: 65535 }),
    description: fc.constant('Test protocol')
  }),
  connection: fc.record({
    type: fc.constant('TCP' as const)
  }),
  messageTypes: fc.array(
    fc.record({
      name: fc.constantFrom('Request', 'Response', 'Query', 'Reply'),
      direction: fc.constantFrom('request', 'response'),
      format: fc.constant('structured'),
      fields: fc.array(
        fc.record({
          name: fc.constantFrom('data', 'message', 'content', 'value'),
          type: fc.constantFrom('string', 'number'),
          required: fc.boolean()
        }),
        { minLength: 1, maxLength: 3 }
      )
    }),
    { minLength: 1, maxLength: 2 }
  )
});

test('Property 25: Documentation regenerates within 1 second when spec changes', async () => {
  await fc.assert(
    fc.asyncProperty(
      simpleProtocolSpecArb,
      simpleProtocolSpecArb,
      async (spec1, spec2) => {
        // Ensure specs are different
        fc.pre(JSON.stringify(spec1) !== JSON.stringify(spec2));

        const syncEngine = new DocumentationSyncEngine();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-regen-test-'));

        try {
          // Initial generation
          await syncEngine.sync(spec1, null, { outputDir: tempDir });

          // Measure regeneration time
          const startTime = Date.now();
          const result = await syncEngine.sync(spec2, spec1, {
            outputDir: tempDir,
            currentVersion: '1.0.0'
          });
          const duration = Date.now() - startTime;

          // Verify regeneration completed successfully
          expect(result.success).toBe(true);
          
          // Verify regeneration completed within 1 second
          expect(duration).toBeLessThan(1000);

          // Verify changes were detected (at least one type of change should exist)
          const totalChanges = result.changes.added.length +
                             result.changes.modified.length +
                             result.changes.removed.length;
          expect(totalChanges).toBeGreaterThan(0);

        } finally {
          // Cleanup
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        }
      }
    ),
    { numRuns: 20, timeout: 30000 }
  );
});

test('Property 25: Documentation detects when regeneration is needed', async () => {
  const syncEngine = new DocumentationSyncEngine();

  // Test with concrete examples
  const spec1: ProtocolSpec = {
    protocol: {
      name: 'Gopher',
      port: 70,
      description: 'Test protocol'
    },
    connection: {
      type: 'TCP'
    },
    messageTypes: [{
      name: 'Request',
      direction: 'request',
      format: 'structured',
      fields: [{
        name: 'data',
        type: 'string',
        required: false
      }]
    }]
  };

  // Identical specs should not need regeneration
  expect(syncEngine.needsRegeneration(spec1, spec1)).toBe(false);

  // Modified spec should need regeneration
  const spec2: ProtocolSpec = {
    ...spec1,
    protocol: {
      ...spec1.protocol,
      name: 'GopherModified'
    }
  };
  expect(syncEngine.needsRegeneration(spec2, spec1)).toBe(true);

  // Null old spec should need regeneration
  expect(syncEngine.needsRegeneration(spec1, null)).toBe(true);
});
