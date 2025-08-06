import { useState, useEffect } from "react";
import { Search, Download, Trash2, Package, ExternalLink, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PackageManagerService, PackageInfo, InstalledPackage } from "@/services/PackageManagerService";

interface PackageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PackageManager({ isOpen, onClose }: PackageManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());
  const packageManager = new PackageManagerService();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadInstalledPackages();
    }
  }, [isOpen]);

  const loadInstalledPackages = () => {
    const packages = packageManager.getInstalledPackages();
    setInstalledPackages(packages);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await packageManager.searchPackages(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not search for packages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstallPackage = async (packageInfo: PackageInfo) => {
    setInstallingPackages(prev => new Set(prev).add(packageInfo.name));
    
    try {
      const installed = await packageManager.installPackage(packageInfo.name, packageInfo.version);
      if (installed) {
        toast({
          title: "Package Installed",
          description: `${packageInfo.name}@${packageInfo.version} has been installed successfully.`
        });
        loadInstalledPackages();
      } else {
        throw new Error("Installation failed");
      }
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: `Could not install ${packageInfo.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setInstallingPackages(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageInfo.name);
        return newSet;
      });
    }
  };

  const handleUninstallPackage = (packageName: string) => {
    const success = packageManager.uninstallPackage(packageName);
    if (success) {
      toast({
        title: "Package Uninstalled",
        description: `${packageName} has been removed successfully.`
      });
      loadInstalledPackages();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getDependencyTree = () => {
    return packageManager.getDependencyTree();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Package Manager</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs defaultValue="search" className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="search">Search Packages</TabsTrigger>
                <TabsTrigger value="installed">
                  Installed ({installedPackages.length})
                </TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="search" className="flex-1 overflow-hidden px-6">
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search npm packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {searchResults.map((pkg) => (
                      <Card key={`${pkg.name}-${pkg.version}`} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">{pkg.name}</h3>
                              <Badge variant="secondary">v{pkg.version}</Badge>
                              {packageManager.isPackageInstalled(pkg.name) && (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Installed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {pkg.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {pkg.author && <span>By {pkg.author}</span>}
                              {pkg.license && <span>License: {pkg.license}</span>}
                              {pkg.homepage && (
                                <a 
                                  href={pkg.homepage} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Homepage
                                </a>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleInstallPackage(pkg)}
                            disabled={
                              installingPackages.has(pkg.name) || 
                              packageManager.isPackageInstalled(pkg.name)
                            }
                          >
                            {installingPackages.has(pkg.name) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : packageManager.isPackageInstalled(pkg.name) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            {packageManager.isPackageInstalled(pkg.name) ? 'Installed' : 'Install'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="installed" className="flex-1 overflow-hidden px-6">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {installedPackages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No packages installed yet</p>
                      <p className="text-sm">Search and install packages to get started</p>
                    </div>
                  ) : (
                    installedPackages.map((pkg) => (
                      <Card key={pkg.name} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{pkg.name}</h3>
                              <Badge variant="outline">v{pkg.installedVersion}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {pkg.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Installed: {pkg.installedAt.toLocaleDateString()}</span>
                              <a 
                                href={pkg.cdnUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                                CDN URL
                              </a>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUninstallPackage(pkg.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="dependencies" className="flex-1 overflow-hidden px-6">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Dependency relationships between installed packages:
                  </div>
                  {Object.entries(getDependencyTree()).map(([packageName, deps]) => (
                    <Card key={packageName} className="p-4">
                      <h3 className="font-semibold mb-2">{packageName}</h3>
                      {deps.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {deps.map((dep) => (
                            <Badge key={dep} variant="outline">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No dependencies</span>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}