import { TOPOLOGY_THEMES } from './themes';
import { detectTopologyType } from './detector';

export function generateMermaid(
  protocolName: string,
  spec: any,
  themeMode: 'light' | 'dark' | 'halloween',
  activeNode: 'RUST' | 'GO' | 'PYTHON' | null
) {
  // Fallback to dark theme if themeMode is invalid or undefined
  const t = TOPOLOGY_THEMES[themeMode] || TOPOLOGY_THEMES.dark;
  const type = detectTopologyType(protocolName, spec);

  // 1. Define Base Styles (Injected dynamically)
  const styles = `
    %% Base Styling
    classDef rust fill:${t.rust.fill},stroke:${t.rust.stroke},stroke-width:2px,color:${t.text};
    classDef go   fill:${t.go.fill},stroke:${t.go.stroke},stroke-width:3px,color:${t.text},shape:circle;
    classDef py   fill:${t.py.fill},stroke:${t.py.stroke},stroke-width:2px,color:${t.text};
    
    %% Animation Class (The "Glow")
    classDef active stroke-width:4px;
    linkStyle default stroke:${t.edgeIdle},stroke-width:2px,fill:none;
  `;

  let graphDefinition = '';

  // 2. Construct Structure based on Type
  if (type === 'DENDRITE') {
    // The "Star" Topology for IoT
    graphDefinition = `
      graph LR
        GATEWAY[Go Gateway]:::go
        
        %% Fan-In Pattern
        S1[Rust Sensor A]:::rust --> GATEWAY
        S2[Rust Sensor B]:::rust --> GATEWAY
        S3[Rust Sensor C]:::rust --> GATEWAY
        
        GATEWAY --> DASH[Python Dashboard]:::py
        
        %% Apply Active State
        ${activeNode === 'RUST' ? 'class S1,S2,S3 active;' : ''}
        ${activeNode === 'GO' ? 'class GATEWAY active;' : ''}
        ${activeNode === 'PYTHON' ? 'class DASH active;' : ''}
    `;
  }
  else if (type === 'MESH') {
    // The "Chat" Topology
    graphDefinition = `
      graph LR
        SERVER[Go Server]:::go
        CLIENT_A[TS Client]:::py <--> SERVER
        CLIENT_B[TS Client]:::py <--> SERVER
        SERVER --> BOT[Python AI]:::rust
        
        ${activeNode === 'RUST' ? 'class BOT active;' : ''} 
        ${activeNode === 'GO' ? 'class SERVER active;' : ''}
        ${activeNode === 'PYTHON' ? 'class CLIENT_A,CLIENT_B active;' : ''}
    `;
  }
  else if (type === 'PIPELINE') {
    // The "Banking" Topology (Horizontal for better visibility)
    graphDefinition = `
      graph LR
        MAINFRAME[Legacy Core]:::rust --> ADAPTER[Go Adapter]:::go
        ADAPTER --> API[REST API]:::go
        API --> DASH[Web Client]:::py
        
        ${activeNode === 'RUST' ? 'class MAINFRAME active;' : ''}
        ${activeNode === 'GO' ? 'class ADAPTER,API active;' : ''}
        ${activeNode === 'PYTHON' ? 'class DASH active;' : ''}
    `;
  }
  else {
    // The "Generic" Fallback
    graphDefinition = `
      graph LR
        CLIENT[Generated Client]:::py <--> SERVER[Generated Server]:::go
        
        ${activeNode === 'PYTHON' ? 'class CLIENT active;' : ''}
        ${activeNode === 'GO' ? 'class SERVER active;' : ''}
    `;
  }

  // Combine: Graph Definition MUST come first, then styles
  return `${graphDefinition}\n${styles}`;
}
