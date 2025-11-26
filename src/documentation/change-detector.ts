import type { ProtocolSpec, MessageType, Field } from '../types/protocol-spec.js';
import * as crypto from 'crypto';

export interface SpecChange {
  type: 'added' | 'modified' | 'removed';
  category: 'message_type' | 'field' | 'constraint' | 'protocol_metadata';
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface ChangeSet {
  added: SpecChange[];
  modified: SpecChange[];
  removed: SpecChange[];
  hasBreakingChanges: boolean;
  hasNewFeatures: boolean;
  hasBugFixes: boolean;
}

export class ChangeDetector {
  /**
   * Detect changes between two protocol specifications
   */
  detectChanges(oldSpec: ProtocolSpec, newSpec: ProtocolSpec): ChangeSet {
    const changes: SpecChange[] = [];

    // Detect protocol metadata changes
    changes.push(...this.detectProtocolMetadataChanges(oldSpec, newSpec));

    // Detect message type changes
    changes.push(...this.detectMessageTypeChanges(oldSpec, newSpec));

    // Detect field changes within message types
    changes.push(...this.detectFieldChanges(oldSpec, newSpec));

    // Detect constraint changes
    changes.push(...this.detectConstraintChanges(oldSpec, newSpec));

    // Categorize changes
    const added = changes.filter(c => c.type === 'added');
    const modified = changes.filter(c => c.type === 'modified');
    const removed = changes.filter(c => c.type === 'removed');

    // Determine change significance
    const hasBreakingChanges = this.hasBreakingChanges(changes);
    const hasNewFeatures = this.hasNewFeatures(changes);
    const hasBugFixes = this.hasBugFixes(changes);

    return {
      added,
      modified,
      removed,
      hasBreakingChanges,
      hasNewFeatures,
      hasBugFixes
    };
  }

  /**
   * Detect protocol metadata changes (name, version, description, etc.)
   */
  private detectProtocolMetadataChanges(
    oldSpec: ProtocolSpec,
    newSpec: ProtocolSpec
  ): SpecChange[] {
    const changes: SpecChange[] = [];

    // Check protocol name
    if (oldSpec.protocol.name !== newSpec.protocol.name) {
      changes.push({
        type: 'modified',
        category: 'protocol_metadata',
        path: 'protocol.name',
        oldValue: oldSpec.protocol.name,
        newValue: newSpec.protocol.name,
        description: `Protocol name changed from "${oldSpec.protocol.name}" to "${newSpec.protocol.name}"`
      });
    }

    // Check protocol description
    if (oldSpec.protocol.description !== newSpec.protocol.description) {
      changes.push({
        type: 'modified',
        category: 'protocol_metadata',
        path: 'protocol.description',
        oldValue: oldSpec.protocol.description,
        newValue: newSpec.protocol.description,
        description: 'Protocol description updated'
      });
    }

    // Check default port
    if (oldSpec.connection.defaultPort !== newSpec.connection.defaultPort) {
      changes.push({
        type: 'modified',
        category: 'protocol_metadata',
        path: 'connection.defaultPort',
        oldValue: oldSpec.connection.defaultPort,
        newValue: newSpec.connection.defaultPort,
        description: `Default port changed from ${oldSpec.connection.defaultPort} to ${newSpec.connection.defaultPort}`
      });
    }

    return changes;
  }

  /**
   * Detect message type changes (added, removed, modified)
   */
  private detectMessageTypeChanges(
    oldSpec: ProtocolSpec,
    newSpec: ProtocolSpec
  ): SpecChange[] {
    const changes: SpecChange[] = [];

    const oldMessageTypes = new Map(
      oldSpec.messageTypes.map(mt => [mt.name, mt])
    );
    const newMessageTypes = new Map(
      newSpec.messageTypes.map(mt => [mt.name, mt])
    );

    // Detect added message types
    for (const [name, messageType] of newMessageTypes) {
      if (!oldMessageTypes.has(name)) {
        changes.push({
          type: 'added',
          category: 'message_type',
          path: `messageTypes.${name}`,
          newValue: messageType,
          description: `Added message type "${name}"`
        });
      }
    }

    // Detect removed message types
    for (const [name, messageType] of oldMessageTypes) {
      if (!newMessageTypes.has(name)) {
        changes.push({
          type: 'removed',
          category: 'message_type',
          path: `messageTypes.${name}`,
          oldValue: messageType,
          description: `Removed message type "${name}"`
        });
      }
    }

    // Detect modified message types
    for (const [name, oldMessageType] of oldMessageTypes) {
      const newMessageType = newMessageTypes.get(name);
      if (newMessageType) {
        // Check if format changed
        if (oldMessageType.format !== newMessageType.format) {
          changes.push({
            type: 'modified',
            category: 'message_type',
            path: `messageTypes.${name}.format`,
            oldValue: oldMessageType.format,
            newValue: newMessageType.format,
            description: `Message type "${name}" format changed`
          });
        }

        // Check if direction changed
        if (oldMessageType.direction !== newMessageType.direction) {
          changes.push({
            type: 'modified',
            category: 'message_type',
            path: `messageTypes.${name}.direction`,
            oldValue: oldMessageType.direction,
            newValue: newMessageType.direction,
            description: `Message type "${name}" direction changed from "${oldMessageType.direction}" to "${newMessageType.direction}"`
          });
        }
      }
    }

    return changes;
  }

  /**
   * Detect field changes within message types
   */
  private detectFieldChanges(
    oldSpec: ProtocolSpec,
    newSpec: ProtocolSpec
  ): SpecChange[] {
    const changes: SpecChange[] = [];

    const oldMessageTypes = new Map(
      oldSpec.messageTypes.map(mt => [mt.name, mt])
    );
    const newMessageTypes = new Map(
      newSpec.messageTypes.map(mt => [mt.name, mt])
    );

    // Only check message types that exist in both specs
    for (const [messageName, oldMessageType] of oldMessageTypes) {
      const newMessageType = newMessageTypes.get(messageName);
      if (!newMessageType) continue;

      const oldFields = new Map(
        oldMessageType.fields.map(f => [f.name, f])
      );
      const newFields = new Map(
        newMessageType.fields.map(f => [f.name, f])
      );

      // Detect added fields
      for (const [fieldName, field] of newFields) {
        if (!oldFields.has(fieldName)) {
          changes.push({
            type: 'added',
            category: 'field',
            path: `messageTypes.${messageName}.fields.${fieldName}`,
            newValue: field,
            description: `Added field "${fieldName}" to message type "${messageName}"`
          });
        }
      }

      // Detect removed fields
      for (const [fieldName, field] of oldFields) {
        if (!newFields.has(fieldName)) {
          changes.push({
            type: 'removed',
            category: 'field',
            path: `messageTypes.${messageName}.fields.${fieldName}`,
            oldValue: field,
            description: `Removed field "${fieldName}" from message type "${messageName}"`
          });
        }
      }

      // Detect modified fields
      for (const [fieldName, oldField] of oldFields) {
        const newField = newFields.get(fieldName);
        if (newField) {
          // Check if type changed
          if (oldField.type !== newField.type) {
            changes.push({
              type: 'modified',
              category: 'field',
              path: `messageTypes.${messageName}.fields.${fieldName}.type`,
              oldValue: oldField.type,
              newValue: newField.type,
              description: `Field "${fieldName}" in message type "${messageName}" type changed from "${oldField.type}" to "${newField.type}"`
            });
          }

          // Check if required status changed
          if (oldField.required !== newField.required) {
            changes.push({
              type: 'modified',
              category: 'field',
              path: `messageTypes.${messageName}.fields.${fieldName}.required`,
              oldValue: oldField.required,
              newValue: newField.required,
              description: `Field "${fieldName}" in message type "${messageName}" required status changed from ${oldField.required} to ${newField.required}`
            });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Detect constraint changes on fields
   */
  private detectConstraintChanges(
    oldSpec: ProtocolSpec,
    newSpec: ProtocolSpec
  ): SpecChange[] {
    const changes: SpecChange[] = [];

    const oldMessageTypes = new Map(
      oldSpec.messageTypes.map(mt => [mt.name, mt])
    );
    const newMessageTypes = new Map(
      newSpec.messageTypes.map(mt => [mt.name, mt])
    );

    // Only check message types that exist in both specs
    for (const [messageName, oldMessageType] of oldMessageTypes) {
      const newMessageType = newMessageTypes.get(messageName);
      if (!newMessageType) continue;

      const oldFields = new Map(
        oldMessageType.fields.map(f => [f.name, f])
      );
      const newFields = new Map(
        newMessageType.fields.map(f => [f.name, f])
      );

      // Only check fields that exist in both message types
      for (const [fieldName, oldField] of oldFields) {
        const newField = newFields.get(fieldName);
        if (!newField) continue;

        // Check validation constraints
        const oldValidation = oldField.validation || {};
        const newValidation = newField.validation || {};

        // Check minLength
        if (oldValidation.minLength !== newValidation.minLength) {
          changes.push({
            type: 'modified',
            category: 'constraint',
            path: `messageTypes.${messageName}.fields.${fieldName}.validation.minLength`,
            oldValue: oldValidation.minLength,
            newValue: newValidation.minLength,
            description: `Field "${fieldName}" minLength constraint changed from ${oldValidation.minLength} to ${newValidation.minLength}`
          });
        }

        // Check maxLength
        if (oldValidation.maxLength !== newValidation.maxLength) {
          changes.push({
            type: 'modified',
            category: 'constraint',
            path: `messageTypes.${messageName}.fields.${fieldName}.validation.maxLength`,
            oldValue: oldValidation.maxLength,
            newValue: newValidation.maxLength,
            description: `Field "${fieldName}" maxLength constraint changed from ${oldValidation.maxLength} to ${newValidation.maxLength}`
          });
        }

        // Check pattern
        if (oldValidation.pattern !== newValidation.pattern) {
          changes.push({
            type: 'modified',
            category: 'constraint',
            path: `messageTypes.${messageName}.fields.${fieldName}.validation.pattern`,
            oldValue: oldValidation.pattern,
            newValue: newValidation.pattern,
            description: `Field "${fieldName}" pattern constraint changed`
          });
        }

        // Check enum values
        const oldEnum = JSON.stringify(oldValidation.enum || []);
        const newEnum = JSON.stringify(newValidation.enum || []);
        if (oldEnum !== newEnum) {
          changes.push({
            type: 'modified',
            category: 'constraint',
            path: `messageTypes.${messageName}.fields.${fieldName}.validation.enum`,
            oldValue: oldValidation.enum,
            newValue: newValidation.enum,
            description: `Field "${fieldName}" enum constraint changed`
          });
        }
      }
    }

    return changes;
  }

  /**
   * Determine if changes include breaking changes
   */
  private hasBreakingChanges(changes: SpecChange[]): boolean {
    return changes.some(change => {
      // Removed message types are breaking
      if (change.type === 'removed' && change.category === 'message_type') {
        return true;
      }

      // Removed required fields are breaking
      if (change.type === 'removed' && change.category === 'field') {
        return true;
      }

      // Field type changes are breaking
      if (
        change.type === 'modified' &&
        change.category === 'field' &&
        change.path.endsWith('.type')
      ) {
        return true;
      }

      // Making a field required is breaking
      if (
        change.type === 'modified' &&
        change.category === 'field' &&
        change.path.endsWith('.required') &&
        change.newValue === true
      ) {
        return true;
      }

      // More restrictive constraints are breaking
      if (change.type === 'modified' && change.category === 'constraint') {
        // Check if constraint became more restrictive
        if (change.path.includes('minLength') && change.newValue > change.oldValue) {
          return true;
        }
        if (change.path.includes('maxLength') && change.newValue < change.oldValue) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Determine if changes include new features
   */
  private hasNewFeatures(changes: SpecChange[]): boolean {
    return changes.some(change => {
      // Added message types are new features
      if (change.type === 'added' && change.category === 'message_type') {
        return true;
      }

      // Added optional fields are new features
      if (change.type === 'added' && change.category === 'field') {
        return true;
      }

      return false;
    });
  }

  /**
   * Determine if changes are bug fixes
   */
  private hasBugFixes(changes: SpecChange[]): boolean {
    // Bug fixes are typically constraint modifications that don't break compatibility
    return changes.some(change => {
      if (change.type === 'modified' && change.category === 'constraint') {
        // Less restrictive constraints are bug fixes
        if (change.path.includes('minLength') && change.newValue < change.oldValue) {
          return true;
        }
        if (change.path.includes('maxLength') && change.newValue > change.oldValue) {
          return true;
        }
      }

      // Description updates might be bug fixes
      if (
        change.type === 'modified' &&
        change.category === 'protocol_metadata' &&
        change.path.includes('description')
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Compute hash of a protocol specification for change detection
   */
  computeSpecHash(spec: ProtocolSpec): string {
    const normalized = JSON.stringify(spec, Object.keys(spec).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Check if two specs are identical
   */
  areSpecsIdentical(spec1: ProtocolSpec, spec2: ProtocolSpec): boolean {
    return this.computeSpecHash(spec1) === this.computeSpecHash(spec2);
  }
}
