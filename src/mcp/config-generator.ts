/**
 * MCP Config Generator
 * 
 * Generates mcp.json configuration files for MCP servers
 */

import { ProtocolSpec } from '../types/protocol-spec.js';
import { MCPConfig } from './types.js';

export interface MCPConfigOptions {
  /** Server name (defaults to protocol name) */
  serverName?: string;
  /** Command to run the server (defaults to 'node') */
  command?: string;
  /** Arguments for the command */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Whether server is disabled */
  disabled?: boolean;
  /** Tools to auto-approve */
  autoApprove?: string[];
}

export class ConfigGenerator {
  /**
   * Generate MCP config for a single protocol
   */
  generateConfig(spec: ProtocolSpec, options: MCPConfigOptions = {}): MCPConfig {
    const serverName = options.serverName || this.generateServerName(spec);
    const command = options.command || 'node';
    const args = options.args || this.generateDefaultArgs(spec);

    return {
      mcpServers: {
        [serverName]: {
          command,
          args,
          env: options.env || this.generateDefaultEnv(),
          disabled: options.disabled || false,
          autoApprove: options.autoApprove || []
        }
      }
    };
  }

  /**
   * Generate MCP config for multiple protocols (unified server)
   */
  generateMultiProtocolConfig(
    specs: ProtocolSpec[],
    options: MCPConfigOptions = {}
  ): MCPConfig {
    const serverName = options.serverName || 'protocol-resurrection-machine';
    const command = options.command || 'node';
    const args = options.args || ['dist/mcp-server.js'];

    // Collect all tool names for auto-approve
    const allTools: string[] = [];
    for (const spec of specs) {
      const protocolName = spec.protocol.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      for (const messageType of spec.messageTypes) {
        if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
          const operation = messageType.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          allTools.push(`${protocolName}_${operation}`);
        }
      }
    }

    return {
      mcpServers: {
        [serverName]: {
          command,
          args,
          env: options.env || this.generateDefaultEnv(),
          disabled: options.disabled || false,
          autoApprove: options.autoApprove || []
        }
      }
    };
  }

  /**
   * Generate server name from protocol
   */
  private generateServerName(spec: ProtocolSpec): string {
    return `${spec.protocol.name.toLowerCase()}-protocol`;
  }

  /**
   * Generate default command arguments
   */
  private generateDefaultArgs(spec: ProtocolSpec): string[] {
    const protocolName = spec.protocol.name.toLowerCase();
    return [`dist/generated/${protocolName}/mcp-server.js`];
  }

  /**
   * Generate default environment variables
   */
  private generateDefaultEnv(): Record<string, string> {
    return {
      LOG_LEVEL: 'info',
      NODE_ENV: 'production'
    };
  }

  /**
   * Merge multiple MCP configs
   */
  mergeConfigs(...configs: MCPConfig[]): MCPConfig {
    const merged: MCPConfig = { mcpServers: {} };

    for (const config of configs) {
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (merged.mcpServers[serverName]) {
          throw new Error(`Duplicate server name: ${serverName}`);
        }
        merged.mcpServers[serverName] = serverConfig;
      }
    }

    return merged;
  }

  /**
   * Validate MCP config
   */
  validateConfig(config: MCPConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check mcpServers exists
    if (!config.mcpServers) {
      errors.push('Config must have mcpServers field');
      return { valid: false, errors };
    }

    // Check each server config
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      // Check server name is valid
      if (!serverName || serverName.trim().length === 0) {
        errors.push('Server name cannot be empty');
      }

      // Check command exists
      if (!serverConfig.command || serverConfig.command.trim().length === 0) {
        errors.push(`Server ${serverName}: command cannot be empty`);
      }

      // Check args is an array
      if (!Array.isArray(serverConfig.args)) {
        errors.push(`Server ${serverName}: args must be an array`);
      }

      // Check env is an object if present
      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        errors.push(`Server ${serverName}: env must be an object`);
      }

      // Check disabled is boolean if present
      if (serverConfig.disabled !== undefined && typeof serverConfig.disabled !== 'boolean') {
        errors.push(`Server ${serverName}: disabled must be a boolean`);
      }

      // Check autoApprove is array if present
      if (serverConfig.autoApprove && !Array.isArray(serverConfig.autoApprove)) {
        errors.push(`Server ${serverName}: autoApprove must be an array`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate config file content as JSON string
   */
  generateConfigFile(config: MCPConfig, pretty: boolean = true): string {
    return JSON.stringify(config, null, pretty ? 2 : 0);
  }

  /**
   * Generate example config with comments (as JSON5-style string)
   */
  generateExampleConfig(spec: ProtocolSpec): string {
    const serverName = this.generateServerName(spec);
    const protocolName = spec.protocol.name;

    return `{
  // MCP Server Configuration for ${protocolName}
  "mcpServers": {
    "${serverName}": {
      // Command to run the server
      "command": "node",
      
      // Arguments passed to the command
      "args": ["dist/generated/${spec.protocol.name.toLowerCase()}/mcp-server.js"],
      
      // Environment variables
      "env": {
        "LOG_LEVEL": "info",
        "NODE_ENV": "production"
      },
      
      // Whether the server is disabled
      "disabled": false,
      
      // Tools that don't require user approval
      "autoApprove": []
    }
  }
}`;
  }

  /**
   * Add protocol to existing config
   */
  addProtocolToConfig(
    existingConfig: MCPConfig,
    spec: ProtocolSpec,
    options: MCPConfigOptions = {}
  ): MCPConfig {
    const newConfig = this.generateConfig(spec, options);
    return this.mergeConfigs(existingConfig, newConfig);
  }

  /**
   * Remove protocol from config
   */
  removeProtocolFromConfig(config: MCPConfig, serverName: string): MCPConfig {
    const newConfig: MCPConfig = { mcpServers: {} };

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (name !== serverName) {
        newConfig.mcpServers[name] = serverConfig;
      }
    }

    return newConfig;
  }
}
