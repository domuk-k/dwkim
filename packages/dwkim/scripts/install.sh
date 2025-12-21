#!/usr/bin/env bash
# dwkim CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/domuk-k/dwkim/main/packages/dwkim/scripts/install.sh | bash

set -e

REPO="domuk-k/dwkim"
INSTALL_DIR="${DWKIM_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="dwkim"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Detect OS and architecture
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)  os="linux" ;;
        Darwin*) os="macos" ;;
        MINGW*|CYGWIN*|MSYS*) os="win" ;;
        *)       error "Unsupported operating system: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64)  arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *)             error "Unsupported architecture: $(uname -m)" ;;
    esac

    echo "${os}-${arch}"
}

# Check if npm/npx is available
check_npm() {
    if command -v npm &> /dev/null; then
        return 0
    fi
    return 1
}

# Install via npm (fallback)
install_via_npm() {
    info "Installing via npm..."
    npm install -g dwkim
    success "dwkim installed via npm!"
    echo ""
    echo "Run 'dwkim' to get started, or 'dwkim chat' to chat with AI."
}

# Install binary
install_binary() {
    local platform="$1"
    local download_url="https://github.com/${REPO}/releases/latest/download/dwkim-${platform}"

    if [[ "$platform" == win-* ]]; then
        download_url="${download_url}.exe"
    fi

    info "Downloading dwkim for ${platform}..."

    # Create install directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"

    # Download binary
    if command -v curl &> /dev/null; then
        if ! curl -fsSL "$download_url" -o "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null; then
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if ! wget -q "$download_url" -O "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null; then
            return 1
        fi
    else
        error "Neither curl nor wget found. Please install one of them."
    fi

    # Make executable
    chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

    return 0
}

# Add to PATH instructions
show_path_instructions() {
    local shell_name shell_rc

    shell_name="$(basename "$SHELL")"
    case "$shell_name" in
        bash) shell_rc="$HOME/.bashrc" ;;
        zsh)  shell_rc="$HOME/.zshrc" ;;
        fish) shell_rc="$HOME/.config/fish/config.fish" ;;
        *)    shell_rc="your shell config file" ;;
    esac

    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo ""
        warn "Add the following to your ${shell_rc}:"
        echo ""
        if [[ "$shell_name" == "fish" ]]; then
            echo "  set -gx PATH \$PATH $INSTALL_DIR"
        else
            echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
        fi
        echo ""
        echo "Then restart your shell or run: source ${shell_rc}"
    fi
}

main() {
    echo ""
    echo -e "${GREEN}"
    echo "  ____  _       _  ____  __ "
    echo " |  _ \| |     | |/ ___||  \\"
    echo " | | | | | ___ | | |    | | |"
    echo " | |_| | |/ _ \| | |___ | | |"
    echo " |____/|_|\___/|_|\____||__/"
    echo ""
    echo -e "${NC}"
    echo "dwkim CLI Installer"
    echo "==================="
    echo ""

    local platform
    platform="$(detect_platform)"
    info "Detected platform: ${platform}"

    # Try binary installation first
    if install_binary "$platform"; then
        success "dwkim installed to ${INSTALL_DIR}/${BINARY_NAME}"
        show_path_instructions
        echo ""
        success "Installation complete!"
        echo ""
        echo "Run 'dwkim' to get started, or 'dwkim chat' to chat with AI."
    else
        warn "Binary not available for ${platform}"

        # Fallback to npm
        if check_npm; then
            info "Falling back to npm installation..."
            install_via_npm
        else
            error "npm is not installed. Please install Node.js and npm first, then run: npm install -g dwkim"
        fi
    fi
}

main
