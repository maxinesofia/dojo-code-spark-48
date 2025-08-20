import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileNode } from "../types/FileTypes";
import { Trash2, Edit3, FolderPlus, FilePlus, Copy } from "lucide-react";

interface FileContextMenuProps {
  children: React.ReactNode;
  node: FileNode;
  onDelete: (nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
}

export function FileContextMenu({
  children,
  node,
  onDelete,
  onRename,
  onCreateFile,
  onCreateFolder,
}: FileContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleDelete = () => {
    onDelete(node.id);
    setShowDeleteDialog(false);
  };

  const handleRename = () => {
    const newName = prompt("Enter new name:", node.name);
    if (newName && newName.trim() && newName !== node.name) {
      onRename(node.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleNewFile = () => {
    const fileName = prompt("Enter file name:");
    if (fileName && fileName.trim()) {
      onCreateFile(fileName.trim(), "javascript");
    }
  };

  const handleNewFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (folderName && folderName.trim()) {
      onCreateFolder(folderName.trim());
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {node.type === 'folder' && (
            <>
              <ContextMenuItem onClick={handleNewFile} className="flex items-center gap-2">
                <FilePlus className="w-4 h-4" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={handleNewFolder} className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename} className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(node.name)} className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy Name
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)} 
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {node.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{node.name}"? 
              {node.type === 'folder' && ' This will also delete all files and folders inside it.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}