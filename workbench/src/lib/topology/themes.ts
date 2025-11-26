export const TOPOLOGY_THEMES = {
    // 🌞 Standard Light Mode (Clean, Professional, Readable)
    light: {
        nodeFill: '#f3f4f6',
        nodeBorder: '#1f2937',
        text: '#000000',
        edgeIdle: '#9ca3af', // Grey wires
        edgeActive: '#2563eb', // Blue Pulse
        rust: { stroke: '#c2410c', fill: '#ffedd5' }, // Orange-ish
        go: { stroke: '#059669', fill: '#d1fae5' }, // Green-ish
        py: { stroke: '#4f46e5', fill: '#e0e7ff' }  // Indigo-ish
    },

    // 🌙 Standard Dark Mode (Sleek, High Contrast)
    dark: {
        nodeFill: '#1f2937',
        nodeBorder: '#e5e7eb',
        text: '#ffffff',
        edgeIdle: '#4b5563', // Dim wires
        edgeActive: '#ffffff', // White Pulse
        rust: { stroke: '#fb923c', fill: '#431407' },
        go: { stroke: '#34d399', fill: '#064e3b' },
        py: { stroke: '#818cf8', fill: '#312e81' }
    },

    // 🎃 Halloween Mode (Neon, Aggressive, Spooky)
    halloween: {
        nodeFill: '#000000', // Pitch Black
        nodeBorder: '#ff7518', // Pumpkin Orange
        text: '#39ff14', // Slime Green Text
        edgeIdle: '#4a0404', // Dried Blood (Dark Red)
        edgeActive: '#ff0000', // Fresh Blood (Bright Red)
        rust: { stroke: '#ff4500', fill: '#1a0500' }, // Blood Orange
        go: { stroke: '#39ff14', fill: '#051a00' }, // Slime Green
        py: { stroke: '#bf00ff', fill: '#1a001a' }  // Witch Purple
    }
};
