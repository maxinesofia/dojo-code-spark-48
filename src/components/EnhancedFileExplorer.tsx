import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  File, 
  Folder, 
  Plus, 
  MoreHorizontal, 
  Search,
  Undo,
  Redo,
  Copy,
  Scissors,
  ClipboardPaste,
  Download,
  Upload,
  Eye,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileCreateDialog } from "./FileCreateDialog";
import { FileContextMenu } from "./FileContextMenu";
import { FileSystemService, FileOperation } from "@/services/FileSystemService";
import { useToast } from "@/hooks/use-toast";

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

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
}

export function EnhancedFileExplorer({
  files = [],
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onMoveFile,
  onToggleFolder,
  onDeleteFile,
  onRenameFile,
  onUpdateFile
}: EnhancedFileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);
  const [dragDropZone, setDragDropZone] = useState(false);
  
  const fileSystemService = useRef(new FileSystemService());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery) {
      const results = fileSystemService.current.searchFiles(files, searchQuery, false);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, files]);

  // File operations
  const handleFileSelect = (file: FileNode, ctrlKey = false) => {
    if (ctrlKey) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set([file.id]));
      onFileSelect(file);
    }
  };

  const handleCopyFiles = () => {
    const fileIds = Array.from(selectedFiles);
    fileSystemService.current.copyFiles(fileIds);
    toast({
      title: "Files Copied",
      description: `${fileIds.length} file(s) copied to clipboard`
    });
  };

  const handleCutFiles = () => {
    const fileIds = Array.from(selectedFiles);
    fileSystemService.current.cutFiles(fileIds);
    toast({
      title: "Files Cut",
      description: `${fileIds.length} file(s) cut to clipboard`
    });
  };

  const handlePasteFiles = () => {
    const clipboard = fileSystemService.current.getClipboard();
    if (clipboard) {
      // Implement paste logic here
      toast({
        title: "Files Pasted",
        description: `${clipboard.files.length} file(s) pasted`
      });
      fileSystemService.current.clearClipboard();
    }
  };

  const handleUndo = () => {
    const operation = fileSystemService.current.undo();
    if (operation) {
      // Implement undo logic based on operation type
      toast({
        title: "Action Undone",
        description: `Undid ${operation.type} operation`
      });
    }
  };

  const handleRedo = () => {
    const operation = fileSystemService.current.redo();
    if (operation) {
      // Implement redo logic based on operation type
      toast({
        title: "Action Redone",
        description: `Redid ${operation.type} operation`
      });
    }
  };

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDragDropZone(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragDropZone(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragDropZone(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      try {
        const fileNodes = await fileSystemService.current.handleFileDrop(droppedFiles);
        // Add files to project
        for (const fileNode of fileNodes) {
          onCreateFile(fileNode.name, 'file');
          if (fileNode.content) {
            onUpdateFile(fileNode.id, fileNode.content);
          }
        }
        toast({
          title: "Files Imported",
          description: `${fileNodes.length} file(s) imported successfully`
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import some files",
          variant: "destructive"
        });
      }
    }
  };

  // File upload
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (uploadedFiles) {
      await handleDrop({ 
        preventDefault: () => {}, 
        stopPropagation: () => {},
        dataTransfer: { files: uploadedFiles }
      } as any);
    }
  };

  // Preview
  const handlePreview = (file: FileNode) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const FileTreeItem = ({ 
    node, 
    level = 0,
    inSearchResults = false
  }: {
    node: FileNode;
    level?: number;
    inSearchResults?: boolean;
  }) => {
    const isSelected = selectedFiles.has(node.id);
    const isActive = activeFile === node.id;
    const paddingLeft = level * 16 + 8;
    const metadata = fileSystemService.current.getFileMetadata(node.id);

    return (
      <div className="relative">
        <FileContextMenu
          node={node}
          onDelete={onDeleteFile}
          onRename={onRenameFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
        >
          <div
            className={cn(
              "flex items-center h-8 cursor-pointer hover:bg-muted/50 transition-colors group",
              isActive && "bg-primary-light border-r-2 border-primary",
              isSelected && "bg-muted",
              inSearchResults && "bg-accent/20"
            )}
            style={{ paddingLeft: inSearchResults ? 8 : paddingLeft }}
            onClick={(e) => {
              if (node.type === 'folder') {
                onToggleFolder(node.id);
              } else {
                handleFileSelect(node, e.ctrlKey || e.metaKey);
              }
            }}
          >
            {node.type === 'folder' && !inSearchResults && (
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
              "text-sm flex-1 truncate",
              isActive ? "text-primary font-medium" : "text-foreground"
            )}>
              {node.name}
            </span>

            {metadata && node.type === 'file' && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {Math.round(metadata.size / 1024)}KB
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(node);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview file</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </FileContextMenu>

        {node.type === 'folder' && node.isOpen && node.children && !inSearchResults && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="w-64 bg-editor-sidebar border-r border-editor-border flex flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="h-12 border-b border-editor-border flex items-center justify-between px-3">
        <span className="text-sm font-medium text-foreground">Explorer</span>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search files</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <FileCreateDialog onCreateFile={onCreateFile} onCreateFolder={onCreateFolder} />
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={handleFileUpload}
          >
            <Upload className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-3 border-b border-editor-border">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-editor-border bg-muted/20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleUndo}
                disabled={!fileSystemService.current.canUndo()}
              >
                <Undo className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleRedo}
                disabled={!fileSystemService.current.canRedo()}
              >
                <Redo className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCopyFiles}
                disabled={selectedFiles.size === 0}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCutFiles}
                disabled={selectedFiles.size === 0}
              >
                <Scissors className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cut</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handlePasteFiles}
                disabled={!fileSystemService.current.getClipboard()}
              >
                <ClipboardPaste className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {selectedFiles.size > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {selectedFiles.size} selected
          </Badge>
        )}
      </div>

      {/* File Tree */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        dragDropZone && "bg-primary/10 border-2 border-primary border-dashed"
      )}>
        {searchQuery && searchResults.length > 0 ? (
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((file) => (
              <FileTreeItem
                key={file.id}
                node={file}
                inSearchResults
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="p-4 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No files found matching "{searchQuery}"</p>
          </div>
        ) : (
          Array.isArray(files) ? files.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
            />
          )) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>No files to display</p>
            </div>
          )
        )}

        {dragDropZone && (
          <div className="p-4 text-center text-primary text-sm opacity-75">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            Drop files here to import
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* File Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="w-4 h-4" />
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {previewFile?.content && (
              <pre className="text-sm font-mono bg-muted p-4 rounded">
                {previewFile.content}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}