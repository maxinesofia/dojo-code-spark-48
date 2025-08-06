export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  homepage?: string;
  repository?: string;
  license?: string;
  dependencies?: Record<string, string>;
}

export interface InstalledPackage extends PackageInfo {
  cdnUrl: string;
  installDate: Date;
}

export interface PackageSearchResult {
  packages: PackageInfo[];
  total: number;
}

export class PackageManagerService {
  private installedPackages = new Map<string, InstalledPackage>();
  private importMap = new Map<string, string>();
  private storageKey = 'tutorials-dojo-packages';

  constructor() {
    this.loadPackagesFromStorage();
  }

  async searchPackages(query: string, limit = 20): Promise<PackageSearchResult> {
    try {
      // Use npms.io API for package search
      const response = await fetch(
        `https://api.npms.io/v2/search?q=${encodeURIComponent(query)}&size=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search packages');
      }

      const data = await response.json();
      
      const packages: PackageInfo[] = data.objects.map((item: any) => ({
        name: item.package.name,
        version: item.package.version,
        description: item.package.description || '',
        homepage: item.package.links?.homepage,
        repository: item.package.links?.repository,
        license: item.package.license
      }));

      return {
        packages,
        total: data.total
      };
    } catch (error) {
      console.error('Package search failed:', error);
      return { packages: [], total: 0 };
    }
  }

  async installPackage(name: string, version = 'latest'): Promise<InstalledPackage> {
    try {
      // Get package info from unpkg
      const infoResponse = await fetch(`https://unpkg.com/${name}@${version}/package.json`);
      
      if (!infoResponse.ok) {
        throw new Error(`Failed to fetch package info for ${name}@${version}`);
      }

      const packageInfo: PackageInfo = await infoResponse.json();
      
      // Determine the CDN URL
      const cdnUrl = `https://unpkg.com/${name}@${version}`;
      
      const installedPackage: InstalledPackage = {
        ...packageInfo,
        cdnUrl,
        installDate: new Date()
      };

      // Store the package
      this.installedPackages.set(name, installedPackage);
      this.updateImportMap(name, cdnUrl);
      this.savePackagesToStorage();

      return installedPackage;
    } catch (error) {
      throw new Error(`Failed to install ${name}@${version}: ${error}`);
    }
  }

  uninstallPackage(name: string): boolean {
    const removed = this.installedPackages.delete(name);
    if (removed) {
      this.importMap.delete(name);
      this.savePackagesToStorage();
    }
    return removed;
  }

  getInstalledPackages(): InstalledPackage[] {
    return Array.from(this.installedPackages.values());
  }

  getImportMap(): Record<string, string> {
    return Object.fromEntries(this.importMap);
  }

  generateImportMapScript(): string {
    const importMap = this.getImportMap();
    
    return `<script type="importmap">
{
  "imports": ${JSON.stringify(importMap, null, 2)}
}
</script>`;
  }

  private updateImportMap(packageName: string, cdnUrl: string): void {
    // For ES modules, try to find the module entry point
    this.importMap.set(packageName, `${cdnUrl}/+esm`);
    
    // Common patterns for submodules
    this.importMap.set(`${packageName}/`, `${cdnUrl}/`);
  }

  private savePackagesToStorage(): void {
    try {
      const packagesData = Array.from(this.installedPackages.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(packagesData));
    } catch (error) {
      console.error('Failed to save packages to storage:', error);
    }
  }

  private loadPackagesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const packagesData = JSON.parse(stored);
        this.installedPackages = new Map(packagesData);
        
        // Rebuild import map
        for (const [name, pkg] of this.installedPackages) {
          this.updateImportMap(name, pkg.cdnUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load packages from storage:', error);
    }
  }

  async getPackageVersions(name: string): Promise<string[]> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${name}`);
      if (!response.ok) {
        throw new Error('Failed to fetch package versions');
      }
      
      const data = await response.json();
      const versions = Object.keys(data.versions || {});
      
      // Sort versions in descending order (latest first)
      return versions.sort((a, b) => {
        // Simple version comparison
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aNum = aParts[i] || 0;
          const bNum = bParts[i] || 0;
          
          if (aNum !== bNum) {
            return bNum - aNum;
          }
        }
        
        return 0;
      });
    } catch (error) {
      console.error('Failed to get package versions:', error);
      return [];
    }
  }
}