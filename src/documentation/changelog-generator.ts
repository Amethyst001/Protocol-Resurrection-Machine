import type { ChangeSet, SpecChange } from './change-detector.js';
import type { Version } from './version-manager.js';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    breaking: string[];
    added: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
    fixed: string[];
    security: string[];
  };
}

export class ChangelogGenerator {
  /**
   * Generate a changelog entry from a change set
   */
  generateEntry(
    version: Version | string,
    changeSet: ChangeSet,
    date?: Date
  ): ChangelogEntry {
    const versionString = typeof version === 'string' ? version : `${version.major}.${version.minor}.${version.patch}`;
    const dateString = date ? this.formatDate(date) : this.formatDate(new Date());

    const entry: ChangelogEntry = {
      version: versionString,
      date: dateString,
      changes: {
        breaking: [],
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: []
      }
    };

    // Categorize changes
    this.categorizeChanges(changeSet, entry);

    return entry;
  }

  /**
   * Format a changelog entry as markdown
   */
  formatEntry(entry: ChangelogEntry): string {
    const lines: string[] = [];

    lines.push(`## [${entry.version}] - ${entry.date}`);
    lines.push('');

    // Breaking changes (if any)
    if (entry.changes.breaking.length > 0) {
      lines.push('### ⚠️ BREAKING CHANGES');
      lines.push('');
      entry.changes.breaking.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Added features
    if (entry.changes.added.length > 0) {
      lines.push('### Added');
      lines.push('');
      entry.changes.added.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Changed features
    if (entry.changes.changed.length > 0) {
      lines.push('### Changed');
      lines.push('');
      entry.changes.changed.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Deprecated features
    if (entry.changes.deprecated.length > 0) {
      lines.push('### Deprecated');
      lines.push('');
      entry.changes.deprecated.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Removed features
    if (entry.changes.removed.length > 0) {
      lines.push('### Removed');
      lines.push('');
      entry.changes.removed.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Fixed bugs
    if (entry.changes.fixed.length > 0) {
      lines.push('### Fixed');
      lines.push('');
      entry.changes.fixed.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    // Security fixes
    if (entry.changes.security.length > 0) {
      lines.push('### Security');
      lines.push('');
      entry.changes.security.forEach(change => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate a complete changelog from multiple entries
   */
  generateChangelog(entries: ChangelogEntry[], title?: string): string {
    const lines: string[] = [];

    lines.push(`# ${title || 'Changelog'}`);
    lines.push('');
    lines.push('All notable changes to this project will be documented in this file.');
    lines.push('');
    lines.push('The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),');
    lines.push('and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).');
    lines.push('');

    // Sort entries by version (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
      return this.compareVersionStrings(b.version, a.version);
    });

    sortedEntries.forEach(entry => {
      lines.push(this.formatEntry(entry));
    });

    return lines.join('\n');
  }

  /**
   * Append a new entry to an existing changelog
   */
  appendToChangelog(existingChangelog: string, newEntry: ChangelogEntry): string {
    const lines = existingChangelog.split('\n');
    
    // Find where to insert the new entry (after the header)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## [')) {
        insertIndex = i;
        break;
      }
    }

    // If no existing entries, insert after the header
    if (insertIndex === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '' && i > 5) {
          insertIndex = i + 1;
          break;
        }
      }
    }

    // Insert the new entry
    const entryLines = this.formatEntry(newEntry).split('\n');
    lines.splice(insertIndex, 0, ...entryLines);

    return lines.join('\n');
  }

  /**
   * Categorize changes into changelog sections
   */
  private categorizeChanges(changeSet: ChangeSet, entry: ChangelogEntry): void {
    // Process all changes
    const allChanges = [
      ...changeSet.added,
      ...changeSet.modified,
      ...changeSet.removed
    ];

    allChanges.forEach(change => {
      const description = change.description;

      // Breaking changes
      if (this.isBreakingChange(change)) {
        entry.changes.breaking.push(description);
      }

      // Categorize by type
      if (change.type === 'added') {
        if (change.category === 'message_type') {
          entry.changes.added.push(description);
        } else if (change.category === 'field') {
          entry.changes.added.push(description);
        }
      } else if (change.type === 'removed') {
        if (change.category === 'message_type') {
          entry.changes.removed.push(description);
        } else if (change.category === 'field') {
          entry.changes.removed.push(description);
        }
      } else if (change.type === 'modified') {
        if (change.category === 'constraint') {
          // Constraint changes might be fixes
          if (this.isBugFix(change)) {
            entry.changes.fixed.push(description);
          } else {
            entry.changes.changed.push(description);
          }
        } else {
          entry.changes.changed.push(description);
        }
      }
    });

    // Remove duplicates from breaking changes (they're also in other categories)
    entry.changes.breaking = [...new Set(entry.changes.breaking)];
  }

  /**
   * Determine if a change is breaking
   */
  private isBreakingChange(change: SpecChange): boolean {
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
      if (change.path.includes('minLength') && change.newValue > change.oldValue) {
        return true;
      }
      if (change.path.includes('maxLength') && change.newValue < change.oldValue) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine if a change is a bug fix
   */
  private isBugFix(change: SpecChange): boolean {
    // Less restrictive constraints are bug fixes
    if (change.type === 'modified' && change.category === 'constraint') {
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
  }

  /**
   * Format a date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Compare two version strings
   */
  private compareVersionStrings(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] !== parts2[i]) {
        return parts1[i] - parts2[i];
      }
    }

    return 0;
  }

  /**
   * Parse an existing changelog to extract entries
   */
  parseChangelog(changelog: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = changelog.split('\n');

    let currentEntry: ChangelogEntry | null = null;
    let currentSection: keyof ChangelogEntry['changes'] | null = null;

    for (const line of lines) {
      // Check for version header
      const versionMatch = line.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/);
      if (versionMatch) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        currentEntry = {
          version: versionMatch[1],
          date: versionMatch[2],
          changes: {
            breaking: [],
            added: [],
            changed: [],
            deprecated: [],
            removed: [],
            fixed: [],
            security: []
          }
        };
        currentSection = null;
        continue;
      }

      // Check for section headers
      if (line.startsWith('### ')) {
        const section = line.substring(4).toLowerCase().replace('⚠️ ', '');
        if (section.includes('breaking')) {
          currentSection = 'breaking';
        } else if (section === 'added') {
          currentSection = 'added';
        } else if (section === 'changed') {
          currentSection = 'changed';
        } else if (section === 'deprecated') {
          currentSection = 'deprecated';
        } else if (section === 'removed') {
          currentSection = 'removed';
        } else if (section === 'fixed') {
          currentSection = 'fixed';
        } else if (section === 'security') {
          currentSection = 'security';
        }
        continue;
      }

      // Check for change items
      if (line.startsWith('- ') && currentEntry && currentSection) {
        const change = line.substring(2).trim();
        currentEntry.changes[currentSection].push(change);
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }

    return entries;
  }
}
