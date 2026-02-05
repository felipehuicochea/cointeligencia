# Cointeligencia Android App

React Native mobile application for trading alerts and automated trading capabilities.

**Development is local only.** Do not push source code to GitHub. GitHub is used only for APK releases (upload APKs via [Releases](https://github.com/felipehuicochea/cointeligencia/releases)).

---

## Quick Start (Local)

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

See [BUILD_WORKFLOW.md](./BUILD_WORKFLOW.md) for the full workflow.

**Before building:**
```bash
./scripts/pre-build-check.sh
```

**Build Android APK (local):**
```bash
eas build --platform android --profile preview --local
```

---

## Releasing an APK

1. Build the APK locally (see above).
2. Go to [GitHub Releases](https://github.com/felipehuicochea/cointeligencia/releases).
3. Create a new release and upload the built APK.

---

## About

Cointeligencia is a trading alert system with real-time alerts and automated trading. All development and builds are done in this local directory.
