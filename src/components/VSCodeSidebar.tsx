import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Plus, Trash2, Search, GitBranch, Puzzle, Settings } from 'lucide-react';
import { FileNode } from '../types/FileTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface VSCodeSidebarProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  onCreateFile: (name: string, type: 'file' | 'folder', parentId?: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export function VSCodeSidebar({ files, selectedFile, onFileSelect, onCreateFile, onDeleteFile }: VSCodeSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explorer');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFile = () => {
    const name = prompt('Enter file name:');
    if (name) {
      onCreateFile(name, 'file');
    }
  };

  const handleCreateFolder = () => {
    const name = prompt('Enter folder name:');
    if (name) {
      onCreateFile(name, 'folder');
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes
      .filter(node => !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(node => {
        const isExpanded = expandedFolders.has(node.id);
        const isSelected = selectedFile?.id === node.id;
        
        return (
          <div key={node.id} className="select-none">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent/50 group",
                isSelected && "bg-accent text-accent-foreground",
                level > 0 && "ml-4"
              )}
              onClick={() => {
                if (node.type === 'folder') {
                  toggleFolder(node.id);
                } else {
                  onFileSelect(node);
                }
              }}
              style={{ paddingLeft: `${8 + level * 16}px` }}
            >
              {node.type === 'folder' ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  ) : (
                    <Folder className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  )}
                </>
              ) : (
                <File className="w-4 h-4 flex-shrink-0 ml-5 text-gray-500" />
              )}
              
              <span className="flex-1 truncate">{node.name}</span>
              
              {node.type === 'file' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(node.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {node.type === 'folder' && isExpanded && node.children && (
              <div>
                {renderFileTree(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <div className="h-full bg-sidebar border-r border-border flex flex-col">
      {/* Activity Bar */}
      <div className="w-12 bg-sidebar-accent border-r border-border flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-12 w-12 rounded-none", activeTab === 'explorer' && "bg-accent")}
          onClick={() => setActiveTab('explorer')}
        >
          <File className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-12 w-12 rounded-none", activeTab === 'search' && "bg-accent")}
          onClick={() => setActiveTab('search')}
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-12 w-12 rounded-none", activeTab === 'git' && "bg-accent")}
          onClick={() => setActiveTab('git')}
        >
          <GitBranch className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-12 w-12 rounded-none", activeTab === 'extensions' && "bg-accent")}
          onClick={() => setActiveTab('extensions')}
        >
          <Puzzle className="w-5 h-5" />
        </Button>
        
        <div className="flex-1" />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-none"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'explorer' && (
          <>
            {/* Explorer Header */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">EXPLORER</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={handleCreateFile}
                    title="New File"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={handleCreateFolder}
                    title="New Folder"
                  >
                    <Folder className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
              <div className="py-1">
                {renderFileTree(files)}
              </div>
            </ScrollArea>
          </>
        )}

        {activeTab === 'search' && (
          <div className="p-2">
            <h3 className="text-sm font-medium text-foreground mb-2">SEARCH</h3>
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <div className="text-sm text-muted-foreground">
              {searchQuery ? `Searching for "${searchQuery}"` : 'Enter search term'}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="p-2">
            <h3 className="text-sm font-medium text-foreground mb-2">SOURCE CONTROL</h3>
            <div className="text-sm text-muted-foreground">
              <div className="mb-2">• Repository: vscode-firecracker</div>
              <div className="mb-2">• Branch: main</div>
              <div className="mb-2">• Changes: 0</div>
              <div className="text-green-600">✓ Working tree clean</div>
            </div>
          </div>
        )}

        {activeTab === 'extensions' && (
          <div className="p-2">
            <h3 className="text-sm font-medium text-foreground mb-2">EXTENSIONS</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>JavaScript (ES6)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Prettier - Code formatter</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>ESLint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>GitLens</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}