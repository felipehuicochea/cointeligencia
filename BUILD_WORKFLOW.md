# Build Workflow - Ensuring Fixes Persist

This document describes the proper workflow to ensure bug fixes are included in builds and don't disappear in future builds.

## The Problem We Solved

Previously, fixes were made locally but:
- Source code (`src/`) wasn't tracked in git
- Builds pulled from git, which didn't have the fixes
- Fixes kept "disappearing" in new builds

## Solution: Proper Git Workflow

### ✅ Correct Workflow

1. **Make your fix** in the local files
2. **Verify the fix works** locally
3. **Commit to git**:
   ```bash
   git add src/
   git commit -m "Fix: Description of the fix"
   ```
4. **Push to GitHub**:
   ```bash
   git push origin master
   ```
5. **Build from committed code**:
   - **Cloud builds** (recommended): Automatically pull from git
   - **Local builds**: Ensure you're on the latest commit first

### ❌ What NOT to Do

- ❌ Don't build without committing changes
- ❌ Don't skip pushing to GitHub
- ❌ Don't build from uncommitted local files (unless testing)

## Build Methods

### Method 1: Cloud Build (Recommended)

Cloud builds automatically pull from git, ensuring fixes are included:

```bash
# Make sure you're on latest commit
git pull origin master

# Build on EAS cloud
eas build --platform android --profile preview
```

**Advantages:**
- ✅ Always uses committed code from git
- ✅ Consistent builds across team members
- ✅ No local environment issues

### Method 2: Local Build (For Testing)

If building locally, **always run pre-build checks first**:

```bash
# Run pre-build verification
./scripts/pre-build-check.sh

# Then build
eas build --platform android --profile preview --local
```

**Important:** Local builds use your local files. If you haven't committed, the build won't reflect your fixes for others.

## Pre-Build Verification Script

We've added `scripts/pre-build-check.sh` to verify:
- ✅ Source code is tracked in git
- ✅ No uncommitted changes (or warns you)
- ✅ Critical files exist
- ✅ Latest commit includes source code

**Run it before every build:**
```bash
chmod +x scripts/pre-build-check.sh
./scripts/pre-build-check.sh
```

## GitHub Actions (Automated)

We've set up GitHub Actions workflow (`.github/workflows/build.yml`) that:
- ✅ Automatically verifies git state on push
- ✅ Ensures source code is tracked
- ✅ Triggers builds when source code changes

**Setup required:**
1. Add `EXPO_TOKEN` secret to GitHub repository settings
2. Workflow will run automatically on pushes to `master`

## Checklist Before Building

Before creating a build, verify:

- [ ] Fix is implemented and tested locally
- [ ] All changes are committed: `git status` shows clean
- [ ] Changes are pushed to GitHub: `git push origin master`
- [ ] Pre-build check passes: `./scripts/pre-build-check.sh`
- [ ] Build is done from git (cloud) or verified local state (local)

## Verifying Builds Include Fixes

After building, verify the fix is included:

1. **Check build logs** - Should show source files being included
2. **Test the fix** - Install APK and verify the bug is fixed
3. **Check git commit** - Build should be from a commit that includes the fix

## Troubleshooting

### "Fix disappeared in new build"

**Possible causes:**
1. Fix wasn't committed to git
2. Build pulled from wrong branch/commit
3. Source code not tracked in git

**Solution:**
```bash
# Check if fix is in git
git log --all --oneline --grep "your fix description"

# Check if src/ is tracked
git ls-files | grep src/

# Re-apply fix and commit properly
```

### "Build doesn't include my changes"

**Check:**
1. Are changes committed? `git status`
2. Are changes pushed? `git log origin/master`
3. Is build pulling from git? (cloud builds do automatically)

## Best Practices

1. **Always commit fixes** before building
2. **Use cloud builds** for production/release builds
3. **Run pre-build checks** before local builds
4. **Tag releases** in git for traceability
5. **Document fixes** in commit messages

## Example: Fixing a Bug

```bash
# 1. Make the fix
vim src/services/tradingService.ts

# 2. Test locally
npm start

# 3. Commit the fix
git add src/services/tradingService.ts
git commit -m "Fix: USDT→USDC conversion for Binance EU"

# 4. Push to GitHub
git push origin master

# 5. Verify pre-build checks
./scripts/pre-build-check.sh

# 6. Build (cloud - recommended)
eas build --platform android --profile preview

# OR build locally (for testing)
eas build --platform android --profile preview --local
```

---

**Remember:** If it's not in git, it won't be in the build (for cloud builds or fresh clones).
