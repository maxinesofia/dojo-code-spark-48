import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, Plus, MoreHorizontal, Trash2, Edit, FileText, Type, Hash, Database, Settings, Search, Download } from 'lucide-react';
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
  onFileMove?: (fileId: string, newParentId?: string, targetNodeId?: string, position?: 'above' | 'below') => void;
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
  onMove?: (fileId: string, newParentId?: string, targetNodeId?: string, position?: 'above' | 'below') => void;
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
  onMove,
  expandedFolders
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(node.name);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'inside' | null>(null);

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

  // Global drag state cleanup listener
  useEffect(() => {
    const handleClearDragStates = () => {
      setIsDragOver(false);
      setDropPosition(null);
      setIsDragging(false);
    };

    window.addEventListener('clearAllDragStates', handleClearDragStates);
    return () => window.removeEventListener('clearAllDragStates', handleClearDragStates);
  }, []);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (node.type === 'folder') {
      // For folders, check if we're dropping above, below, or inside
      if (y < height * 0.25) {
        setDropPosition('above');
        setIsDragOver(true);
      } else if (y > height * 0.75) {
        setDropPosition('below');
        setIsDragOver(true);
      } else {
        setDropPosition('inside');
        setIsDragOver(true);
      }
    } else {
      // For files, only above or below
      if (y < height * 0.5) {
        setDropPosition('above');
        setIsDragOver(true);
      } else {
        setDropPosition('below');
        setIsDragOver(true);
      }
    }
    
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're actually leaving this element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedFileId = e.dataTransfer.getData('text/plain');
    
    if (draggedFileId && draggedFileId !== node.id) {
      if (dropPosition === 'inside' && node.type === 'folder') {
        // Drop into folder
        onMove?.(draggedFileId, node.id);
      } else if (dropPosition === 'above' || dropPosition === 'below') {
        // Reorder - pass the target node ID and position
        onMove?.(draggedFileId, undefined, node.id, dropPosition);
      }
    }
    
    setIsDragOver(false);
    setDropPosition(null);
  };

  return (
    <div className="relative">
      {/* Drop indicators - only show when actively dragging over */}
      {isDragOver && dropPosition === 'above' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" 
             style={{ pointerEvents: 'none' }} />
      )}
      {isDragOver && dropPosition === 'below' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full z-10"
             style={{ pointerEvents: 'none' }} />
      )}
      
      <div
        className={cn(
          "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-muted/50 group relative",
          isSelected && "bg-primary/20 text-primary",
          isDragging && "opacity-50",
          isDragOver && dropPosition === 'inside' && node.type === 'folder' && "bg-blue-100 border border-blue-300 border-dashed",
          "transition-all duration-200"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
              onMove={onMove}
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
  onFileMove,
  projectTitle = "TUTORIALS DOJO",
  onProjectTitleChange
}: VSCodeFileExplorerProps) {
  // Debug logging and safety check
  console.log('VSCodeFileExplorer received files:', files, 'Type:', typeof files, 'Is array:', Array.isArray(files));
  
  // Ensure files is always an array
  const safeFiles = Array.isArray(files) ? files : [];
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const downloadProjectAsZip = () => {
    // Create a simple zip-like structure by concatenating all files
    const projectData = {
      projectName: projectTitle || 'project',
      files: safeFiles.map(file => ({
        name: file.name,
        content: file.content || ''
      })),
      timestamp: new Date().toISOString()
    };

    // Create a blob with all file contents
    let zipContent = `# ${projectData.projectName}\nExported on: ${projectData.timestamp}\n\n`;
    
    projectData.files.forEach(file => {
      zipContent += `\n${'='.repeat(50)}\nFile: ${file.name}\n${'='.repeat(50)}\n`;
      zipContent += file.content + '\n';
    });

    const blob = new Blob([zipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectData.projectName}-export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Global cleanup for drag states
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      // Force clear all drag states when any drag operation ends
      const event = new CustomEvent('clearAllDragStates');
      window.dispatchEvent(event);
    };

    const handleClearDragStates = () => {
      // This will be caught by individual FileTreeItems to clear their states
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('clearAllDragStates', handleClearDragStates);
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('clearAllDragStates', handleClearDragStates);
    };
  }, []);

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
              size="sm"
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-accent"
              onClick={downloadProjectAsZip}
              title="Download project as file"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-accent"
              onClick={() => setShowCreateDialog(true)}
              title="Create new file"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Project Folder - Scrollable File Tree */}
      <div 
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedFileId = e.dataTransfer.getData('text/plain');
          if (draggedFileId) {
            // Drop to root level (no parent)
            onFileMove?.(draggedFileId, undefined);
          }
        }}
        onDragEnd={(e) => {
          // Global cleanup to ensure all drag states are cleared
          e.preventDefault();
        }}
      >
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
                onMove={onFileMove}
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
