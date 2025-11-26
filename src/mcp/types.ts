/**
 * MCP Server Types
 * 
 * Type definitions for Model Context Protocol server implementation
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: ToolHandler;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  items?: JSONSchemaProperty;
}

export type ToolHandler = (args: any) => Promise<ToolResponse>;

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPTool[];
}

export interface MCPConfig {
  mcpServers: {
    [serverName: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
      disabled?: boolean;
      autoApprove?: string[];
    };
  };
}
