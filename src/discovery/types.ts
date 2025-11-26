/**
 * Type definitions for protocol discovery and fingerprinting
 */

/**
 * Protocol fingerprint containing signatures for identification
 */
export interface ProtocolFingerprint {
  /** Protocol name */
  protocol: string;
  /** Default port number */
  defaultPort: number;
  /** Initial handshake pattern (if any) */
  initialHandshake?: string;
  /** Response patterns to look for */
  responsePatterns: Pattern[];
  /** Active probes for this protocol */
  probes: Probe[];
  /** Behavioral signatures */
  behaviorSignatures?: BehaviorSignature[];
}

/**
 * Pattern for matching protocol responses
 */
export interface Pattern {
  /** Pattern type */
  type: 'exact' | 'prefix' | 'regex' | 'length';
  /** Pattern value */
  value: string | number;
  /** Weight for confidence scoring (0-1) */
  weight: number;
  /** Description of what this pattern matches */
  description?: string;
}

/**
 * Active probe for protocol detection
 */
export interface Probe {
  /** Probe name */
  name: string;
  /** Protocol this probe is for */
  protocol: string;
  /** Payload to send */
  payload: Buffer;
  /** Expected response pattern */
  expectedResponse?: Pattern;
  /** Timeout in milliseconds */
  timeout: number;
}

/**
 * Behavioral signature for protocol identification
 */
export interface BehaviorSignature {
  /** Signature type */
  type: 'behavior';
  /** Description of the behavior */
  description: string;
  /** Weight for confidence scoring (0-1) */
  weight: number;
}

/**
 * Protocol signature observed from a connection
 */
export interface ProtocolSignature {
  /** Port number */
  port: number;
  /** Initial response from server (if any) */
  initialResponse?: Buffer;
  /** Responses to probes */
  responseToProbes: Map<string, Buffer>;
  /** Timing information */
  timing: TimingInfo;
}

/**
 * Timing information for protocol detection
 */
export interface TimingInfo {
  /** Connection time in milliseconds */
  connectionTime: number;
  /** Response times for each probe */
  probeResponseTimes: Map<string, number>;
}

/**
 * Result of protocol discovery
 */
export interface DiscoveryResult {
  /** Captured packets */
  packets: Packet[];
  /** Identified protocol (if any) */
  identified: MatchResult | null;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Suggestions for unidentified protocols */
  suggestions: string[];
}

/**
 * Network packet captured during discovery
 */
export interface Packet {
  /** Packet direction */
  direction: 'sent' | 'received';
  /** Timestamp */
  timestamp: string;
  /** Packet length in bytes */
  length: number;
  /** Hex representation of packet data */
  hex: string;
  /** Parsed message (if successful) */
  parsed?: ParsedMessage;
  /** Parse error (if failed) */
  error?: string;
}

/**
 * Parsed message from a packet
 */
export interface ParsedMessage {
  /** Message type */
  type: string;
  /** Parsed fields */
  fields: Record<string, any>;
}

/**
 * Result of fingerprint matching
 */
export interface MatchResult {
  /** Matched protocol name */
  protocol: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Features that matched */
  matchedFeatures: string[];
  /** Path to protocol specification */
  specPath: string;
}

/**
 * Result of probe execution
 */
export interface ProbeResult {
  /** Probe name */
  probe: string;
  /** Protocol name */
  protocol: string;
  /** Whether the probe matched */
  matches: boolean;
  /** Response received */
  response: string;
  /** Timestamp */
  timestamp: number;
}
