/**
 * MCP Tool Registry
 * 
 * Manages registration and lookup of MCP tools
 */

import { MCPTool, ToolHandler } from './types.js';

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: MCPTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  list(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }
}
