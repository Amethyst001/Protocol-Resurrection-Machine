# Efficiency Master Guide

This document provides a high-level overview of all efficiency steering documents and when to apply each strategy.

## Overview of Efficiency Documents

1. **code-generation-efficiency.md** - File operations and code generation
2. **parallel-operations.md** - Batching and parallelization
3. **smart-caching-and-incremental.md** - Caching and incremental updates
4. **tool-selection-guide.md** - Choosing the right tool
5. **execution-efficiency.md** - Context loading, communication, error prevention

## Quick Decision Guide

### "I need to generate code"
→ **code-generation-efficiency.md**
- < 50 lines: Use fsWrite
- 50-100 lines: Use fsWrite + fsAppend
- \> 100 lines: Use PowerShell heredoc
- Multiple files: Use PowerShell batch

### "I need to read files"
→ **tool-selection-guide.md** + **parallel-operations.md**
- 1 file: readFile
- 2+ files: readMultipleFiles
- Search content: grepSearch
- Find files: fileSearch
- Large file: Use line ranges

### "I'm regenerating the same thing"
→ **smart-caching-and-incremental.md**
- Cache parsed specs
- Check for changes first
- Use incremental updates
- Track dependencies

### "Operations are slow"
→ **parallel-operations.md**
- Batch file operations
- Read multiple files at once
- Check diagnostics together
- Write files in batch

### "I don't know which tool to use"
→ **tool-selection-guide.md**
- Use the decision tree
- Check performance comparison
- Follow the quick reference

### "I'm loading too much context"
→ **execution-efficiency.md**
- Use line ranges
- Search then read
- Load on demand
- Avoid reading dependencies

### "Too much back-and-forth"
→ **execution-efficiency.md**
- Batch questions
- Provide options
- Make safe assumptions
- Confirm only critical changes

### "Errors after generation"
→ **execution-efficiency.md**
- Validate before generating
- Type-check in memory
- Use dry-run mode
- Fail fast

## Performance Impact Summary

| Strategy | Time Saved | Complexity | Priority |
|----------|------------|------------|----------|
| Parallel operations | 3-5x | Low | **High** |
| Smart caching | 5-20x | Medium | **High** |
| Tool selection | 3-7x | Low | **High** |
| Code generation | 3-5x | Low | Medium |
| Minimal context | 2-4x | Low | Medium |
| Efficient communication | 2-3x | Low | Medium |
| Error prevention | 2-3x | Medium | Medium |

**Combined potential: 10-50x faster execution**

## Implementation Priority

### Phase 1: Quick Wins (Implement First)
1. **Use readMultipleFiles** instead of multiple readFile calls
2. **Use PowerShell** for files > 100 lines
3. **Use grepSearch** instead of reading files to search
4. **Batch getDiagnostics** calls

**Impact: 3-5x faster immediately**

### Phase 2: Smart Operations (Implement Second)
1. **Check for changes** before regenerating
2. **Cache parsed specs** and analysis results
3. **Use line ranges** for large files
4. **Batch questions** to user

**Impact: Additional 2-3x faster**

### Phase 3: Advanced Optimization (Implement Third)
1. **Incremental regeneration** of only changed parts
2. **Smart test selection** based on changes
3. **Persistent caching** across sessions
4. **Dependency tracking** for invalidation

**Impact: Additional 2-5x faster**

## Common Patterns

### Pattern 1: Multi-File Generation

```typescript
// ✅ Optimal approach
// 1. Validate all specs first
const specs = ['gopher.yaml', 'finger.yaml', 'pop3.yaml'];
const validations = specs.map(validateSpec);
if (!validations.every(v => v.valid)) return;

// 2. Generate all in memory
const generated = specs.map(spec => ({
  parser: generateParser(spec),
  serializer: generateSerializer(spec),
  types: generateTypes(spec)
}));

// 3. Write all at once via PowerShell
const writeScript = generated.flatMap((g, i) => [
  `@"\n${g.parser}\n"@ | Out-File -FilePath generated/${specs[i]}/parser.ts`,
  `@"\n${g.serializer}\n"@ | Out-File -FilePath generated/${specs[i]}/serializer.ts`,
  `@"\n${g.types}\n"@ | Out-File -FilePath generated/${specs[i]}/types.ts`
]).join('\n');

executePwsh({ command: writeScript });
```

### Pattern 2: Incremental Update

```typescript
// ✅ Optimal approach
// 1. Check what changed
const currentHash = hashFile('protocols/gopher.yaml');
const lastHash = readFile('generated/gopher/.spec-hash');

if (currentHash === lastHash) {
  console.log('No changes - skipping');
  return;
}

// 2. Detect specific changes
const oldSpec = getCachedSpec('gopher');
const newSpec = parseSpec('protocols/gopher.yaml');
const changes = detectChanges(oldSpec, newSpec);

// 3. Regenerate only affected parts
if (changes.modifiedMessages.length > 0) {
  regenerateMessages(changes.modifiedMessages);
}

// 4. Update hash
fsWrite('generated/gopher/.spec-hash', currentHash);
```

### Pattern 3: Search and Modify

```typescript
// ✅ Optimal approach
// 1. Search for target
const matches = grepSearch({
  query: 'function parseMessage',
  includePattern: 'src/**/*.ts'
});

// 2. Read only matched file with line range
const file = matches[0].file;
const line = matches[0].line;
const section = readFile(file, {
  start_line: line - 5,
  end_line: line + 20
});

// 3. Make targeted change
strReplace({
  path: file,
  oldStr: section,
  newStr: modifiedSection
});
```

### Pattern 4: Batch Validation

```typescript
// ✅ Optimal approach
// 1. Collect all files to validate
const filesToValidate = [
  'generated/gopher/parser.ts',
  'generated/gopher/serializer.ts',
  'generated/finger/parser.ts',
  'generated/finger/serializer.ts'
];

// 2. Check all at once
const diagnostics = getDiagnostics(filesToValidate);

// 3. Group errors by file
const errorsByFile = groupBy(diagnostics, d => d.file);

// 4. Report all errors
for (const [file, errors] of Object.entries(errorsByFile)) {
  console.log(`${file}: ${errors.length} errors`);
}
```

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Sequential Everything
```typescript
// Don't do this
const file1 = readFile('file1.ts');
const file2 = readFile('file2.ts');
const file3 = readFile('file3.ts');
fsWrite('out1.ts', generate(file1));
fsWrite('out2.ts', generate(file2));
fsWrite('out3.ts', generate(file3));
```

### ❌ Anti-Pattern 2: No Caching
```typescript
// Don't do this
for (let i = 0; i < 10; i++) {
  const spec = parseYAML(readFile('spec.yaml')); // Parsing 10 times!
  generate(spec);
}
```

### ❌ Anti-Pattern 3: Reading to Search
```typescript
// Don't do this
const allFiles = readMultipleFiles(['file1.ts', 'file2.ts', /* ... 50 files */]);
const found = allFiles.find(f => f.includes('TODO'));
```

### ❌ Anti-Pattern 4: Generate Then Validate
```typescript
// Don't do this
fsWrite('parser.ts', generateParser(spec));
const errors = getDiagnostics(['parser.ts']);
if (errors.length > 0) {
  // Oops, need to fix and regenerate
}
```

### ❌ Anti-Pattern 5: Many Small Questions
```typescript
// Don't do this
ask("Use TypeScript?");
ask("Add tests?");
ask("Use fast-check?");
ask("Generate docs?");
```

## Efficiency Checklist

Before starting any task, review this checklist:

### Planning Phase
- [ ] Can I batch any operations?
- [ ] Can I cache any results?
- [ ] Can I reuse existing work?
- [ ] Do I need all this context?
- [ ] Can I validate before generating?

### Execution Phase
- [ ] Am I using the right tools?
- [ ] Am I reading minimal context?
- [ ] Am I batching file operations?
- [ ] Am I checking for changes first?
- [ ] Am I failing fast on errors?

### Communication Phase
- [ ] Can I batch questions?
- [ ] Have I provided options?
- [ ] Am I making safe assumptions?
- [ ] Do I really need confirmation?

### Completion Phase
- [ ] Did I cache results for reuse?
- [ ] Did I update dependency tracking?
- [ ] Did I validate the output?
- [ ] Did I clean up temporary files?

## Measuring Success

### Key Metrics

1. **Tool Calls**: Fewer is better
   - Before: 20 tool calls
   - After: 5 tool calls
   - **4x reduction**

2. **Execution Time**: Faster is better
   - Before: 10 minutes
   - After: 2 minutes
   - **5x faster**

3. **Context Size**: Smaller is better
   - Before: 50,000 lines loaded
   - After: 5,000 lines loaded
   - **10x reduction**

4. **User Interactions**: Fewer is better
   - Before: 10 questions
   - After: 2 questions
   - **5x reduction**

### Success Criteria

A well-optimized execution should have:
- ✅ < 10 tool calls for typical tasks
- ✅ < 5 minutes execution time
- ✅ < 10,000 lines of context loaded
- ✅ < 3 user interactions
- ✅ 0 regenerations due to errors

## When to Apply Each Strategy

### Always Apply
- Use readMultipleFiles for 2+ files
- Use grepSearch for content search
- Use getDiagnostics for type checking
- Validate before generating
- Batch questions

### Apply When Appropriate
- Use caching for repeated operations
- Use incremental updates for large projects
- Use line ranges for large files
- Use PowerShell for bulk operations

### Apply for Advanced Cases
- Persistent caching across sessions
- Dependency tracking and invalidation
- Smart test selection
- Parallel generation

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│              EFFICIENCY QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────┤
│ Reading Files:                                          │
│   1 file    → readFile                                  │
│   2+ files  → readMultipleFiles                         │
│   Search    → grepSearch                                │
│   Find      → fileSearch                                │
├─────────────────────────────────────────────────────────┤
│ Writing Files:                                          │
│   < 50 lines   → fsWrite                                │
│   > 100 lines  → PowerShell                             │
│   Multiple     → PowerShell batch                       │
│   Targeted     → strReplace                             │
├─────────────────────────────────────────────────────────┤
│ Optimization:                                           │
│   Repeated ops → Cache results                          │
│   Unchanged    → Skip regeneration                      │
│   Large files  → Use line ranges                        │
│   Multiple ops → Batch together                         │
├─────────────────────────────────────────────────────────┤
│ Communication:                                          │
│   Questions    → Batch together                         │
│   Decisions    → Provide options                        │
│   Safe choices → Auto-proceed                           │
│   Critical     → Confirm only                           │
└─────────────────────────────────────────────────────────┘
```

## Summary

**The 5 Golden Rules of Efficiency:**

1. **Batch Everything** - Never do sequentially what can be done in parallel
2. **Cache Aggressively** - Never recompute what hasn't changed
3. **Load Minimally** - Never read more than you need
4. **Validate Early** - Never generate before validating
5. **Choose Wisely** - Never use the wrong tool for the job

**Expected Overall Impact: 10-50x faster execution**

Follow these guidelines and you'll see dramatic improvements in execution speed, reduced context usage, and better user experience.
