# Codex Quota Dashboard

English | [简体中文](README.zh-CN.md)

[![CI](https://github.com/retuzjj/codex-quota-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/retuzjj/codex-quota-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A cross-platform desktop dashboard for Codex quota usage. It displays the percentage used, percentage remaining, and reset time for the 5-hour and 7-day quota windows.

> [!IMPORTANT]
> This is an unofficial community project. It is not affiliated with, authorized by, or endorsed by OpenAI. Codex and OpenAI are trademarks of their respective owners.

## Features

- Refreshes automatically every minute, with manual refresh support.
- Displays quota usage, remaining quota, and reset countdowns.
- Falls back to the latest local quota snapshot when live retrieval fails, clearly marking it as cached data.
- Supports launch at login.
- Runs as a single-instance application with an isolated Electron renderer process.

## Requirements

- Node.js 22.12 or later
- Codex CLI installed and authenticated

```bash
codex --version
codex login
```

## Run from Source

```bash
git clone https://github.com/retuzjj/codex-quota-dashboard.git
cd codex-quota-dashboard
npm ci
npm run dev
```

This repository primarily provides source builds. Binary installers are considered official project artifacts only when explicitly published under GitHub Releases. Do not download installers from unknown sources.

## Test and Build

```bash
npm test
npm run build
```

Build an installer for the current platform:

```bash
npm run dist
```

You can also select a target platform explicitly:

```bash
npm run dist:linux
npm run dist:windows
npm run dist:mac
```

The project configures the following build targets:

- Windows 10/11 x64: NSIS
- macOS Intel and Apple Silicon: universal DMG
- Linux x64: AppImage and DEB

Windows installers should be built on Windows, and macOS DMGs should be built on macOS. The current CI workflow only verifies source builds and tests on Linux. Other platform configurations must be tested on their respective systems before release.

## Data Sources and Privacy

The application first starts the local `codex app-server` and retrieves the latest quota using the read-only `account/rateLimits/read` method.

If the live query fails, the application looks for the latest quota snapshot under `$CODEX_HOME/sessions` (default: `~/.codex/sessions`). All reading is performed locally. It only parses up to 1 MiB from the end of each of the 20 most recent session logs and never sends session contents to another service.

The application does not read `auth.json`, store accounts or tokens, or call third-party analytics services directly.

## Launch at Login

Enable “Launch at login” at the bottom of the application:

- Windows and macOS use Electron's login item API.
- Linux writes `~/.config/autostart/codex-quota-dashboard.desktop` for the current user.

Disabling the option removes the corresponding login item.

## Troubleshooting

### “Codex CLI not found”

Make sure `codex` is available in the desktop session's `PATH`. Applications launched from the desktop may not inherit your interactive shell configuration.

### Cached data is displayed

The live query failed, but a recent local quota record was available. Run `codex` to verify authentication and network connectivity, then refresh the dashboard.

### Older Codex versions cannot retrieve quota data

Upgrade Codex CLI and try again. Quota retrieval depends on the Codex app-server protocol, with session-log fallback for environments where live queries are unavailable.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Do not attach tokens, `auth.json`, complete session logs, or other private information to issue reports.

## License

This project is licensed under the [MIT License](LICENSE).
