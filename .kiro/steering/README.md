# Kiro Steering Documents

This directory contains steering documents that guide agent behavior for optimal performance and code quality.

## 📚 Document Index

### 🚀 Efficiency & Performance (NEW!)

**Start here for maximum speed improvements:**

1. **[efficiency-master-guide.md](efficiency-master-guide.md)** - Overview of all efficiency strategies
   - Quick decision guide
   - Performance impact summary
   - Implementation priority
   - **Read this first!**

2. **[parallel-operations.md](parallel-operations.md)** - Batching and parallelization
   - Batch file operations (3-5x faster)
   - Parallel code generation
   - Test execution optimization
   - **High priority - Immediate 3-5x speedup**

3. **[smart-caching-and-incremental.md](smart-caching-and-incremental.md)** - Avoid redundant work
   - Caching strategies (5-20x faster for repeated ops)
   - Incremental updates
   - Change detection
   - **High priority - Huge wins for iterative work**

4. **[tool-selection-guide.md](tool-selection-guide.md)** - Choose the right tool
   - Decision tree for tool selection
   - Performance comparisons (3-7x faster)
   - Common mistakes to avoid
   - **High priority - Use right tool for the job**

5. **[code-generation-efficiency.md](code-generation-efficiency.md)** - File operations
   - When to use file tools vs shell commands
   - Large file generation strategies
   - Decision matrix
   - **Medium priority - 3-5x faster code generation**

6. **[execution-efficiency.md](execution-efficiency.md)** - Context, communication, error prevention
   - Minimal context loading (2-4x faster)
   - Efficient communication (2-3x fewer interactions)
   - Proactive error prevention
   - **Medium priority - Better UX and fewer errors**

### 🏗️ Architecture & Patterns

7. **[protocol-patterns.md](protocol-patterns.md)** - Protocol implementation patterns
   - Parser generation guidelines
   - Serializer patterns
   - Client generation
   - Property-based testing requirements

8. **[mcp-server-patterns.md](mcp-server-patterns.md)** - MCP server generation
   - Tool naming conventions
   - JSON schema generation
   - Error handling in MCP format
   - Security considerations

9. **[protocol-discovery-patterns.md](protocol-discovery-patterns.md)** - Protocol fingerprinting
   - Fingerprint generation
   - Probe design
   - Signature matching
   - Confidence scoring

10. **[constraint-solving-patterns.md](constraint-solving-patterns.md)** - Test data generation
    - Constraint types
    - Conflict detection
    - Multi-constraint satisfaction
    - Integration with fast-check

### 💻 Language & Testing

11. **[multi-language-idioms.md](multi-language-idioms.md)** - Language-specific patterns
    - TypeScript, Python, Go, Rust conventions
    - Naming conventions
    - Error handling patterns
    - Type system usage

12. **[testing-strategy.md](testing-strategy.md)** - Testing approach
    - Dual testing (unit + property)
    - Essential properties to test
    - Test organization
    - Coverage goals

13. **[workbench-development.md](workbench-development.md)** - SvelteKit UI patterns
    - Component structure
    - Tailwind CSS usage
    - API endpoint implementation
    - Performance optimization

### 📋 Specifications

14. **[yaml-spec-format.md](yaml-spec-format.md)** - Protocol YAML format
    - Schema definition
    - Field types
    - Validation rules
    - Examples

## 🎯 Quick Start Guide

### For Maximum Speed Improvements

1. Read **efficiency-master-guide.md** (5 min)
2. Implement **parallel-operations.md** strategies (immediate 3-5x speedup)
3. Add **smart-caching-and-incremental.md** patterns (additional 2-3x speedup)
4. Follow **tool-selection-guide.md** recommendations (additional 2-3x speedup)

**Total potential: 10-50x faster execution!**

### For Code Quality

1. Follow **protocol-patterns.md** for parser/serializer generation
2. Use **multi-language-idioms.md** for language-specific code
3. Apply **testing-strategy.md** for comprehensive testing
4. Reference **mcp-server-patterns.md** for MCP integration

### For Specific Tasks

| Task | Document |
|------|----------|
| Generating code | code-generation-efficiency.md |
| Reading files | tool-selection-guide.md |
| Caching results | smart-caching-and-incremental.md |
| Batching operations | parallel-operations.md |
| Writing tests | testing-strategy.md |
| Multi-language generation | multi-language-idioms.md |
| MCP server generation | mcp-server-patterns.md |
| Protocol discovery | protocol-discovery-patterns.md |
| UI development | workbench-development.md |

## 📊 Performance Impact Summary

| Strategy | Time Saved | Complexity | Priority |
|----------|------------|------------|----------|
| Parallel operations | 3-5x | Low | ⭐⭐⭐ High |
| Smart caching | 5-20x | Medium | ⭐⭐⭐ High |
| Tool selection | 3-7x | Low | ⭐⭐⭐ High |
| Code generation | 3-5x | Low | ⭐⭐ Medium |
| Minimal context | 2-4x | Low | ⭐⭐ Medium |
| Efficient communication | 2-3x | Low | ⭐⭐ Medium |

**Combined potential: 10-50x faster execution**

## 🔄 Document Relationships

```
efficiency-master-guide.md (START HERE)
    ├── parallel-operations.md (Batching)
    ├── smart-caching-and-incremental.md (Caching)
    ├── tool-selection-guide.md (Tool choice)
    ├── code-generation-efficiency.md (File ops)
    └── execution-efficiency.md (Context & communication)

protocol-patterns.md
    ├── multi-language-idioms.md (Language specifics)
    ├── testing-strategy.md (Testing approach)
    └── constraint-solving-patterns.md (Test generation)

mcp-server-patterns.md
    └── protocol-patterns.md (Base patterns)

workbench-development.md
    └── code-generation-efficiency.md (File operations)
```

## 🎓 Learning Path

### Beginner (Start Here)
1. efficiency-master-guide.md - Overview
2. tool-selection-guide.md - Basic tool usage
3. code-generation-efficiency.md - File operations

### Intermediate
4. parallel-operations.md - Batching strategies
5. smart-caching-and-incremental.md - Optimization
6. protocol-patterns.md - Implementation patterns

### Advanced
7. multi-language-idioms.md - Multi-language generation
8. mcp-server-patterns.md - MCP integration
9. protocol-discovery-patterns.md - Advanced features
10. constraint-solving-patterns.md - Complex test generation

## 📝 Usage Notes

### How Steering Documents Work

- **Always Active**: All steering documents in this directory are automatically included in agent context
- **Workspace-Level**: These override global steering rules
- **Conditional Loading**: Some documents can be configured to load only when specific files are accessed
- **Manual Loading**: Documents can be referenced explicitly with `#` in chat

### Best Practices

1. **Start with efficiency-master-guide.md** - It provides the big picture
2. **Reference specific documents** when working on related tasks
3. **Update documents** as patterns evolve
4. **Keep documents focused** - Each should cover one topic well
5. **Cross-reference** related documents for comprehensive guidance

### Document Maintenance

- **Review quarterly** - Ensure patterns are still relevant
- **Update with learnings** - Add new patterns as discovered
- **Remove obsolete patterns** - Keep documents current
- **Measure impact** - Track performance improvements

## 🚀 Expected Results

Following these steering documents should result in:

- ✅ **10-50x faster execution** for typical tasks
- ✅ **3-5x fewer tool calls** through batching
- ✅ **5-10x less context loaded** through smart loading
- ✅ **2-3x fewer user interactions** through batching questions
- ✅ **Higher code quality** through consistent patterns
- ✅ **Better error prevention** through validation
- ✅ **Faster iteration** through caching

## 📞 Support

If you have questions or suggestions for improving these steering documents:

1. Review the efficiency-master-guide.md for overview
2. Check specific documents for detailed guidance
3. Propose updates through pull requests
4. Share performance improvements and learnings

---

**Last Updated**: 2025-01-19
**Total Documents**: 14
**Total Size**: ~157 KB
**Focus**: Performance, Quality, Consistency
