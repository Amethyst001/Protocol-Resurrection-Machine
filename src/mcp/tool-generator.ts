/**
 * MCP Tool Generator
 * 
 * Generates MCP tool definitions from protocol message types
 */

import { ProtocolSpec, MessageType } from '../types/protocol-spec.js';
import { MCPTool, ToolHandler, ToolResponse } from './types.js';
import { SchemaGenerator } from './schema-generator.js';

export class ToolGenerator {
  private schemaGenerator: SchemaGenerator;

  constructor() {
    this.schemaGenerator = new SchemaGenerator();
  }

  /**
   * Generate MCP tools from protocol specification
   */
  generateTools(spec: ProtocolSpec): MCPTool[] {
    const tools: MCPTool[] = [];

    for (const messageType of spec.messageTypes) {
      // Only generate tools for request messages or bidirectional messages
      if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
        const tool = this.generateTool(spec, messageType);
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Generate a single MCP tool from message type
   */
  private generateTool(spec: ProtocolSpec, messageType: MessageType): MCPTool {
    const toolName = this.generateToolName(spec.protocol.name, messageType.name);
    const description = this.generateToolDescription(spec, messageType);
    const inputSchema = this.schemaGenerator.generateSchema(messageType);
    const handler = this.generateToolHandler(spec, messageType);

    return {
      name: toolName,
      description,
      inputSchema,
      handler
    };
  }

  /**
   * Generate tool name following {protocol}_{operation} convention
   */
  private generateToolName(protocolName: string, messageName: string): string {
    const protocol = protocolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const operation = messageName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${protocol}_${operation}`;
  }

  /**
   * Generate tool description
   */
  private generateToolDescription(spec: ProtocolSpec, messageType: MessageType): string {
    const protocolName = spec.protocol.name;
    const operation = messageType.name;
    
    return `Execute ${operation} operation on ${protocolName} protocol (RFC ${spec.protocol.rfc || 'N/A'})`;
  }

  /**
   * Generate tool handler function
   * 
   * Note: This generates a placeholder handler. In actual implementation,
   * this would be replaced with generated code that uses the protocol's
   * parser, serializer, and client.
   */
  private generateToolHandler(spec: ProtocolSpec, messageType: MessageType): ToolHandler {
    return async (args: any): Promise<ToolResponse> => {
      try {
        // Validate required fields
        for (const field of messageType.fields) {
          if (field.required && !(field.name in args)) {
            return {
              content: [{
                type: 'text',
                text: `Error: Missing required field: ${field.name}`
              }],
              isError: true
            };
          }
        }

        // This is a placeholder - actual implementation would:
        // 1. Use generated serializer to create protocol message
        // 2. Use generated client to send message
        // 3. Use generated parser to parse response
        // 4. Return formatted response

        return {
          content: [{
            type: 'text',
            text: `Tool ${this.generateToolName(spec.protocol.name, messageType.name)} executed successfully with args: ${JSON.stringify(args)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    };
  }

  /**
   * Generate tool handler code as string (for code generation)
   */
  generateToolHandlerCode(spec: ProtocolSpec, messageType: MessageType): string {
    const toolName = this.generateToolName(spec.protocol.name, messageType.name);
    const protocolName = spec.protocol.name;
    const messageName = messageType.name;

    return `
/**
 * Handler for ${toolName} tool
 */
async function ${toolName}Handler(args: any): Promise<ToolResponse> {
  try {
    // Import generated protocol client
    const { ${protocolName}Client } = await import('./${protocolName.toLowerCase()}-client.js');
    const { serialize${messageName} } = await import('./${protocolName.toLowerCase()}-serializer.js');
    const { parse${messageName}Response } = await import('./${protocolName.toLowerCase()}-parser.js');

    // Create client instance
    const client = new ${protocolName}Client();

    // Serialize message
    const message = serialize${messageName}(args);

    // Send message and get response
    const response = await client.send(message);

    // Parse response
    const parsed = parse${messageName}Response(response);

    // Format response for MCP
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(parsed, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: \`Error: \${error instanceof Error ? error.message : 'Unknown error'}\`
      }],
      isError: true
    };
  }
}
`.trim();
  }

  /**
   * Validate tool definition
   */
  validateTool(tool: MCPTool): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check tool name follows convention
    if (!tool.name.match(/^[a-z0-9]+_[a-z0-9_]+$/)) {
      errors.push(`Tool name "${tool.name}" does not follow {protocol}_{operation} convention`);
    }

    // Check description exists
    if (!tool.description || tool.description.trim().length === 0) {
      errors.push('Tool must have a description');
    }

    // Check input schema is valid
    const schemaValidation = this.schemaGenerator.validateSchema(tool.inputSchema);
    if (!schemaValidation.valid) {
      errors.push(...schemaValidation.errors.map(e => `Schema error: ${e}`));
    }

    // Check handler exists
    if (typeof tool.handler !== 'function') {
      errors.push('Tool must have a handler function');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Count tools that would be generated for a protocol
   */
  countTools(spec: ProtocolSpec): number {
    return spec.messageTypes.filter(
      mt => mt.direction === 'request' || mt.direction === 'bidirectional'
    ).length;
  }
}
