# Parallel Operations & Batching

This steering document provides guidance on executing operations in parallel and batching requests for maximum efficiency.

## Core Principle

**Sequential operations are slow. Batch and parallelize whenever possible.**

## File Operations

### Reading Multiple Files

**❌ Bad: Sequential reads**
```typescript
const file1 = readFile('src/parser.ts');
const file2 = readFile('src/serializer.ts');
const file3 = readFile('src/types.ts');
// 3 separate tool calls = 3x latency
```

**✅ Good: Batch read**
```typescript
const files = readMultipleFiles([
  'src/parser.ts',
  'src/serializer.ts', 
  'src/types.ts'
]);
// 1 tool call = 1x latency
```

### Checking Diagnostics

**❌ Bad: One file at a time**
```typescript
getDiagnostics(['src/parser.ts']);
getDiagnostics(['src/serializer.ts']);
getDiagnostics(['src/types.ts']);
```

**✅ Good: Batch diagnostics**
```typescript
getDiagnostics([
  'src/parser.ts',
  'src/serializer.ts',
  'src/types.ts'
]);
```

### Writing Multiple Files

**❌ Bad: Sequential writes**
```typescript
fsWrite('src/parser.ts', parserCode);
fsWrite('src/serializer.ts', serializerCode);
fsWrite('src/types.ts', typesCode);
```

**✅ Good: Batch via PowerShell**
```powershell
# Write all files in one command
$files = @{
  'src/parser.ts' = $parserCode
  'src/serializer.ts' = $serializerCode
  'src/types.ts' = $typesCode
}

foreach ($file in $files.GetEnumerator()) {
  $file.Value | Out-File -FilePath $file.Key -Encoding UTF8
}
```

## Code Generation

### Multi-Language Generation

**❌ Bad: Sequential generation**
```typescript
// Generate TypeScript
const tsCode = generateTypeScript(spec);
fsWrite('generated/typescript/parser.ts', tsCode);

// Generate Python
const pyCode = generatePython(spec);
fsWrite('generated/python/parser.py', pyCode);

// Generate Go
const goCode = generateGo(spec);
fsWrite('generated/go/parser.go', goCode);
```

**✅ Good: Parallel generation**
```typescript
// Generate all languages conceptually in parallel
// (Implementation note: generate all in memory first, then write)
const languages = ['typescript', 'python', 'go', 'rust'];
const generated = {};

// Generate all in memory
for (const lang of languages) {
  generated[lang] = generateForLanguage(spec, lang);
}

// Write all at once via PowerShell
const writeScript = languages.map(lang => 
  `@"\n${generated[lang]}\n"@ | Out-File -FilePath generated/${lang}/parser.${ext[lang]} -Encoding UTF8`
).join('\n');

executePwsh({ command: writeScript });
```

## Test Execution

### Running Tests

**❌ Bad: Sequential test runs**
```typescript
executePwsh({ command: 'npm test -- unit.test.ts --run' });
executePwsh({ command: 'npm test -- property.test.ts --run' });
executePwsh({ command: 'npm test -- integration.test.ts --run' });
```

**✅ Good: Single test run with pattern**
```typescript
// Run all tests in one command
executePwsh({ 
  command: 'npm test -- "tests/**/*.test.ts" --run --reporter=verbose'
});

// Or run specific suites in parallel (if test runner supports it)
executePwsh({
  command: 'npm test -- --run --threads'
});
```

### Property-Based Tests

**✅ Good: Run multiple properties in one test file**
```typescript
// Instead of separate test files for each property,
// group related properties together
describe('State Machine Parser Properties', () => {
  it('Property 1: Fixed strings', () => { /* ... */ });
  it('Property 2: Field extraction', () => { /* ... */ });
  it('Property 3: Mixed patterns', () => { /* ... */ });
  // All run in one test execution
});
```

## Search Operations

### Finding Code Patterns

**❌ Bad: Read entire files to search**
```typescript
const file1 = readFile('src/large-file.ts');
const file2 = readFile('src/another-large.ts');
// Then search in memory
```

**✅ Good: Use grepSearch**
```typescript
// Search across multiple files at once
const results = grepSearch({
  query: 'function.*parse',
  includePattern: 'src/**/*.ts'
});
// Returns only matching lines with context
```

### Finding Files

**❌ Bad: List directory recursively**
```typescript
const files = listDirectory('src', { depth: 5 });
// Then filter in memory
```

**✅ Good: Use fileSearch**
```typescript
const files = fileSearch({
  query: 'parser',
  includePattern: '**/*.ts'
});
// Returns only matching files
```

## Validation Operations

### Pre-Generation Validation

**✅ Good: Validate everything before generating**
```typescript
// Validate all specs at once
const specs = ['gopher.yaml', 'finger.yaml', 'pop3.yaml'];
const validationResults = specs.map(spec => validateSpec(spec));

// Check all results
const allValid = validationResults.every(r => r.valid);

if (allValid) {
  // Generate all at once
  generateAll(specs);
} else {
  // Report all errors at once
  reportErrors(validationResults);
}
```

## Batching Strategies

### Strategy 1: Collect Then Execute

```typescript
// Collect all operations
const operations = [];
operations.push({ type: 'write', path: 'file1.ts', content: code1 });
operations.push({ type: 'write', path: 'file2.ts', content: code2 });
operations.push({ type: 'write', path: 'file3.ts', content: code3 });

// Execute all at once
executeBatch(operations);
```

### Strategy 2: Pipeline Pattern

```typescript
// Chain operations that depend on each other
const result = await pipeline([
  () => readMultipleFiles(['spec1.yaml', 'spec2.yaml']),
  (specs) => specs.map(validateSpec),
  (validated) => validated.map(generateCode),
  (generated) => writeAllFiles(generated)
]);
```

### Strategy 3: Fan-Out Fan-In

```typescript
// Fan out: Generate multiple artifacts
const artifacts = [
  generateParser(spec),
  generateSerializer(spec),
  generateTypes(spec),
  generateTests(spec)
];

// Fan in: Write all at once
writeAllArtifacts(artifacts);
```

## Performance Metrics

### Measuring Impact

**Before optimization:**
- 4 file reads = 4 tool calls = ~400ms
- 4 file writes = 4 tool calls = ~400ms
- Total: ~800ms

**After optimization:**
- 1 batch read = 1 tool call = ~100ms
- 1 batch write = 1 tool call = ~100ms
- Total: ~200ms
- **4x faster!**

## Common Patterns

### Pattern 1: Read-Process-Write Batch

```typescript
// Read all inputs at once
const inputs = readMultipleFiles([
  'protocols/gopher.yaml',
  'protocols/finger.yaml',
  'protocols/pop3.yaml'
]);

// Process all in memory
const outputs = inputs.map(input => ({
  parser: generateParser(input),
  serializer: generateSerializer(input),
  types: generateTypes(input)
}));

// Write all outputs at once
const writeCommands = outputs.flatMap((output, i) => [
  `@"\n${output.parser}\n"@ | Out-File -FilePath generated/protocol${i}/parser.ts`,
  `@"\n${output.serializer}\n"@ | Out-File -FilePath generated/protocol${i}/serializer.ts`,
  `@"\n${output.types}\n"@ | Out-File -FilePath generated/protocol${i}/types.ts`
]).join('\n');

executePwsh({ command: writeCommands });
```

### Pattern 2: Validation Gate

```typescript
// Validate all before proceeding
const validations = await Promise.all([
  validateSpec('spec1.yaml'),
  validateSpec('spec2.yaml'),
  validateSpec('spec3.yaml')
]);

if (validations.every(v => v.valid)) {
  // All valid - proceed with batch generation
  batchGenerate(validations.map(v => v.spec));
} else {
  // Report all errors at once
  const errors = validations.filter(v => !v.valid);
  reportAllErrors(errors);
}
```

### Pattern 3: Incremental Batch

```typescript
// For very large operations, batch in chunks
const allFiles = [...Array(100)].map((_, i) => `file${i}.ts`);
const chunkSize = 10;

for (let i = 0; i < allFiles.length; i += chunkSize) {
  const chunk = allFiles.slice(i, i + chunkSize);
  
  // Process chunk in parallel
  const results = readMultipleFiles(chunk);
  processChunk(results);
  
  // Small delay between chunks to avoid overwhelming system
  await sleep(100);
}
```

## Decision Matrix

| Operation | Sequential Time | Batch Time | Speedup | Use Batching? |
|-----------|----------------|------------|---------|---------------|
| Read 1 file | 100ms | 100ms | 1x | No |
| Read 5 files | 500ms | 120ms | 4x | **Yes** |
| Read 20 files | 2000ms | 200ms | 10x | **Yes** |
| Write 1 file | 100ms | 100ms | 1x | No |
| Write 5 files | 500ms | 150ms | 3x | **Yes** |
| Run 1 test | 1000ms | 1000ms | 1x | No |
| Run 5 tests | 5000ms | 1200ms | 4x | **Yes** |
| Check 1 diagnostic | 200ms | 200ms | 1x | No |
| Check 5 diagnostics | 1000ms | 250ms | 4x | **Yes** |

**Rule of thumb: Batch when operating on 3+ items**

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Premature Batching
```typescript
// Don't batch if you need results immediately
const spec = readFile('spec.yaml'); // Need this NOW
const validated = validate(spec);   // Need this NOW
if (!validated) return;             // Early exit

// Don't batch these - they're sequential dependencies
```

### ❌ Anti-Pattern 2: Over-Batching
```typescript
// Don't batch unrelated operations
const batch = [
  readFile('spec.yaml'),
  executePwsh({ command: 'npm test' }),
  getDiagnostics(['src/parser.ts']),
  grepSearch({ query: 'TODO' })
];
// These are different tool types - can't batch
```

### ❌ Anti-Pattern 3: Ignoring Dependencies
```typescript
// Don't batch operations that depend on each other
const results = [
  generateParser(spec),      // Needs spec
  generateTests(parser),     // Needs parser (not available yet!)
  writeFiles(tests)          // Needs tests (not available yet!)
];
// These must be sequential
```

## Summary

**Key Principles:**
1. **Batch file operations** - Read/write multiple files at once
2. **Parallelize independent work** - Generate multiple artifacts simultaneously
3. **Use appropriate tools** - grepSearch, fileSearch, readMultipleFiles
4. **Validate before generating** - Catch all errors upfront
5. **Write once** - Generate in memory, write in batch

**Expected Performance Gains:**
- 3-5x faster for file operations
- 4-10x faster for multi-file generation
- 2-3x faster for test execution
- Overall: **3-5x faster execution time**

**When to Batch:**
- Operating on 3+ files
- Generating multiple artifacts
- Running multiple tests
- Checking multiple diagnostics
- Any independent operations

**When NOT to Batch:**
- Operations have dependencies
- Need immediate results
- Early exit conditions
- Different tool types
