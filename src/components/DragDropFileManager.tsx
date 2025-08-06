import React, { useState, useRef } from 'react';
import { FileNode } from '../types/FileTypes';

interface DragDropFileManagerProps {
  files: FileNode[];
  onFileMove: (fileId: string, newParentId: string | null, newIndex?: number) => void;
  onFileSelect: (file: FileNode) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileDelete: (fileId: string) => void;
  activeFileId?: string;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemType: 'file' | 'folder' | null;
  dropTargetId: string | null;
}

export function DragDropFileManager({
  files,
  onFileMove,
  onFileSelect,
  onFileRename,
  onFileDelete,
  activeFileId,
  className = ''
}: DragDropFileManagerProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItemId: null,
    draggedItemType: null,
    dropTargetId: null
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, file: FileNode) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.id);
    
    setDragState({
      isDragging: true,
      draggedItemId: file.id,
      draggedItemType: file.type,
      dropTargetId: null
    });
  };

  const handleDragOver = (e: React.DragEvent, targetFile?: FileNode) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetFile && targetFile.type === 'folder' && targetFile.id !== dragState.draggedItemId) {
      setDragState(prev => ({ ...prev, dropTargetId: targetFile.id }));
    } else {
      setDragState(prev => ({ ...prev, dropTargetId: null }));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState(prev => ({ ...prev, dropTargetId: null }));
    }
  };

  const handleDrop = (e: React.DragEvent, targetFile?: FileNode) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetFile?.id) return;

    const newParentId = targetFile?.type === 'folder' ? targetFile.id : null;
    onFileMove(draggedId, newParentId);

    setDragState({
      isDragging: false,
      draggedItemId: null,
      draggedItemType: null,
      dropTargetId: null
    });
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedItemId: null,
      draggedItemType: null,
      dropTargetId: null
    });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const startRename = (file: FileNode) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim() && renameValue.trim() !== files.find(f => f.id === renamingId)?.name) {
      onFileRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      const isExpanded = expandedFolders.has(file.id);
      return isExpanded ? '📁' : '📂';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📄';
      case 'ts':
      case 'tsx':
        return '📘';
      case 'css':
        return '🎨';
      case 'html':
        return '🌐';
      case 'json':
        return '⚙️';
      case 'md':
        return '📝';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const renderFileTree = (fileList: FileNode[], level = 0) => {
    return fileList.map(file => {
      const isActive = file.id === activeFileId;
      const isDraggedOver = dragState.dropTargetId === file.id;
      const isDragging = dragState.draggedItemId === file.id;
      const isExpanded = expandedFolders.has(file.id);
      const isRenaming = renamingId === file.id;

      return (
        <div key={file.id} className="select-none">
          <div
            draggable={!isRenaming}
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) => handleDragOver(e, file)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, file)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-2 px-2 py-1 cursor-pointer transition-all duration-200
              hover:bg-primary/10 group relative
              ${isActive ? 'bg-primary/20 text-primary' : 'text-foreground'}
              ${isDraggedOver ? 'bg-primary/30 ring-2 ring-primary/50' : ''}
              ${isDragging ? 'opacity-50' : ''}
              ${level > 0 ? `ml-${level * 4}` : ''}
            `}
            style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            onClick={() => {
              if (file.type === 'folder') {
                toggleFolder(file.id);
              } else {
                onFileSelect(file);
              }
            }}
            onDoubleClick={() => {
              if (file.type === 'file') {
                startRename(file);
              }
            }}
          >
            {file.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(file.id);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            
            <span className="text-lg">{getFileIcon(file)}</span>
            
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={finishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    finishRename();
                  } else if (e.key === 'Escape') {
                    cancelRename();
                  }
                }}
                className="flex-1 bg-background border border-primary rounded px-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm truncate">{file.name}</span>
            )}

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(file);
                }}
                className="text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-primary/10"
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileDelete(file.id);
                }}
                className="text-xs text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>

          {file.type === 'folder' && isExpanded && file.children && (
            <div>
              {renderFileTree(file.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div 
      className={`h-full overflow-auto ${className}`}
      onDragOver={(e) => handleDragOver(e)}
      onDrop={(e) => handleDrop(e)}
    >
      <div className="p-2 space-y-1">
        {renderFileTree(files)}
      </div>
      
      {dragState.isDragging && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            Moving {dragState.draggedItemType}...
          </div>
        </div>
      )}
    </div>
  );
}