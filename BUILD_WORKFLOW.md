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
4. **Build locally** (do not push source to GitHub).
5. **Publish APK** by uploading the built APK to GitHub Releases when ready.

### ❌ What NOT to Do

- ❌ Don't push source code to GitHub (repo is for APK releases only)
- ❌ Don't build without committing changes locally
- ❌ Don't build from uncommitted local files (unless testing)

## Build Methods (Local Only)

### Local build

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

## Checklist Before Building

Before creating a build, verify:

- [ ] Fix is implemented and tested locally
- [ ] All changes are committed locally: `git status` shows clean
- [ ] Pre-build check passes: `./scripts/pre-build-check.sh`
- [ ] Build is done from your local directory (no GitHub push of source)

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
2. Did you build from this directory? (local builds use local files)

## Best Practices

1. **Always commit fixes** before building (local git only)
2. **Run pre-build checks** before local builds
3. **Tag or note commits** when releasing an APK for traceability
4. **Upload APK to GitHub Releases** when you want to distribute

## Example: Fixing a Bug and Releasing

```bash
# 1. Make the fix
vim src/services/tradingService.ts

# 2. Test locally
npm start

# 3. Commit locally (do not push source)
git add src/services/tradingService.ts
git commit -m "Fix: description"

# 4. Pre-build check and build
./scripts/pre-build-check.sh
eas build --platform android --profile preview --local

# 5. Upload the built APK to GitHub Releases (manual)
#    https://github.com/felipehuicochea/cointeligencia/releases
```

---

**Remember:** Development is local. GitHub is used only for APK releases.
