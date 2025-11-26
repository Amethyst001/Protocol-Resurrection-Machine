/**
 * Unit tests for Kiro Spec Generator
 */

import { describe, it, expect } from 'vitest';
import { KiroSpecGenerator } from '../../src/generation/kiro-spec-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('KiroSpecGenerator', () => {
  const generator = new KiroSpecGenerator();
  const parser = new YAMLParser();

  // Load and parse the Gopher protocol spec
  const gopherYaml = readFileSync(join(process.cwd(), 'protocols', 'gopher.yaml'), 'utf-8');
  const gopherSpec = parser.parse(gopherYaml);

  describe('generateRequirements', () => {
    it('should generate a requirements document with all required sections', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for main sections
      expect(requirements).toContain('# Requirements Document');
      expect(requirements).toContain('## Introduction');
      expect(requirements).toContain('## Glossary');
      expect(requirements).toContain('## Requirements');
    });

    it('should include protocol metadata in introduction', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      expect(requirements).toContain('Gopher');
      expect(requirements).toContain('RFC 1436');
      expect(requirements).toContain('hierarchical document retrieval');
    });

    it('should generate glossary terms', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for key glossary terms
      expect(requirements).toContain('**Gopher**');
      expect(requirements).toContain('**Gopher System**');
      expect(requirements).toContain('**Request Message**');
      expect(requirements).toContain('**DirectoryItem Message**');
      expect(requirements).toContain('**GopherItemType**');
      expect(requirements).toContain('**TCP Connection**');
    });

    it('should generate EARS-compliant acceptance criteria for parsing', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for EARS patterns (WHEN...THEN)
      expect(requirements).toMatch(/WHEN.*THEN.*SHALL/);
      
      // Check for parsing-specific criteria
      expect(requirements).toContain('parse');
      expect(requirements).toContain('extract');
      expect(requirements).toContain('selector');
      expect(requirements).toContain('itemType');
      expect(requirements).toContain('display');
    });

    it('should generate EARS-compliant acceptance criteria for serialization', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for serialization criteria
      expect(requirements).toContain('serialize');
      expect(requirements).toContain('format');
    });

    it('should generate EARS-compliant acceptance criteria for client operations', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for client criteria
      expect(requirements).toContain('connect');
      expect(requirements).toContain('TCP');
      expect(requirements).toContain('port 70');
    });

    it('should generate EARS-compliant acceptance criteria for error handling', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for error handling criteria
      expect(requirements).toContain('error');
      expect(requirements).toContain('malformed');
      expect(requirements).toContain('invalid');
    });

    it('should generate EARS-compliant acceptance criteria for round-trip correctness', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for round-trip criteria
      expect(requirements).toContain('round-trip');
      expect(requirements).toContain('equivalent');
    });

    it('should generate user stories for each requirement', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for user story format
      expect(requirements).toMatch(/\*\*User Story:\*\* As a/);
      expect(requirements).toContain('As a developer using the Gopher protocol');
      expect(requirements).toContain('As a user of the Gopher protocol');
    });

    it('should number requirements sequentially', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for sequential requirement numbers
      expect(requirements).toContain('### Requirement 1');
      expect(requirements).toContain('### Requirement 2');
      expect(requirements).toContain('### Requirement 3');
      expect(requirements).toContain('### Requirement 4');
      expect(requirements).toContain('### Requirement 5');
    });

    it('should number acceptance criteria within each requirement', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check for numbered acceptance criteria
      const criteriaPattern = /\d+\. (WHEN|WHILE|IF|WHERE).*THEN.*SHALL/g;
      const matches = requirements.match(criteriaPattern);
      
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(0);
    });

    it('should handle protocols with delimiters', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Gopher has tab delimiters
      expect(requirements).toContain('delimiter');
    });

    it('should handle protocols with terminators', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Gopher has CRLF terminators
      expect(requirements).toContain('terminator');
    });

    it('should reference the system name consistently', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check that "Gopher System" is used consistently
      const systemNamePattern = /Gopher System/g;
      const matches = requirements.match(systemNamePattern);
      
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(5); // Should appear multiple times
    });

    it('should follow EARS syntax (no escape clauses or vague terms)', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // Check that we don't have escape clauses
      expect(requirements).not.toContain('where possible');
      expect(requirements).not.toContain('if possible');
      expect(requirements).not.toContain('as appropriate');
      
      // Check that we don't have vague terms
      expect(requirements).not.toContain('quickly');
      expect(requirements).not.toContain('adequate');
      expect(requirements).not.toContain('reasonable');
    });

    it('should use active voice with SHALL', () => {
      const requirements = generator.generateRequirements(gopherSpec);

      // All acceptance criteria should use SHALL
      const criteriaLines = requirements.split('\n').filter(line => 
        line.match(/^\d+\. (WHEN|WHILE|IF|WHERE)/)
      );
      
      for (const line of criteriaLines) {
        expect(line).toContain('SHALL');
      }
    });
  });

  describe('generateDesign', () => {
    it('should generate a design document with all required sections', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for main sections
      expect(design).toContain('# Design Document');
      expect(design).toContain('## Overview');
      expect(design).toContain('## Architecture');
      expect(design).toContain('## Components and Interfaces');
      expect(design).toContain('## Data Models');
      expect(design).toContain('## Correctness Properties');
      expect(design).toContain('## Error Handling');
      expect(design).toContain('## Testing Strategy');
    });

    it('should include protocol metadata in overview', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Gopher');
      expect(design).toContain('RFC 1436');
      expect(design).toContain('hierarchical document retrieval');
    });

    it('should generate component interfaces', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for component interfaces
      expect(design).toContain('GopherParser');
      expect(design).toContain('GopherSerializer');
      expect(design).toContain('GopherClient');
      expect(design).toContain('GopherConverter');
    });

    it('should document message types in data models', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for message types
      expect(design).toContain('Request Message');
      expect(design).toContain('DirectoryItem Message');
      expect(design).toContain('selector');
      expect(design).toContain('itemType');
      expect(design).toContain('display');
    });

    it('should generate TypeScript interfaces for message types', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for TypeScript interfaces
      expect(design).toContain('interface RequestMessage');
      expect(design).toContain('interface DirectoryItemMessage');
    });

    it('should document custom types', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for enum documentation
      expect(design).toContain('GopherItemType');
      expect(design).toContain('enum');
    });

    it('should generate round-trip correctness properties', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check for round-trip properties
      expect(design).toContain('Round-Trip Correctness');
      expect(design).toContain('parse(serialize(message)) == message');
    });

    it('should generate parser error reporting property', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Parser Error Reporting');
      expect(design).toContain('byte offset');
    });

    it('should generate serializer validation property', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Serializer Validation');
      expect(design).toContain('invalid field');
    });

    it('should generate client integration properties', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Client Serializer Integration');
      expect(design).toContain('Client Parser Integration');
    });

    it('should generate JSON conversion property', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('JSON Conversion Round-Trip');
      expect(design).toContain('fromJSON(toJSON(message)) == message');
    });

    it('should format properties with "For any" quantification', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check that properties use "For any" quantification
      const propertyPattern = /\*For any\*/g;
      const matches = design.match(propertyPattern);
      
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(5); // Should have multiple properties
    });

    it('should link properties to requirements', () => {
      const design = generator.generateDesign(gopherSpec);

      // Check that properties reference requirements
      expect(design).toMatch(/\*\*Validates: Requirements \d+/);
    });

    it('should document connection type in architecture', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('TCP');
      expect(design).toContain('port 70');
    });

    it('should include error handling strategies', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Parse Errors');
      expect(design).toContain('Serialization Errors');
      expect(design).toContain('Network Errors');
      expect(design).toContain('Validation Errors');
    });

    it('should document testing strategy with fast-check', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('fast-check');
      expect(design).toContain('Property-Based Testing');
      expect(design).toContain('100 iterations');
    });

    it('should include extension points', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Extension Points');
      expect(design).toContain('preSendHook');
      expect(design).toContain('postReceiveHook');
    });

    it('should handle protocols with delimiters', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Delimiter Handling');
    });

    it('should handle protocols with terminators', () => {
      const design = generator.generateDesign(gopherSpec);

      expect(design).toContain('Terminator Handling');
    });
  });

  describe('generateTasks', () => {
    it('should generate a tasks document with all required sections', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('# Implementation Plan');
    });

    it('should generate numbered checkbox list', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Check for numbered tasks with checkboxes
      expect(tasks).toMatch(/- \[ \] \d+\./);
    });

    it('should support two-level hierarchy with sub-tasks', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Check for main tasks
      expect(tasks).toMatch(/- \[ \] \d+\. /);
      
      // Check for sub-tasks with decimal notation
      expect(tasks).toMatch(/- \[ \] \d+\.\d+ /);
    });

    it('should include requirement references', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Check for requirement references
      expect(tasks).toMatch(/_Requirements: \d+/);
    });

    it('should support optional task marking with *', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Check for optional tasks marked with *
      expect(tasks).toMatch(/- \[ \]\* \d+\.\d+ /);
    });

    it('should generate tasks for parser implementation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement Gopher message parser');
      expect(tasks).toContain('parse() method');
    });

    it('should generate tasks for each message type parsing', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Gopher has Request and DirectoryItem message types
      expect(tasks).toContain('Request message parsing');
      expect(tasks).toContain('DirectoryItem message parsing');
    });

    it('should generate tasks for serializer implementation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement Gopher message serializer');
      expect(tasks).toContain('serialize() method');
    });

    it('should generate tasks for each message type serialization', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Request message serialization');
      expect(tasks).toContain('DirectoryItem message serialization');
    });

    it('should generate tasks for client implementation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement Gopher network client');
      expect(tasks).toContain('connection management');
      expect(tasks).toContain('TCP');
    });

    it('should generate tasks for JSON converter implementation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement JSON converter');
      expect(tasks).toContain('toJSON()');
      expect(tasks).toContain('fromJSON()');
    });

    it('should generate tasks for test generation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement test data generators');
      expect(tasks).toContain('fast-check arbitraries');
    });

    it('should generate tasks for UI generation', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Implement CLI user interface');
      expect(tasks).toContain('input prompts');
    });

    it('should order tasks incrementally', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Extract task numbers in order
      const taskMatches = tasks.match(/- \[ \] (\d+)\. /g);
      expect(taskMatches).toBeTruthy();
      
      // Verify sequential numbering
      const taskNumbers = taskMatches!.map(m => parseInt(m.match(/\d+/)![0]));
      for (let i = 1; i < taskNumbers.length; i++) {
        expect(taskNumbers[i]).toBe(taskNumbers[i - 1] + 1);
      }
    });

    it('should add checkpoint tasks after major milestones', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Verify all tests pass');
    });

    it('should include property test tasks with property references', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('**Property:');
      expect(tasks).toContain('**Validates: Requirements');
    });

    it('should mark property tests as optional', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Property tests should be marked with *
      expect(tasks).toMatch(/- \[ \]\* \d+\.\d+ Write property test/);
    });

    it('should mark unit tests as optional', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Unit tests should be marked with *
      expect(tasks).toMatch(/- \[ \]\* \d+\.\d+ Write unit tests/);
    });

    it('should include protocol-specific details in tasks', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Check for Gopher-specific details
      expect(tasks).toContain('Gopher');
      expect(tasks).toContain('selector');
      expect(tasks).toContain('itemType');
    });

    it('should handle protocols with handshakes', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Gopher doesn't have a handshake, but check the structure is there
      // If it did, it would contain handshake tasks
      expect(tasks).toBeTruthy();
    });

    it('should handle protocols with terminators', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Gopher has CRLF terminators
      expect(tasks).toContain('terminator');
    });

    it('should handle protocols with delimiters', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Gopher has tab delimiters
      expect(tasks).toContain('delimiter');
    });

    it('should generate arbitraries for each message type', () => {
      const tasks = generator.generateTasks(gopherSpec);

      // Should have arbitraries for Request and DirectoryItem
      expect(tasks).toContain('arbitrary for Request messages');
      expect(tasks).toContain('arbitrary for DirectoryItem messages');
    });

    it('should include integration and documentation tasks', () => {
      const tasks = generator.generateTasks(gopherSpec);

      expect(tasks).toContain('Integration and documentation');
      expect(tasks).toContain('README');
      expect(tasks).toContain('end-to-end integration tests');
    });
  });

  describe('generateAll', () => {
    it('should generate all three spec documents', () => {
      const specs = generator.generateAll(gopherSpec);

      expect(specs).toHaveProperty('requirements');
      expect(specs).toHaveProperty('design');
      expect(specs).toHaveProperty('tasks');
      
      expect(specs.requirements).toContain('# Requirements Document');
      expect(specs.design).toContain('# Design Document');
      expect(specs.tasks).toContain('# Implementation Plan');
    });

    it('should generate a complete tasks document', () => {
      const specs = generator.generateAll(gopherSpec);

      // Verify tasks document is complete and not a placeholder
      expect(specs.tasks).not.toContain('(To be implemented)');
      expect(specs.tasks).toContain('Implement Gopher message parser');
      expect(specs.tasks).toContain('Implement Gopher message serializer');
      expect(specs.tasks).toContain('Implement Gopher network client');
    });
  });
});
