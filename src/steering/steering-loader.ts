/**
 * Steering Document Loader
 * 
 * Loads and parses language-specific steering documents from .kiro/steering/
 * Extracts idiom rules and patterns for code generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TargetLanguage, LanguageIdiom, LanguageProfile } from '../types/language-target.js';
import { createLanguageProfile } from '../types/language-target.js';

/**
 * Parsed steering document
 */
export interface SteeringDocument {
  /** The target language */
  language: TargetLanguage;
  
  /** Path to the steering document */
  path: string;
  
  /** Raw markdown content */
  content: string;
  
  /** Extracted idioms */
  idioms: LanguageIdiom[];
  
  /** Metadata from the document */
  metadata: Record<string, string>;
}

/**
 * Cache for loaded steering documents
 */
const steeringCache = new Map<TargetLanguage, SteeringDocument>();

/**
 * Load a steering document for a specific language
 * 
 * @param language - The target language
 * @param steeringDir - Directory containing steering documents (default: .kiro/steering)
 * @returns Parsed steering document
 */
export function loadSteeringDocument(
  language: TargetLanguage,
  steeringDir: string = '.kiro/steering'
): SteeringDocument {
  // Check cache first
  if (steeringCache.has(language)) {
    return steeringCache.get(language)!;
  }
  
  const steeringPath = path.join(steeringDir, `${language}-idioms.md`);
  
  // Check if file exists
  if (!fs.existsSync(steeringPath)) {
    // Return empty steering document if file doesn't exist
    const emptyDoc: SteeringDocument = {
      language,
      path: steeringPath,
      content: '',
      idioms: [],
      metadata: {}
    };
    steeringCache.set(language, emptyDoc);
    return emptyDoc;
  }
  
  // Read the file
  const content = fs.readFileSync(steeringPath, 'utf-8');
  
  // Parse the document
  const idioms = parseIdioms(content);
  const metadata = parseMetadata(content);
  
  const doc: SteeringDocument = {
    language,
    path: steeringPath,
    content,
    idioms,
    metadata
  };
  
  // Cache the document
  steeringCache.set(language, doc);
  
  return doc;
}

/**
 * Parse idioms from markdown content
 * 
 * Looks for code blocks with pattern/replacement pairs
 * 
 * @param content - Markdown content
 * @returns Array of language idioms
 */
function parseIdioms(content: string): LanguageIdiom[] {
  const idioms: LanguageIdiom[] = [];
  
  // Match code blocks with idiom patterns
  // Format: ### Idiom Name\n```pattern\n...\n```\n```replacement\n...\n```
  const idiomPattern = /###\s+(.+?)\n.*?```(?:pattern)?\n([\s\S]+?)\n```.*?```(?:replacement)?\n([\s\S]+?)\n```/g;
  
  let match;
  while ((match = idiomPattern.exec(content)) !== null) {
    const [, name, pattern, replacement] = match;
    
    if (name && pattern && replacement) {
      idioms.push({
        name: name.trim(),
        pattern: pattern.trim(),
        replacement: replacement.trim(),
        priority: idioms.length // Lower index = higher priority
      });
    }
  }
  
  // Also look for inline idiom definitions
  // Format: - **Pattern**: `pattern` → **Replacement**: `replacement`
  const inlinePattern = /[-*]\s+\*\*Pattern\*\*:\s+`([^`]+)`\s+→\s+\*\*Replacement\*\*:\s+`([^`]+)`/g;
  
  while ((match = inlinePattern.exec(content)) !== null) {
    const [, pattern, replacement] = match;
    
    if (pattern && replacement) {
      idioms.push({
        name: `Inline idiom ${idioms.length + 1}`,
        pattern: pattern.trim(),
        replacement: replacement.trim(),
        priority: idioms.length
      });
    }
  }
  
  return idioms;
}

/**
 * Parse metadata from markdown frontmatter or headers
 * 
 * @param content - Markdown content
 * @returns Metadata key-value pairs
 */
function parseMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  // Try to parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  if (frontmatterMatch && frontmatterMatch[1]) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        metadata[key] = value;
      }
    }
  }
  
  return metadata;
}

/**
 * Clear the steering document cache
 * Useful for testing or when documents are updated
 */
export function clearSteeringCache(): void {
  steeringCache.clear();
}

/**
 * Load steering documents for multiple languages
 * 
 * @param languages - Array of target languages
 * @param steeringDir - Directory containing steering documents
 * @returns Map of language to steering document
 */
export function loadSteeringDocuments(
  languages: TargetLanguage[],
  steeringDir?: string
): Map<TargetLanguage, SteeringDocument> {
  const docs = new Map<TargetLanguage, SteeringDocument>();
  
  for (const language of languages) {
    docs.set(language, loadSteeringDocument(language, steeringDir));
  }
  
  return docs;
}

/**
 * Create a complete language profile with steering document
 * 
 * @param language - The target language
 * @param steeringDir - Directory containing steering documents
 * @returns Complete language profile with idioms
 */
export function createLanguageProfileWithSteering(
  language: TargetLanguage,
  steeringDir?: string
): LanguageProfile {
  const profile = createLanguageProfile(language);
  const steering = loadSteeringDocument(language, steeringDir);
  
  // Merge idioms from steering document
  profile.idioms = steering.idioms;
  profile.steeringDocPath = steering.path;
  
  return profile;
}

/**
 * Check if a steering document exists for a language
 * 
 * @param language - The target language
 * @param steeringDir - Directory containing steering documents
 * @returns True if the steering document exists
 */
export function hasSteeringDocument(
  language: TargetLanguage,
  steeringDir: string = '.kiro/steering'
): boolean {
  const steeringPath = path.join(steeringDir, `${language}-idioms.md`);
  return fs.existsSync(steeringPath);
}
