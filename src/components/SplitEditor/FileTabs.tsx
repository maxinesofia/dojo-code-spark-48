
import { useState, useRef } from 'react';
import { FileNode } from '@/types/FileTypes';
import { EditorPaneData } from './SplitEditor';
import { Button } from '@/components/ui/button';
import { X, SplitSquareHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/utils/fileIcons';

interface FileTabsProps {
  paneId: string;
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileClose?: (fileId: string) => void;
  onMoveToPane?: (fileId: string, targetPaneId: string, sourcePaneId?: string) => void;
  availablePanes?: EditorPaneData[];
  onClose?: () => void;
  showSplitOption?: boolean;
  onSplitWith?: (fileId: string) => void;
  openFiles?: string[]; // List of file IDs that should show as tabs
}

export function FileTabs({
  paneId,
  files,
  activeFileId,
  onFileSelect,
  onFileClose,
  onMoveToPane,
  availablePanes = [],
  onClose,
  showSplitOption = false,
  onSplitWith,
  openFiles = []
}: FileTabsProps) {
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Only show files that are in the openFiles array
  const displayFiles = files.filter(f => f.type === 'file' && openFiles.includes(f.id));

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFileId(fileId);
    e.dataTransfer.setData('text/plain', fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPaneId: string) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('text/plain');
    
    if (fileId && targetPaneId !== paneId && onMoveToPane) {
      onMoveToPane(fileId, targetPaneId, paneId);
    }
    
    setDraggedFileId(null);
  };

  const handleCloseTab = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (onFileClose) {
      onFileClose(fileId);
    }
  };

  const renderTab = (file: FileNode) => {
    const isActive = file.id === activeFileId;
    const isDragged = draggedFileId === file.id;
    
    return (
      <div
        key={file.id}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 border-r border-border cursor-pointer transition-colors group relative",
          "hover:bg-muted/50 select-none min-w-0 max-w-[160px] text-sm",
          isActive 
            ? "bg-background text-foreground border-b-2 border-b-primary" 
            : "bg-muted/20 text-muted-foreground hover:text-foreground",
          isDragged && "opacity-50"
        )}
        onClick={() => onFileSelect(file.id)}
        draggable
        onDragStart={(e) => handleDragStart(e, file.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0 text-muted-foreground">
            {(() => {
              const icon = getFileIcon(file.name);
              if (typeof icon === 'object' && 'icon' in icon) {
                const IconComponent = icon.icon;
                return <IconComponent className="w-3.5 h-3.5" style={{ color: icon.color }} />;
              }
              return icon;
            })()}
          </div>
          <span className="truncate font-medium">
            {file.name}
          </span>
        </div>
        
        {/* Close button with X icon */}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted-foreground/20"
          onClick={(e) => handleCloseTab(e, file.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Don't render the tabs container if there are no open files
  if (displayFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-b bg-muted/10">
      <div 
        ref={tabsRef}
        className="flex flex-1 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, paneId)}
      >
        {displayFiles.map(renderTab)}
      </div>
      
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 mx-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
