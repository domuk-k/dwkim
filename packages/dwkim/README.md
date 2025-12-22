# dwkim

CLI business card and AI assistant for dwkim.

## Installation

### Quick Start (npx)

```bash
npx dwkim
```

### Install Globally

```bash
npm install -g dwkim
# or
pnpm add -g dwkim
```

### Curl Install (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/domuk-k/dwkim/main/packages/dwkim/scripts/install.sh | bash
```

## Usage

```bash
# Show profile card
dwkim

# Start interactive AI chat
dwkim chat

# Show help
dwkim help
```

### Chat Commands

Inside the chat mode, you can use:

- `/help` - Show available commands
- `/status` - Check API server status
- `/search <query>` - Search documents directly

### Environment Variables

- `DWKIM_API_URL` - Custom API endpoint (default: https://persona-api.fly.dev)
- `DWKIM_NO_STREAM` - Set to `1` to disable streaming mode

## Features

- **Profile Card**: Display developer information in a beautiful terminal card
- **AI Chat**: Interactive chat with RAG-powered AI assistant
- **Streaming**: Real-time streaming responses for a better UX
- **Cross-platform**: Works on Linux, macOS, and Windows

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode
pnpm dev

# Build
pnpm build

# Build binaries (requires @yao-pkg/pkg)
pnpm build:binary
```

## License

MIT
