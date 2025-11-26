/**
 * Multi-Language Coordinator
 * 
 * Coordinates code generation across multiple target languages.
 * Routes generation requests to language-specific generators and
 * aggregates results and errors.
 */

import type { ProtocolSpec } from '../../types/protocol-spec.js';
import type { TargetLanguage, LanguageProfile } from '../../types/language-target.js';
import { createLanguageProfileWithSteering } from '../../steering/steering-loader.js';

/**
 * Generated code artifacts for a single language
 */
export interface LanguageArtifacts {
  /** The target language */
  language: TargetLanguage;
  
  /** Generated parser code */
  parser: string;
  
  /** Generated serializer code */
  serializer: string;
  
  /** Generated client code */
  client: string;
  
  /** Generated type definitions */
  types: string;
  
  /** Generated tests */
  tests: string;
  
  /** Time taken to generate (milliseconds) */
  generationTimeMs: number;
  
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Result of multi-language generation
 */
export interface MultiLanguageGenerationResult {
  /** Generated artifacts for each language */
  artifacts: Map<TargetLanguage, LanguageArtifacts>;
  
  /** Total generation time (milliseconds) */
  totalTimeMs: number;
  
  /** Languages that succeeded */
  succeeded: TargetLanguage[];
  
  /** Languages that failed */
  failed: TargetLanguage[];
  
  /** Errors by language */
  errors: Map<TargetLanguage, Error>;
  
  /** Overall success status */
  success: boolean;
}

/**
 * Options for multi-language generation
 */
export interface GenerationOptions {
  /** Target languages to generate */
  languages: TargetLanguage[];
  
  /** Whether to generate in parallel */
  parallel?: boolean;
  
  /** Directory containing steering documents */
  steeringDir?: string;
  
  /** Whether to continue on error */
  continueOnError?: boolean;
  
  /** Timeout per language (milliseconds) */
  timeout?: number;
}

/**
 * Language-specific generator interface
 */
export interface LanguageGenerator {
  /** Generate code for a protocol specification */
  generate(spec: ProtocolSpec, profile: LanguageProfile): Promise<LanguageArtifacts>;
  
  /** Validate generated code */
  validate?(code: string): Promise<boolean>;
}

/**
 * Multi-Language Coordinator
 * 
 * Manages code generation across multiple programming languages
 */
export class LanguageCoordinator {
  private generators: Map<TargetLanguage, LanguageGenerator>;
  private profiles: Map<TargetLanguage, LanguageProfile>;
  
  constructor(private steeringDir?: string) {
    this.generators = new Map();
    this.profiles = new Map();
  }
  
  /**
   * Register a language-specific generator
   * 
   * @param language - The target language
   * @param generator - The generator implementation
   */
  registerGenerator(language: TargetLanguage, generator: LanguageGenerator): void {
    this.generators.set(language, generator);
  }
  
  /**
   * Get or create a language profile
   * 
   * @param language - The target language
   * @returns Language profile with steering
   */
  private getProfile(language: TargetLanguage): LanguageProfile {
    if (!this.profiles.has(language)) {
      const profile = createLanguageProfileWithSteering(language, this.steeringDir);
      this.profiles.set(language, profile);
    }
    return this.profiles.get(language)!;
  }
  
  /**
   * Generate code for a single language
   * 
   * @param spec - Protocol specification
   * @param language - Target language
   * @returns Generated artifacts or error
   */
  private async generateForLanguage(
    spec: ProtocolSpec,
    language: TargetLanguage
  ): Promise<LanguageArtifacts> {
    const generator = this.generators.get(language);
    if (!generator) {
      throw new Error(`No generator registered for language: ${language}`);
    }
    
    const profile = this.getProfile(language);
    const startTime = Date.now();
    
    try {
      const artifacts = await generator.generate(spec, profile);
      const endTime = Date.now();
      
      return {
        ...artifacts,
        generationTimeMs: endTime - startTime
      };
    } catch (error) {
      throw new Error(`Generation failed for ${language}: ${error}`);
    }
  }
  
  /**
   * Generate code for multiple languages in parallel
   * 
   * @param spec - Protocol specification
   * @param languages - Target languages
   * @param continueOnError - Whether to continue if one language fails
   * @returns Map of language to artifacts or errors
   */
  private async generateParallel(
    spec: ProtocolSpec,
    languages: TargetLanguage[],
    continueOnError: boolean
  ): Promise<{
    artifacts: Map<TargetLanguage, LanguageArtifacts>;
    errors: Map<TargetLanguage, Error>;
  }> {
    const artifacts = new Map<TargetLanguage, LanguageArtifacts>();
    const errors = new Map<TargetLanguage, Error>();
    
    // Generate all languages in parallel
    const results = await Promise.allSettled(
      languages.map(async (language) => ({
        language,
        artifacts: await this.generateForLanguage(spec, language)
      }))
    );
    
    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        artifacts.set(result.value.language, result.value.artifacts);
      } else {
        const error = result.reason instanceof Error 
          ? result.reason 
          : new Error(String(result.reason));
        
        // Extract language from error message if possible
        const languageMatch = error.message.match(/for (\w+):/);
        const language = languageMatch ? languageMatch[1] as TargetLanguage : 'typescript';
        
        errors.set(language, error);
        
        if (!continueOnError) {
          break;
        }
      }
    }
    
    return { artifacts, errors };
  }
  
  /**
   * Generate code for multiple languages sequentially
   * 
   * @param spec - Protocol specification
   * @param languages - Target languages
   * @param continueOnError - Whether to continue if one language fails
   * @returns Map of language to artifacts or errors
   */
  private async generateSequential(
    spec: ProtocolSpec,
    languages: TargetLanguage[],
    continueOnError: boolean
  ): Promise<{
    artifacts: Map<TargetLanguage, LanguageArtifacts>;
    errors: Map<TargetLanguage, Error>;
  }> {
    const artifacts = new Map<TargetLanguage, LanguageArtifacts>();
    const errors = new Map<TargetLanguage, Error>();
    
    for (const language of languages) {
      try {
        const result = await this.generateForLanguage(spec, language);
        artifacts.set(language, result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.set(language, err);
        
        if (!continueOnError) {
          break;
        }
      }
    }
    
    return { artifacts, errors };
  }
  
  /**
   * Generate code for multiple languages
   * 
   * @param spec - Protocol specification
   * @param options - Generation options
   * @returns Multi-language generation result
   */
  async generate(
    spec: ProtocolSpec,
    options: GenerationOptions
  ): Promise<MultiLanguageGenerationResult> {
    const startTime = Date.now();
    const { languages, parallel = true, continueOnError = true } = options;
    
    // Validate that we have generators for all requested languages
    for (const language of languages) {
      if (!this.generators.has(language)) {
        throw new Error(`No generator registered for language: ${language}`);
      }
    }
    
    // Generate code
    const { artifacts, errors } = parallel
      ? await this.generateParallel(spec, languages, continueOnError)
      : await this.generateSequential(spec, languages, continueOnError);
    
    const endTime = Date.now();
    
    // Determine success/failure
    const succeeded = Array.from(artifacts.keys());
    const failed = Array.from(errors.keys());
    const success = failed.length === 0;
    
    return {
      artifacts,
      totalTimeMs: endTime - startTime,
      succeeded,
      failed,
      errors,
      success
    };
  }
  
  /**
   * Check if a generator is registered for a language
   * 
   * @param language - The target language
   * @returns True if generator is registered
   */
  hasGenerator(language: TargetLanguage): boolean {
    return this.generators.has(language);
  }
  
  /**
   * Get all registered languages
   * 
   * @returns Array of registered languages
   */
  getRegisteredLanguages(): TargetLanguage[] {
    return Array.from(this.generators.keys());
  }
  
  /**
   * Clear all registered generators
   */
  clearGenerators(): void {
    this.generators.clear();
  }
  
  /**
   * Clear cached language profiles
   */
  clearProfiles(): void {
    this.profiles.clear();
  }
}

/**
 * Create a default language coordinator with no generators
 * Generators must be registered separately
 * 
 * @param steeringDir - Directory containing steering documents
 * @returns Language coordinator instance
 */
export function createLanguageCoordinator(steeringDir?: string): LanguageCoordinator {
  return new LanguageCoordinator(steeringDir);
}
