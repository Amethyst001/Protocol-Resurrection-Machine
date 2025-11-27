# Execution Efficiency: Context, Communication & Error Prevention

This steering document combines guidance on minimal context loading, efficient communication, and proactive error prevention.

## Part 1: Minimal Context Loading

### Core Principle
**Load only what you need, when you need it. Context is expensive.**

### Strategy 1: Use Line Ranges

**❌ Bad: Reading entire large file**
```typescript
const file = readFile('src/large-parser.ts'); // 2000 lines
// Only need lines 100-150
```

**✅ Good: Reading specific section**
```typescript
const section = readFile('src/large-parser.ts', {
  start_line: 100,
  end_line: 150
});
```

### Strategy 2: Search Then Read

**❌ Bad: Read all files to find something**
```typescript
const files = readMultipleFiles([
  'src/file1.ts',
  'src/file2.ts',
  'src/file3.ts',
  // ... 20 more files
]);
// Search in memory for specific function
```

**✅ Good: Search first, then read**
```typescript
// Find which files contain the function
const matches = grepSearch({
  query: 'function parseMessage',
  includePattern: 'src/**/*.ts'
});

// Read only the relevant file
const relevantFile = readFile(matches[0].file);
```

### Strategy 3: Lazy Loading

**❌ Bad: Load everything upfront**
```typescript
const allSpecs = readMultipleFiles([
  'protocols/gopher.yaml',
  'protocols/finger.yaml',
  'protocols/pop3.yaml',
  'protocols/smtp.yaml',
  'protocols/ftp.yaml'
]);
// Only need gopher
```

**✅ Good: Load on demand**
```typescript
// Only load what's needed
const gopherSpec = readFile('protocols/gopher.yaml');
```

### Strategy 4: Incremental Context Building

**✅ Good: Build context incrementally**
```typescript
// Step 1: Find the file
const files = fileSearch({ query: 'parser' });

// Step 2: Check if it's the right one (grep)
const hasFunction = grepSearch({
  query: 'function parseGopher',
  includePattern: files[0]
});

// Step 3: Only if found, read the full file
if (hasFunction.length > 0) {
  const content = readFile(files[0]);
}
```

### Strategy 5: Avoid Reading Dependencies

**❌ Bad: Reading entire dependency tree**
```typescript
// Reading all imports
const parser = readFile('src/parser.ts');
const types = readFile('src/types.ts');
const utils = readFile('src/utils.ts');
const helpers = readFile('src/helpers.ts');
// Only modifying parser
```

**✅ Good: Read only what you'll modify**
```typescript
// Only read the file you're changing
const parser = readFile('src/parser.ts');
// Types are already known from TypeScript
```

### Context Loading Decision Matrix

| Scenario | Load Full File? | Use Line Range? | Use Search? |
|----------|----------------|-----------------|-------------|
| Modifying specific function | No | Yes | Yes |
| Understanding file structure | Yes | No | No |
| Finding specific code | No | No | Yes |
| Checking if file exists | No | No | Yes (fileSearch) |
| Reading small file (< 200 lines) | Yes | No | No |
| Reading large file (> 1000 lines) | No | Yes | Yes |

---

## Part 2: Efficient Communication

### Core Principle
**Minimize back-and-forth. Batch questions and provide options.**

### Strategy 1: Batch Questions

**❌ Bad: Sequential questions**
```
Agent: "Should I use TypeScript?"
User: "Yes"
Agent: "Should I add tests?"
User: "Yes"
Agent: "Should I use fast-check?"
User: "Yes"
```

**✅ Good: Batch questions**
```
Agent: "I'll implement this with:
- TypeScript for type safety
- Vitest for testing
- fast-check for property tests

Proceed with these choices?"
User: "Yes"
```

### Strategy 2: Provide Options Upfront

**❌ Bad: Asking without context**
```
Agent: "Which testing library should I use?"
```

**✅ Good: Provide options with recommendations**
```
Agent: "For property-based testing, I recommend:
1. fast-check (recommended) - Most popular, great TypeScript support
2. jsverify - Older, less maintained
3. testcheck-js - Simpler API

Proceed with fast-check?"
```

### Strategy 3: Make Safe Assumptions

**❌ Bad: Asking about obvious choices**
```
Agent: "Should I use camelCase for TypeScript?"
Agent: "Should I add type annotations?"
Agent: "Should I export the main class?"
```

**✅ Good: Follow conventions, confirm only critical decisions**
```
Agent: "I'll follow TypeScript conventions (camelCase, type annotations, exports).
The critical decision is: Should I generate parsers for all message types or just the main ones?"
```

### Strategy 4: Confirm Only Breaking Changes

**✅ Good: Auto-proceed for safe operations**
```typescript
// Don't ask for confirmation:
- Adding new files
- Adding new functions
- Adding tests
- Fixing obvious bugs
- Following established patterns

// Do ask for confirmation:
- Deleting files
- Changing public APIs
- Modifying existing behavior
- Breaking changes
```

### Strategy 5: Provide Context in Questions

**❌ Bad: Vague question**
```
Agent: "Should I proceed?"
```

**✅ Good: Specific question with context**
```
Agent: "I'll generate 4 files (parser, serializer, types, tests) totaling ~500 lines.
This will overwrite existing generated files. Proceed?"
```

### Communication Efficiency Checklist

Before asking a question:
- [ ] Can I make a safe assumption based on conventions?
- [ ] Can I batch this with other questions?
- [ ] Have I provided options and recommendations?
- [ ] Have I explained the impact of the decision?
- [ ] Is this a critical decision that needs confirmation?

---

## Part 3: Proactive Error Prevention

### Core Principle
**Catch errors before they happen. Validate early and often.**

### Strategy 1: Validate Before Generating

**❌ Bad: Generate then discover errors**
```typescript
// Generate code
const code = generateParser(spec);
fsWrite('parser.ts', code);

// Check for errors
const diagnostics = getDiagnostics(['parser.ts']);
// Oops, errors found, need to regenerate
```

**✅ Good: Validate spec first**
```typescript
// Validate spec
const validation = validateSpec(spec);
if (!validation.valid) {
  reportErrors(validation.errors);
  return;
}

// Generate code (confident it will work)
const code = generateParser(spec);
fsWrite('parser.ts', code);
```

### Strategy 2: Type-Check in Memory

**❌ Bad: Write then check**
```typescript
fsWrite('parser.ts', generatedCode);
const errors = getDiagnostics(['parser.ts']);
if (errors.length > 0) {
  // Fix and rewrite
}
```

**✅ Good: Validate before writing**
```typescript
// Validate generated code structure
const ast = parseTypeScript(generatedCode);
const errors = validateAST(ast);

if (errors.length === 0) {
  fsWrite('parser.ts', generatedCode);
} else {
  fixErrors(errors);
  // Then write
}
```

### Strategy 3: Dry-Run Mode

**✅ Good: Test generation without writing**
```typescript
function generateWithDryRun(spec: ProtocolSpec, dryRun = false) {
  const code = generateParser(spec);
  
  // Validate
  const errors = validateCode(code);
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  if (!dryRun) {
    fsWrite('parser.ts', code);
  }
  
  return { success: true, code };
}

// Test first
const result = generateWithDryRun(spec, true);
if (result.success) {
  // Actually generate
  generateWithDryRun(spec, false);
}
```

### Strategy 4: Progressive Validation

**✅ Good: Validate at each step**
```typescript
// Step 1: Validate input
const specValidation = validateSpec(spec);
if (!specValidation.valid) return;

// Step 2: Validate analysis
const analysis = analyzeFormat(spec.format);
if (analysis.ambiguities.length > 0) {
  warnAboutAmbiguities(analysis.ambiguities);
}

// Step 3: Validate state machine
const stateMachine = generateStateMachine(spec);
if (!isStateMachineValid(stateMachine)) return;

// Step 4: Generate code
const code = generateCode(stateMachine);

// Step 5: Validate generated code
const codeValidation = validateGeneratedCode(code);
if (!codeValidation.valid) return;

// Step 6: Write
fsWrite('parser.ts', code);
```

### Strategy 5: Fail Fast

**✅ Good: Exit early on errors**
```typescript
function generateProtocol(specPath: string) {
  // Check file exists
  if (!fileExists(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }
  
  // Parse YAML
  const spec = parseYAML(readFile(specPath));
  if (!spec) {
    throw new Error('Failed to parse YAML');
  }
  
  // Validate spec
  const validation = validateSpec(spec);
  if (!validation.valid) {
    throw new Error(`Invalid spec: ${validation.errors.join(', ')}`);
  }
  
  // Continue with generation...
}
```

### Common Error Prevention Patterns

#### Pattern 1: Pre-flight Checks

```typescript
function preflight(spec: ProtocolSpec): ValidationResult {
  const checks = [
    () => checkRequiredFields(spec),
    () => checkFormatStrings(spec),
    () => checkFieldTypes(spec),
    () => checkDelimiters(spec),
    () => checkTerminators(spec)
  ];
  
  for (const check of checks) {
    const result = check();
    if (!result.valid) {
      return result;
    }
  }
  
  return { valid: true };
}
```

#### Pattern 2: Defensive Generation

```typescript
function generateParser(spec: ProtocolSpec): string {
  try {
    // Validate inputs
    assert(spec.messageTypes.length > 0, 'No message types defined');
    
    // Generate with error handling
    const code = [];
    
    for (const messageType of spec.messageTypes) {
      try {
        code.push(generateMessageParser(messageType));
      } catch (error) {
        console.error(`Failed to generate parser for ${messageType.name}:`, error);
        // Continue with other message types
      }
    }
    
    return code.join('\n');
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
}
```

#### Pattern 3: Validation Layers

```typescript
// Layer 1: Schema validation
const schemaValid = validateSchema(spec);

// Layer 2: Semantic validation
const semanticValid = validateSemantics(spec);

// Layer 3: Consistency validation
const consistencyValid = validateConsistency(spec);

// Layer 4: Completeness validation
const completenessValid = validateCompleteness(spec);

// All layers must pass
const allValid = schemaValid && semanticValid && 
                 consistencyValid && completenessValid;
```

---

## Part 4: Workspace Awareness

### Core Principle
**Remember project structure and patterns. Reuse knowledge.**

### Strategy 1: Remember File Locations

**✅ Good: Know where things are**
```typescript
// Remember common locations
const LOCATIONS = {
  specs: 'protocols/',
  generated: 'generated/',
  tests: 'tests/',
  types: 'src/types/',
  core: 'src/core/'
};

// Use known locations
const spec = readFile(`${LOCATIONS.specs}gopher.yaml`);
```

### Strategy 2: Understand Project Patterns

**✅ Good: Follow established patterns**
```typescript
// Recognize pattern: Each protocol has parser, serializer, types
function generateProtocol(name: string) {
  const outputDir = `generated/${name}`;
  
  // Follow the pattern
  fsWrite(`${outputDir}/parser.ts`, generateParser());
  fsWrite(`${outputDir}/serializer.ts`, generateSerializer());
  fsWrite(`${outputDir}/types.ts`, generateTypes());
  fsWrite(`${outputDir}/tests/${name}.test.ts`, generateTests());
}
```

### Strategy 3: Reuse Similar Implementations

**✅ Good: Learn from existing code**
```typescript
// Check how similar feature was implemented
const existingParser = readFile('generated/gopher/parser.ts');

// Use same patterns for new protocol
const newParser = generateSimilarParser(existingParser, newSpec);
```

### Strategy 4: Track Dependencies

**✅ Good: Know what depends on what**
```typescript
const DEPENDENCIES = {
  'generated/gopher/parser.ts': ['protocols/gopher.yaml', 'src/core/format-parser.ts'],
  'generated/gopher/tests/gopher.test.ts': ['generated/gopher/parser.ts']
};

// When format-parser changes, regenerate affected files
function onFileChange(changedFile: string) {
  const affected = Object.entries(DEPENDENCIES)
    .filter(([_, deps]) => deps.includes(changedFile))
    .map(([file, _]) => file);
  
  regenerateFiles(affected);
}
```

---

## Combined Performance Impact

### Before Optimization:
- Reading 10 large files fully: 2000ms
- Sequential questions: 5 interactions
- Generate then fix errors: 3 iterations
- No caching: Regenerate everything

**Total time: ~10-15 minutes for complex task**

### After Optimization:
- Search then read specific sections: 300ms
- Batch questions: 1 interaction
- Validate before generating: 1 iteration
- Smart caching: Skip unchanged files

**Total time: ~2-3 minutes for same task**

**5-7x faster overall!**

---

## Summary Checklist

### Before Reading Files:
- [ ] Do I need the entire file?
- [ ] Can I search first?
- [ ] Can I use line ranges?
- [ ] Can I batch multiple reads?

### Before Asking Questions:
- [ ] Can I batch multiple questions?
- [ ] Have I provided options?
- [ ] Is this a safe assumption?
- [ ] Is confirmation really needed?

### Before Generating Code:
- [ ] Have I validated the spec?
- [ ] Have I checked for errors?
- [ ] Can I dry-run first?
- [ ] Have I validated dependencies?

### During Execution:
- [ ] Am I loading minimal context?
- [ ] Am I using the right tools?
- [ ] Am I batching operations?
- [ ] Am I caching results?
- [ ] Am I failing fast on errors?

---

## Key Principles Summary

1. **Minimal Context**: Load only what you need
2. **Efficient Communication**: Batch questions, provide options
3. **Error Prevention**: Validate early, fail fast
4. **Workspace Awareness**: Remember structure, reuse patterns
5. **Progressive Enhancement**: Build context incrementally

**Expected Combined Impact: 5-10x faster execution**
