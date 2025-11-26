/**
 * Protocol specification templates for quick start
 */

export interface Template {
	name: string;
	description: string;
	content: string;
}

export const templates: Template[] = [
	{
		name: 'Gopher Protocol',
		description: 'Classic Gopher directory protocol (RFC 1436)',
		content: `protocol:
  name: gopher
  version: "1.0"
  description: "Gopher protocol for hierarchical document retrieval"
  defaultPort: 70

connection:
  type: tcp
  terminator: "\\r\\n"

messageTypes:
  - name: Query
    direction: request
    format: "{selector}\\r\\n"
    fields:
      - name: selector
        type: string
        description: "Resource selector path"
        validation:
          maxLength: 255

  - name: DirectoryItem
    direction: response
    format: "{type}{display}\\t{selector}\\t{host}\\t{port}\\r\\n"
    fields:
      - name: type
        type: enum
        description: "Item type indicator"
        validation:
          values: ["0", "1", "3", "7", "9", "g", "h", "i"]
      - name: display
        type: string
        description: "Display string for the item"
      - name: selector
        type: string
        description: "Selector path"
      - name: host
        type: string
        description: "Hostname"
      - name: port
        type: integer
        description: "Port number"
        validation:
          min: 1
          max: 65535
`
	},
	{
		name: 'POP3 Protocol',
		description: 'Post Office Protocol v3 for email retrieval',
		content: `protocol:
  name: pop3
  version: "3.0"
  description: "Post Office Protocol version 3 for email retrieval"
  defaultPort: 110

connection:
  type: tcp
  terminator: "\\r\\n"

messageTypes:
  - name: Command
    direction: request
    format: "{command} {args}\\r\\n"
    fields:
      - name: command
        type: enum
        description: "POP3 command"
        validation:
          values: ["USER", "PASS", "STAT", "LIST", "RETR", "DELE", "QUIT"]
      - name: args
        type: string
        description: "Command arguments"
        optional: true

  - name: Response
    direction: response
    format: "{status} {message}\\r\\n"
    fields:
      - name: status
        type: enum
        description: "Response status"
        validation:
          values: ["+OK", "-ERR"]
      - name: message
        type: string
        description: "Response message"
`
	},
	{
		name: 'FTP Protocol',
		description: 'File Transfer Protocol control connection',
		content: `protocol:
  name: ftp
  version: "1.0"
  description: "File Transfer Protocol control connection"
  defaultPort: 21

connection:
  type: tcp
  terminator: "\\r\\n"

messageTypes:
  - name: Command
    direction: request
    format: "{command} {args}\\r\\n"
    fields:
      - name: command
        type: enum
        description: "FTP command"
        validation:
          values: ["USER", "PASS", "PWD", "CWD", "LIST", "RETR", "STOR", "QUIT"]
      - name: args
        type: string
        description: "Command arguments"
        optional: true

  - name: Response
    direction: response
    format: "{code} {message}\\r\\n"
    fields:
      - name: code
        type: integer
        description: "FTP response code"
        validation:
          min: 100
          max: 599
      - name: message
        type: string
        description: "Response message"
`
	},
	{
		name: 'Simple Binary Protocol',
		description: 'Template for a simple binary protocol with length prefix',
		content: `protocol:
  name: simple-binary
  version: "1.0"
  description: "Simple binary protocol with length-prefixed messages"
  defaultPort: 8080

connection:
  type: tcp
  terminator: null  # Binary protocol, no terminator

messageTypes:
  - name: Request
    direction: request
    format: "{length}{type}{payload}"
    fields:
      - name: length
        type: integer
        description: "Message length in bytes"
        validation:
          min: 0
          max: 65535
      - name: type
        type: enum
        description: "Message type"
        validation:
          values: ["0x01", "0x02", "0x03"]
      - name: payload
        type: string
        description: "Message payload"

  - name: Response
    direction: response
    format: "{length}{status}{data}"
    fields:
      - name: length
        type: integer
        description: "Response length in bytes"
        validation:
          min: 0
          max: 65535
      - name: status
        type: enum
        description: "Response status"
        validation:
          values: ["0x00", "0x01", "0xFF"]
      - name: data
        type: string
        description: "Response data"
`
	}
];

/**
 * Get a template by name
 */
export function getTemplate(name: string): Template | undefined {
	return templates.find(t => t.name === name);
}

/**
 * Get all template names
 */
export function getTemplateNames(): string[] {
	return templates.map(t => t.name);
}
