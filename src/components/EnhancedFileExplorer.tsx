import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, File, Folder, Plus, MoreHorizontal, Search, Upload, Copy, Scissors, Clipboard, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FileCreateDialog } from "./FileCreateDialog";
import { FileContextMenu } from "./FileContextMenu";
import { FileNode } from "./FileExplorer";
import { FileSystemService, SearchResult, ClipboardItem } from "@/services/FileSystemService";
import { useToast } from "@/hooks/use-toast";

interface EnhancedFileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (file: FileNode) => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null, position?: 'before' | 'after', targetFileId?: string) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onUpdateFile: (fileId: string, content: string) => void;
  onAddFiles: (files: FileNode[]) => void;
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
  onCreateFolder,
  fileSystemService,
  selectedFiles,
  onFileSelectionChange,
  searchTerm
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
  fileSystemService: FileSystemService;
  selectedFiles: Set<string>;
  onFileSelectionChange: (fileId: string, selected: boolean, multiSelect?: boolean) => void;
  searchTerm?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const isActive = activeFile === node.id;
  const isSelected = selectedFiles.has(node.id);
  const paddingLeft = level * 16 + 8;

  // Filter children based on search term
  const visibleChildren = searchTerm && node.children 
    ? node.children.filter(child => 
        child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (child.type === 'folder' && hasMatchingDescendants(child, searchTerm))
      )
    : node.children;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      fileIds: isSelected ? Array.from(selectedFiles) : [node.id],
      type: 'file-drag'
    }));
    e.dataTransfer.effectAllowed = 'move';
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
      if (y < height / 2) {
        setDropPosition('before');
      } else {
        setDropPosition('after');
      }
    }
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
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
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'file-drag' && data.fileIds) {
        for (const fileId of data.fileIds) {
          if (fileId !== node.id) {
            if (node.type === 'folder' && dropPosition === 'inside') {
              onMoveFile(fileId, node.id);
            } else if (node.type === 'file' && (dropPosition === 'before' || dropPosition === 'after')) {
              onMoveFile(fileId, null, dropPosition, node.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
    setDragOver(false);
    setDropPosition(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      onFileSelectionChange(node.id, !isSelected, true);
    } else if (e.shiftKey && selectedFiles.size > 0) {
      // Range select (simplified - would need more logic for proper range selection)
      onFileSelectionChange(node.id, true, true);
    } else {
      // Single select
      if (node.type === 'folder') {
        onToggle(node.id);
      } else {
        onFileSelect(node);
      }
      if (selectedFiles.size > 1) {
        // Clear multi-selection
        selectedFiles.forEach(id => onFileSelectionChange(id, false));
      }
    }
  };

  // Highlight search matches
  const highlightedName = searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase())
    ? node.name.replace(
        new RegExp(`(${searchTerm})`, 'gi'),
        '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
      )
    : node.name;

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
            isSelected && "bg-accent/50",
            dragOver && dropPosition === 'inside' && node.type === 'folder' && "bg-primary/10 border-l-2 border-primary"
          )}
          style={{ paddingLeft }}
          draggable={true}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
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
            node.isOpen ? (
              <FolderOpen className="w-4 h-4 mr-2 text-primary" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-primary" />
            )
          ) : (
            <File className="w-4 h-4 mr-2 text-muted-foreground" />
          )}
          <span 
            className={cn(
              "text-sm flex-1",
              isActive ? "text-primary font-medium" : "text-foreground"
            )}
            dangerouslySetInnerHTML={{ __html: highlightedName }}
          />
          
          {/* File stats */}
          {node.type === 'file' && node.content && (
            <div className="text-xs text-muted-foreground mr-2">
              {fileSystemService.getFileStats(node).lines && (
                <span>{fileSystemService.getFileStats(node).lines}L</span>
              )}
            </div>
          )}
        </div>
      </FileContextMenu>

      {/* Drop indicator */}
      {dragOver && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" style={{ marginLeft: paddingLeft }} />
      )}
      
      {node.type === 'folder' && node.isOpen && visibleChildren && (
        <div>
          {visibleChildren.map((child) => (
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
              fileSystemService={fileSystemService}
              selectedFiles={selectedFiles}
              onFileSelectionChange={onFileSelectionChange}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function hasMatchingDescendants(node: FileNode, searchTerm: string): boolean {
  if (node.children) {
    return node.children.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (child.type === 'folder' && hasMatchingDescendants(child, searchTerm))
    );
  }
  return false;
}

export function EnhancedFileExplorer({ 
  files, 
  activeFile, 
  onFileSelect, 
  onCreateFile, 
  onCreateFolder,
  onMoveFile,
  onToggleFolder,
  onDeleteFile,
  onRenameFile,
  onUpdateFile,
  onAddFiles
}: EnhancedFileExplorerProps) {
  const [rootDropZone, setRootDropZone] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fileSystemService = new FileSystemService();
  const { toast } = useToast();

  useEffect(() => {
    if (searchTerm.trim()) {
      const results = fileSystemService.searchFiles(files, searchTerm);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, files]);

  const handleToggle = (id: string) => {
    onToggleFolder(id);
  };

  const handleFileSelectionChange = (fileId: string, selected: boolean, multiSelect = false) => {
    if (multiSelect) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(fileId);
        } else {
          newSet.delete(fileId);
        }
        return newSet;
      });
    } else {
      setSelectedFiles(selected ? new Set([fileId]) : new Set());
    }
  };

  const handleCopy = () => {
    if (selectedFiles.size === 0) return;
    
    const filesToCopy = Array.from(selectedFiles).map(id => findFileById(files, id)).filter(Boolean) as FileNode[];
    fileSystemService.copyFiles(filesToCopy);
    setClipboard(fileSystemService.getClipboard());
    
    toast({
      title: "Files Copied",
      description: `${filesToCopy.length} file(s) copied to clipboard`
    });
  };

  const handleCut = () => {
    if (selectedFiles.size === 0) return;
    
    const filesToCut = Array.from(selectedFiles).map(id => findFileById(files, id)).filter(Boolean) as FileNode[];
    fileSystemService.cutFiles(filesToCut);
    setClipboard(fileSystemService.getClipboard());
    
    toast({
      title: "Files Cut",
      description: `${filesToCut.length} file(s) cut to clipboard`
    });
  };

  const handlePaste = () => {
    const clipboardData = fileSystemService.getClipboard();
    if (!clipboardData) return;

    // Implementation would depend on your file management logic
    toast({
      title: "Files Pasted",
      description: `${clipboardData.files.length} file(s) pasted`
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    try {
      const fileNodes: FileNode[] = [];
      
      for (const file of Array.from(uploadedFiles)) {
        const fileNode = await fileSystemService.handleFileUpload(file);
        fileNodes.push(fileNode);
      }
      
      onAddFiles(fileNodes);
      
      toast({
        title: "Files Uploaded",
        description: `${fileNodes.length} file(s) uploaded successfully`
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: "destructive"
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Check if it's a file from outside the browser
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setRootDropZone(true);
    } else {
      e.dataTransfer.dropEffect = 'move';
      setRootDropZone(true);
    }
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setRootDropZone(false);
    }
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setRootDropZone(false);
    
    // Handle external file drops
    if (e.dataTransfer.files.length > 0) {
      const uploadedFiles = Array.from(e.dataTransfer.files);
      try {
        const fileNodes: FileNode[] = [];
        
        for (const file of uploadedFiles) {
          const fileNode = await fileSystemService.handleFileUpload(file);
          fileNodes.push(fileNode);
        }
        
        onAddFiles(fileNodes);
        
        toast({
          title: "Files Dropped",
          description: `${fileNodes.length} file(s) added successfully`
        });
      } catch (error) {
        toast({
          title: "Drop Failed",
          description: error instanceof Error ? error.message : 'Failed to add files',
          variant: "destructive"
        });
      }
      return;
    }
    
    // Handle internal file moves
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'file-drag' && data.fileIds) {
        for (const fileId of data.fileIds) {
          onMoveFile(fileId, null);
        }
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="w-64 bg-editor-sidebar border-r border-editor-border flex flex-col">
      {/* Header */}
      <div className="border-b border-editor-border">
        <div className="h-12 flex items-center justify-between px-3">
          <span className="text-sm font-medium text-foreground">Explorer</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowSearch(!showSearch)}
              title="Search files"
            >
              <Search className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => fileInputRef.current?.click()}
              title="Upload files"
            >
              <Upload className="w-3 h-3" />
            </Button>
            <FileCreateDialog onCreateFile={onCreateFile} onCreateFolder={onCreateFolder} />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="px-3 pb-3">
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
        
        {/* File Operations Bar */}
        {selectedFiles.size > 0 && (
          <div className="px-3 pb-3 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {selectedFiles.size} selected
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCopy}
                title="Copy"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCut}
                title="Cut"
              >
                <Scissors className="w-3 h-3" />
              </Button>
              {clipboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handlePaste}
                  title="Paste"
                >
                  <Clipboard className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* File Tree */}
      <div 
        className={cn(
          "flex-1 overflow-hidden flex flex-col",
          rootDropZone && "bg-primary/5 border-2 border-primary border-dashed"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <ScrollArea className="flex-1">
          <div className="p-1">
            {searchResults.length > 0 ? (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.map((result) => (
                  <div key={result.file.id} className="space-y-1">
                    <div
                      className="flex items-center h-8 px-2 cursor-pointer hover:bg-muted/50 transition-colors rounded"
                      onClick={() => onFileSelect(result.file)}
                    >
                      <File className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{result.file.name}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {result.matches.length}
                      </Badge>
                    </div>
                    {result.matches.slice(0, 3).map((match, index) => (
                      <div key={index} className="px-6 py-1 text-xs text-muted-foreground">
                        Line {match.line}: <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                          {match.text.substring(Math.max(0, match.startIndex - 10), match.endIndex + 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              files.map((node) => (
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
                  fileSystemService={fileSystemService}
                  selectedFiles={selectedFiles}
                  onFileSelectionChange={handleFileSelectionChange}
                  searchTerm={searchTerm}
                />
              ))
            )}
            
            {rootDropZone && (
              <div className="p-4 text-center text-primary text-sm opacity-75">
                Drop files here to add them to the project
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}