import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, Plus, MoreHorizontal, Trash2, Edit, FileText, Type, Hash, Database, Settings, Search } from 'lucide-react';
import { FileNode } from '../types/FileTypes';
import { getFileIcon } from '../utils/fileIcons';
import { FileContextMenu } from './FileContextMenu';
import { FileCreateDialog } from './FileCreateDialog';
import { EditableProjectTitle } from '@/components/EditableProjectTitle';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PackageService, Package } from "../services/PackageService";
import { FileIcon } from "@/utils/fileIcons";

interface VSCodeFileExplorerProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (name: string, type: 'file' | 'folder', content?: string, parentId?: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  projectTitle?: string;
  onProjectTitleChange?: (newTitle: string) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isSelected: boolean;
  selectedFile: FileNode | null;
  onSelect: (file: FileNode) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onCreateInFolder?: (parentId: string, name: string, type: 'file' | 'folder', content?: string) => void;
  expandedFolders: Set<string>;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  node, 
  level, 
  isSelected, 
  selectedFile,
  onSelect,
  onToggle,
  onDelete,
  onRename,
  onCreateInFolder,
  expandedFolders
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(node.name);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Check if this folder is expanded
  const isExpanded = node.type === 'folder' && expandedFolders.has(node.id);

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggle?.(node.id);
    } else {
      onSelect(node);
    }
  };

  const handleRename = () => {
    if (renameName.trim() && renameName !== node.name) {
      onRename?.(node.id, renameName.trim());
    }
    setIsRenaming(false);
    setRenameName(node.name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameName(node.name);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-muted/50 group relative",
          isSelected && "bg-primary/20 text-primary",
          "transition-colors"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 flex-shrink-0" />
            )}
            <FileIcon 
              fileName={node.name}
              isFolder={true}
              isExpanded={isExpanded}
              size={16}
              className="mr-2 flex-shrink-0"
            />
          </>
        ) : (
          <>
            <div className="w-4 mr-1" />
            <FileIcon 
              fileName={node.name}
              size={16}
              className="mr-2 flex-shrink-0"
            />
          </>
        )}
        
        {isRenaming ? (
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRename}
            onKeyPress={handleKeyPress}
            className="h-6 text-xs border-0 bg-background p-1 min-w-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}

        {/* Action buttons on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2">
          {node.type === 'folder' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-sidebar-accent"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateDialog(true);
              }}
              title="Add file to folder"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 hover:bg-sidebar-accent"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            title="Rename"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 hover:bg-sidebar-accent hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(node.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* File Create Dialog for this folder */}
      {node.type === 'folder' && (
        <FileCreateDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreateFile={(name, type, content) => {
            onCreateInFolder?.(node.id, name, type, content);
          }}
          parentFolder={node.name}
        />
      )}
      
      {isExpanded && node.children && (
        <div>
          {Array.isArray(node.children) ? node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={selectedFile?.id === child.id}
              selectedFile={selectedFile}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onRename={onRename}
              onCreateInFolder={onCreateInFolder}
              expandedFolders={expandedFolders}
            />
          )) : null}
        </div>
      )}
    </div>
  );
};

export function VSCodeFileExplorer({
  files = [],
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  projectTitle = "TUTORIALS DOJO",
  onProjectTitleChange
}: VSCodeFileExplorerProps) {
  // Debug logging and safety check
  console.log('VSCodeFileExplorer received files:', files, 'Type:', typeof files, 'Is array:', Array.isArray(files));
  
  // Ensure files is always an array
  const safeFiles = Array.isArray(files) ? files : [];
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get package service and analyze dependencies
  const packageService = PackageService.getInstance();
  const detectedPackages = packageService.analyzeProjectDependencies(safeFiles);
  const installedPackages = packageService.getInstalledPackages();

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateInFolder = (parentId: string, name: string, type: 'file' | 'folder', content?: string) => {
    onFileCreate(name, type, content, parentId);
  };

  return (
    <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Explorer Header */}
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <span>Explorer</span>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 hover:bg-sidebar-accent"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Project Folder - Scrollable File Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1">
          <div className="flex items-center text-sm font-medium py-1">
            <ChevronDown className="w-4 h-4 mr-1" />
            <Folder className="w-4 h-4 mr-2 text-blue-400" />
            <EditableProjectTitle 
              title={projectTitle}
              onTitleChange={onProjectTitleChange || (() => {})}
            />
          </div>
          
          {/* File Tree */}
          <div className="ml-2">
            {safeFiles.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                level={0}
                isSelected={selectedFile?.id === node.id}
                selectedFile={selectedFile}
                onSelect={onFileSelect}
                onToggle={toggleFolder}
                onDelete={onFileDelete}
                onRename={onFileRename}
                onCreateInFolder={handleCreateInFolder}
                expandedFolders={expandedFolders}
              />
            ))}
          </div>
        </div>
      </div>

      {/* File Create Dialog */}
      <FileCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateFile={(name, type, content) => {
          onFileCreate(name, type, content);
        }}
      />

      {/* Dependencies Section - Fixed at bottom */}
      {(installedPackages.length > 0 || detectedPackages.filter(pkg => !pkg.installed).length > 0) && (
        <div className="border-t border-sidebar-border flex-shrink-0">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Dependencies</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-sidebar-accent">
                <Search className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="px-2 py-1 max-h-24 overflow-y-auto">
            <div className="text-xs space-y-1">
              {installedPackages.length > 0 && (
                installedPackages.map((pkg) => (
                  <div key={pkg.name} className="flex items-center justify-between py-1 hover:bg-sidebar-accent/50 rounded px-1">
                    <div className="flex items-center min-w-0">
                      <span className="w-4 h-4 mr-2 text-xs">📦</span>
                      <span className="truncate">{pkg.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">{pkg.version}</span>
                  </div>
                ))
              )}
              
              {/* Show detected but not installed packages */}
              {detectedPackages.filter(pkg => !pkg.installed).length > 0 && (
                <>
                  {installedPackages.length > 0 && <div className="text-muted-foreground text-xs mt-2 mb-1">Detected in code:</div>}
                  {detectedPackages.filter(pkg => !pkg.installed).map((pkg) => (
                    <div key={`detected-${pkg.name}`} className="flex items-center justify-between py-1 hover:bg-sidebar-accent/50 rounded px-1">
                      <div className="flex items-center min-w-0">
                        <span className="w-4 h-4 mr-2 text-xs">⚠️</span>
                        <span className="truncate text-orange-500">{pkg.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">missing</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
