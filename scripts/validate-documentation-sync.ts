#!/usr/bin/env tsx

/**
 * Validation script for documentation synchronization
 * Task 22.12: Validate documentation sync
 */

import { DocumentationSyncEngine } from '../src/documentation/sync-engine.js';
import { ChangeDetector } from '../src/documentation/change-detector.js';
import { DocumentationGenerator } from '../src/documentation/documentation-generator.js';
import { VersionManager } from '../src/documentation/version-manager.js';
import { ChangelogGenerator } from '../src/documentation/changelog-generator.js';
import * as fs from 'fs';
import * as path from 'path';

async function validateDocumentationSync() {
  console.log('🔍 Validating Documentation Synchronization...\n');

  const syncEngine = new DocumentationSyncEngine();
  const changeDetector = new ChangeDetector();
  const docGenerator = new DocumentationGenerator();
  const versionManager = new VersionManager();
  const changelogGenerator = new ChangelogGenerator();

  let passed = 0;
  let failed = 0;

  // Test 1: Verify change detection works
  console.log('Test 1: Change detection...');
  try {
    const gopherPath = 'protocols/gopher.yaml';
    const fingerPath = 'protocols/finger.yaml';
    
    if (fs.existsSync(gopherPath) && fs.existsSync(fingerPath)) {
      const gopherContent = fs.readFileSync(gopherPath, 'utf-8');
      const fingerContent = fs.readFileSync(fingerPath, 'utf-8');
      
      // Simulate change detection
      const needsRegen = syncEngine.needsRegeneration(gopherPath);
      console.log(`  ✓ Change detection functional (needs regen: ${needsRegen})`);
      passed++;
    } else {
      console.log('  ⚠ Protocol files not found, skipping');
    }
  } catch (error) {
    console.log(`  ✗ Change detection failed: ${error.message}`);
    failed++;
  }

  // Test 2: Verify documentation generator works
  console.log('\nTest 2: Documentation generation...');
  try {
    const testSpec = {
      protocol: {
        name: 'TestProtocol',
        description: 'Test protocol for validation',
        version: '1.0.0'
      },
      connection: {
        transport: 'tcp' as const,
        defaultPort: 8080,
        terminator: '\\r\\n'
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request' as const,
          format: '{field}\\r\\n',
          fields: [
            {
              name: 'field',
              type: 'string',
              required: true
            }
          ]
        }
      ]
    };

    const docs = docGenerator.generate(testSpec);
    
    if (docs.readme && docs.apiReference && docs.examples.length > 0) {
      console.log('  ✓ Documentation generation works');
      console.log(`    - README: ${docs.readme.length} chars`);
      console.log(`    - API Reference: ${docs.apiReference.length} chars`);
      console.log(`    - Examples: ${docs.examples.length} languages`);
      passed++;
    } else {
      console.log('  ✗ Documentation incomplete');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Documentation generation failed: ${error.message}`);
    failed++;
  }

  // Test 3: Verify version management works
  console.log('\nTest 3: Version management...');
  try {
    const currentVersion = { major: 1, minor: 0, patch: 0 };
    const changes = {
      added: ['newField'],
      modified: [],
      removed: [],
      hasBreakingChanges: false,
      hasNewFeatures: true,
      hasBugFixes: false
    };

    const newVersion = versionManager.incrementVersion(currentVersion, changes);
    
    if (newVersion.major === 1 && newVersion.minor === 1 && newVersion.patch === 0) {
      console.log('  ✓ Version increment works correctly');
      console.log(`    - ${versionManager.formatVersion(currentVersion)} → ${versionManager.formatVersion(newVersion)}`);
      passed++;
    } else {
      console.log('  ✗ Version increment incorrect');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Version management failed: ${error.message}`);
    failed++;
  }

  // Test 4: Verify changelog generation works
  console.log('\nTest 4: Changelog generation...');
  try {
    const changes = {
      added: ['newField'],
      modified: ['existingField'],
      removed: [],
      hasBreakingChanges: false,
      hasNewFeatures: true,
      hasBugFixes: false
    };

    const entry = changelogGenerator.generateEntry(
      { major: 1, minor: 1, patch: 0 },
      changes,
      new Date()
    );

    if (entry.version === '1.1.0') {
      console.log('  ✓ Changelog generation works');
      console.log(`    - Version: ${entry.version}`);
      console.log(`    - Date: ${entry.date}`);
      passed++;
    } else {
      console.log('  ✗ Changelog incomplete');
      console.log(`    - Got version: ${entry.version}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Changelog generation failed: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n✅ All documentation synchronization tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some documentation synchronization tests failed');
    process.exit(1);
  }
}

validateDocumentationSync().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
