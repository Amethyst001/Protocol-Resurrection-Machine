/**
 * MCP Tool Registry
 *
 * Manages registration and lookup of MCP tools
 */
export class ToolRegistry {
    tools = new Map();
    /**
     * Register a new tool
     */
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool ${tool.name} is already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    /**
     * Register multiple tools at once
     */
    registerAll(tools) {
        for (const tool of tools) {
            this.register(tool);
        }
    }
    /**
     * Get a tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Check if a tool exists
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * Get all registered tools
     */
    list() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tool names
     */
    names() {
        return Array.from(this.tools.keys());
    }
    /**
     * Clear all tools
     */
    clear() {
        this.tools.clear();
    }
    /**
     * Get tool count
     */
    count() {
        return this.tools.size;
    }
}
