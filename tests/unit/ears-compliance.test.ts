/**
 * Unit tests for EARS compliance in generated requirements
 * Verifies that all generated acceptance criteria follow EARS patterns
 */

import { describe, it, expect } from 'vitest';
import { KiroSpecGenerator } from '../../src/generation/kiro-spec-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('EARS Compliance', () => {
  const generator = new KiroSpecGenerator();
  const parser = new YAMLParser();

  // Load Gopher protocol spec for testing
  const gopherYaml = readFileSync(join(process.cwd(), 'protocols', 'gopher.yaml'), 'utf-8');
  const gopherSpec = parser.parse(gopherYaml);

  describe('EARS Pattern Compliance', () => {
    it('should generate acceptance criteria with WHEN...THEN pattern', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract all acceptance criteria (numbered lines starting with digits)
      const criteriaPattern = /^\d+\. (WHEN|WHILE|IF|WHERE).*THEN.*SHALL/gm;
      const matches = requirements.match(criteriaPattern);

      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(0);

      // Verify each criterion has proper structure
      for (const criterion of matches!) {
        expect(criterion).toMatch(/^\d+\. (WHEN|WHILE|IF|WHERE)/);
        expect(criterion).toContain('THEN');
        expect(criterion).toContain('SHALL');
      }
    });

    it('should use WHEN for event-driven requirements', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Most protocol requirements should be event-driven (WHEN)
      const whenPattern = /^\d+\. WHEN.*THEN.*SHALL/gm;
      const whenMatches = requirements.match(whenPattern);

      expect(whenMatches).toBeTruthy();
      expect(whenMatches!.length).toBeGreaterThan(5);
    });

    it('should use SHALL for all requirements (not SHOULD or MAY)', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract all acceptance criteria
      const criteriaLines = requirements.split('\n').filter(line =>
        /^\d+\. (WHEN|WHILE|IF|WHERE)/.test(line)
      );

      for (const line of criteriaLines) {
        expect(line).toContain('SHALL');
        expect(line).not.toContain('SHOULD');
        expect(line).not.toContain('MAY');
        expect(line).not.toContain('MIGHT');
      }
    });

    it('should avoid escape clauses', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for common escape clauses
      const escapeClausePatterns = [
        /where possible/i,
        /if possible/i,
        /as appropriate/i,
        /when necessary/i,
        /if needed/i,
        /as needed/i,
      ];

      for (const pattern of escapeClausePatterns) {
        expect(requirements).not.toMatch(pattern);
      }
    });

    it('should avoid vague terms', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract acceptance criteria only (not descriptions)
      const criteriaLines = requirements.split('\n').filter(line =>
        /^\d+\. (WHEN|WHILE|IF|WHERE)/.test(line)
      );

      const criteriaText = criteriaLines.join(' ');

      // Check for vague terms
      const vagueTerms = [
        /\bquickly\b/i,
        /\badequate\b/i,
        /\breasonable\b/i,
        /\bappropriate\b/i,
        /\bsuitable\b/i,
        /\bsufficient\b/i,
      ];

      for (const pattern of vagueTerms) {
        expect(criteriaText).not.toMatch(pattern);
      }
    });

    it('should use active voice with system as subject', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract acceptance criteria
      const criteriaLines = requirements.split('\n').filter(line =>
        /^\d+\. (WHEN|WHILE|IF|WHERE)/.test(line)
      );

      // Each criterion should mention the system name
      const systemName = 'Gopher System';
      for (const line of criteriaLines) {
        expect(line).toContain(systemName);
      }
    });

    it('should have complete WHEN...THEN structure', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract all acceptance criteria
      const criteriaPattern = /^\d+\. (WHEN|WHILE|IF|WHERE)([^]*?)THEN([^]*?)$/gm;
      const matches = [...requirements.matchAll(criteriaPattern)];

      expect(matches.length).toBeGreaterThan(0);

      for (const match of matches) {
        const condition = match[2]; // Text between WHEN and THEN
        const action = match[3]; // Text after THEN

        // Condition should not be empty
        expect(condition.trim().length).toBeGreaterThan(0);

        // Action should not be empty and should contain SHALL
        expect(action.trim().length).toBeGreaterThan(0);
        expect(action).toContain('SHALL');
      }
    });

    it('should be specific and measurable', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract acceptance criteria
      const criteriaLines = requirements.split('\n').filter(line =>
        /^\d+\. (WHEN|WHILE|IF|WHERE)/.test(line)
      );

      // Each criterion should be reasonably specific (not too short)
      for (const line of criteriaLines) {
        // Remove the number prefix
        const content = line.replace(/^\d+\. /, '');
        expect(content.length).toBeGreaterThan(30); // Minimum length for specificity
      }
    });

    it('should reference specific protocol elements', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Should reference specific message types
      expect(requirements).toContain('Request');
      expect(requirements).toContain('DirectoryItem');

      // Should reference specific fields
      expect(requirements).toContain('selector');
      expect(requirements).toContain('itemType');
      expect(requirements).toContain('display');
    });

    it('should have numbered acceptance criteria within each requirement', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Find all requirement sections
      const requirementSections = requirements.split(/### Requirement \d+/);

      for (let i = 1; i < requirementSections.length; i++) {
        const section = requirementSections[i];

        // Should have "Acceptance Criteria" heading
        expect(section).toContain('#### Acceptance Criteria');

        // Should have numbered criteria (1., 2., 3., etc.)
        const numberedCriteria = section.match(/^\d+\. /gm);
        expect(numberedCriteria).toBeTruthy();
        expect(numberedCriteria!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('EARS Pattern Variations', () => {
    it('should support WHILE...THEN for state-based requirements', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // WHILE is used for state-based requirements (optional but valid)
      // If present, should follow EARS pattern
      const whilePattern = /WHILE.*THEN.*SHALL/;
      const hasWhile = whilePattern.test(requirements);

      if (hasWhile) {
        const whileMatches = requirements.match(/^\d+\. WHILE.*THEN.*SHALL/gm);
        expect(whileMatches).toBeTruthy();
      }
    });

    it('should support IF...THEN for conditional requirements', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // IF is used for conditional requirements (optional but valid)
      // If present, should follow EARS pattern
      const ifPattern = /IF.*THEN.*SHALL/;
      const hasIf = ifPattern.test(requirements);

      if (hasIf) {
        const ifMatches = requirements.match(/^\d+\. IF.*THEN.*SHALL/gm);
        expect(ifMatches).toBeTruthy();
      }
    });

    it('should support WHERE...THEN for optional features', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // WHERE is used for optional features (optional but valid)
      // If present, should follow EARS pattern
      const wherePattern = /WHERE.*THEN.*SHALL/;
      const hasWhere = wherePattern.test(requirements);

      if (hasWhere) {
        const whereMatches = requirements.match(/^\d+\. WHERE.*THEN.*SHALL/gm);
        expect(whereMatches).toBeTruthy();
      }
    });
  });

  describe('Requirement Structure', () => {
    it('should have user stories for each requirement', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Find all requirement sections
      const userStoryPattern = /\*\*User Story:\*\* As a/g;
      const userStories = requirements.match(userStoryPattern);

      expect(userStories).toBeTruthy();
      expect(userStories!.length).toBeGreaterThan(0);
    });

    it('should follow user story format: As a...I want...so that...', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Extract user stories
      const userStoryPattern = /\*\*User Story:\*\* (As a[^]*?)(?=\n\n|####)/g;
      const userStories = [...requirements.matchAll(userStoryPattern)];

      expect(userStories.length).toBeGreaterThan(0);

      for (const match of userStories) {
        const story = match[1];
        expect(story).toContain('As a');
        expect(story).toContain('I want');
        expect(story).toContain('so that');
      }
    });

    it('should have acceptance criteria section for each requirement', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Count requirements
      const requirementCount = (requirements.match(/### Requirement \d+/g) || []).length;

      // Count acceptance criteria sections
      const criteriaCount = (requirements.match(/#### Acceptance Criteria/g) || []).length;

      // Should have equal counts
      expect(criteriaCount).toBe(requirementCount);
    });
  });
});
