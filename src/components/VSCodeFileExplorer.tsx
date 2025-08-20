import React, { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  File, 
  Folder, 
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileNode } from "../types/FileTypes";

interface VSCodeFileExplorerProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (name: string, type: 'file' | 'folder', parentId?: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isSelected: boolean;
  onSelect: (file: FileNode) => void;
  onToggle?: (id: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  node, 
  level, 
  isSelected, 
  onSelect,
  onToggle 
}) => {
  const handleClick = () => {
    if (node.type === 'folder') {
      onToggle?.(node.id);
    } else {
      onSelect(node);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return '🟨';
      case 'ts': return '🔷';
      case 'jsx': return '⚛️';
      case 'tsx': return '⚛️';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'json': return '📋';
      default: return '📄';
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-muted/50 group",
          isSelected && "bg-primary/20 text-primary",
          "transition-colors"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {node.isOpen ? (
              <ChevronDown className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 flex-shrink-0" />
            )}
            {node.isOpen ? (
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 mr-2 flex-shrink-0 text-blue-400" />
            )}
          </>
        ) : (
          <>
            <div className="w-4 mr-1" />
            <span className="w-4 h-4 mr-2 flex-shrink-0 text-xs">
              {getFileIcon(node.name)}
            </span>
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={isSelected && child.id === node.id}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function VSCodeFileExplorer({
  files,
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename
}: VSCodeFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const filesWithExpandedState = files.map(file => ({
    ...file,
    isOpen: expandedFolders.has(file.id)
  }));

  return (
    <div className="h-full bg-sidebar text-sidebar-foreground">
      {/* Explorer Header */}
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <span>Explorer</span>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 hover:bg-sidebar-accent"
              onClick={() => {
                setCreateType('file');
                setShowCreateInput(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-sidebar-accent">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Project Folder */}
      <div className="px-2 py-1">
        <div className="flex items-center text-sm font-medium py-1">
          <ChevronDown className="w-4 h-4 mr-1" />
          <Folder className="w-4 h-4 mr-2 text-blue-400" />
          <span>TUTORIALS DOJO</span>
        </div>
        
        {/* File Tree */}
        <div className="ml-2">
          {filesWithExpandedState.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              level={0}
              isSelected={selectedFile?.id === node.id}
              onSelect={onFileSelect}
              onToggle={toggleFolder}
            />
          ))}
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="mt-4 border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Dependencies</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-sidebar-accent">
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="px-2 py-1">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center py-1">
              <span className="w-4 h-4 mr-2 text-xs">📦</span>
              <span>react</span>
              <span className="ml-auto text-muted-foreground">^18.0.0</span>
            </div>
            <div className="flex items-center py-1">
              <span className="w-4 h-4 mr-2 text-xs">📦</span>
              <span>react-dom</span>
              <span className="ml-auto text-muted-foreground">^18.0.0</span>
            </div>
            <div className="flex items-center py-1">
              <span className="w-4 h-4 mr-2 text-xs">📦</span>
              <span>react-scripts</span>
              <span className="ml-auto text-muted-foreground">^5.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}