<script lang="ts">
  import { slide } from 'svelte/transition';

  const steeringDocs = [
    {
      id: 'best-practices',
      name: 'Protocol Design Best Practices',
      description: 'Guidelines for designing robust network protocols',
      content: `# Protocol Design Best Practices

## Connection Management
- Always specify connection type (TCP/UDP)
- Define clear timeout values
- Include port numbers in specifications
- Document handshake procedures

## Message Format
- Use consistent delimiters
- Define message types clearly
- Include format specifications
- Document encoding (UTF-8, ASCII, etc.)

## Error Handling
- Define error message formats
- Specify timeout behavior
- Document reconnection logic
- Include validation rules

## Security Considerations
- Document authentication methods
- Specify encryption requirements
- Define access control
- Include rate limiting guidelines`,
    },
    {
      id: 'yaml-structure',
      name: 'YAML Specification Structure',
      description: 'How to structure your protocol YAML files',
      content: `# YAML Specification Structure

## Required Fields
\`\`\`yaml
protocol:
  name: ProtocolName
  rfc: "RFC Number or N/A"
  port: 1234
  description: Clear description

connection:
  type: TCP or UDP
  timeout: milliseconds
  port: default port number
\`\`\`

## Message Types
Define all message types with:
- name: Message identifier
- direction: request/response/bidirectional
- format: Structure specification
- terminator: End-of-message marker

## Example
\`\`\`yaml
messageTypes:
  - name: Login
    direction: request
    format: "USER {username}\\r\\n"
    terminator: "\\r\\n"
\`\`\``,
    },
    {
      id: 'testing-guide',
      name: 'Testing Your Protocol',
      description: 'How to test and validate protocol implementations',
      content: `# Testing Your Protocol

## Protocol Discovery
1. Use the Discovery tab
2. Enter target host and port
3. Capture initial traffic
4. Verify fingerprint matches

## Code Generation
1. Validate YAML specification
2. Generate code in target language
3. Review generated parser
4. Test with sample data

## MCP Server Testing
1. Generate MCP server
2. Connect with Claude Desktop
3. Test protocol operations
4. Verify tool functionality

## Common Issues
- Missing connection.port field
- Invalid YAML syntax
- Incorrect message formats
- Timeout too short`,
    },
  ];

  let selectedDocId: string | null = null;

  function toggleDoc(id: string) {
    if (selectedDocId === id) {
      selectedDocId = null;
    } else {
      selectedDocId = id;
    }
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Steering System
    </h2>
    <span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
      {steeringDocs.length} Active
    </span>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-4 space-y-4">
    {#each steeringDocs as doc}
      <div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
        <button
          class="w-full flex items-center justify-between px-4 py-3 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          onclick={() => toggleDoc(doc.id)}
        >
          <div class="flex items-center gap-3">
            <div
              class="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.name}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>
            </div>
          </div>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform {selectedDocId ===
            doc.id
              ? 'rotate-180'
              : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {#if selectedDocId === doc.id}
          <div
            class="border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-black"
            transition:slide
          >
            <pre
              class="p-4 text-xs font-mono overflow-auto max-h-64 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{doc.content}</pre>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
