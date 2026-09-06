#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ANSI Color Codes (disabled if output is not a terminal)
if [ -t 1 ]; then
    COLOR_RESET="\033[0m"
    COLOR_BOLD="\033[1m"
    COLOR_CYAN="\033[1;36m"
    COLOR_GREEN="\033[1;32m"
    COLOR_YELLOW="\033[1;33m"
    COLOR_BLUE="\033[1;34m"
    COLOR_DIM="\033[2m"
else
    COLOR_RESET=""
    COLOR_BOLD=""
    COLOR_CYAN=""
    COLOR_GREEN=""
    COLOR_YELLOW=""
    COLOR_BLUE=""
    COLOR_DIM=""
fi

log_section() {
    echo -e "\n${COLOR_CYAN}▸ $1${COLOR_RESET}"
}

log_ok() {
    echo -e "  ${COLOR_GREEN}✔ [OK]${COLOR_RESET}     $1"
}

log_warn() {
    echo -e "  ${COLOR_YELLOW}⚠ [WARN]${COLOR_RESET}   $1"
}

log_info() {
    echo -e "  ${COLOR_DIM}ℹ [INFO]   $1${COLOR_RESET}"
}

echo -e "${COLOR_BOLD}============================================================${COLOR_RESET}"
echo -e "${COLOR_BOLD}          CareerLens: MCP Setup (AGY & ChatGPT Codex)       ${COLOR_RESET}"
echo -e "${COLOR_BOLD}============================================================${COLOR_RESET}"

# --- STEP 1: Pre-flight checks ---
log_section "Step 1: Verifying base environment"

if ! command -v npx >/dev/null 2>&1; then
    log_warn "'npx' not found in PATH. It is required to run ctx7 setup."
    exit 1
else
    log_ok "'npx' is available: $(npx --version)"
fi

# --- STEP 2: Context7 API Key (Optional) ---
log_section "Step 2: Context7 Authentication (Optional)"

API_KEY="${CONTEXT7_API_KEY:-}"

if [ -z "$API_KEY" ] && [ -t 0 ]; then
    echo -e "  Leave blank for free/public mode, or paste your personal API key:"
    read -r -p "  Enter CONTEXT7_API_KEY [press Enter to skip]: " INPUT_KEY || true
    API_KEY="$(echo -e "${INPUT_KEY:-}" | tr -d '[:space:]')"
fi

if [ -n "$API_KEY" ]; then
    log_ok "Using provided Context7 API key (${#API_KEY} characters)."
else
    log_info "No API key specified; using free/public mode."
fi

# --- STEP 3: Official Context7 Setup Wizard ---
log_section "Step 3: Running official Context7 setup for AGY & Codex"

SETUP_ARGS=("--antigravity" "--codex" "-p" "-y")

if [ -n "$API_KEY" ]; then
    SETUP_ARGS+=("--api-key" "$API_KEY")
fi

npx -y ctx7@latest setup "${SETUP_ARGS[@]}"

# Remove duplicate GEMINI.md since rules are canonically maintained in AGENTS.md
rm -f GEMINI.md

# --- STEP 4: CLI verification ---
log_section "Step 4: Checking installed developer CLIs"

if command -v codex >/dev/null 2>&1; then
    if codex mcp list 2>/dev/null | grep -q "context7"; then
        log_ok "Codex CLI: context7 is registered and active."
    else
        log_info "Codex CLI: context7 configured locally via .codex/config.toml."
    fi
else
    log_info "Codex CLI: not found in PATH (project file .codex/config.toml is ready)."
fi

if command -v agy >/dev/null 2>&1; then
    if agy mcp list 2>&1 | grep -q "context7"; then
        log_ok "AGY CLI: context7 is registered and enabled."
    else
        log_info "AGY CLI: not yet active in global list (project configuration ready)."
    fi
else
    log_info "AGY CLI: not found in PATH."
fi

echo -e "\n${COLOR_BOLD}============================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}${COLOR_BOLD}✔ All MCP servers for AGY and Codex are ready!${COLOR_RESET}"
echo -e "${COLOR_BOLD}============================================================${COLOR_RESET}"
