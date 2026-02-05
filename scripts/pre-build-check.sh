#!/bin/bash
# Pre-build verification script
# Ensures git state is clean and source code is tracked before building

set -e

echo "🔍 Pre-build verification..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ ERROR: Not in a git repository!"
  exit 1
fi

# Check if src/ is tracked
if ! git ls-files | grep -q "^src/"; then
  echo "❌ ERROR: src/ directory is not tracked in git!"
  echo ""
  echo "To fix this, run:"
  echo "  git add src/"
  echo "  git commit -m 'Add source code to git'"
  echo ""
  exit 1
fi
echo "✓ Source code is tracked in git"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  WARNING: Uncommitted changes detected!"
  echo ""
  git status --short
  echo ""
  echo "These changes will NOT be included in the build if you're building from git."
  echo "Consider committing them first:"
  echo "  git add ."
  echo "  git commit -m 'Your commit message'"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✓ Working directory is clean"
fi

# Verify critical files exist
CRITICAL_FILES=(
  "src/services/tradingService.ts"
  "src/services/exchangeCapabilities.ts"
  "package.json"
  "app.json"
)

echo ""
echo "Checking critical files..."
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ ERROR: Critical file missing: $file"
    exit 1
  fi
  echo "✓ Found: $file"
done

# Check if we're on the expected branch (optional)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo ""
echo "Current branch: $CURRENT_BRANCH"

# Verify latest commit includes source code
LATEST_COMMIT=$(git rev-parse HEAD)
if ! git ls-tree -r --name-only "$LATEST_COMMIT" | grep -q "^src/"; then
  echo "⚠️  WARNING: Latest commit does not include src/ directory!"
  echo "The build may not include your latest fixes."
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✓ Latest commit includes source code"
fi

echo ""
echo "✅ Pre-build checks passed!"
echo ""
