# Cointeligencia Android App

React Native mobile application for trading alerts and automated trading capabilities.

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI
- EAS CLI (for builds)

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

### Building

**Important:** See [BUILD_WORKFLOW.md](./BUILD_WORKFLOW.md) for proper build workflow to ensure fixes persist.

**Before building, always run pre-build checks:**
```bash
npm run pre-build-check
```

**Build Android APK:**
```bash
# Cloud build (recommended - uses git)
npm run build:android

# Local build (for testing)
npm run build:android:local
```

## Releases

Check the [Releases](https://github.com/felipehuicochea/cointeligencia/releases) page for the latest APK download.

### Installation

1. Download the latest APK from the [Releases](https://github.com/felipehuicochea/cointeligencia/releases) page
2. Enable "Install from Unknown Sources" on your Android device
3. Install the APK file

## Build Workflow

**⚠️ IMPORTANT:** To ensure bug fixes persist in builds, follow the workflow in [BUILD_WORKFLOW.md](./BUILD_WORKFLOW.md).

Key points:
- Always commit fixes to git before building
- Use cloud builds for production (they pull from git)
- Run `npm run pre-build-check` before local builds

## Reporting Issues

If you encounter any issues or bugs, please report them in the [Issues](https://github.com/felipehuicochea/cointeligencia/issues) section.

## About

Cointeligencia is a trading alert system mobile application that provides real-time trading alerts and automated trading capabilities.
