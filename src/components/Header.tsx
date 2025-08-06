import { Button } from "@/components/ui/button";
import { Save, Share, Play, Settings, User, FileText, Moon, Sun, Clock, CheckCircle, Edit3, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  projectName: string;
  onSave: () => void;
  onRun: () => void;
  onShare: () => void;
  isSaving?: boolean;
  lastSaved?: string;
  onProjectNameChange?: (name: string) => void;
}

export function Header({ projectName, onSave, onRun, onShare, isSaving, lastSaved, onProjectNameChange }: HeaderProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(projectName);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    setEditedName(projectName);
  }, [projectName]);
  
  const getRecentProjects = () => {
    const saved = localStorage.getItem('tutorials-dojo-projects');
    if (saved) {
      try {
        const projects = JSON.parse(saved);
        return projects.slice(0, 5); // Show last 5 projects
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleProjectNameSubmit = () => {
    if (editedName.trim() && editedName !== projectName) {
      onProjectNameChange?.(editedName.trim());
      toast({
        title: "Success",
        description: "Project renamed successfully!"
      });
    }
    setIsEditingName(false);
  };

  const openRecentProject = (projectId: string) => {
    navigate(`/?project=${projectId}`);
  };

  const deleteRecentProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = localStorage.getItem('tutorials-dojo-projects');
    if (saved) {
      try {
        const projects = JSON.parse(saved);
        const updated = projects.filter((p: any) => p.id !== projectId);
        localStorage.setItem('tutorials-dojo-projects', JSON.stringify(updated));
        toast({
          title: "Success",
          description: "Project deleted from recent list"
        });
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };
  
  return (
    <header className="h-14 border-b border-editor-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TD</span>
          </div>
          <span className="font-semibold text-foreground">Tutorials Dojo</span>
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-2 relative"
            >
              <Clock className="w-4 h-4" />
              Recent
              {getRecentProjects().length > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {getRecentProjects().length === 0 ? (
              <DropdownMenuItem disabled>
                No recent projects
              </DropdownMenuItem>
            ) : (
              getRecentProjects().map((project: any) => (
                <DropdownMenuItem 
                  key={project.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => openRecentProject(project.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteRecentProject(project.id, e)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/projects')}>
              <User className="w-4 h-4 mr-2" />
              View All Projects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        
        <div className="text-muted-foreground">|</div>
        
        {isEditingName ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleProjectNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleProjectNameSubmit();
              if (e.key === 'Escape') {
                setEditedName(projectName);
                setIsEditingName(false);
              }
            }}
            className="h-8 w-48"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 group">
            <span className="text-foreground font-medium cursor-pointer" onClick={() => setIsEditingName(true)}>
              {projectName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingName(true)}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          </div>
        )}
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
        
        {lastSaved && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
        )}
        <Button variant="default" size="sm" onClick={onRun}>
          <Play className="w-4 h-4 mr-2" />
          Run
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share className="w-4 h-4 mr-2" />
          Share
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="projectNameSetting">Project Name</Label>
                <Input
                  id="projectNameSetting"
                  value={projectName}
                  onChange={(e) => onProjectNameChange?.(e.target.value)}
                  placeholder="Enter project name..."
                />
              </div>
              
              <div>
                <Label>Theme</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    System
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    localStorage.clear();
                    toast({
                      title: "Success",
                      description: "All project data cleared"
                    });
                    window.location.reload();
                  }}
                >
                  Clear All Data
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}