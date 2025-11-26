export const exampleVariations = {
    demo: [
        `protocol:
  name: Demo Chat
  port: 8080
  description: A simple chat protocol
  rfc: "demo-chat"

connection:
  type: TCP
  timeout: 60000
  keepAlive: true

messageTypes:
  - name: Login
    direction: request
    format: "LOGIN {username}\\n"
    terminator: "\\n"
  - name: Message
    direction: bidirectional
    format: "MSG {content}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Demo Weather
  port: 8081
  description: Weather inquiry protocol
  rfc: "demo-weather"

connection:
  type: TCP
  timeout: 5000

messageTypes:
  - name: GetWeather
    direction: request
    format: "GET {city}\\r\\n"
    terminator: "\\r\\n"
  - name: WeatherData
    direction: response
    format: "TEMP {celsius}C\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Demo Time
  port: 37
  description: Simple time protocol
  rfc: "868"

connection:
  type: TCP
  timeout: 1000

messageTypes:
  - name: GetTime
    direction: request
    format: ""
    terminator: ""
  - name: TimeResponse
    direction: response
    format: "{timestamp}"
    terminator: ""`,
        `protocol:
  name: Demo Echo
  port: 7
  description: Echo protocol
  rfc: "862"

connection:
  type: TCP
  timeout: 0

messageTypes:
  - name: Echo
    direction: bidirectional
    format: "{data}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Demo KV Store
  port: 6379
  description: Simple Key-Value store
  rfc: "demo-kv"

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: Set
    direction: request
    format: "SET {key} {value}\\r\\n"
    terminator: "\\r\\n"
  - name: Get
    direction: request
    format: "GET {key}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Demo Auth
  port: 8888
  description: Authentication service
  rfc: "demo-auth"

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: Authenticate
    direction: request
    format: "AUTH {user}:{pass}\\n"
    terminator: "\\n"
  - name: Token
    direction: response
    format: "TOKEN {token}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Demo Sensor
  port: 9000
  description: IoT Sensor Protocol
  rfc: "demo-iot"

connection:
  type: UDP
  timeout: 1000

messageTypes:
  - name: Reading
    direction: request
    format: "ID:{id} VAL:{value}"
    terminator: ""`,
        `protocol:
  name: Demo Game
  port: 7777
  description: Game state sync
  rfc: "demo-game"

connection:
  type: UDP
  timeout: 500

messageTypes:
  - name: Move
    direction: request
    format: "MV X:{x} Y:{y}"
    terminator: ""
  - name: State
    direction: response
    format: "ST P1:{p1_score} P2:{p2_score}"
    terminator: ""`,
        `protocol:
  name: Demo File
  port: 2121
  description: Simple file transfer
  rfc: "demo-ftp"

connection:
  type: TCP
  timeout: 120000

messageTypes:
  - name: List
    direction: request
    format: "LIST {path}\\n"
    terminator: "\\n"
  - name: Retrieve
    direction: request
    format: "RETR {filename}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Demo Ping
  port: 80
  description: Health check
  rfc: "demo-ping"

connection:
  type: TCP
  timeout: 2000

messageTypes:
  - name: Ping
    direction: request
    format: "PING\\r\\n"
    terminator: "\\r\\n"
  - name: Pong
    direction: response
    format: "PONG\\r\\n"
    terminator: "\\r\\n"`
    ],
    gopher: [
        `protocol:
  name: Gopher Standard
  rfc: "1436"
  port: 70
  description: The classic Gopher protocol

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: Request
    direction: request
    format: "{selector}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Search
  rfc: "1436"
  port: 70
  description: Gopher search request

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: SearchRequest
    direction: request
    format: "{selector}\\t{query}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Plus
  rfc: "Gopher+"
  port: 70
  description: Gopher+ attribute request

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: AttributeRequest
    direction: request
    format: "{selector}\\t!\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Root
  rfc: "1436"
  port: 70
  description: Requesting the root menu

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: RootRequest
    direction: request
    format: "\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Alt Port
  rfc: "1436"
  port: 7070
  description: Gopher on alternative port

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: Request
    direction: request
    format: "{selector}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Secure Gopher
  rfc: "Over TLS"
  port: 105
  description: Gopher over TLS (Sopher)

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: Request
    direction: request
    format: "{selector}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Image
  rfc: "1436"
  port: 70
  description: Requesting an image file

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: ImageRequest
    direction: request
    format: "I{path}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Text
  rfc: "1436"
  port: 70
  description: Requesting a text file

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: TextRequest
    direction: request
    format: "0{path}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Binary
  rfc: "1436"
  port: 70
  description: Requesting a binary file

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: BinaryRequest
    direction: request
    format: "9{path}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Gopher Phonebook
  rfc: "1436"
  port: 70
  description: Phonebook lookup

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: Lookup
    direction: request
    format: "2{query}\\r\\n"
    terminator: "\\r\\n"`
    ],
    finger: [
        `protocol:
  name: Finger Standard
  rfc: "1288"
  port: 79
  description: Standard user lookup

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: Query
    direction: request
    format: "{username}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Verbose
  rfc: "1288"
  port: 79
  description: Verbose user lookup

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: VerboseQuery
    direction: request
    format: "/W {username}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger List
  rfc: "1288"
  port: 79
  description: List all users

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: ListQuery
    direction: request
    format: "\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Host
  rfc: "1288"
  port: 79
  description: Finger forwarding

connection:
  type: TCP
  timeout: 15000

messageTypes:
  - name: ForwardQuery
    direction: request
    format: "{user}@{host}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Vending
  rfc: "N/A"
  port: 79
  description: Vending machine status

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: Status
    direction: request
    format: "coke\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Weather
  rfc: "N/A"
  port: 79
  description: Weather via Finger

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: WeatherQuery
    direction: request
    format: "{city}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Quote
  rfc: "N/A"
  port: 79
  description: Quote of the day

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: QOTD
    direction: request
    format: "quote\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Debug
  rfc: "1288"
  port: 79
  description: Debug mode query

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: Debug
    direction: request
    format: "debug {user}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Alt
  rfc: "1288"
  port: 2003
  description: Finger on alt port

connection:
  type: TCP
  timeout: 10000

messageTypes:
  - name: Query
    direction: request
    format: "{user}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: Finger Gateway
  rfc: "1288"
  port: 79
  description: Gateway query

connection:
  type: TCP
  timeout: 20000

messageTypes:
  - name: Gateway
    direction: request
    format: "{user}%{target}\\r\\n"
    terminator: "\\r\\n"`
    ],
    wais: [
        `protocol:
  name: WAIS Standard
  rfc: "1625"
  port: 210
  description: Wide Area Information Servers

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: Init
    direction: request
    format: "Z39.50\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Search
  rfc: "1625"
  port: 210
  description: WAIS Database Search

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: Search
    direction: request
    format: "SEARCH {database} {terms}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Scan
  rfc: "1625"
  port: 210
  description: Scan index terms

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: Scan
    direction: request
    format: "SCAN {term}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Retrieve
  rfc: "1625"
  port: 210
  description: Retrieve document

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: Retrieve
    direction: request
    format: "GET {docId}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Init V2
  rfc: "1625"
  port: 210
  description: Version 2 Initialization

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: InitV2
    direction: request
    format: "WAIS 2.0\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Describe
  rfc: "1625"
  port: 210
  description: Describe database

connection:
  type: TCP
  timeout: 60000

messageTypes:
  - name: Describe
    direction: request
    format: "DESCRIBE {db}\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Quit
  rfc: "1625"
  port: 210
  description: End session

connection:
  type: TCP
  timeout: 1000

messageTypes:
  - name: Quit
    direction: request
    format: "QUIT\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Status
  rfc: "1625"
  port: 210
  description: Server status

connection:
  type: TCP
  timeout: 5000

messageTypes:
  - name: Status
    direction: request
    format: "STATUS\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS Help
  rfc: "1625"
  port: 210
  description: Help command

connection:
  type: TCP
  timeout: 5000

messageTypes:
  - name: Help
    direction: request
    format: "HELP\\r\\n"
    terminator: "\\r\\n"`,
        `protocol:
  name: WAIS List
  rfc: "1625"
  port: 210
  description: List databases

connection:
  type: TCP
  timeout: 30000

messageTypes:
  - name: List
    direction: request
    format: "LIST\\r\\n"
    terminator: "\\r\\n"`
    ],
    archie: [
        `protocol:
  name: Archie Standard
  rfc: "N/A"
  port: 1525
  description: Archie Prospero Protocol

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: Query
    direction: request
    format: "FIND {filename}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Regex
  rfc: "N/A"
  port: 1525
  description: Regex search

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: RegexQuery
    direction: request
    format: "REGEX {pattern}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Exact
  rfc: "N/A"
  port: 1525
  description: Exact match search

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: ExactQuery
    direction: request
    format: "EXACT {filename}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Site
  rfc: "N/A"
  port: 1525
  description: Search specific site

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: SiteQuery
    direction: request
    format: "SITE {domain} {file}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Whatis
  rfc: "N/A"
  port: 1525
  description: Description lookup

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: Whatis
    direction: request
    format: "WHATIS {term}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Sort
  rfc: "N/A"
  port: 1525
  description: Sorted results

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: SortedQuery
    direction: request
    format: "SORT BY DATE {file}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Limit
  rfc: "N/A"
  port: 1525
  description: Limited results

connection:
  type: UDP
  timeout: 30000

messageTypes:
  - name: LimitedQuery
    direction: request
    format: "MAXHITS 10 {file}\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Version
  rfc: "N/A"
  port: 1525
  description: Server version

connection:
  type: UDP
  timeout: 5000

messageTypes:
  - name: Version
    direction: request
    format: "VERSION\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Servers
  rfc: "N/A"
  port: 1525
  description: List known servers

connection:
  type: UDP
  timeout: 10000

messageTypes:
  - name: Servers
    direction: request
    format: "SERVERS\\n"
    terminator: "\\n"`,
        `protocol:
  name: Archie Help
  rfc: "N/A"
  port: 1525
  description: Help command

connection:
  type: UDP
  timeout: 5000

messageTypes:
  - name: Help
    direction: request
    format: "HELP\\n"
    terminator: "\\n"`
    ]
};
