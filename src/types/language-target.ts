/**
 * Language Target Type System
 * 
 * Defines types and interfaces for multi-language code generation.
 * Supports TypeScript, Python, Go, and Rust with language-specific configurations.
 */

/**
 * Supported target languages for code generation
 */
export type TargetLanguage = 'typescript' | 'python' | 'go' | 'rust';

/**
 * Naming convention styles used by different languages
 */
export type NamingConvention = 
  | 'camelCase' 
  | 'snake_case' 
  | 'PascalCase' 
  | 'UPPER_SNAKE_CASE'
  | 'kebab-case'
  | 'mixed';

/**
 * Error handling patterns used by different languages
 */
export type ErrorHandlingPattern = 
  | 'exceptions'        // TypeScript, Python: throw/raise exceptions
  | 'result_types'      // Rust: Result<T, E>
  | 'error_returns';    // Go: (value, error) tuple returns

/**
 * Async programming patterns used by different languages
 */
export type AsyncPattern = 
  | 'promises'          // TypeScript: Promise-based
  | 'async_await'       // Python, Rust: async/await
  | 'goroutines'        // Go: goroutines and channels
  | 'callbacks';        // Legacy callback-based

/**
 * Type system characteristics
 */
export type TypeSystemStyle = 
  | 'structural'        // TypeScript: structural typing
  | 'nominal'           // Go, Rust: nominal typing
  | 'duck'              // Python: duck typing
  | 'gradual';          // Python with type hints

/**
 * Configuration for a specific target language
 */
export interface LanguageConfig {
  /** The target language identifier */
  language: TargetLanguage;
  
  /** Display name for the language */
  displayName: string;
  
  /** File extension for source files */
  fileExtension: string;
  
  /** Naming convention for identifiers */
  namingConvention: NamingConvention;
  
  /** Error handling pattern */
  errorHandling: ErrorHandlingPattern;
  
  /** Async programming pattern */
  asyncPattern: AsyncPattern;
  
  /** Type system style */
  typeSystem: TypeSystemStyle;
  
  /** Whether the language requires explicit type annotations */
  requiresTypeAnnotations: boolean;
  
  /** Whether the language supports null/undefined */
  supportsNull: boolean;
  
  /** Whether the language has a package manager */
  packageManager?: string;
  
  /** Command to run tests */
  testCommand?: string;
  
  /** Command to format code */
  formatCommand?: string;
  
  /** Command to check types/lint */
  lintCommand?: string;
}

/**
 * Naming convention mappings for different identifier types
 */
export interface NamingConventionMapping {
  /** Convention for type/class names */
  types: NamingConvention;
  
  /** Convention for function names */
  functions: NamingConvention;
  
  /** Convention for variable names */
  variables: NamingConvention;
  
  /** Convention for constant names */
  constants: NamingConvention;
  
  /** Convention for private/internal members */
  private: NamingConvention;
  
  /** Convention for file names */
  files: NamingConvention;
}

/**
 * Error handling pattern mappings
 */
export interface ErrorHandlingMapping {
  /** How to throw/raise errors */
  throwError: string;
  
  /** How to catch errors */
  catchError: string;
  
  /** How to define custom error types */
  defineErrorType: string;
  
  /** How to add context to errors */
  addErrorContext: string;
  
  /** Whether to use Result types */
  useResultTypes: boolean;
}

/**
 * Language-specific idioms and patterns
 */
export interface LanguageIdiom {
  /** Name/description of the idiom */
  name: string;
  
  /** Pattern to match (regex or AST pattern) */
  pattern: string;
  
  /** Replacement pattern */
  replacement: string;
  
  /** Optional condition for when to apply */
  condition?: string;
  
  /** Priority (higher = applied first) */
  priority?: number;
}

/**
 * Complete language configuration with all mappings
 */
export interface LanguageProfile {
  /** Base language configuration */
  config: LanguageConfig;
  
  /** Naming convention mappings */
  naming: NamingConventionMapping;
  
  /** Error handling mappings */
  errorHandling: ErrorHandlingMapping;
  
  /** Language-specific idioms */
  idioms: LanguageIdiom[];
  
  /** Path to steering document */
  steeringDocPath?: string;
}

/**
 * Pre-defined language configurations
 */
export const LANGUAGE_CONFIGS: Record<TargetLanguage, LanguageConfig> = {
  typescript: {
    language: 'typescript',
    displayName: 'TypeScript',
    fileExtension: '.ts',
    namingConvention: 'camelCase',
    errorHandling: 'exceptions',
    asyncPattern: 'promises',
    typeSystem: 'structural',
    requiresTypeAnnotations: true,
    supportsNull: true,
    packageManager: 'npm',
    testCommand: 'npm test',
    formatCommand: 'prettier --write',
    lintCommand: 'eslint'
  },
  
  python: {
    language: 'python',
    displayName: 'Python',
    fileExtension: '.py',
    namingConvention: 'snake_case',
    errorHandling: 'exceptions',
    asyncPattern: 'async_await',
    typeSystem: 'gradual',
    requiresTypeAnnotations: false,
    supportsNull: true,
    packageManager: 'pip',
    testCommand: 'pytest',
    formatCommand: 'black',
    lintCommand: 'mypy'
  },
  
  go: {
    language: 'go',
    displayName: 'Go',
    fileExtension: '.go',
    namingConvention: 'mixed', // PascalCase for exports, camelCase for private
    errorHandling: 'error_returns',
    asyncPattern: 'goroutines',
    typeSystem: 'nominal',
    requiresTypeAnnotations: true,
    supportsNull: false, // Uses nil, but different semantics
    packageManager: 'go mod',
    testCommand: 'go test',
    formatCommand: 'gofmt',
    lintCommand: 'go vet'
  },
  
  rust: {
    language: 'rust',
    displayName: 'Rust',
    fileExtension: '.rs',
    namingConvention: 'snake_case',
    errorHandling: 'result_types',
    asyncPattern: 'async_await',
    typeSystem: 'nominal',
    requiresTypeAnnotations: true,
    supportsNull: false, // Uses Option<T>
    packageManager: 'cargo',
    testCommand: 'cargo test',
    formatCommand: 'rustfmt',
    lintCommand: 'cargo clippy'
  }
};

/**
 * Pre-defined naming convention mappings
 */
export const NAMING_CONVENTIONS: Record<TargetLanguage, NamingConventionMapping> = {
  typescript: {
    types: 'PascalCase',
    functions: 'camelCase',
    variables: 'camelCase',
    constants: 'UPPER_SNAKE_CASE',
    private: 'camelCase', // with _ prefix
    files: 'kebab-case'
  },
  
  python: {
    types: 'PascalCase',
    functions: 'snake_case',
    variables: 'snake_case',
    constants: 'UPPER_SNAKE_CASE',
    private: 'snake_case', // with _ prefix
    files: 'snake_case'
  },
  
  go: {
    types: 'PascalCase', // Exported
    functions: 'PascalCase', // Exported, camelCase for unexported
    variables: 'camelCase',
    constants: 'PascalCase', // or UPPER_SNAKE_CASE
    private: 'camelCase',
    files: 'snake_case'
  },
  
  rust: {
    types: 'PascalCase',
    functions: 'snake_case',
    variables: 'snake_case',
    constants: 'UPPER_SNAKE_CASE',
    private: 'snake_case',
    files: 'snake_case'
  }
};

/**
 * Pre-defined error handling mappings
 */
export const ERROR_HANDLING_PATTERNS: Record<TargetLanguage, ErrorHandlingMapping> = {
  typescript: {
    throwError: 'throw new Error(message)',
    catchError: 'try { } catch (error) { }',
    defineErrorType: 'class CustomError extends Error { }',
    addErrorContext: 'error.context = { }',
    useResultTypes: false
  },
  
  python: {
    throwError: 'raise Exception(message)',
    catchError: 'try: except Exception as e:',
    defineErrorType: 'class CustomError(Exception): pass',
    addErrorContext: 'error.context = { }',
    useResultTypes: false
  },
  
  go: {
    throwError: 'return nil, fmt.Errorf(message)',
    catchError: 'if err != nil { }',
    defineErrorType: 'type CustomError struct { }',
    addErrorContext: 'fmt.Errorf("%w: %s", err, context)',
    useResultTypes: false
  },
  
  rust: {
    throwError: 'return Err(Error::new(message))',
    catchError: 'match result { Ok(v) => v, Err(e) => }',
    defineErrorType: 'enum CustomError { }',
    addErrorContext: 'error.context(context)',
    useResultTypes: true
  }
};

/**
 * Helper function to get language configuration
 */
export function getLanguageConfig(language: TargetLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[language];
}

/**
 * Helper function to get naming conventions for a language
 */
export function getNamingConventions(language: TargetLanguage): NamingConventionMapping {
  return NAMING_CONVENTIONS[language];
}

/**
 * Helper function to get error handling patterns for a language
 */
export function getErrorHandlingPattern(language: TargetLanguage): ErrorHandlingMapping {
  return ERROR_HANDLING_PATTERNS[language];
}

/**
 * Helper function to create a complete language profile
 */
export function createLanguageProfile(language: TargetLanguage): LanguageProfile {
  return {
    config: getLanguageConfig(language),
    naming: getNamingConventions(language),
    errorHandling: getErrorHandlingPattern(language),
    idioms: [],
    steeringDocPath: `.kiro/steering/${language}-idioms.md`
  };
}

/**
 * Helper function to validate if a language is supported
 */
export function isSupportedLanguage(language: string): language is TargetLanguage {
  return ['typescript', 'python', 'go', 'rust'].includes(language);
}

/**
 * Helper function to get all supported languages
 */
export function getSupportedLanguages(): TargetLanguage[] {
  return ['typescript', 'python', 'go', 'rust'];
}
