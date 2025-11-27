# Protocol Discovery Patterns

This document defines patterns for implementing protocol discovery and fingerprinting.

## Fingerprint Generation

### Signature-Based Fingerprints
```typescript
interface ProtocolFingerprint {
  protocol: string;
  signatures: Signature[];
  confidence: number;
}

interface Signature {
  type: 'banner' | 'response' | 'timing' | 'behavior';
  pattern: string | RegExp;
  weight: number;
}

function generateFingerprint(protocol: ProtocolSpec): ProtocolFingerprint {
  const signatures: Signature[] = [];
  
  // Extract banner signatures from connection spec
  if (protocol.connection.banner) {
    signatures.push({
      type: 'banner',
      pattern: protocol.connection.banner,
      weight: 0.8
    });
  }
  
  // Extract response signatures from message formats
  for (const message of protocol.messages) {
    if (message.format.includes('fixed:')) {
      const fixed = extractFixedStrings(message.format);
      signatures.push({
        type: 'response',
        pattern: fixed,
        weight: 0.6
      });
    }
  }
  
  return {
    protocol: protocol.name,
    signatures,
    confidence: 0
  };
}
```

### Behavioral Fingerprints
```typescript
interface BehaviorSignature {
  type: 'behavior';
  description: string;
  test: (connection: Connection) => Promise<boolean>;
  weight: number;
}

const gopherBehavior: BehaviorSignature = {
  type: 'behavior',
  description: 'Responds to empty query with directory listing',
  test: async (conn) => {
    await conn.send('\r\n');
    const response = await conn.receive();
    return response.includes('\t') && response.includes('\r\n');
  },
  weight: 0.7
};
```

## Probe Design

### Active Probes
```typescript
interface Probe {
  name: string;
  protocol: string;
  payload: Buffer;
  expectedResponse: RegExp | ((data: Buffer) => boolean);
  timeout: number;
}

const gopherProbe: Probe = {
  name: 'gopher-directory',
  protocol: 'gopher',
  payload: Buffer.from('\r\n'),
  expectedResponse: /^[0-9i].*\t.*\t.*\t\d+\r\n/,
  timeout: 5000
};

async function executeProbe(
  host: string,
  port: number,
  probe: Probe
): Promise<ProbeResult> {
  const conn = await connect(host, port, probe.timeout);
  
  try {
    await conn.send(probe.payload);
    const response = await conn.receive(probe.timeout);
    
    const matches = typeof probe.expectedResponse === 'function'
      ? probe.expectedResponse(response)
      : probe.expectedResponse.test(response.toString());
    
    return {
      probe: probe.name,
      protocol: probe.protocol,
      matches,
      response: response.toString(),
      timestamp: Date.now()
    };
  } finally {
    await conn.close();
  }
}
```

### Passive Probes
```typescript
interface PassiveProbe {
  name: string;
  protocol: string;
  check: (banner: string) => boolean;
}

const fingerBannerProbe: PassiveProbe = {
  name: 'finger-banner',
  protocol: 'finger',
  check: (banner) => {
    // Finger servers typically don't send banners
    // but some might identify themselves
    return banner.includes('finger') || banner.length === 0;
  }
};

async function passiveDetection(
  host: string,
  port: number
): Promise<string[]> {
  const conn = await connect(host, port, 3000);
  const banner = await conn.receiveBanner(1000);
  
  const matches: string[] = [];
  for (const probe of passiveProbes) {
    if (probe.check(banner)) {
      matches.push(probe.protocol);
    }
  }
  
  return matches;
}
```

## Signature Matching

### Pattern Matching
```typescript
function matchSignature(
  data: Buffer,
  signature: Signature
): { matches: boolean; confidence: number } {
  let matches = false;
  
  if (typeof signature.pattern === 'string') {
    matches = data.toString().includes(signature.pattern);
  } else {
    matches = signature.pattern.test(data.toString());
  }
  
  return {
    matches,
    confidence: matches ? signature.weight : 0
  };
}
```

### Fuzzy Matching
```typescript
function fuzzyMatch(
  data: string,
  pattern: string,
  threshold: number = 0.8
): boolean {
  const similarity = levenshteinSimilarity(data, pattern);
  return similarity >= threshold;
}

function levenshteinSimilarity(s1: string, s2: string): number {
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}
```

### Multi-Signature Matching
```typescript
function matchProtocol(
  responses: Map<string, Buffer>,
  fingerprint: ProtocolFingerprint
): number {
  let totalConfidence = 0;
  let matchedSignatures = 0;
  
  for (const signature of fingerprint.signatures) {
    const data = responses.get(signature.type);
    if (!data) continue;
    
    const result = matchSignature(data, signature);
    if (result.matches) {
      totalConfidence += result.confidence;
      matchedSignatures++;
    }
  }
  
  // Normalize confidence
  return matchedSignatures > 0
    ? totalConfidence / fingerprint.signatures.length
    : 0;
}
```

## Confidence Scoring

### Weighted Scoring
```typescript
interface DetectionResult {
  protocol: string;
  confidence: number;
  evidence: Evidence[];
}

interface Evidence {
  type: 'banner' | 'response' | 'timing' | 'behavior';
  description: string;
  weight: number;
}

function calculateConfidence(evidence: Evidence[]): number {
  const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
  const maxWeight = evidence.length * 1.0; // Max weight per evidence
  
  return Math.min(totalWeight / maxWeight, 1.0);
}
```

### Bayesian Confidence
```typescript
function bayesianConfidence(
  priorProbability: number,
  evidence: Evidence[]
): number {
  let posterior = priorProbability;
  
  for (const e of evidence) {
    // Update posterior probability using Bayes' theorem
    const likelihood = e.weight;
    posterior = (likelihood * posterior) / 
      ((likelihood * posterior) + (1 - likelihood) * (1 - posterior));
  }
  
  return posterior;
}
```

### Threshold-Based Classification
```typescript
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3
};

function classifyDetection(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'high';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'medium';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
    return 'low';
  } else {
    return 'unknown';
  }
}
```

## Security Considerations

### Rate Limiting
```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests = 10;
  private windowMs = 60000; // 1 minute
  
  async checkLimit(host: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(host) || [];
    
    // Remove old requests outside window
    const recent = requests.filter(time => now - time < this.windowMs);
    
    if (recent.length >= this.maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(host, recent);
    return true;
  }
}
```

### Safe Probing
```typescript
async function safeProbe(
  host: string,
  port: number,
  probe: Probe
): Promise<ProbeResult | null> {
  // Check if host is in private network
  if (isPrivateIP(host)) {
    throw new Error('Cannot probe private networks');
  }
  
  // Check rate limit
  if (!await rateLimiter.checkLimit(host)) {
    throw new Error('Rate limit exceeded');
  }
  
  // Execute probe with timeout
  try {
    return await Promise.race([
      executeProbe(host, port, probe),
      timeout(probe.timeout)
    ]);
  } catch (error) {
    // Log but don't expose internal errors
    console.error(`Probe failed: ${error.message}`);
    return null;
  }
}

function isPrivateIP(host: string): boolean {
  return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/.test(host);
}
```

### Input Validation
```typescript
function validateProbeTarget(host: string, port: number): void {
  // Validate hostname
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    throw new Error('Invalid hostname format');
  }
  
  // Validate port
  if (port < 1 || port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }
  
  // Block privileged ports
  if (port < 1024) {
    throw new Error('Cannot probe privileged ports');
  }
  
  // Block private networks
  if (isPrivateIP(host)) {
    throw new Error('Cannot probe private networks');
  }
}
```

## Discovery Strategies

### Sequential Discovery
```typescript
async function sequentialDiscovery(
  host: string,
  port: number,
  probes: Probe[]
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  
  for (const probe of probes) {
    const result = await executeProbe(host, port, probe);
    if (result.matches) {
      results.push({
        protocol: probe.protocol,
        confidence: 0.7,
        evidence: [{
          type: 'response',
          description: `Matched ${probe.name}`,
          weight: 0.7
        }]
      });
    }
  }
  
  return results;
}
```

### Parallel Discovery
```typescript
async function parallelDiscovery(
  host: string,
  port: number,
  probes: Probe[]
): Promise<DetectionResult[]> {
  const results = await Promise.allSettled(
    probes.map(probe => executeProbe(host, port, probe))
  );
  
  return results
    .filter(r => r.status === 'fulfilled' && r.value.matches)
    .map(r => ({
      protocol: (r as PromiseFulfilledResult<ProbeResult>).value.protocol,
      confidence: 0.7,
      evidence: [{
        type: 'response',
        description: 'Matched probe',
        weight: 0.7
      }]
    }));
}
```

### Adaptive Discovery
```typescript
async function adaptiveDiscovery(
  host: string,
  port: number,
  probes: Probe[]
): Promise<DetectionResult[]> {
  // Start with passive detection
  const passive = await passiveDetection(host, port);
  
  // If passive detection found something, use targeted probes
  if (passive.length > 0) {
    const targeted = probes.filter(p => passive.includes(p.protocol));
    return await parallelDiscovery(host, port, targeted);
  }
  
  // Otherwise, try all probes sequentially
  return await sequentialDiscovery(host, port, probes);
}
```

## Testing Discovery

### Mock Servers
```typescript
class MockProtocolServer {
  private server: net.Server;
  
  constructor(
    private protocol: string,
    private responses: Map<string, Buffer>
  ) {}
  
  async start(port: number): Promise<void> {
    this.server = net.createServer(socket => {
      socket.on('data', data => {
        const response = this.responses.get(data.toString());
        if (response) {
          socket.write(response);
        }
        socket.end();
      });
    });
    
    await new Promise<void>(resolve => {
      this.server.listen(port, resolve);
    });
  }
  
  async stop(): Promise<void> {
    await new Promise<void>(resolve => {
      this.server.close(() => resolve());
    });
  }
}
```

### Discovery Tests
```typescript
describe('Protocol Discovery', () => {
  let mockServer: MockProtocolServer;
  
  beforeEach(async () => {
    mockServer = new MockProtocolServer('gopher', new Map([
      ['\r\n', Buffer.from('0About\t/about\tgopher.example.com\t70\r\n')]
    ]));
    await mockServer.start(7070);
  });
  
  afterEach(async () => {
    await mockServer.stop();
  });
  
  it('should detect Gopher protocol', async () => {
    const results = await sequentialDiscovery(
      'localhost',
      7070,
      [gopherProbe]
    );
    
    expect(results).toHaveLength(1);
    expect(results[0].protocol).toBe('gopher');
    expect(results[0].confidence).toBeGreaterThan(0.5);
  });
});
```

## Performance Optimization

### Caching
```typescript
class DiscoveryCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 3600000; // 1 hour
  
  get(host: string, port: number): DetectionResult[] | null {
    const key = `${host}:${port}`;
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.results;
  }
  
  set(host: string, port: number, results: DetectionResult[]): void {
    const key = `${host}:${port}`;
    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });
  }
}
```

### Connection Pooling
```typescript
class DiscoveryConnectionPool {
  private pools = new Map<string, Connection[]>();
  private maxConnections = 5;
  
  async getConnection(host: string, port: number): Promise<Connection> {
    const key = `${host}:${port}`;
    const pool = this.pools.get(key) || [];
    
    // Reuse existing connection
    const available = pool.find(c => !c.inUse);
    if (available) {
      available.inUse = true;
      return available;
    }
    
    // Create new connection if under limit
    if (pool.length < this.maxConnections) {
      const conn = await connect(host, port);
      conn.inUse = true;
      pool.push(conn);
      this.pools.set(key, pool);
      return conn;
    }
    
    // Wait for available connection
    return await this.waitForConnection(key);
  }
}
```

