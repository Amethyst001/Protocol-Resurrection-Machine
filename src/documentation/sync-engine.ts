import type { ProtocolSpec } from '../types/protocol-spec.js';
import { ChangeDetector, type ChangeSet } from './change-detector.js';
import { DocumentationGenerator, type KiroSpecSet, type Documentation } from './documentation-generator.js';
import { VersionManager } from './version-manager.js';
import { ChangelogGenerator } from './changelog-generator.js';
import { ExampleGenerator } from './example-generator.js';
import { InteractiveDocGenerator } from './interactive-doc-generator.js';
import { MCPDocGenerator } from './mcp-doc-generator.js';
import * as fs from 'fs';
import * as path from 'path';

export interface SyncOptions {
  outputDir: string;
  kiroSpecsDir?: string;
  generatedCodePath?: string;
  currentVersion?: string;
}

export interface SyncResult {
  success: boolean;
  changes: ChangeSet;
  newVersion: string;
  filesWritten: string[];
  errors: string[];
}

export class DocumentationSyncEngine {
  private changeDetector: ChangeDetector;
  private docGenerator: DocumentationGenerator;
  private versionManager: VersionManager;
  private changelogGenerator: ChangelogGenerator;
  private exampleGenerator: ExampleGenerator;
  private interactiveDocGenerator: InteractiveDocGenerator;
  private mcpDocGenerator: MCPDocGenerator;

  constructor() {
    this.changeDetector = new ChangeDetector();
    this.docGenerator = new DocumentationGenerator();
    this.versionManager = new VersionManager();
    this.changelogGenerator = new ChangelogGenerator();
    this.exampleGenerator = new ExampleGenerator();
    this.interactiveDocGenerator = new InteractiveDocGenerator();
    this.mcpDocGenerator = new MCPDocGenerator();
  }

  /**
   * Synchronize documentation for a protocol specification
   */
  async sync(
    newSpec: ProtocolSpec,
    oldSpec: ProtocolSpec | null,
    options: SyncOptions
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      changes: {
        added: [],
        modified: [],
        removed: [],
        hasBreakingChanges: false,
        hasNewFeatures: false,
        hasBugFixes: false
      },
      newVersion: options.currentVersion || '1.0.0',
      filesWritten: [],
      errors: []
    };

    try {
      // Detect changes if old spec exists
      if (oldSpec) {
        result.changes = this.changeDetector.detectChanges(oldSpec, newSpec);
        
        // Update version based on changes
        const currentVersion = this.versionManager.parseVersion(options.currentVersion || '1.0.0');
        const newVersion = this.versionManager.incrementVersion(currentVersion, result.changes);
        result.newVersion = this.versionManager.formatVersion(newVersion);
      }

      // Load Kiro specs if available
      const kiroSpecs = this.loadKiroSpecs(options.kiroSpecsDir);

      // Generate documentation
      const documentation = this.docGenerator.generate(
        newSpec,
        kiroSpecs,
        options.generatedCodePath
      );

      // Update version in documentation
      documentation.version = result.newVersion;

      // Generate cross-language examples
      const crossLanguageExamples = this.exampleGenerator.generateCrossLanguageExamples(newSpec);

      // Generate interactive documentation
      const interactiveDoc = this.interactiveDocGenerator.generateInteractiveDoc(
        newSpec,
        crossLanguageExamples
      );

      // Generate MCP documentation
      const mcpDoc = this.mcpDocGenerator.generateMCPDocumentation(newSpec);

      // Generate changelog entry if there are changes
      if (oldSpec && (result.changes.added.length > 0 || result.changes.modified.length > 0 || result.changes.removed.length > 0)) {
        const changelogEntry = this.changelogGenerator.generateEntry(
          result.newVersion,
          result.changes
        );
        documentation.changelog = this.changelogGenerator.formatEntry(changelogEntry);
      }

      // Write documentation files
      await this.writeDocumentation(
        newSpec,
        documentation,
        crossLanguageExamples,
        interactiveDoc,
        mcpDoc,
        options.outputDir,
        result
      );

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Check if documentation needs regeneration
   */
  needsRegeneration(
    newSpec: ProtocolSpec,
    oldSpec: ProtocolSpec | null
  ): boolean {
    if (!oldSpec) {
      return true;
    }

    // Use change detector to determine if specs are different
    const changes = this.changeDetector.detectChanges(oldSpec, newSpec);
    const hasChanges = changes.added.length > 0 ||
                      changes.modified.length > 0 ||
                      changes.removed.length > 0;
    
    return hasChanges;
  }

  /**
   * Load Kiro specification documents
   */
  private loadKiroSpecs(kiroSpecsDir?: string): KiroSpecSet | undefined {
    if (!kiroSpecsDir) {
      return undefined;
    }

    const kiroSpecs: KiroSpecSet = {};

    try {
      const requirementsPath = path.join(kiroSpecsDir, 'requirements.md');
      if (fs.existsSync(requirementsPath)) {
        kiroSpecs.requirements = fs.readFileSync(requirementsPath, 'utf-8');
      }

      const designPath = path.join(kiroSpecsDir, 'design.md');
      if (fs.existsSync(designPath)) {
        kiroSpecs.design = fs.readFileSync(designPath, 'utf-8');
      }

      const tasksPath = path.join(kiroSpecsDir, 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        kiroSpecs.tasks = fs.readFileSync(tasksPath, 'utf-8');
      }
    } catch (error) {
      // Silently fail if Kiro specs can't be loaded
    }

    return Object.keys(kiroSpecs).length > 0 ? kiroSpecs : undefined;
  }

  /**
   * Write documentation files
   */
  private async writeDocumentation(
    spec: ProtocolSpec,
    documentation: Documentation,
    crossLanguageExamples: any[],
    interactiveDoc: any,
    mcpDoc: any,
    outputDir: string,
    result: SyncResult
  ): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write README.md
    const readmePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(readmePath, documentation.readme, 'utf-8');
    result.filesWritten.push(readmePath);

    // Write API reference
    const apiRefPath = path.join(outputDir, 'API.md');
    fs.writeFileSync(apiRefPath, documentation.apiReference, 'utf-8');
    result.filesWritten.push(apiRefPath);

    // Write changelog if it exists
    if (documentation.changelog) {
      const changelogPath = path.join(outputDir, 'CHANGELOG.md');
      
      // Append to existing changelog or create new one
      if (fs.existsSync(changelogPath)) {
        const existingChangelog = fs.readFileSync(changelogPath, 'utf-8');
        const parsedEntries = this.changelogGenerator.parseChangelog(documentation.changelog);
        if (parsedEntries.length > 0) {
          const updatedChangelog = this.changelogGenerator.appendToChangelog(
            existingChangelog,
            parsedEntries[0]
          );
          fs.writeFileSync(changelogPath, updatedChangelog, 'utf-8');
        }
      } else {
        const newChangelog = this.changelogGenerator.generateChangelog(
          this.changelogGenerator.parseChangelog(documentation.changelog),
          `${spec.protocol.name} Protocol Changelog`
        );
        fs.writeFileSync(changelogPath, newChangelog, 'utf-8');
      }
      result.filesWritten.push(changelogPath);
    }

    // Write examples
    const examplesDir = path.join(outputDir, 'examples');
    if (!fs.existsSync(examplesDir)) {
      fs.mkdirSync(examplesDir, { recursive: true });
    }

    crossLanguageExamples.forEach((example, index) => {
      const examplePath = path.join(examplesDir, `example-${index + 1}.md`);
      const exampleContent = this.formatCrossLanguageExample(example);
      fs.writeFileSync(examplePath, exampleContent, 'utf-8');
      result.filesWritten.push(examplePath);
    });

    // Write interactive documentation
    const interactivePath = path.join(outputDir, 'interactive.html');
    const interactiveHTML = this.interactiveDocGenerator.generateHTML(interactiveDoc);
    fs.writeFileSync(interactivePath, interactiveHTML, 'utf-8');
    result.filesWritten.push(interactivePath);

    // Write MCP documentation
    const mcpDocPath = path.join(outputDir, 'MCP.md');
    const mcpMarkdown = this.mcpDocGenerator.generateMarkdown(mcpDoc);
    fs.writeFileSync(mcpDocPath, mcpMarkdown, 'utf-8');
    result.filesWritten.push(mcpDocPath);

    // Write version file
    const versionPath = path.join(outputDir, 'VERSION');
    fs.writeFileSync(versionPath, documentation.version, 'utf-8');
    result.filesWritten.push(versionPath);
  }

  /**
   * Format cross-language example as markdown
   */
  private formatCrossLanguageExample(example: any): string {
    const sections: string[] = [];

    sections.push(`# ${example.title}`);
    sections.push('');
    sections.push(example.description);
    sections.push('');

    // TypeScript
    sections.push('## TypeScript');
    sections.push('');
    sections.push('**Installation:**');
    sections.push('```bash');
    sections.push(example.installation.typescript);
    sections.push('```');
    sections.push('');
    sections.push('**Code:**');
    sections.push('```typescript');
    sections.push(example.typescript);
    sections.push('```');
    sections.push('');

    // Python
    sections.push('## Python');
    sections.push('');
    sections.push('**Installation:**');
    sections.push('```bash');
    sections.push(example.installation.python);
    sections.push('```');
    sections.push('');
    sections.push('**Code:**');
    sections.push('```python');
    sections.push(example.python);
    sections.push('```');
    sections.push('');

    // Go
    sections.push('## Go');
    sections.push('');
    sections.push('**Installation:**');
    sections.push('```bash');
    sections.push(example.installation.go);
    sections.push('```');
    sections.push('');
    sections.push('**Code:**');
    sections.push('```go');
    sections.push(example.go);
    sections.push('```');
    sections.push('');

    // Rust
    sections.push('## Rust');
    sections.push('');
    sections.push('**Installation:**');
    sections.push('```bash');
    sections.push(example.installation.rust);
    sections.push('```');
    sections.push('');
    sections.push('**Code:**');
    sections.push('```rust');
    sections.push(example.rust);
    sections.push('```');
    sections.push('');

    return sections.join('\n');
  }
}
