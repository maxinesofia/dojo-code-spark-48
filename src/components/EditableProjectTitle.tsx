import { useState, useEffect, useRef } from 'react';
import { Check, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProjectService, Project } from '@/services/ProjectService';

interface EditableProjectTitleProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  className?: string;
  currentProjectId?: string; // Add this to identify current project
}

export function EditableProjectTitle({ title, onTitleChange, className = "", currentProjectId }: EditableProjectTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{newName: string, existingProject: Project} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      toast({
        title: "Error",
        description: "Please enter a valid project name",
        variant: "destructive"
      });
      return;
    }
    
    // If the name hasn't changed, just exit editing mode
    if (trimmedValue === title) {
      setIsEditing(false);
      return;
    }

    // Check if another project already has this name
    const existingProjects = ProjectService.getAllProjects();
    
    // Find if there's a different project with the same name
    const existingProject = existingProjects.find(p => {
      const hasSameName = p.name.toLowerCase() === trimmedValue.toLowerCase();
      
      if (!hasSameName) return false;
      
      // For unsaved projects (currentProjectId === 'current'), 
      // any existing project with same name is a conflict
      if (currentProjectId === 'current') {
        return true;
      }
      
      // For saved projects, only projects with different IDs are conflicts
      if (currentProjectId && p.id !== currentProjectId) {
        return true;
      }
      
      return false;
    });
    
    if (existingProject) {
      // Show confirmation dialog
      setConfirmData({ newName: trimmedValue, existingProject });
      setIsConfirmOpen(true);
      return;
    }

    // No conflict, proceed with rename
    performRename(trimmedValue);
  };

  const performRename = (newName: string) => {
    onTitleChange(newName);
    setIsEditing(false);
    
    // Also update the project in the projects list if we have a currentProjectId
    if (currentProjectId) {
      ProjectService.renameProject(currentProjectId, newName);
    }
    
    toast({
      title: "Success",
      description: "Project renamed successfully!"
    });
  };

  const handleConfirm = () => {
    if (confirmData) {
      // Delete the existing project and rename the current one
      ProjectService.deleteProject(confirmData.existingProject.id);
      performRename(confirmData.newName);
      
      toast({
        title: "Success",
        description: `Project renamed and "${confirmData.existingProject.name}" was replaced`
      });
    }
    setIsConfirmOpen(false);
    setConfirmData(null);
  };

  const handleConfirmCancel = () => {
    setIsConfirmOpen(false);
    setConfirmData(null);
    setEditValue(title); // Reset to original
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
    // Ensure dialog is closed when canceling
    setIsConfirmOpen(false);
    setConfirmData(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-6 text-sm font-medium px-2 py-1 min-w-[200px]"
          placeholder="Project name"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-700"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-2 group ${className}`}>
        <span className="font-medium text-sm">{title}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>

      {/* Confirmation Dialog - Using regular Dialog instead of AlertDialog */}
      <Dialog 
        open={isConfirmOpen} 
        onOpenChange={(open) => {
          if (!open) {
            handleConfirmCancel();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Existing Project?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A project named "{confirmData?.newName}" already exists.
            </p>
            {confirmData?.existingProject && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Existing project details:</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <div>• Template: {confirmData.existingProject.template}</div>
                  <div>• Files: {confirmData.existingProject.fileCount}</div>
                  <div>• Last modified: {formatDate(confirmData.existingProject.lastModified)}</div>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Do you want to replace it with the renamed project? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleConfirmCancel}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
            >
              Replace Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}