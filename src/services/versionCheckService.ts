interface GitHubRelease {
  tag_name: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  body?: string;
}

interface VersionInfo {
  version: string;
  tagName: string;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt: string;
}

// App version and release date constants
// These should be updated when building a new release
export const APP_VERSION = '2.1.0-beta'; // Current app version - update when building
export const APP_RELEASE_DATE = '2026-02-04'; // Release date in YYYY-MM-DD format - update when building

class VersionCheckService {
  private static readonly GITHUB_REPO_OWNER = 'felipehuicochea'; // GitHub owner
  private static readonly GITHUB_REPO_NAME = 'cointeligencia'; // GitHub repository name
  private static readonly GITHUB_API_BASE = 'https://api.github.com';

  // Parse version string (e.g., "2.0.5-beta") into comparable parts
  private parseVersion(version: string): { major: number; minor: number; patch: number; prerelease?: string } {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^v/i, '');
    
    // Split version and prerelease
    const parts = cleanVersion.split('-');
    const versionPart = parts[0];
    const prereleasePart = parts[1] || undefined;
    
    const [major, minor, patch] = versionPart.split('.').map(Number);
    
    return {
      major: major || 0,
      minor: minor || 0,
      patch: patch || 0,
      prerelease: prereleasePart
    };
  }

  // Normalize patch so 2.0.8 and 2.0.80 are treated as the same release (app vs GitHub naming)
  private normalizePatchForEquivalence(patch1: number, patch2: number): { p1: number; p2: number } {
    const a = Math.min(patch1, patch2);
    const b = Math.max(patch1, patch2);
    if (a >= 1 && a <= 9 && b === a * 10) return { p1: a, p2: a };
    return { p1: patch1, p2: patch2 };
  }

  // Compare two versions - returns: 1 if version1 > version2, -1 if version1 < version2, 0 if equal
  private compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    // Compare major version
    if (v1.major > v2.major) return 1;
    if (v1.major < v2.major) return -1;

    // Compare minor version
    if (v1.minor > v2.minor) return 1;
    if (v1.minor < v2.minor) return -1;

    // Compare patch: treat 2.0.8 and 2.0.80 as same release (different naming)
    const { p1, p2 } = this.normalizePatchForEquivalence(v1.patch, v2.patch);
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;

    // If versions are equal, prereleases are considered older
    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      // Simple string comparison for prerelease tags (beta > alpha, etc.)
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  // Get current app version
  getCurrentVersion(): string {
    return APP_VERSION;
  }

  // Get app release date
  getReleaseDate(): string {
    return APP_RELEASE_DATE;
  }

  // Check for newer prereleases on GitHub
  async checkForUpdates(): Promise<VersionInfo | null> {
    try {
      const currentVersion = this.getCurrentVersion();
      console.log('[VersionCheck] Checking for updates...');
      console.log('[VersionCheck] Current version:', currentVersion);

      // Fetch prereleases from GitHub
      const url = `${VersionCheckService.GITHUB_API_BASE}/repos/${VersionCheckService.GITHUB_REPO_OWNER}/${VersionCheckService.GITHUB_REPO_NAME}/releases`;
      
      console.log('[VersionCheck] Fetching releases from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('[VersionCheck] Failed to fetch releases:', response.status, response.statusText);
        return null;
      }

      const releases: GitHubRelease[] = await response.json();
      console.log('[VersionCheck] Found', releases.length, 'releases');

      // Filter only prereleases
      const prereleases = releases.filter(release => release.prerelease === true);
      console.log('[VersionCheck] Found', prereleases.length, 'prereleases');

      if (prereleases.length === 0) {
        console.log('[VersionCheck] No prereleases found');
        return null;
      }

      // Sort prereleases by version (newest first)
      prereleases.sort((a, b) => {
        return this.compareVersions(b.tag_name, a.tag_name);
      });

      // Get the latest prerelease
      const latestPrerelease = prereleases[0];
      console.log('[VersionCheck] Latest prerelease:', latestPrerelease.tag_name);

      // Compare with current version
      const comparison = this.compareVersions(latestPrerelease.tag_name, currentVersion);
      
      if (comparison > 0) {
        console.log('[VersionCheck] Newer version available:', latestPrerelease.tag_name, 'vs current:', currentVersion);
        return {
          version: latestPrerelease.tag_name,
          tagName: latestPrerelease.name || latestPrerelease.tag_name,
          releaseUrl: latestPrerelease.html_url,
          releaseNotes: latestPrerelease.body || undefined,
          publishedAt: latestPrerelease.published_at
        };
      } else {
        console.log('[VersionCheck] Current version is up to date or newer. Latest:', latestPrerelease.tag_name, 'Current:', currentVersion);
        return null;
      }
    } catch (error) {
      console.error('[VersionCheck] Error checking for updates:', error);
      return null;
    }
  }

}

export const versionCheckService = new VersionCheckService();
