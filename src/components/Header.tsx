import { Button } from "@/components/ui/button";
import { Save, Share, Play, Settings, User, FileText, Moon, Sun, CheckCircle, Edit3, Package, Terminal as TerminalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { useState, useEffect } from "react";
import { EditableProjectTitle } from '@/components/EditableProjectTitle';
import { ProjectService } from '@/services/ProjectService';
import { ShareDialog } from '@/components/ShareDialog';
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  projectName: string;
  onSave: () => void;
  onRun: () => void;
  onShare: () => void;
  onTogglePackageManager?: () => void;
  onToggleTerminal?: () => void;
  isSaving?: boolean;
  onProjectNameChange?: (name: string) => void;
  projectTitle?: string;
  onProjectTitleChange?: (newTitle: string) => void;
}

export function Header({ projectName, onSave, onRun, onShare, onTogglePackageManager, onToggleTerminal, isSaving, onProjectNameChange, projectTitle = projectName, onProjectTitleChange }: HeaderProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Get current project ID
  useEffect(() => {
    const projectState = ProjectService.getProjectState();
    console.log('Header - Current project state:', projectState);
    if (projectState?.currentProject?.id) {
      setCurrentProjectId(projectState.currentProject.id);
      console.log('Header - Set current project ID:', projectState.currentProject.id);
    } else {
      // When editing the current unsaved project, use 'current' as the ID
      setCurrentProjectId('current');
      console.log('Header - Set current project ID to: current');
    }
  }, [projectTitle]); // Re-run when project title changes
  
  return (
    <header className="h-14 border-b border-editor-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TD</span>
          </div>
          <EditableProjectTitle 
            title={projectTitle || "TUTORIALS DOJO"}
            onTitleChange={onProjectTitleChange || (() => {})}
            currentProjectId={currentProjectId}
            className="hover:bg-muted/50 rounded px-2 py-1 transition-colors"
          />
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/templates')}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Templates
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          My Projects
        </Button>
        
        
        <div className="text-muted-foreground">|</div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>
        
        <Button variant="default" size="sm" onClick={onRun}>
          <Play className="w-4 h-4 mr-2" />
          Run
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
          <Share className="w-4 h-4 mr-2" />
          Share
        </Button>
        {onToggleTerminal && (
          <Button variant="outline" size="sm" onClick={onToggleTerminal}>
            <TerminalIcon className="w-4 h-4 mr-2" />
            Terminal
          </Button>
        )}
        <div className="w-px h-6 bg-border mx-2" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
      
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectName={projectTitle || projectName}
      />
    </header>
  );
}