/**
 * UI Generator
 * Generates terminal-based user interfaces for protocol interaction
 * 
 * This module generates simple CLI-based UIs that allow users to:
 * 1. Connect to protocol servers
 * 2. Send requests with user input
 * 3. Display responses in readable format
 * 4. Navigate through protocol-specific structures (e.g., Gopher directories)
 */

import type { ProtocolSpec } from '../types/protocol-spec.js';

/**
 * UI Generator
 * Generates terminal-based UIs for protocol implementations
 */
export class UIGenerator {
  /**
   * Generate a terminal UI for a protocol
   * @param spec - Protocol specification
   * @returns Generated UI code
   */
  generate(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name;

    // Generate protocol-specific UI based on protocol type
    if (protocolName.toLowerCase() === 'gopher') {
      return this.generateGopherUI(spec);
    }

    // Default generic UI for other protocols
    return this.generateGenericUI(spec);
  }

  /**
   * Convert string to PascalCase
   * @param str - Input string
   * @returns PascalCase string
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate generic UI for any protocol
   * @param spec - Protocol specification
   * @returns Generated generic UI code
   */
  private generateGenericUI(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name;
    const protocolNamePascal = this.toPascalCase(protocolName);
    const port = spec.protocol.port;

    return `/**
 * ${protocolName} Protocol Terminal UI
 * Interactive terminal interface for ${protocolName} protocol
 */

import * as readline from 'readline';
import * as net from 'net';

/**
 * ${protocolName} UI class
 */
export class ${protocolNamePascal}UI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Start the ${protocolName} UI
   */
  async start(host: string = 'localhost', port: number = ${port}): Promise<void> {
    console.log('\\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          ${protocolName} Protocol Client                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\\n');

    console.log(\`Connecting to \${host}:\${port}...\\n\`);
    
    // TODO: Implement protocol-specific interaction
    console.log('Protocol interaction not yet implemented.');
    console.log('Please refer to the generated parser and serializer for manual usage.\\n');
    
    this.close();
  }

  /**
   * Close the UI
   */
  private close(): void {
    console.log('\\n👋 Goodbye!\\n');
    this.rl.close();
    process.exit(0);
  }
}

/**
 * Main entry point
 */
if (require.main === module) {
  const ui = new ${protocolNamePascal}UI();
  const args = process.argv.slice(2);
  const host = args[0] || 'localhost';
  const port = args[1] ? parseInt(args[1], 10) : ${port};

  ui.start(host, port).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
`;
  }

  /**
   * Generate Gopher-specific UI with navigation
   * @param spec - Protocol specification
   * @returns Generated Gopher UI code
   */
  private generateGopherUI(spec: ProtocolSpec): string {
    const port = spec.protocol.port;

    return `/**
 * Gopher Protocol Terminal UI
 * Interactive terminal interface for browsing Gopherspace
 * 
 * Features:
 * - Item type icons/labels
 * - Navigation (clicking/selecting items sends new requests)
 * - Display text files in readable format
 * - Back navigation
 * 
 * Requirements: 13.5, 13.6
 */

import * as readline from 'readline';
import * as net from 'net';
import { GopherParser, DirectoryItem, Request, GopherItemType } from './gopher-parser.js';
import { GopherSerializer } from './gopher-serializer.js';

/**
 * Navigation history entry
 */
interface HistoryEntry {
  host: string;
  port: number;
  selector: string;
  title: string;
}

/**
 * Gopher UI class
 * Manages terminal-based Gopher browsing
 */
export class GopherUI {
  private parser: GopherParser;
  private serializer: GopherSerializer;
  private history: HistoryEntry[] = [];
  private currentItems: DirectoryItem[] = [];
  private rl: readline.Interface;

  constructor() {
    this.parser = new GopherParser();
    this.serializer = new GopherSerializer();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Start the Gopher UI
   * @param host - Initial host to connect to
   * @param port - Initial port (default: ${port})
   * @param selector - Initial selector (default: root)
   */
  async start(host: string = 'gopher.floodgap.com', port: number = ${port}, selector: string = ''): Promise<void> {
    console.log('\\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Welcome to the Gopher Browser!                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\\n');

    await this.navigate(host, port, selector, 'Root');
  }

  /**
   * Navigate to a Gopher location
   * @param host - Server host
   * @param port - Server port
   * @param selector - Resource selector
   * @param title - Display title for history
   */
  private async navigate(host: string, port: number, selector: string, title: string): Promise<void> {
    try {
      // Add to history
      this.history.push({ host, port, selector, title });

      // Fetch and display content
      const data = await this.fetchGopher(host, port, selector);
      
      // Try to parse as directory
      const items = this.parseDirectory(data);
      
      if (items.length > 0) {
        // Display as directory
        this.currentItems = items;
        this.displayDirectory(host, port, selector, items);
        await this.handleDirectoryInput();
      } else {
        // Display as text file
        this.displayTextFile(data);
        await this.handleTextFileInput();
      }
    } catch (error) {
      console.error(\`\\n❌ Error: \${error instanceof Error ? error.message : String(error)}\\n\`);
      await this.handleErrorInput();
    }
  }

  /**
   * Fetch data from Gopher server
   * @param host - Server host
   * @param port - Server port
   * @param selector - Resource selector
   * @returns Response data
   */
  private async fetchGopher(host: string, port: number, selector: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({ host, port }, () => {
        const request: Request = { selector };
        const serialized = this.serializer.request.serialize(request);

        if (!serialized.success) {
          client.destroy();
          reject(new Error(\`Serialization failed: \${serialized.error?.message}\`));
          return;
        }

        client.write(serialized.data!);
      });

      let responseData = Buffer.alloc(0);

      client.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
      });

      client.on('end', () => {
        resolve(responseData);
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.setTimeout(10000, () => {
        client.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  /**
   * Parse Gopher directory listing
   * @param data - Response data
   * @returns Array of directory items
   */
  private parseDirectory(data: Buffer): DirectoryItem[] {
    const items: DirectoryItem[] = [];
    let offset = 0;

    while (offset < data.length) {
      const remaining = data.slice(offset).toString('utf-8');
      
      // Check for end marker
      if (remaining.startsWith('.\\r\\n') || remaining.startsWith('.')) {
        break;
      }

      // Try to parse as directory item
      const lineEnd = data.indexOf('\\r\\n', offset);
      if (lineEnd === -1) break;

      const line = data.slice(offset, lineEnd).toString('utf-8');
      const item = this.parseGopherLine(line);
      
      if (item) {
        items.push(item);
      }

      offset = lineEnd + 2;
    }

    return items;
  }

  /**
   * Parse a single Gopher directory line
   * @param line - Directory line
   * @returns Parsed directory item or null
   */
  private parseGopherLine(line: string): DirectoryItem | null {
    const parts = line.split('\\t');
    if (parts.length < 4) return null;

    const firstPart = parts[0];
    if (firstPart.length === 0) return null;

    const itemType = firstPart[0] as DirectoryItem['itemType'];
    const display = firstPart.substring(1);
    const selector = parts[1];
    const host = parts[2];
    const port = parseInt(parts[3], 10);

    if (isNaN(port)) return null;

    return { itemType, display, selector, host, port };
  }

  /**
   * Display directory listing
   * @param host - Current host
   * @param port - Current port
   * @param selector - Current selector
   * @param items - Directory items
   */
  private displayDirectory(host: string, port: number, selector: string, items: DirectoryItem[]): void {
    console.clear();
    console.log(\`\\n📍 Location: gopher://\${host}:\${port}\${selector || '/'}\\n\`);
    console.log('═'.repeat(70));

    items.forEach((item, index) => {
      const icon = this.getItemIcon(item.itemType);
      const number = (index + 1).toString().padStart(3, ' ');
      console.log(\`\${number}. \${icon} \${item.display}\`);
    });

    console.log('═'.repeat(70));
    console.log(\`\\nTotal items: \${items.length}\`);
    console.log(\`\\nCommands: [number] to select | [b]ack | [q]uit\\n\`);
  }

  /**
   * Display text file content
   * @param data - File data
   */
  private displayTextFile(data: Buffer): void {
    console.clear();
    console.log('\\n📄 Text File Content:\\n');
    console.log('═'.repeat(70));
    
    const text = data.toString('utf-8').replace(/\\r\\n\\.\\r\\n$/, ''); // Remove end marker
    console.log(text);
    
    console.log('═'.repeat(70));
    console.log(\`\\nCommands: [b]ack | [q]uit\\n\`);
  }

  /**
   * Get icon for item type
   * @param itemType - Gopher item type
   * @returns Icon string
   */
  private getItemIcon(itemType: string): string {
    switch (itemType) {
      case '0': return '📄'; // Text file
      case '1': return '📁'; // Directory
      case '2': return '☎️ '; // CSO
      case '3': return '❌'; // Error
      case '7': return '🔍'; // Search
      case '9': return '📦'; // Binary
      case 'g': return '🖼️ '; // GIF
      case 'I': return '🖼️ '; // Image
      case 'h': return '🌐'; // HTML
      case 'i': return 'ℹ️ '; // Info
      default: return '❓';
    }
  }

  /**
   * Handle user input for directory navigation
   */
  private async handleDirectoryInput(): Promise<void> {
    const answer = await this.prompt('> ');
    const input = answer.trim().toLowerCase();

    if (input === 'q' || input === 'quit') {
      this.close();
      return;
    }

    if (input === 'b' || input === 'back') {
      await this.goBack();
      return;
    }

    // Try to parse as item number
    const itemNumber = parseInt(input, 10);
    if (!isNaN(itemNumber) && itemNumber >= 1 && itemNumber <= this.currentItems.length) {
      const item = this.currentItems[itemNumber - 1];
      
      // Skip informational items
      if (item.itemType === 'i') {
        console.log('\\nℹ️  This is an informational item (not selectable)\\n');
        await this.handleDirectoryInput();
        return;
      }

      await this.navigate(item.host, item.port, item.selector, item.display);
      return;
    }

    console.log('\\n❌ Invalid input. Please enter a number, [b]ack, or [q]uit.\\n');
    await this.handleDirectoryInput();
  }

  /**
   * Handle user input for text file viewing
   */
  private async handleTextFileInput(): Promise<void> {
    const answer = await this.prompt('> ');
    const input = answer.trim().toLowerCase();

    if (input === 'q' || input === 'quit') {
      this.close();
      return;
    }

    if (input === 'b' || input === 'back') {
      await this.goBack();
      return;
    }

    console.log('\\n❌ Invalid input. Please enter [b]ack or [q]uit.\\n');
    await this.handleTextFileInput();
  }

  /**
   * Handle user input after error
   */
  private async handleErrorInput(): Promise<void> {
    const answer = await this.prompt('Press [b]ack to return or [q]uit to exit: ');
    const input = answer.trim().toLowerCase();

    if (input === 'q' || input === 'quit') {
      this.close();
      return;
    }

    if (input === 'b' || input === 'back') {
      await this.goBack();
      return;
    }

    await this.handleErrorInput();
  }

  /**
   * Go back to previous location
   */
  private async goBack(): Promise<void> {
    // Remove current location
    this.history.pop();

    if (this.history.length === 0) {
      console.log('\\n❌ No more history. Exiting...\\n');
      this.close();
      return;
    }

    // Remove previous location (will be re-added by navigate)
    const previous = this.history.pop()!;
    await this.navigate(previous.host, previous.port, previous.selector, previous.title);
  }

  /**
   * Prompt user for input
   * @param question - Prompt text
   * @returns User input
   */
  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Close the UI
   */
  private close(): void {
    console.log('\\n👋 Thanks for using the Gopher Browser!\\n');
    this.rl.close();
    process.exit(0);
  }
}

/**
 * Main entry point
 * Run this file directly to start the Gopher browser
 */
if (require.main === module) {
  const ui = new GopherUI();
  
  // Get host and port from command line args
  const args = process.argv.slice(2);
  const host = args[0] || 'gopher.floodgap.com';
  const port = args[1] ? parseInt(args[1], 10) : ${port};
  const selector = args[2] || '';

  ui.start(host, port, selector).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
`;
    }
}

