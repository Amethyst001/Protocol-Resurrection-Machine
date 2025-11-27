# Smart Caching & Incremental Operations

This steering document provides guidance on avoiding redundant work through caching and incremental updates.

## Core Principle

**Never regenerate what hasn't changed. Cache expensive operations.**

## Caching Strategies

### 1. Spec Change Detection

**Before regenerating, check if the spec actually changed.**

```typescript
// ✅ Good: Check before regenerating
const currentSpecHash = hashFile('protocols/gopher.yaml');
const lastGeneratedHash = readFile('generated/gopher/.spec-hash');

if (currentSpecHash === lastGeneratedHash) {
  console.log('Spec unchanged - skipping generation');
  return;
}

// Spec changed - regenerate
generateProtocol('protocols/gopher.yaml');
fsWrite('generated/gopher/.spec-hash', currentSpecHash);
```

### 2. Parsed Spec Caching

**Cache parsed YAML to avoid re-parsing.**

```typescript
// Cache structure
const specCache = new Map<string, {
  spec: ProtocolSpec;
  timestamp: number;
  hash: string;
}>();

function getSpec(path: string): ProtocolSpec {
  const hash = hashFile(path);
  const cached = specCache.get(path);
  
  if (cached && cached.hash === hash) {
    return cached.spec; // Return cached
  }
  
  // Parse and cache
  const spec = parseYAML(readFile(path));
  specCache.set(path, { spec, timestamp: Date.now(), hash });
  return spec;
}
```

### 3. Analysis Result Caching

**Cache expensive analysis operations.**

```typescript
// Cache format analysis
const analysisCache = new Map<string, FormatAnalysis>();

function analyzeFormat(format: string, messageType: MessageType): FormatAnalysis {
  const cacheKey = `${format}:${JSON.stringify(messageType)}`;
  
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }
  
  const analysis = performExpensiveAnalysis(format, messageType);
  analysisCache.set(cacheKey, analysis);
  return analysis;
}
```

### 4. State Machine Caching

**Reuse state machines for identical format patterns.**

```typescript
// Cache by format string
const stateMachineCache = new Map<string, StateMachine>();

function getStateMachine(messageType: MessageType): StateMachine {
  const cacheKey = messageType.format;
  
  if (stateMachineCache.has(cacheKey)) {
    return stateMachineCache.get(cacheKey)!;
  }
  
  const sm = generateStateMachine(messageType);
  stateMachineCache.set(cacheKey, sm);
  return sm;
}
```

### 5. Template Compilation Caching

**Compile templates once, reuse many times.**

```typescript
// Cache compiled templates
const templateCache = new Map<string, CompiledTemplate>();

function getTemplate(name: string): CompiledTemplate {
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }
  
  const template = compileTemplate(readFile(`templates/${name}.hbs`));
  templateCache.set(name, template);
  return template;
}
```

## Incremental Operations

### 1. Detect What Changed

**Only regenerate affected files.**

```typescript
// Track dependencies
const dependencies = {
  'generated/gopher/parser.ts': ['protocols/gopher.yaml', 'templates/parser.hbs'],
  'generated/gopher/serializer.ts': ['protocols/gopher.yaml', 'templates/serializer.hbs'],
  'generated/gopher/types.ts': ['protocols/gopher.yaml', 'templates/types.hbs']
};

function getChangedFiles(changedSource: string): string[] {
  return Object.entries(dependencies)
    .filter(([_, deps]) => deps.includes(changedSource))
    .map(([target, _]) => target);
}

// Only regenerate affected files
const changed = getChangedFiles('protocols/gopher.yaml');
regenerateFiles(changed);
```

### 2. Partial Regeneration

**Regenerate only changed message types.**

```typescript
function incrementalGenerate(oldSpec: ProtocolSpec, newSpec: ProtocolSpec) {
  const changes = detectChanges(oldSpec, newSpec);
  
  if (changes.addedMessages.length > 0) {
    // Generate only new messages
    for (const msg of changes.addedMessages) {
      generateMessageParser(msg);
    }
  }
  
  if (changes.modifiedMessages.length > 0) {
    // Regenerate only modified messages
    for (const msg of changes.modifiedMessages) {
      regenerateMessageParser(msg);
    }
  }
  
  if (changes.deletedMessages.length > 0) {
    // Remove deleted message parsers
    for (const msg of changes.deletedMessages) {
      deleteFile(`generated/${msg.name}-parser.ts`);
    }
  }
  
  // Only regenerate main file if structure changed
  if (changes.structureChanged) {
    regenerateMainParser(newSpec);
  }
}
```

### 3. Smart Test Selection

**Run only tests for changed code.**

```typescript
function getAffectedTests(changedFiles: string[]): string[] {
  const testMap = {
    'src/core/format-parser.ts': ['tests/unit/format-parser.test.ts'],
    'src/generation/parser-generator.ts': [
      'tests/unit/parser-generator.test.ts',
      'tests/property/parser.property.test.ts'
    ],
    'src/core/state-machine.ts': [
      'tests/unit/state-machine.test.ts',
      'tests/property/state-machine-parser.property.test.ts'
    ]
  };
  
  const tests = new Set<string>();
  for (const file of changedFiles) {
    const relatedTests = testMap[file] || [];
    relatedTests.forEach(t => tests.add(t));
  }
  
  return Array.from(tests);
}

// Run only affected tests
const changedFiles = ['src/core/format-parser.ts'];
const testsToRun = getAffectedTests(changedFiles);
executePwsh({ command: `npm test -- ${testsToRun.join(' ')} --run` });
```

### 4. Incremental Compilation

**Only recompile changed modules.**

```typescript
// Check TypeScript build info
function needsRecompilation(file: string): boolean {
  const tsFile = file;
  const jsFile = file.replace('.ts', '.js');
  
  if (!fileExists(jsFile)) return true;
  
  const tsTime = getFileModTime(tsFile);
  const jsTime = getFileModTime(jsFile);
  
  return tsTime > jsTime;
}

// Only compile changed files
const changedTsFiles = allTsFiles.filter(needsRecompilation);
if (changedTsFiles.length > 0) {
  executePwsh({ 
    command: `tsc ${changedTsFiles.join(' ')} --incremental` 
  });
}
```

## Change Detection Algorithms

### 1. Hash-Based Detection

```typescript
function hashFile(path: string): string {
  const content = readFile(path);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hasFileChanged(path: string, lastHash: string): boolean {
  const currentHash = hashFile(path);
  return currentHash !== lastHash;
}
```

### 2. Timestamp-Based Detection

```typescript
function getFileModTime(path: string): number {
  const stats = fs.statSync(path);
  return stats.mtimeMs;
}

function isNewer(sourcePath: string, targetPath: string): boolean {
  if (!fileExists(targetPath)) return true;
  return getFileModTime(sourcePath) > getFileModTime(targetPath);
}
```

### 3. Content-Based Detection

```typescript
function detectSpecChanges(oldSpec: ProtocolSpec, newSpec: ProtocolSpec) {
  return {
    protocolChanged: !deepEqual(oldSpec.protocol, newSpec.protocol),
    addedMessages: newSpec.messageTypes.filter(
      m => !oldSpec.messageTypes.find(om => om.name === m.name)
    ),
    modifiedMessages: newSpec.messageTypes.filter(m => {
      const old = oldSpec.messageTypes.find(om => om.name === m.name);
      return old && !deepEqual(old, m);
    }),
    deletedMessages: oldSpec.messageTypes.filter(
      m => !newSpec.messageTypes.find(nm => nm.name === m.name)
    ),
    structureChanged: oldSpec.messageTypes.length !== newSpec.messageTypes.length
  };
}
```

## Cache Invalidation

### 1. Time-Based Invalidation

```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(cacheEntry: CacheEntry): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

function getCached<T>(key: string, cache: Map<string, CacheEntry<T>>): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (!isCacheValid(entry)) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}
```

### 2. Dependency-Based Invalidation

```typescript
function invalidateDependentCaches(changedFile: string) {
  // Invalidate all caches that depend on this file
  const dependents = getDependents(changedFile);
  
  for (const dependent of dependents) {
    specCache.delete(dependent);
    analysisCache.delete(dependent);
    stateMachineCache.delete(dependent);
  }
}
```

### 3. Manual Invalidation

```typescript
// Provide cache clearing commands
function clearAllCaches() {
  specCache.clear();
  analysisCache.clear();
  stateMachineCache.clear();
  templateCache.clear();
  console.log('All caches cleared');
}

function clearCache(type: 'spec' | 'analysis' | 'template' | 'all') {
  switch (type) {
    case 'spec': specCache.clear(); break;
    case 'analysis': analysisCache.clear(); break;
    case 'template': templateCache.clear(); break;
    case 'all': clearAllCaches(); break;
  }
}
```

## Persistent Caching

### 1. File-Based Cache

```typescript
// Save cache to disk
function saveCacheToDisk() {
  const cacheData = {
    specs: Array.from(specCache.entries()),
    analysis: Array.from(analysisCache.entries()),
    timestamp: Date.now()
  };
  
  fsWrite('.cache/agent-cache.json', JSON.stringify(cacheData));
}

// Load cache from disk
function loadCacheFromDisk() {
  if (!fileExists('.cache/agent-cache.json')) return;
  
  const cacheData = JSON.parse(readFile('.cache/agent-cache.json'));
  
  // Restore caches
  specCache = new Map(cacheData.specs);
  analysisCache = new Map(cacheData.analysis);
}
```

### 2. Build Artifacts Cache

```typescript
// Track what was generated and when
interface BuildManifest {
  version: string;
  timestamp: number;
  files: {
    [path: string]: {
      hash: string;
      sourceHash: string;
      dependencies: string[];
    };
  };
}

function saveBuildManifest(manifest: BuildManifest) {
  fsWrite('generated/.build-manifest.json', JSON.stringify(manifest, null, 2));
}

function loadBuildManifest(): BuildManifest | null {
  if (!fileExists('generated/.build-manifest.json')) return null;
  return JSON.parse(readFile('generated/.build-manifest.json'));
}
```

## Performance Optimization Patterns

### Pattern 1: Lazy Loading

```typescript
// Don't load until needed
class LazySpec {
  private _spec: ProtocolSpec | null = null;
  
  constructor(private path: string) {}
  
  get spec(): ProtocolSpec {
    if (!this._spec) {
      this._spec = parseYAML(readFile(this.path));
    }
    return this._spec;
  }
}
```

### Pattern 2: Memoization

```typescript
// Memoize expensive functions
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Usage
const expensiveAnalysis = memoize((format: string) => {
  return performExpensiveAnalysis(format);
});
```

### Pattern 3: Precomputation

```typescript
// Precompute common values
const COMMON_FORMATS = [
  '{type}{display}\t{selector}\t{host}\t{port}\r\n',
  '{username}@{host}\r\n',
  'USER {username}\r\n'
];

// Precompute state machines for common formats
const precomputedStateMachines = new Map(
  COMMON_FORMATS.map(format => [
    format,
    generateStateMachine({ format, /* ... */ })
  ])
);
```

## Monitoring & Metrics

### Track Cache Performance

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

function getCacheStats(cache: Map<any, any>): CacheStats {
  const hits = cacheHits.get(cache) || 0;
  const misses = cacheMisses.get(cache) || 0;
  const total = hits + misses;
  
  return {
    hits,
    misses,
    size: cache.size,
    hitRate: total > 0 ? hits / total : 0
  };
}

// Log cache performance
function logCachePerformance() {
  console.log('Cache Performance:');
  console.log('  Spec Cache:', getCacheStats(specCache));
  console.log('  Analysis Cache:', getCacheStats(analysisCache));
  console.log('  State Machine Cache:', getCacheStats(stateMachineCache));
}
```

## Decision Matrix

| Operation | Without Cache | With Cache | Speedup | Use Cache? |
|-----------|---------------|------------|---------|------------|
| Parse YAML | 50ms | 1ms | 50x | **Yes** |
| Analyze format | 100ms | 1ms | 100x | **Yes** |
| Generate state machine | 200ms | 1ms | 200x | **Yes** |
| Compile template | 150ms | 1ms | 150x | **Yes** |
| Hash file | 10ms | 10ms | 1x | No |
| Read file | 5ms | 5ms | 1x | No |

**Rule of thumb: Cache operations that take >20ms**

## Best Practices

### ✅ DO:
- Cache parsed specs
- Cache analysis results
- Cache compiled templates
- Check for changes before regenerating
- Use incremental updates
- Track dependencies
- Invalidate stale caches
- Monitor cache performance

### ❌ DON'T:
- Cache everything blindly
- Keep caches forever
- Ignore cache invalidation
- Cache file reads (OS does this)
- Cache simple operations
- Forget to clear caches on errors

## Summary

**Key Principles:**
1. **Check before regenerating** - Detect changes first
2. **Cache expensive operations** - Parsing, analysis, compilation
3. **Incremental updates** - Only regenerate what changed
4. **Smart invalidation** - Clear caches when dependencies change
5. **Monitor performance** - Track cache hit rates

**Expected Performance Gains:**
- 10-50x faster for cached operations
- 5-10x faster for incremental regeneration
- 3-5x faster for smart test selection
- Overall: **5-20x faster for repeated operations**

**When to Cache:**
- Parsing YAML specs
- Format string analysis
- State machine generation
- Template compilation
- Any operation >20ms

**When NOT to Cache:**
- File I/O (OS caches this)
- Simple string operations
- One-time operations
- Operations with side effects
