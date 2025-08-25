import { useState, useRef } from 'react';
import { FileNode } from '@/types/FileTypes';
import { EditorPaneData } from './SplitEditor';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { X, MoreHorizontal, SplitSquareHorizontal, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/utils/fileIcons';

interface FileTabsProps {
  paneId: string;
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onMoveToPane?: (fileId: string, targetPaneId: string, sourcePaneId?: string) => void;
  availablePanes?: EditorPaneData[];
  onClose?: () => void;
  showSplitOption?: boolean;
  onSplitWith?: (fileId: string) => void;
}

export function FileTabs({
  paneId,
  files,
  activeFileId,
  onFileSelect,
  onMoveToPane,
  availablePanes = [],
  onClose,
  showSplitOption = false,
  onSplitWith
}: FileTabsProps) {
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const displayFiles = files.filter(f => f.type === 'file');

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
        
        {isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-background border shadow-lg z-50">
              {showSplitOption && onSplitWith && (
                <>
                  <DropdownMenuItem onClick={() => onSplitWith(file.id)}>
                    <SplitSquareHorizontal className="w-3 h-3 mr-2" />
                    Split Right
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {availablePanes.length > 1 && onMoveToPane && (
                <>
                  {availablePanes
                    .filter(pane => pane.id !== paneId)
                    .map((pane, index) => (
                      <DropdownMenuItem
                        key={pane.id}
                        onClick={() => onMoveToPane(file.id, pane.id, paneId)}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Move to Editor {index + 2}
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

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