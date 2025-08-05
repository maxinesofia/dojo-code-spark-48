import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, File, Folder, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCreateDialog } from "./FileCreateDialog";

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
  onMoveFile: (fileId: string, targetFolderId: string | null) => void;
}

function FileTreeItem({ 
  node, 
  level = 0, 
  activeFile, 
  onFileSelect, 
  onToggle,
  onMoveFile
}: {
  node: FileNode;
  level?: number;
  activeFile: string | null;
  onFileSelect: (file: FileNode) => void;
  onToggle: (id: string) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isActive = activeFile === node.id;
  const paddingLeft = level * 16 + 8;

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type === 'file') {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      e.preventDefault();
      const fileId = e.dataTransfer.getData('text/plain');
      if (fileId && fileId !== node.id) {
        onMoveFile(fileId, node.id);
      }
      setDragOver(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center h-8 cursor-pointer hover:bg-muted/50 transition-colors",
          isActive && "bg-primary-light border-r-2 border-primary",
          dragOver && node.type === 'folder' && "bg-primary/10 border-primary",
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({ 
  files, 
  activeFile, 
  onFileSelect, 
  onCreateFile, 
  onCreateFolder,
  onMoveFile
}: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>(files);

  // Update file tree when files prop changes
  useEffect(() => {
    setFileTree(files);
  }, [files]);

  const handleToggle = (id: string) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateNodes(fileTree));
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
      
      <div className="flex-1 overflow-y-auto">
        {fileTree.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            onToggle={handleToggle}
            onMoveFile={onMoveFile}
          />
        ))}
      </div>
    </div>
  );
}