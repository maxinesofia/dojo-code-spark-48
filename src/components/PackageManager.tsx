import React, { useState, useEffect } from 'react';
import { Search, Package, Download, Trash2, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PackageManagerService, PackageInfo, InstalledPackage } from '@/services/PackageManagerService';

interface PackageManagerProps {
  packageService: PackageManagerService;
  onPackageInstalled?: (pkg: InstalledPackage) => void;
  onPackageUninstalled?: (packageName: string) => void;
}

export function PackageManager({ packageService, onPackageInstalled, onPackageUninstalled }: PackageManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'search' | 'installed'>('installed');
  const { toast } = useToast();

  useEffect(() => {
    loadInstalledPackages();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim() && activeTab === 'search') {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, activeTab]);

  const loadInstalledPackages = () => {
    setInstalledPackages(packageService.getInstalledPackages());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await packageService.searchPackages(searchQuery);
      setSearchResults(results.packages);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search packages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstall = async (packageInfo: PackageInfo) => {
    const packageName = packageInfo.name;
    setInstalling(prev => new Set(prev).add(packageName));

    try {
      const installedPackage = await packageService.installPackage(packageName, packageInfo.version);
      loadInstalledPackages();
      onPackageInstalled?.(installedPackage);
      
      toast({
        title: "Package Installed",
        description: `${packageName}@${packageInfo.version} has been installed successfully.`
      });
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: `Failed to install ${packageName}: ${error}`,
        variant: "destructive"
      });
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageName);
        return newSet;
      });
    }
  };

  const handleUninstall = (packageName: string) => {
    const success = packageService.uninstallPackage(packageName);
    if (success) {
      loadInstalledPackages();
      onPackageUninstalled?.(packageName);
      
      toast({
        title: "Package Uninstalled",
        description: `${packageName} has been uninstalled.`
      });
    } else {
      toast({
        title: "Uninstall Failed",
        description: `Failed to uninstall ${packageName}.`,
        variant: "destructive"
      });
    }
  };

  const isPackageInstalled = (packageName: string) => {
    return installedPackages.some(pkg => pkg.name === packageName);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Package Manager</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          <Button
            variant={activeTab === 'installed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('installed')}
          >
            Installed ({installedPackages.length})
          </Button>
          <Button
            variant={activeTab === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('search')}
          >
            Search
          </Button>
        </div>

        {/* Search Bar */}
        {activeTab === 'search' && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === 'installed' ? (
            <div className="space-y-3">
              {installedPackages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No packages installed</p>
                  <p className="text-sm">Switch to Search tab to install packages</p>
                </div>
              ) : (
                installedPackages.map((pkg) => (
                  <Card key={pkg.name} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{pkg.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            v{pkg.version}
                          </Badge>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {pkg.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Installed {new Date(pkg.installDate).toLocaleDateString()}
                          </span>
                          {pkg.homepage && (
                            <a
                              href={pkg.homepage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Homepage
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUninstall(pkg.name)}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isSearching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Searching packages...</p>
                </div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No packages found for "{searchQuery}"</p>
                  <p className="text-sm">Try different keywords</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Search for packages to install</p>
                  <p className="text-sm">Enter a package name above</p>
                </div>
              ) : (
                searchResults.map((pkg) => (
                  <Card key={pkg.name} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{pkg.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            v{pkg.version}
                          </Badge>
                          {isPackageInstalled(pkg.name) && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {pkg.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {pkg.license && <span>License: {pkg.license}</span>}
                          {pkg.homepage && (
                            <a
                              href={pkg.homepage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Homepage
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={isPackageInstalled(pkg.name) ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleInstall(pkg)}
                        disabled={installing.has(pkg.name) || isPackageInstalled(pkg.name)}
                        className="ml-2"
                      >
                        {installing.has(pkg.name) ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : isPackageInstalled(pkg.name) ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}