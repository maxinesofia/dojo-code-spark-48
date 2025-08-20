export interface Package {
  name: string;
  version: string;
  description?: string;
  type: 'dependency' | 'devDependency';
  installed: boolean;
}

export class PackageService {
  private static instance: PackageService;
  private packages: Package[] = [];

  private constructor() {
    this.loadDefaultPackages();
  }

  static getInstance(): PackageService {
    if (!PackageService.instance) {
      PackageService.instance = new PackageService();
    }
    return PackageService.instance;
  }

  private loadDefaultPackages() {
    // Load packages from localStorage or set defaults
    const saved = localStorage.getItem('tutorials-dojo-dependencies');
    if (saved) {
      try {
        this.packages = JSON.parse(saved);
      } catch (error) {
        console.error('Error loading packages:', error);
        this.setDefaultPackages();
      }
    } else {
      this.setDefaultPackages();
    }
  }

  private setDefaultPackages() {
    this.packages = [
      {
        name: 'react',
        version: '^18.0.0',
        description: 'A JavaScript library for building user interfaces',
        type: 'dependency',
        installed: true
      },
      {
        name: 'react-dom',
        version: '^18.0.0',
        description: 'React package for working with the DOM',
        type: 'dependency',
        installed: true
      }
    ];
    this.savePackages();
  }

  getInstalledPackages(): Package[] {
    return this.packages.filter(pkg => pkg.installed);
  }

  getAllPackages(): Package[] {
    return [...this.packages];
  }

  installPackage(name: string, version: string = 'latest', type: 'dependency' | 'devDependency' = 'dependency'): boolean {
    try {
      const existingIndex = this.packages.findIndex(pkg => pkg.name === name);
      
      if (existingIndex >= 0) {
        // Update existing package
        this.packages[existingIndex] = {
          ...this.packages[existingIndex],
          version,
          type,
          installed: true
        };
      } else {
        // Add new package
        this.packages.push({
          name,
          version,
          type,
          installed: true
        });
      }

      this.savePackages();
      return true;
    } catch (error) {
      console.error('Error installing package:', error);
      return false;
    }
  }

  uninstallPackage(name: string): boolean {
    try {
      this.packages = this.packages.filter(pkg => pkg.name !== name);
      this.savePackages();
      return true;
    } catch (error) {
      console.error('Error uninstalling package:', error);
      return false;
    }
  }

  isPackageInstalled(name: string): boolean {
    return this.packages.some(pkg => pkg.name === name && pkg.installed);
  }

  private savePackages() {
    try {
      localStorage.setItem('tutorials-dojo-dependencies', JSON.stringify(this.packages));
    } catch (error) {
      console.error('Error saving packages:', error);
    }
  }

  // Method to analyze project files and detect used packages
  analyzeProjectDependencies(files: any[]): Package[] {
    const detectedPackages: Package[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    const analyzeContent = (content: string) => {
      // Find ES6 imports
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const packageName = match[1];
        if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
          const baseName = packageName.split('/')[0];
          if (!detectedPackages.find(pkg => pkg.name === baseName)) {
            detectedPackages.push({
              name: baseName,
              version: 'latest',
              type: 'dependency',
              installed: this.isPackageInstalled(baseName)
            });
          }
        }
      }

      // Find CommonJS requires
      while ((match = requireRegex.exec(content)) !== null) {
        const packageName = match[1];
        if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
          const baseName = packageName.split('/')[0];
          if (!detectedPackages.find(pkg => pkg.name === baseName)) {
            detectedPackages.push({
              name: baseName,
              version: 'latest',
              type: 'dependency',
              installed: this.isPackageInstalled(baseName)
            });
          }
        }
      }
    };

    const processFiles = (fileArray: any[]) => {
      fileArray.forEach(file => {
        if (file.type === 'file' && file.content) {
          analyzeContent(file.content);
        }
        if (file.children) {
          processFiles(file.children);
        }
      });
    };

    processFiles(files);
    return detectedPackages;
  }
}