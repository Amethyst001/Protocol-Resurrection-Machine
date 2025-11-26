import type { ChangeSet } from './change-detector.js';

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export class VersionManager {
  /**
   * Parse a semantic version string
   */
  parseVersion(versionString: string): Version {
    const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      throw new Error(`Invalid version string: ${versionString}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }

  /**
   * Format a version object as a string
   */
  formatVersion(version: Version): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  /**
   * Increment version based on change set
   */
  incrementVersion(currentVersion: Version, changes: ChangeSet): Version {
    const newVersion = { ...currentVersion };

    if (changes.hasBreakingChanges) {
      // Breaking changes -> increment major version
      newVersion.major++;
      newVersion.minor = 0;
      newVersion.patch = 0;
    } else if (changes.hasNewFeatures) {
      // New features -> increment minor version
      newVersion.minor++;
      newVersion.patch = 0;
    } else if (changes.hasBugFixes || changes.modified.length > 0) {
      // Bug fixes or other modifications -> increment patch version
      newVersion.patch++;
    }

    return newVersion;
  }

  /**
   * Determine version increment type
   */
  getIncrementType(changes: ChangeSet): 'major' | 'minor' | 'patch' | 'none' {
    if (changes.hasBreakingChanges) {
      return 'major';
    } else if (changes.hasNewFeatures) {
      return 'minor';
    } else if (changes.hasBugFixes || changes.modified.length > 0) {
      return 'patch';
    } else {
      return 'none';
    }
  }

  /**
   * Compare two versions
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  compareVersions(v1: Version, v2: Version): number {
    if (v1.major !== v2.major) {
      return v1.major < v2.major ? -1 : 1;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor < v2.minor ? -1 : 1;
    }
    if (v1.patch !== v2.patch) {
      return v1.patch < v2.patch ? -1 : 1;
    }
    return 0;
  }

  /**
   * Check if a version is compatible with another (same major version)
   */
  isCompatible(v1: Version, v2: Version): boolean {
    return v1.major === v2.major;
  }

  /**
   * Get the next version string based on changes
   */
  getNextVersion(currentVersionString: string, changes: ChangeSet): string {
    const currentVersion = this.parseVersion(currentVersionString);
    const nextVersion = this.incrementVersion(currentVersion, changes);
    return this.formatVersion(nextVersion);
  }

  /**
   * Validate a version string
   */
  isValidVersion(versionString: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(versionString);
  }

  /**
   * Get version increment description
   */
  getIncrementDescription(changes: ChangeSet): string {
    const type = this.getIncrementType(changes);
    
    switch (type) {
      case 'major':
        return 'Breaking changes detected - incrementing major version';
      case 'minor':
        return 'New features detected - incrementing minor version';
      case 'patch':
        return 'Bug fixes or modifications detected - incrementing patch version';
      case 'none':
        return 'No significant changes detected - version unchanged';
    }
  }

  /**
   * Create initial version
   */
  createInitialVersion(): Version {
    return { major: 1, minor: 0, patch: 0 };
  }

  /**
   * Get version range string for package managers
   */
  getVersionRange(version: Version, type: 'exact' | 'compatible' | 'latest'): string {
    const versionString = this.formatVersion(version);
    
    switch (type) {
      case 'exact':
        return versionString;
      case 'compatible':
        return `^${versionString}`; // npm/yarn compatible range
      case 'latest':
        return '*';
    }
  }
}
