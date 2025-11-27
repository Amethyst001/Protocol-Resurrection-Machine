# Multi-Language Code Generation Idioms

This document defines language-specific patterns and conventions for generating protocol implementations across multiple programming languages.

## Naming Conventions

### TypeScript
- **Types/Interfaces**: PascalCase (`GopherMessage`, `FingerRequest`)
- **Functions/Variables**: camelCase (`parseMessage`, `connectionTimeout`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BUFFER_SIZE`, `DEFAULT_PORT`)
- **Files**: kebab-case (`gopher-parser.ts`, `finger-client.ts`)
- **Private members**: prefix with underscore (`_internalState`)

### Python
- **Classes**: PascalCase (`GopherParser`, `FingerClient`)
- **Functions/Variables**: snake_case (`parse_message`, `connection_timeout`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BUFFER_SIZE`, `DEFAULT_PORT`)
- **Modules**: snake_case (`gopher_parser.py`, `finger_client.py`)
- **Private members**: prefix with underscore (`_internal_state`)

### Go
- **Exported types**: PascalCase (`GopherMessage`, `FingerRequest`)
- **Unexported types**: camelCase (`internalState`, `parseContext`)
- **Functions**: PascalCase for exported, camelCase for unexported
- **Constants**: PascalCase or UPPER_SNAKE_CASE
- **Files**: snake_case (`gopher_parser.go`, `finger_client.go`)
- **Packages**: lowercase single word (`gopher`, `finger`)

### Rust
- **Types/Structs**: PascalCase (`GopherMessage`, `FingerRequest`)
- **Functions/Variables**: snake_case (`parse_message`, `connection_timeout`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BUFFER_SIZE`, `DEFAULT_PORT`)
- **Modules**: snake_case (`gopher_parser`, `finger_client`)
- **Traits**: PascalCase (`Parser`, `Serializer`)

## Error Handling Patterns

### TypeScript
```typescript
// Use Result types for expected errors
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Throw for unexpected/programming errors
class ProtocolError extends Error {
  constructor(
    message: string,
    public readonly offset?: number,
    public readonly expected?: string
  ) {
    super(message);
    this.name = 'ProtocolError';
  }
}

// Return Results for parsing/validation
function parse(data: Buffer): Result<Message, ProtocolError> {
  // ...
}
```

### Python
```python
# Use exceptions for all errors
class ProtocolError(Exception):
    """Base exception for protocol errors"""
    def __init__(self, message: str, offset: Optional[int] = None):
        super().__init__(message)
        self.offset = offset

# Raise exceptions with context
def parse(data: bytes) -> Message:
    if not data:
        raise ProtocolError("Empty input", offset=0)
    # ...
```

### Go
```go
// Return errors as second value
type ProtocolError struct {
    Message string
    Offset  int
}

func (e *ProtocolError) Error() string {
    return fmt.Sprintf("%s at offset %d", e.Message, e.Offset)
}

func Parse(data []byte) (*Message, error) {
    if len(data) == 0 {
        return nil, &ProtocolError{Message: "empty input", Offset: 0}
    }
    // ...
}
```

### Rust
```rust
// Use Result with custom error types
#[derive(Debug)]
pub struct ProtocolError {
    pub message: String,
    pub offset: Option<usize>,
}

impl std::fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ProtocolError {}

pub fn parse(data: &[u8]) -> Result<Message, ProtocolError> {
    // ...
}
```

## Async Patterns

### TypeScript
```typescript
// Use Promises and async/await
async function connect(host: string, port: number): Promise<Connection> {
  const socket = await createConnection({ host, port });
  return new Connection(socket);
}

// Use AsyncIterator for streaming
async function* streamMessages(conn: Connection): AsyncIterableIterator<Message> {
  for await (const chunk of conn.stream()) {
    yield parseMessage(chunk);
  }
}
```

### Python
```python
# Use asyncio and async/await
async def connect(host: str, port: int) -> Connection:
    reader, writer = await asyncio.open_connection(host, port)
    return Connection(reader, writer)

# Use async generators for streaming
async def stream_messages(conn: Connection) -> AsyncIterator[Message]:
    async for chunk in conn.stream():
        yield parse_message(chunk)
```

### Go
```go
// Use goroutines and channels
func Connect(host string, port int) (*Connection, error) {
    conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", host, port))
    if err != nil {
        return nil, err
    }
    return &Connection{conn: conn}, nil
}

// Use channels for streaming
func StreamMessages(conn *Connection) <-chan Message {
    ch := make(chan Message)
    go func() {
        defer close(ch)
        for {
            msg, err := conn.ReadMessage()
            if err != nil {
                return
            }
            ch <- msg
        }
    }()
    return ch
}
```

### Rust
```rust
// Use async/await with tokio
pub async fn connect(host: &str, port: u16) -> Result<Connection, std::io::Error> {
    let stream = TcpStream::connect((host, port)).await?;
    Ok(Connection::new(stream))
}

// Use Stream trait for streaming
pub fn stream_messages(conn: Connection) -> impl Stream<Item = Result<Message, ProtocolError>> {
    stream::unfold(conn, |mut conn| async move {
        match conn.read_message().await {
            Ok(msg) => Some((Ok(msg), conn)),
            Err(e) => Some((Err(e), conn)),
        }
    })
}
```

## Type System Usage

### TypeScript
- Use strict null checks: `string | null` not `string?`
- Use union types for variants: `type ItemType = 'file' | 'directory' | 'error'`
- Use interfaces for objects: `interface Message { ... }`
- Use type aliases for unions: `type Result<T> = Success<T> | Failure`
- Use generics for reusable code: `function parse<T>(data: Buffer): Result<T>`

### Python
- Use type hints everywhere: `def parse(data: bytes) -> Message:`
- Use Optional for nullable: `Optional[str]` not `str | None` (pre-3.10)
- Use Union for variants: `Union[File, Directory, Error]`
- Use TypedDict for structured data: `class Message(TypedDict): ...`
- Use Generic for reusable code: `T = TypeVar('T')`

### Go
- Use interfaces for abstraction: `type Parser interface { Parse([]byte) (*Message, error) }`
- Use struct embedding for composition
- Use pointer receivers for methods that modify state
- Use value receivers for methods that don't modify state
- Avoid interface{} when possible, use generics (Go 1.18+)

### Rust
- Use enums for variants: `enum ItemType { File, Directory, Error }`
- Use Option for nullable: `Option<String>`
- Use Result for errors: `Result<Message, ProtocolError>`
- Use traits for abstraction: `trait Parser { fn parse(&self, data: &[u8]) -> Result<Message>; }`
- Use lifetimes when necessary: `fn parse<'a>(data: &'a [u8]) -> Result<&'a str>`

## Memory Management

### TypeScript
- Let garbage collector handle memory
- Avoid circular references
- Use WeakMap/WeakSet for caches
- Close resources explicitly (sockets, files)

### Python
- Let garbage collector handle memory
- Use context managers for resources: `with open(...) as f:`
- Close connections explicitly in finally blocks
- Use `__del__` sparingly

### Go
- Use defer for cleanup: `defer conn.Close()`
- Avoid memory leaks with goroutines (ensure they exit)
- Use sync.Pool for frequently allocated objects
- Return pointers for large structs

### Rust
- Leverage ownership system
- Use references when ownership not needed: `&str` vs `String`
- Use Arc/Rc for shared ownership
- Use lifetimes to prevent dangling references
- Implement Drop for custom cleanup

## Documentation Standards

### TypeScript
```typescript
/**
 * Parses a Gopher protocol message from raw bytes.
 * 
 * @param data - The raw byte buffer to parse
 * @returns A Result containing either the parsed message or an error
 * 
 * @example
 * ```typescript
 * const result = parse(buffer);
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export function parse(data: Buffer): Result<Message, ProtocolError> {
  // ...
}
```

### Python
```python
def parse(data: bytes) -> Message:
    """
    Parse a Gopher protocol message from raw bytes.
    
    Args:
        data: The raw bytes to parse
        
    Returns:
        The parsed message object
        
    Raises:
        ProtocolError: If the data is malformed
        
    Example:
        >>> msg = parse(b"0About\t/about\tgopher.example.com\t70\r\n")
        >>> print(msg.item_type)
        '0'
    """
    # ...
```

### Go
```go
// Parse parses a Gopher protocol message from raw bytes.
//
// The function returns a pointer to the parsed Message and an error.
// If parsing fails, the error will contain details about the failure.
//
// Example:
//   msg, err := Parse(data)
//   if err != nil {
//       log.Fatal(err)
//   }
func Parse(data []byte) (*Message, error) {
    // ...
}
```

### Rust
```rust
/// Parses a Gopher protocol message from raw bytes.
///
/// # Arguments
///
/// * `data` - A byte slice containing the raw protocol data
///
/// # Returns
///
/// Returns `Ok(Message)` if parsing succeeds, or `Err(ProtocolError)` if the data is malformed.
///
/// # Examples
///
/// ```
/// let data = b"0About\t/about\tgopher.example.com\t70\r\n";
/// let msg = parse(data)?;
/// assert_eq!(msg.item_type, '0');
/// ```
pub fn parse(data: &[u8]) -> Result<Message, ProtocolError> {
    // ...
}
```

## Testing Patterns

### TypeScript
- Use Vitest or Jest
- Use fast-check for property-based testing
- Mock with vi.mock() or jest.mock()
- Use describe/it/test structure

### Python
- Use pytest
- Use hypothesis for property-based testing
- Mock with unittest.mock or pytest-mock
- Use fixtures for setup/teardown

### Go
- Use standard testing package
- Use testify for assertions
- Use table-driven tests
- Use subtests with t.Run()

### Rust
- Use built-in test framework
- Use proptest for property-based testing
- Use mockall for mocking
- Use #[test] attribute

## Code Generation Guidelines

When generating code:

1. **Respect language idioms** - Don't generate Python-style code in TypeScript
2. **Use language-specific error handling** - Results in TS/Rust, exceptions in Python, error returns in Go
3. **Follow naming conventions** - camelCase vs snake_case vs PascalCase
4. **Use appropriate async patterns** - Promises vs asyncio vs goroutines vs tokio
5. **Generate idiomatic documentation** - JSDoc vs docstrings vs godoc vs rustdoc
6. **Include proper imports** - Use language-specific module systems
7. **Handle null/optional correctly** - Use language-specific nullable types
8. **Use appropriate collection types** - Array vs list vs slice vs Vec

## Cross-Language Mapping

| Concept | TypeScript | Python | Go | Rust |
|---------|-----------|--------|-----|------|
| String | `string` | `str` | `string` | `String` / `&str` |
| Bytes | `Buffer` / `Uint8Array` | `bytes` | `[]byte` | `Vec<u8>` / `&[u8]` |
| Integer | `number` | `int` | `int` / `int64` | `i32` / `i64` |
| Float | `number` | `float` | `float64` | `f64` |
| Boolean | `boolean` | `bool` | `bool` | `bool` |
| Array | `T[]` | `list[T]` | `[]T` | `Vec<T>` |
| Map | `Map<K,V>` / `Record<K,V>` | `dict[K,V]` | `map[K]V` | `HashMap<K,V>` |
| Optional | `T \| null` / `T \| undefined` | `Optional[T]` | `*T` | `Option<T>` |
| Result | `Result<T,E>` (custom) | Exception | `(T, error)` | `Result<T,E>` |
| Async | `Promise<T>` | `Coroutine[T]` | goroutine | `Future<T>` |

