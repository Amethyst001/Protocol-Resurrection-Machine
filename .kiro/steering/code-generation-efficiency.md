# Code Generation Efficiency Guidelines

This steering document provides guidance on choosing the most efficient approach for file operations and code generation tasks.

## When to Use File Tools vs Shell Commands

### Use File Tools (fsWrite, fsAppend, strReplace)

**Best for:**
- Creating files under 50 lines
- Making targeted edits to existing files
- Replacing specific code sections
- When you need precise control over formatting
- When working with complex string escaping

**Examples:**
```typescript
// Good: Small file creation
fsWrite('config.json', JSON.stringify(config, null, 2))

// Good: Targeted replacement
strReplace({
  path: 'src/parser.ts',
  oldStr: 'function oldParse() {',
  newStr: 'function newParse() {'
})

// Good: Incremental building of medium files
fsWrite('module.ts', header)
fsAppend('module.ts', exports)
fsAppend('module.ts', footer)
```

### Use PowerShell/Shell Commands

**Best for:**
- Generating large files (>100 lines)
- Bulk file operations (creating multiple files)
- Complex text transformations
- Operations that benefit from piping
- When file tools hit line limits

**Examples:**

#### Large Code Generation
```powershell
# Using heredoc for large code blocks
@"
export class LargeGeneratedClass {
  // ... hundreds of lines of generated code ...
}
"@ | Out-File -FilePath src/generated/large-class.ts -Encoding UTF8
```

#### Bulk File Creation
```powershell
# Create multiple files at once
$files = @{
  'parser.ts' = $parserCode
  'serializer.ts' = $serializerCode
  'types.ts' = $typesCode
}

foreach ($file in $files.GetEnumerator()) {
  $file.Value | Out-File -FilePath "src/generated/$($file.Key)" -Encoding UTF8
}
```

#### Using Node for Complex Generation
```powershell
# Generate code using Node.js script
node -e "
const code = generateComplexCode();
console.log(code);
" | Out-File -FilePath src/generated/output.ts -Encoding UTF8
```

## Decision Matrix

| Scenario | File Size | Complexity | Recommended Approach |
|----------|-----------|------------|---------------------|
| Config file | < 20 lines | Low | `fsWrite` |
| Small module | 20-50 lines | Low-Medium | `fsWrite` + `fsAppend` |
| Medium module | 50-100 lines | Medium | `fsWrite` + multiple `fsAppend` |
| Large module | 100-300 lines | Medium-High | PowerShell heredoc |
| Very large module | > 300 lines | High | Node script + PowerShell |
| Targeted edit | Any | Low | `strReplace` |
| Bulk operations | Multiple files | Any | PowerShell loop |

## Performance Considerations

### File Tools
- ✅ Better for precision and control
- ✅ Easier to debug and verify
- ✅ Better error messages
- ❌ Slower for large operations
- ❌ Hit line limits (50 lines per write)
- ❌ Multiple operations = multiple tool calls

### Shell Commands
- ✅ Better for bulk operations
- ✅ No line limits
- ✅ Single operation for large files
- ✅ Can leverage existing scripts
- ❌ Requires careful escaping
- ❌ Less precise error handling
- ❌ Platform-specific syntax

## Best Practices

### 1. Hybrid Approach for Large Code Generation

When generating large amounts of code:

```typescript
// Step 1: Generate code in memory (using your generator)
const generatedCode = generator.generateLargeModule(spec);

// Step 2: Write using PowerShell for efficiency
executePwsh({
  command: `@"\n${generatedCode}\n"@ | Out-File -FilePath src/generated/module.ts -Encoding UTF8`
});
```

### 2. Escape Special Characters Properly

When using PowerShell heredoc:
- Use `@"..."@` for strings with variables
- Use `@'...'@` for literal strings (no variable expansion)
- Escape `$` as `` `$ `` if needed
- Be careful with quotes inside the heredoc

### 3. Verify After Generation

Always verify generated files:
```typescript
// After using shell command
const diagnostics = await getDiagnostics(['src/generated/module.ts']);
if (diagnostics.length > 0) {
  // Handle errors
}
```

### 4. Use Temporary Files for Complex Operations

```powershell
# Generate to temp, verify, then move
$tempFile = New-TemporaryFile
$code | Out-File -FilePath $tempFile -Encoding UTF8

# Verify it's valid
node --check $tempFile

# Move to final location
Move-Item $tempFile src/generated/output.ts -Force
```

## Common Patterns

### Pattern 1: Generate Multiple Related Files

```powershell
# Generate parser, serializer, and types together
$protocol = "gopher"
$outputDir = "src/generated/$protocol"

# Create directory if needed
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# Generate all files
@"
$parserCode
"@ | Out-File -FilePath "$outputDir/parser.ts" -Encoding UTF8

@"
$serializerCode
"@ | Out-File -FilePath "$outputDir/serializer.ts" -Encoding UTF8

@"
$typesCode
"@ | Out-File -FilePath "$outputDir/types.ts" -Encoding UTF8
```

### Pattern 2: Incremental Generation with Checkpoints

```typescript
// For very large files, generate in chunks via shell
const chunks = splitIntoChunks(generatedCode, 500); // 500 lines per chunk

// First chunk - create file
executePwsh({
  command: `@"\n${chunks[0]}\n"@ | Out-File -FilePath src/output.ts -Encoding UTF8`
});

// Remaining chunks - append
for (let i = 1; i < chunks.length; i++) {
  executePwsh({
    command: `@"\n${chunks[i]}\n"@ | Add-Content -Path src/output.ts -Encoding UTF8`
  });
}
```

### Pattern 3: Template-Based Generation

```powershell
# Use PowerShell's template capabilities
$template = Get-Content templates/parser.template.ts -Raw
$output = $template -replace '{{PROTOCOL_NAME}}', $protocolName `
                     -replace '{{FIELDS}}', $fieldsCode `
                     -replace '{{METHODS}}', $methodsCode

$output | Out-File -FilePath src/generated/parser.ts -Encoding UTF8
```

## When to Switch Approaches

### Signs You Should Use Shell Commands Instead:
1. You're making 5+ `fsAppend` calls to the same file
2. You're hitting the 50-line limit repeatedly
3. You're generating multiple related files
4. The code generation logic is complex and would benefit from a script
5. You need to process or transform existing files

### Signs You Should Use File Tools Instead:
1. Making small, targeted changes
2. Need precise error handling
3. Working with complex string escaping
4. File is under 50 lines
5. Need to verify each step of the operation

## Error Handling

### File Tools
```typescript
try {
  fsWrite('output.ts', code);
} catch (error) {
  // Precise error about what failed
}
```

### Shell Commands
```typescript
const result = executePwsh({
  command: `$code | Out-File -FilePath output.ts -Encoding UTF8 -ErrorAction Stop`
});

if (result.exitCode !== 0) {
  // Check stderr for errors
  console.error(result.stderr);
}
```

## Summary

- **Small operations (< 50 lines)**: Use file tools
- **Medium operations (50-100 lines)**: Use file tools with multiple appends
- **Large operations (> 100 lines)**: Use PowerShell commands
- **Bulk operations**: Always use PowerShell
- **Targeted edits**: Always use `strReplace`

When in doubt, start with file tools for clarity, then optimize to shell commands if you hit limitations.
