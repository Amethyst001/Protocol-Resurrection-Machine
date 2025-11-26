# System Requirements

## Development Tools

The Kiroween Protocol Workbench requires the following tools to be installed for full functionality:

### Required

- **Node.js** (v18 or higher) - for running the workbench and TypeScript validation
- **npm** or **pnpm** - package manager

### Code Validation Requirements

To use the "Validate Code" feature, you must have the following language compilers/interpreters installed:

- **Python** (v3.8 or higher) - for validating generated Python code
  ```bash
  python --version  # Should be 3.8+
  ```

- **Go** (v1.21 or higher) - for validating generated Go code
  ```bash
  go version  # Should be 1.21+
  ```

- **Rust** (latest stable) - for validating generated Rust code
  ```bash
  rustc --version  # Latest stable recommended
  ```

### Installation Instructions

#### Windows

```powershell
# Python
winget install Python.Python.3.12

# Go
winget install GoLang.Go

# Rust
winget install Rustlang.Rustup
```

#### macOS

```bash
# Python (usually pre-installed, or via Homebrew)
brew install python@3.12

# Go
brew install go

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Linux (Ubuntu/Debian)

```bash
# Python
sudo apt update
sudo apt install python3 python3-pip

# Go
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Verification

After installation, verify all tools are available:

```bash
# Check all required tools
node --version
npm --version

# Check code validation tools
python --version
go version
rustc --version
```

## Optional Features

If any code validation tools are missing, the workbench will still function but the "Validate Code" button will report errors for those specific languages.
