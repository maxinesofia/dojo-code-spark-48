export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  author?: string;
  license?: string;
}

export interface InstalledPackage extends PackageInfo {
  installedVersion: string;
  installedAt: Date;
  cdnUrl: string;
}

export interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

export class PackageManagerService {
  private installedPackages: Map<string, InstalledPackage> = new Map();
  private cdnBaseUrl = 'https://unpkg.com';
  private jsDelivrUrl = 'https://cdn.jsdelivr.net/npm';

  constructor() {
    this.loadPersistedPackages();
  }

  async searchPackages(query: string): Promise<PackageInfo[]> {
    try {
      // Use npms.io API for package search
      const response = await fetch(`https://api.npms.io/v2/search?q=${encodeURIComponent(query)}&size=20`);
      const data = await response.json();
      
      return data.results.map((result: any) => ({
        name: result.package.name,
        version: result.package.version,
        description: result.package.description,
        repository: result.package.links?.repository ? {
          type: 'git',
          url: result.package.links.repository
        } : undefined,
        homepage: result.package.links?.homepage,
        author: result.package.author?.name,
        license: result.package.license
      }));
    } catch (error) {
      console.error('Package search failed:', error);
      return [];
    }
  }

  async getPackageInfo(packageName: string, version?: string): Promise<PackageInfo | null> {
    try {
      const url = version 
        ? `https://registry.npmjs.org/${packageName}/${version}`
        : `https://registry.npmjs.org/${packageName}/latest`;
      
      const response = await fetch(url);
      const data = await response.json();

      return {
        name: data.name,
        version: data.version,
        description: data.description,
        dependencies: data.dependencies,
        peerDependencies: data.peerDependencies,
        repository: data.repository,
        homepage: data.homepage,
        author: typeof data.author === 'string' ? data.author : data.author?.name,
        license: data.license
      };
    } catch (error) {
      console.error('Failed to fetch package info:', error);
      return null;
    }
  }

  async installPackage(packageName: string, version?: string): Promise<InstalledPackage | null> {
    try {
      const packageInfo = await this.getPackageInfo(packageName, version);
      if (!packageInfo) {
        throw new Error(`Package ${packageName} not found`);
      }

      const resolvedVersion = version || packageInfo.version;
      const cdnUrl = this.resolveCDNUrl(packageName, resolvedVersion);

      // Verify the package exists on CDN
      const headResponse = await fetch(cdnUrl, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Package not available on CDN: ${cdnUrl}`);
      }

      const installedPackage: InstalledPackage = {
        ...packageInfo,
        installedVersion: resolvedVersion,
        installedAt: new Date(),
        cdnUrl
      };

      this.installedPackages.set(packageName, installedPackage);
      this.persistPackages();

      return installedPackage;
    } catch (error) {
      console.error('Package installation failed:', error);
      return null;
    }
  }

  uninstallPackage(packageName: string): boolean {
    const existed = this.installedPackages.has(packageName);
    this.installedPackages.delete(packageName);
    if (existed) {
      this.persistPackages();
    }
    return existed;
  }

  getInstalledPackages(): InstalledPackage[] {
    return Array.from(this.installedPackages.values());
  }

  isPackageInstalled(packageName: string): boolean {
    return this.installedPackages.has(packageName);
  }

  getInstalledPackage(packageName: string): InstalledPackage | null {
    return this.installedPackages.get(packageName) || null;
  }

  resolveCDNUrl(packageName: string, version: string, entrypoint?: string): string {
    const entry = entrypoint || '';
    return `${this.cdnBaseUrl}/${packageName}@${version}${entry}`;
  }

  generateImportMap(): ImportMap {
    const imports: Record<string, string> = {};
    
    for (const [name, packageInfo] of this.installedPackages) {
      // Try to resolve the main entry point
      const cdnUrl = this.resolveCDNUrl(name, packageInfo.installedVersion);
      imports[name] = cdnUrl;
      
      // Also add common variations
      imports[`${name}/`] = `${cdnUrl}/`;
    }

    return { imports };
  }

  async resolveVersionConflicts(): Promise<void> {
    // Simple strategy: use latest installed version for each package
    const conflicts: string[] = [];
    
    for (const [name, packageInfo] of this.installedPackages) {
      try {
        const latestInfo = await this.getPackageInfo(name);
        if (latestInfo && latestInfo.version !== packageInfo.installedVersion) {
          conflicts.push(name);
        }
      } catch (error) {
        console.warn(`Could not check for updates for ${name}:`, error);
      }
    }

    // For now, just log conflicts - in a real implementation,
    // you might want to present resolution options to the user
    if (conflicts.length > 0) {
      console.warn('Version conflicts detected for packages:', conflicts);
    }
  }

  getDependencyTree(): Record<string, string[]> {
    const tree: Record<string, string[]> = {};
    
    for (const [name, packageInfo] of this.installedPackages) {
      const deps = packageInfo.dependencies ? Object.keys(packageInfo.dependencies) : [];
      tree[name] = deps.filter(dep => this.installedPackages.has(dep));
    }

    return tree;
  }

  private persistPackages(): void {
    try {
      const packagesData = Array.from(this.installedPackages.entries()).map(([name, pkg]) => [
        name,
        {
          ...pkg,
          installedAt: pkg.installedAt.toISOString()
        }
      ]);
      localStorage.setItem('tutorials-dojo-packages', JSON.stringify(packagesData));
    } catch (error) {
      console.error('Failed to persist packages:', error);
    }
  }

  private loadPersistedPackages(): void {
    try {
      const stored = localStorage.getItem('tutorials-dojo-packages');
      if (stored) {
        const packagesData = JSON.parse(stored);
        for (const [name, pkg] of packagesData) {
          this.installedPackages.set(name, {
            ...pkg,
            installedAt: new Date(pkg.installedAt)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load persisted packages:', error);
    }
  }

  clearCache(): void {
    this.installedPackages.clear();
    localStorage.removeItem('tutorials-dojo-packages');
  }
}