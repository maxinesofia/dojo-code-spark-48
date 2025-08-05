import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, File, Folder, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCreateDialog } from "./FileCreateDialog";
import { FileContextMenu } from "./FileContextMenu";

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (file: FileNode) => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null, position?: 'before' | 'after', targetFileId?: string) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}

function FileTreeItem({ 
  node, 
  level = 0, 
  activeFile, 
  onFileSelect, 
  onToggle,
  onMoveFile,
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  onCreateFolder
}: {
  node: FileNode;
  level?: number;
  activeFile: string | null;
  onFileSelect: (file: FileNode) => void;
  onToggle: (id: string) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null, position?: 'before' | 'after', targetFileId?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const isActive = activeFile === node.id;
  const paddingLeft = level * 16 + 8;

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type === 'file') {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (node.type === 'folder') {
      setDropPosition('inside');
    } else {
      // For files, determine if dropping above or below
      if (y < height / 2) {
        setDropPosition('before');
      } else {
        setDropPosition('after');
      }
    }
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the element completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('text/plain');
    if (fileId && fileId !== node.id) {
      if (node.type === 'folder' && dropPosition === 'inside') {
        onMoveFile(fileId, node.id);
      } else if (node.type === 'file' && (dropPosition === 'before' || dropPosition === 'after')) {
        // Move to same folder as target file, with specific position
        onMoveFile(fileId, null, dropPosition, node.id);
      }
    }
    setDragOver(false);
    setDropPosition(null);
  };

  return (
    <div className="relative">
      {/* Drop indicator */}
      {dragOver && dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" style={{ marginLeft: paddingLeft }} />
      )}
      
      <FileContextMenu
        node={node}
        onDelete={onDeleteFile}
        onRename={onRenameFile}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
      >
        <div
          className={cn(
            "flex items-center h-8 cursor-pointer hover:bg-muted/50 transition-colors relative",
            isActive && "bg-primary-light border-r-2 border-primary",
            dragOver && dropPosition === 'inside' && node.type === 'folder' && "bg-primary/10 border-l-2 border-primary",
            node.type === 'file' && "select-none"
          )}
          style={{ paddingLeft }}
          draggable={node.type === 'file'}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (node.type === 'folder') {
              onToggle(node.id);
            } else {
              onFileSelect(node);
            }
          }}
        >
          {node.type === 'folder' && (
            <div className="w-4 h-4 mr-1">
              {node.isOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          )}
          {node.type === 'folder' ? (
            <Folder className="w-4 h-4 mr-2 text-primary" />
          ) : (
            <File className="w-4 h-4 mr-2 text-muted-foreground" />
          )}
          <span className={cn(
            "text-sm flex-1",
            isActive ? "text-primary font-medium" : "text-foreground"
          )}>
            {node.name}
          </span>
        </div>
      </FileContextMenu>

      {/* Drop indicator */}
      {dragOver && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" style={{ marginLeft: paddingLeft }} />
      )}
      
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onToggle={onToggle}
              onMoveFile={onMoveFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (file: FileNode) => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null, position?: 'before' | 'after', targetFileId?: string) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}

export function FileExplorer({ 
  files, 
  activeFile, 
  onFileSelect, 
  onCreateFile, 
  onCreateFolder,
  onMoveFile,
  onToggleFolder,
  onDeleteFile,
  onRenameFile
}: FileExplorerProps) {
  const [rootDropZone, setRootDropZone] = useState(false);

  const handleToggle = (id: string) => {
    onToggleFolder(id);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRootDropZone(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setRootDropZone(false);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('text/plain');
    if (fileId) {
      onMoveFile(fileId, null);
    }
    setRootDropZone(false);
  };

  return (
    <div className="w-64 bg-editor-sidebar border-r border-editor-border flex flex-col">
      <div className="h-12 border-b border-editor-border flex items-center justify-between px-3">
        <span className="text-sm font-medium text-foreground">Explorer</span>
        <div className="flex gap-1">
          <FileCreateDialog onCreateFile={onCreateFile} onCreateFolder={onCreateFolder} />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div 
        className={cn(
          "flex-1 overflow-y-auto",
          rootDropZone && "bg-primary/5 border-2 border-primary border-dashed"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {files.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            onToggle={handleToggle}
            onMoveFile={onMoveFile}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
          />
        ))}
        {rootDropZone && (
          <div className="p-4 text-center text-primary text-sm opacity-75">
            Drop file here to move to root
          </div>
        )}
      </div>
    </div>
  );
}