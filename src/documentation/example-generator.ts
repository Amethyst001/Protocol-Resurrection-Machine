import type { ProtocolSpec, MessageType } from '../types/protocol-spec.js';

export interface CrossLanguageExample {
  title: string;
  description: string;
  typescript: string;
  python: string;
  go: string;
  rust: string;
  installation: {
    typescript: string;
    python: string;
    go: string;
    rust: string;
  };
}

export class ExampleGenerator {
  /**
   * Sanitize package name for use in package managers
   * Converts to lowercase, replaces spaces with hyphens, removes invalid characters
   */
  private sanitizePackageName(protocolName: string): string {
    return protocolName
      .toLowerCase()                    // Convert to lowercase
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/[^a-z0-9-_]/g, '')     // Remove invalid characters
      .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
      .replace(/-+/g, '-');            // Collapse multiple hyphens
  }

  /**
   * Generate cross-language examples for a protocol
   */
  generateCrossLanguageExamples(spec: ProtocolSpec): CrossLanguageExample[] {
    const examples: CrossLanguageExample[] = [];

    // Basic connection example
    examples.push(this.generateConnectionExample(spec));

    // Request/response example
    const requestMessage = spec.messageTypes.find(mt => mt.direction === 'request');
    if (requestMessage) {
      examples.push(this.generateRequestResponseExample(spec, requestMessage));
    }

    // Parsing example
    examples.push(this.generateParsingExample(spec));

    // Serialization example
    examples.push(this.generateSerializationExample(spec));

    return examples;
  }

  /**
   * Generate connection example
   */
  private generateConnectionExample(spec: ProtocolSpec): CrossLanguageExample {
    const protocolName = spec.protocol.name;
    const packageName = this.sanitizePackageName(spec.protocol.name);
    const port = spec.connection.defaultPort;

    return {
      title: 'Connecting to a Server',
      description: `Establish a connection to a ${protocolName} server`,
      typescript: this.generateTSConnectionExample(protocolName, packageName, port),
      python: this.generatePyConnectionExample(protocolName, packageName, port),
      go: this.generateGoConnectionExample(protocolName, packageName, port),
      rust: this.generateRustConnectionExample(protocolName, packageName, port),
      installation: this.generateInstallationInstructions(packageName)
    };
  }

  /**
   * Generate request/response example
   */
  private generateRequestResponseExample(
    spec: ProtocolSpec,
    requestMessage: MessageType
  ): CrossLanguageExample {
    const protocolName = spec.protocol.name;
    const packageName = this.sanitizePackageName(spec.protocol.name);
    const port = spec.connection.defaultPort;

    return {
      title: 'Sending a Request',
      description: `Send a ${requestMessage.name} request and receive a response`,
      typescript: this.generateTSRequestExample(protocolName, packageName, port, requestMessage),
      python: this.generatePyRequestExample(protocolName, packageName, port, requestMessage),
      go: this.generateGoRequestExample(protocolName, packageName, port, requestMessage),
      rust: this.generateRustRequestExample(protocolName, packageName, port, requestMessage),
      installation: this.generateInstallationInstructions(packageName)
    };
  }

  /**
   * Generate parsing example
   */
  private generateParsingExample(spec: ProtocolSpec): CrossLanguageExample {
    const protocolName = spec.protocol.name;
    const packageName = this.sanitizePackageName(spec.protocol.name);
    const firstMessage = spec.messageTypes[0];

    return {
      title: 'Parsing Messages',
      description: `Parse raw ${protocolName} protocol messages`,
      typescript: this.generateTSParsingExample(protocolName, packageName, firstMessage),
      python: this.generatePyParsingExample(protocolName, packageName, firstMessage),
      go: this.generateGoParsingExample(protocolName, packageName, firstMessage),
      rust: this.generateRustParsingExample(protocolName, packageName, firstMessage),
      installation: this.generateInstallationInstructions(packageName)
    };
  }

  /**
   * Generate serialization example
   */
  private generateSerializationExample(spec: ProtocolSpec): CrossLanguageExample {
    const protocolName = spec.protocol.name;
    const packageName = this.sanitizePackageName(spec.protocol.name);
    const firstMessage = spec.messageTypes[0];

    return {
      title: 'Serializing Messages',
      description: `Serialize ${protocolName} protocol messages to bytes`,
      typescript: this.generateTSSerializationExample(protocolName, packageName, firstMessage),
      python: this.generatePySerializationExample(protocolName, packageName, firstMessage),
      go: this.generateGoSerializationExample(protocolName, packageName, firstMessage),
      rust: this.generateRustSerializationExample(protocolName, packageName, firstMessage),
      installation: this.generateInstallationInstructions(packageName)
    };
  }

  // TypeScript examples

  private generateTSConnectionExample(protocolName: string, packageName: string, port: number): string {
    const className = this.toPascalCase(protocolName);
    return `import { ${className}Client } from '@prm/generated-${packageName}';

async function connect() {
  const client = new ${className}Client();
  
  try {
    await client.connect('${packageName}.example.com', ${port});
    console.log('Connected successfully');
    
    // Use the client...
    
  } finally {
    await client.disconnect();
  }
}

connect().catch(console.error);`;
  }

  private generateTSRequestExample(
    protocolName: string,
    packageName: string,
    port: number,
    requestMessage: MessageType
  ): string {
    const className = this.toPascalCase(protocolName);
    const methodName = this.toCamelCase(requestMessage.name);
    const requiredFields = requestMessage.fields.filter(f => f.required);
    
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `    ${f.name}: 'example'${comma}`;
    }).join('\n');

    return `import { ${className}Client } from '@prm/generated-${packageName}';

async function sendRequest() {
  const client = new ${className}Client();
  
  try {
    await client.connect('${packageName}.example.com', ${port});
    
    const response = await client.${methodName}({
${fieldLines}
    });
    
    console.log('Response:', response);
    
  } finally {
    await client.disconnect();
  }
}

sendRequest().catch(console.error);`;
  }

  private generateTSParsingExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    return `import { ${className}Parser } from '@prm/generated-${packageName}';

const parser = new ${className}Parser();
const rawData = Buffer.from('...'); // Raw protocol data

const result = parser.parse(rawData);

if (result.success) {
  console.log('Parsed message:', result.message);
  console.log('Message type:', result.message.type);
} else {
  console.error('Parse error:', result.error);
  console.error('At offset:', result.error.offset);
}`;
  }

  private generateTSSerializationExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    const requiredFields = messageType.fields.filter(f => f.required);
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `  ${f.name}: 'example'${comma}`;
    }).join('\n');

    return `import { ${className}Serializer } from '@prm/generated-${packageName}';

const serializer = new ${className}Serializer();

const message = {
${fieldLines}
};

const result = serializer.serialize(message);

if (result.success) {
  console.log('Serialized data:', result.data);
  console.log('Length:', result.data.length, 'bytes');
} else {
  console.error('Serialization error:', result.error);
}`;
  }

  // Python examples

  private generatePyConnectionExample(protocolName: string, packageName: string, port: number): string {
    const className = this.toPascalCase(protocolName);
    return `from prm_${packageName} import ${className}Client
import asyncio

async def connect():
    client = ${className}Client()
    
    try:
        await client.connect('${packageName}.example.com', ${port})
        print('Connected successfully')
        
        # Use the client...
        
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(connect())`;
  }

  private generatePyRequestExample(
    protocolName: string,
    packageName: string,
    port: number,
    requestMessage: MessageType
  ): string {
    const className = this.toPascalCase(protocolName);
    const methodName = this.toSnakeCase(requestMessage.name);
    const requiredFields = requestMessage.fields.filter(f => f.required);
    
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `        ${f.name}='example'${comma}`;
    }).join('\n');

    return `from prm_${packageName} import ${className}Client
import asyncio

async def send_request():
    client = ${className}Client()
    
    try:
        await client.connect('${packageName}.example.com', ${port})
        
        response = await client.${methodName}(
${fieldLines}
        )
        
        print('Response:', response)
        
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(send_request())`;
  }

  private generatePyParsingExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    return `from prm_${packageName} import ${className}Parser

parser = ${className}Parser()
raw_data = b'...'  # Raw protocol data

result = parser.parse(raw_data)

if result.success:
    print('Parsed message:', result.message)
    print('Message type:', result.message.type)
else:
    print('Parse error:', result.error)
    print('At offset:', result.error.offset)`;
  }

  private generatePySerializationExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    const requiredFields = messageType.fields.filter(f => f.required);
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `    ${f.name}='example'${comma}`;
    }).join('\n');

    return `from prm_${packageName} import ${className}Serializer

serializer = ${className}Serializer()

message = {
${fieldLines}
}

result = serializer.serialize(message)

if result.success:
    print('Serialized data:', result.data)
    print('Length:', len(result.data), 'bytes')
else:
    print('Serialization error:', result.error)`;
  }

  // Go examples

  private generateGoConnectionExample(protocolName: string, packageName: string, port: number): string {
    const className = this.toPascalCase(protocolName);
    return `package main

import (
    "fmt"
    "log"
    "${packageName}" "github.com/prm/generated/${packageName}"
)

func main() {
    client := ${packageName}.New${className}Client()
    
    err := client.Connect("${packageName}.example.com", ${port})
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect()
    
    fmt.Println("Connected successfully")
    
    // Use the client...
}`;
  }

  private generateGoRequestExample(
    protocolName: string,
    packageName: string,
    port: number,
    requestMessage: MessageType
  ): string {
    const className = this.toPascalCase(protocolName);
    const requiredFields = requestMessage.fields.filter(f => f.required);
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `        ${this.toPascalCase(f.name)}: "example"${comma}`;
    }).join('\n');

    return `package main

import (
    "fmt"
    "log"
    "${packageName}" "github.com/prm/generated/${packageName}"
)

func main() {
    client := ${packageName}.New${className}Client()
    
    err := client.Connect("${packageName}.example.com", ${port})
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect()
    
    response, err := client.${requestMessage.name}(
${fieldLines}
    )
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Println("Response:", response)
}`;
  }

  private generateGoParsingExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    return `package main

import (
    "fmt"
    "log"
    "${packageName}" "github.com/prm/generated/${packageName}"
)

func main() {
    parser := ${packageName}.New${className}Parser()
    rawData := []byte{...} // Raw protocol data
    
    message, err := parser.Parse(rawData)
    if err != nil {
        log.Fatal("Parse error:", err)
    }
    
    fmt.Println("Parsed message:", message)
    fmt.Println("Message type:", message.Type)
}`;
  }

  private generateGoSerializationExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    const requiredFields = messageType.fields.filter(f => f.required);
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `        ${this.toPascalCase(f.name)}: "example"${comma}`;
    }).join('\n');

    return `package main

import (
    "fmt"
    "log"
    "${packageName}" "github.com/prm/generated/${packageName}"
)

func main() {
    serializer := ${packageName}.New${className}Serializer()
    
    message := &${packageName}.${messageType.name}{
${fieldLines}
    }
    
    data, err := serializer.Serialize(message)
    if err != nil {
        log.Fatal("Serialization error:", err)
    }
    
    fmt.Println("Serialized data:", data)
    fmt.Println("Length:", len(data), "bytes")
}`;
  }

  // Rust examples

  private generateRustConnectionExample(protocolName: string, packageName: string, port: number): string {
    const className = this.toPascalCase(protocolName);
    return `use prm_${packageName}::${className}Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = ${className}Client::new();
    
    client.connect("${packageName}.example.com", ${port}).await?;
    println!("Connected successfully");
    
    // Use the client...
    
    client.disconnect().await?;
    Ok(())
}`;
  }

  private generateRustRequestExample(
    protocolName: string,
    packageName: string,
    port: number,
    requestMessage: MessageType
  ): string {
    const className = this.toPascalCase(protocolName);
    const methodName = this.toSnakeCase(requestMessage.name);
    const requiredFields = requestMessage.fields.filter(f => f.required);
    const fieldArgs = requiredFields.map(() => '"example".to_string()').join(', ');

    return `use prm_${packageName}::${className}Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = ${className}Client::new();
    
    client.connect("${packageName}.example.com", ${port}).await?;
    
    let response = client.${methodName}(${fieldArgs}).await?;
    
    println!("Response: {:?}", response);
    
    client.disconnect().await?;
    Ok(())
}`;
  }

  private generateRustParsingExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    return `use prm_${packageName}::${className}Parser;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let parser = ${className}Parser::new();
    let raw_data = b"..."; // Raw protocol data
    
    match parser.parse(raw_data) {
        Ok(message) => {
            println!("Parsed message: {:?}", message);
            println!("Message type: {:?}", message.message_type);
        }
        Err(e) => {
            eprintln!("Parse error: {}", e);
            eprintln!("At offset: {:?}", e.offset);
        }
    }
    
    Ok(())
}`;
  }

  private generateRustSerializationExample(protocolName: string, packageName: string, messageType: MessageType): string {
    const className = this.toPascalCase(protocolName);
    const requiredFields = messageType.fields.filter(f => f.required);
    const fieldLines = requiredFields.map((f, i) => {
      const comma = i < requiredFields.length - 1 ? ',' : '';
      return `        ${f.name}: "example".to_string()${comma}`;
    }).join('\n');

    return `use prm_${packageName}::{${className}Serializer, ${messageType.name}};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let serializer = ${className}Serializer::new();
    
    let message = ${messageType.name} {
${fieldLines}
    };
    
    match serializer.serialize(&message) {
        Ok(data) => {
            println!("Serialized data: {:?}", data);
            println!("Length: {} bytes", data.len());
        }
        Err(e) => {
            eprintln!("Serialization error: {}", e);
        }
    }
    
    Ok(())
}`;
  }

  // Installation instructions

  private generateInstallationInstructions(packageName: string): {
    typescript: string;
    python: string;
    go: string;
    rust: string;
  } {
    return {
      typescript: `npm install @prm/generated-${packageName}`,
      python: `pip install prm-${packageName}`,
      go: `go get github.com/prm/generated/${packageName}`,
      rust: `cargo add prm-${packageName}`
    };
  }

  // Helper methods

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  }
}
