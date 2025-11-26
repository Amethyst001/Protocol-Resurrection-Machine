/**
 * Property-Based Tests for Documentation Version Increment
 * 
 * Feature: protocol-resurrection-machine, Property 27: Documentation Version Increment
 * Validates: Requirements 21.2, 21.3
 * 
 * Tests that version numbers increment correctly based on change type:
 * - Breaking changes increment major version
 * - Non-breaking changes increment minor version
 * - Bug fixes increment patch version
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { VersionManager } from '../../src/documentation/version-manager';
import type { ChangeSet } from '../../src/documentation/change-detector';

describe('Property 27: Documentation Version Increment', () => {
  const versionManager = new VersionManager();

  /**
   * Property: Breaking changes increment major version
   */
  it('should increment major version for breaking changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          major: fc.integer({ min: 0, max: 10 }),
          minor: fc.integer({ min: 0, max: 20 }),
          patch: fc.integer({ min: 0, max: 50 })
        }),
        (currentVersion) => {
          // Create change set with breaking changes
          const changes: ChangeSet = {
            added: [],
            modified: [],
            removed: ['someField'],
            hasBreakingChanges: true,
            hasNewFeatures: false,
            hasBugFixes: false
          };

          const newVersion = versionManager.incrementVersion(currentVersion, changes);

          // Major version should increment, minor and patch reset to 0
          expect(newVersion.major).toBe(currentVersion.major + 1);
          expect(newVersion.minor).toBe(0);
          expect(newVersion.patch).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-breaking changes increment minor version
   */
  it('should increment minor version for non-breaking changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          major: fc.integer({ min: 0, max: 10 }),
          minor: fc.integer({ min: 0, max: 20 }),
          patch: fc.integer({ min: 0, max: 50 })
        }),
        (currentVersion) => {
          // Create change set with new features
          const changes: ChangeSet = {
            added: ['newField'],
            modified: [],
            removed: [],
            hasBreakingChanges: false,
            hasNewFeatures: true,
            hasBugFixes: false
          };

          const newVersion = versionManager.incrementVersion(currentVersion, changes);

          // Minor version should increment, patch reset to 0
          expect(newVersion.major).toBe(currentVersion.major);
          expect(newVersion.minor).toBe(currentVersion.minor + 1);
          expect(newVersion.patch).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: No changes keep version the same
   */
  it('should not increment version when no changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          major: fc.integer({ min: 0, max: 10 }),
          minor: fc.integer({ min: 0, max: 20 }),
          patch: fc.integer({ min: 0, max: 50 })
        }),
        (currentVersion) => {
          // Create change set with no changes
          const changes: ChangeSet = {
            added: [],
            modified: [],
            removed: [],
            hasBreakingChanges: false,
            hasNewFeatures: false,
            hasBugFixes: false
          };

          const newVersion = versionManager.incrementVersion(currentVersion, changes);

          // Version should not change
          expect(newVersion.major).toBe(currentVersion.major);
          expect(newVersion.minor).toBe(currentVersion.minor);
          expect(newVersion.patch).toBe(currentVersion.patch);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
