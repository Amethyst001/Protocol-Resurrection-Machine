# Tool Selection Guide

This steering document provides guidance on choosing the fastest and most appropriate tool for each task.

## Core Principle

**Use the right tool for the job. Each tool is optimized for specific operations.**

## File Reading Tools

### readFile - Single File Reading

**Use when:**
- Reading a single file
- Need the entire file content
- File is reasonably sized (< 10,000 lines)
- Need specific line ranges

**Don't use when:**
- Reading multiple files (use readMultipleFiles)
- Searching for specific content (use grepSearch)
- File is very large and you only need part of it

```typescript
// ✅ Good: Reading single file
const spec = readFile('protocols/gopher.yaml');

// ✅ Good: Reading specific lines
const header = readFile('src/parser.ts', { start_line: 1, end_line: 50 });

// ❌ Bad: Reading multiple files sequentially
const file1 = readFile('file1.ts');
const file2 = readFile('file2.ts');
const file3 = readFile('file3.ts');
```

### readMultipleFiles - Batch File Reading

**Use when:**
- Reading 2+ files
- Files are related (same operation)
- Want to minimize tool calls

**Don't use when:**
- Only reading one file
- Files are unrelated and may not all be needed

```typescript
// ✅ Good: Reading multiple related files
const files = readMultipleFiles([
  'src/parser.ts',
  'src/serializer.ts',
  'src/types.ts'
]);

// ✅ Good: Reading all test files
const tests = readMultipleFiles([
  'tests/unit/parser.test.ts',
  'tests/unit/serializer.test.ts',
  'tests/property/roundtrip.property.test.ts'
]);

// ❌ Bad: Reading unrelated files
const mixed = readMultipleFiles([
  'package.json',
  'src/parser.ts',
  'README.md'
]); // These serve different purposes
```

## Search Tools

### grepSearch - Content Search

**Use when:**
- Searching for specific text/patterns across files
- Don't know which files contain the content
- Want to find all occurrences
- Need context around matches

**Don't use when:**
- Searching for file names (use fileSearch)
- Need entire file content (use readFile)
- Searching in a single known file

```typescript
// ✅ Good: Finding all TODO comments
const todos = grepSearch({
  query: 'TODO:',
  includePattern: 'src/**/*.ts'
});

// ✅ Good: Finding function definitions
const functions = grepSearch({
  query: 'function\\s+\\w+',
  includePattern: '**/*.ts',
  caseSensitive: false
});

// ✅ Good: Finding imports
const imports = grepSearch({
  query: 'import.*from',
  includePattern: 'src/**/*.ts'
});

// ❌ Bad: Reading entire file
const file = grepSearch({ query: '.*' }); // Just use readFile!
```

### fileSearch - File Name Search

**Use when:**
- Looking for files by name
- Don't know exact path
- Want to find all files matching pattern

**Don't use when:**
- Searching file contents (use grepSearch)
- Know the exact path (just use readFile)

```typescript
// ✅ Good: Finding all test files
const testFiles = fileSearch({
  query: 'test',
  includePattern: '**/*.test.ts'
});

// ✅ Good: Finding parser files
const parsers = fileSearch({
  query: 'parser',
  includePattern: 'src/**/*.ts'
});

// ❌ Bad: Searching file content
const content = fileSearch({ query: 'function' }); // Use grepSearch!
```

## Diagnostic Tools

### getDiagnostics - Type/Lint Checking

**Use when:**
- Checking for TypeScript errors
- Validating code after generation
- Need compiler feedback
- Checking multiple files

**Don't use when:**
- Just want to compile (use executePwsh with tsc)
- Need runtime errors (use tests)

```typescript
// ✅ Good: Checking generated code
const diagnostics = getDiagnostics([
  'generated/gopher/parser.ts',
  'generated/gopher/serializer.ts',
  'generated/gopher/types.ts'
]);

// ✅ Good: Validating after changes
const errors = getDiagnostics(['src/core/format-parser.ts']);
if (errors.length > 0) {
  // Fix errors
}

// ❌ Bad: Compiling for production
getDiagnostics(['src/**/*.ts']); // Use tsc build instead
```

## File Writing Tools

### fsWrite - Create/Overwrite File

**Use when:**
- Creating new file
- Replacing entire file
- File is < 50 lines
- Content is ready

**Don't use when:**
- Appending to file (use fsAppend)
- Making targeted changes (use strReplace)
- File is > 100 lines (use PowerShell)

```typescript
// ✅ Good: Creating small file
fsWrite('config.json', JSON.stringify(config, null, 2));

// ✅ Good: Creating module
fsWrite('src/types.ts', `
export interface Message {
  type: string;
  data: any;
}
`);

// ❌ Bad: Creating large file
fsWrite('large-file.ts', /* 500 lines */); // Use PowerShell!
```

### fsAppend - Append to File

**Use when:**
- Adding to existing file
- Building file incrementally
- File already exists

**Don't use when:**
- Creating new file (use fsWrite first)
- File is large (use PowerShell)
- Making targeted changes (use strReplace)

```typescript
// ✅ Good: Building file incrementally
fsWrite('module.ts', header);
fsAppend('module.ts', exports);
fsAppend('module.ts', footer);

// ❌ Bad: Many appends
fsWrite('file.ts', line1);
fsAppend('file.ts', line2);
fsAppend('file.ts', line3);
// ... 50 more appends
// Use PowerShell instead!
```

### strReplace - Targeted Replacement

**Use when:**
- Changing specific code section
- Updating function/class
- Modifying existing code
- Need precision

**Don't use when:**
- Creating new file (use fsWrite)
- Replacing entire file (use fsWrite)
- Multiple unrelated changes (use multiple strReplace calls)

```typescript
// ✅ Good: Updating function
strReplace({
  path: 'src/parser.ts',
  oldStr: `function parse(data: string) {
    return JSON.parse(data);
  }`,
  newStr: `function parse(data: string) {
    return safeJSONParse(data);
  }`
});

// ✅ Good: Fixing bug
strReplace({
  path: 'src/validator.ts',
  oldStr: 'if (value > max)',
  newStr: 'if (value >= max)'
});

// ❌ Bad: Creating new file
strReplace({ path: 'new.ts', oldStr: '', newStr: code }); // Use fsWrite!
```

## Execution Tools

### executePwsh - Shell Commands

**Use when:**
- Running npm/node commands
- Complex file operations
- Bulk operations
- Need shell features

**Don't use when:**
- Simple file read (use readFile)
- Type checking (use getDiagnostics)
- File search (use fileSearch/grepSearch)

```typescript
// ✅ Good: Running tests
executePwsh({ command: 'npm test -- --run' });

// ✅ Good: Building project
executePwsh({ command: 'npm run build' });

// ✅ Good: Bulk file operations
executePwsh({ command: `
  $files = @('file1.ts', 'file2.ts', 'file3.ts')
  foreach ($f in $files) {
    Remove-Item $f
  }
`});

// ❌ Bad: Reading file
executePwsh({ command: 'cat file.ts' }); // Use readFile!

// ❌ Bad: Type checking
executePwsh({ command: 'tsc --noEmit' }); // Use getDiagnostics!
```

### controlPwshProcess - Long-Running Processes

**Use when:**
- Starting dev servers
- Running watch mode
- Background processes
- Need to stop later

**Don't use when:**
- Quick commands (use executePwsh)
- One-time operations
- Need immediate output

```typescript
// ✅ Good: Starting dev server
const process = controlPwshProcess({
  action: 'start',
  command: 'npm run dev'
});

// Later: stop it
controlPwshProcess({
  action: 'stop',
  processId: process.processId
});

// ❌ Bad: Running tests
controlPwshProcess({ action: 'start', command: 'npm test' }); // Use executePwsh!
```

## Directory Tools

### listDirectory - Directory Listing

**Use when:**
- Need to see directory structure
- Exploring unknown directories
- Need file metadata (size, dates)

**Don't use when:**
- Searching for specific files (use fileSearch)
- Reading file contents (use readFile)
- Know what you're looking for

```typescript
// ✅ Good: Exploring structure
const structure = listDirectory('src', { depth: 2 });

// ✅ Good: Checking what exists
const files = listDirectory('generated/gopher');

// ❌ Bad: Finding specific files
const tests = listDirectory('tests', { depth: 5 }); // Use fileSearch!
```

## Decision Tree

```
Need to work with files?
├─ Reading?
│  ├─ Single file? → readFile
│  ├─ Multiple files? → readMultipleFiles
│  ├─ Search content? → grepSearch
│  └─ Find by name? → fileSearch
│
├─ Writing?
│  ├─ New file < 50 lines? → fsWrite
│  ├─ New file > 100 lines? → executePwsh (PowerShell)
│  ├─ Append to file? → fsAppend
│  ├─ Change specific code? → strReplace
│  └─ Bulk operations? → executePwsh (PowerShell)
│
├─ Checking code?
│  ├─ Type errors? → getDiagnostics
│  ├─ Runtime errors? → executePwsh (npm test)
│  └─ Lint errors? → getDiagnostics
│
└─ Running commands?
   ├─ Quick command? → executePwsh
   ├─ Long-running? → controlPwshProcess
   └─ Tests? → executePwsh (npm test --run)
```

## Performance Comparison

| Task | Wrong Tool | Time | Right Tool | Time | Speedup |
|------|-----------|------|------------|------|---------|
| Read 5 files | 5x readFile | 500ms | readMultipleFiles | 120ms | 4x |
| Find TODO | readFile all | 2000ms | grepSearch | 200ms | 10x |
| Find test files | listDirectory | 500ms | fileSearch | 100ms | 5x |
| Check types | executePwsh tsc | 3000ms | getDiagnostics | 500ms | 6x |
| Write 200 lines | fsWrite+fsAppend | 1000ms | executePwsh | 150ms | 7x |
| Replace code | readFile+fsWrite | 200ms | strReplace | 50ms | 4x |

## Common Mistakes

### Mistake 1: Using Shell for Simple Operations

```typescript
// ❌ Bad
executePwsh({ command: 'cat file.ts' });

// ✅ Good
readFile('file.ts');
```

### Mistake 2: Reading Files to Search

```typescript
// ❌ Bad
const files = ['file1.ts', 'file2.ts', 'file3.ts'];
for (const file of files) {
  const content = readFile(file);
  if (content.includes('TODO')) {
    // found it
  }
}

// ✅ Good
grepSearch({ query: 'TODO', includePattern: '*.ts' });
```

### Mistake 3: Sequential File Reads

```typescript
// ❌ Bad
const file1 = readFile('file1.ts');
const file2 = readFile('file2.ts');
const file3 = readFile('file3.ts');

// ✅ Good
const files = readMultipleFiles(['file1.ts', 'file2.ts', 'file3.ts']);
```

### Mistake 4: Using fsWrite for Large Files

```typescript
// ❌ Bad
fsWrite('large.ts', /* 500 lines */);

// ✅ Good
executePwsh({ command: `@"\n${code}\n"@ | Out-File -FilePath large.ts` });
```

### Mistake 5: Using executePwsh for Type Checking

```typescript
// ❌ Bad
executePwsh({ command: 'tsc --noEmit file.ts' });

// ✅ Good
getDiagnostics(['file.ts']);
```

## Tool Selection Checklist

Before using a tool, ask:

1. **Is this the primary purpose of the tool?**
   - readFile is for reading, not searching
   - grepSearch is for searching, not reading entire files

2. **Am I doing this operation multiple times?**
   - Use batch tools (readMultipleFiles, getDiagnostics with array)

3. **Is there a specialized tool for this?**
   - Don't use shell commands when specialized tools exist

4. **Am I working with large data?**
   - Use appropriate tools (PowerShell for large files)

5. **Do I need the entire result?**
   - Use line ranges, search tools to get only what you need

## Summary

**Quick Reference:**

| Task | Tool | Alternative |
|------|------|-------------|
| Read 1 file | readFile | - |
| Read 2+ files | readMultipleFiles | - |
| Search content | grepSearch | - |
| Find files | fileSearch | - |
| Check types | getDiagnostics | - |
| Write small file | fsWrite | - |
| Write large file | executePwsh | - |
| Append to file | fsAppend | - |
| Replace code | strReplace | - |
| Run tests | executePwsh | - |
| Start server | controlPwshProcess | - |
| List directory | listDirectory | fileSearch |

**Key Principles:**
1. **Use specialized tools** - They're optimized for their purpose
2. **Batch operations** - Use tools that accept arrays
3. **Avoid shell for simple tasks** - Use direct tools
4. **Use shell for complex tasks** - Leverage PowerShell features
5. **Check diagnostics directly** - Don't shell out to tsc

**Expected Performance Gains:**
- 4-10x faster with right tool selection
- 3-5x faster with batching
- 2-3x faster avoiding unnecessary operations
- Overall: **3-7x faster execution**
