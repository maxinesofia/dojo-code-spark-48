import { Button } from "@/components/ui/button";
import { Save, Share, Play, Settings, User, FileText, Moon, Sun, CheckCircle, Edit3, Package, Terminal as TerminalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { useState, useEffect } from "react";
import { EditableProjectTitle } from './EditableProjectTitle';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(projectName);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    setEditedName(projectName);
  }, [projectName]);
  
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
  
  return (
    <header className="h-14 border-b border-editor-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TD</span>
          </div>
          <EditableProjectTitle 
            title={projectTitle}
            onTitleChange={onProjectTitleChange || (() => {})}
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
        
        <Button variant="default" size="sm" onClick={onRun}>
          <Play className="w-4 h-4 mr-2" />
          Run
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const shareUrl = window.location.href;
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Success",
            description: "Project link copied to clipboard!"
          });
          onShare();
        }}>
          <Share className="w-4 h-4 mr-2" />
          Share
        </Button>
        {onTogglePackageManager && (
          <Button variant="outline" size="sm" onClick={onTogglePackageManager}>
            <Package className="w-4 h-4 mr-2" />
            Packages
          </Button>
        )}
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
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}