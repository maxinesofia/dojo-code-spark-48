import { Button } from "@/components/ui/button";
import { Save, Share, Play, Settings, User, FileText, Moon, Sun, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { useState, useEffect } from "react";

interface HeaderProps {
  projectName: string;
  onSave: () => void;
  onRun: () => void;
  onShare: () => void;
  isSaving?: boolean;
  lastSaved?: string;
}

export function Header({ projectName, onSave, onRun, onShare, isSaving, lastSaved }: HeaderProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  
  const getRecentProjects = () => {
    const saved = localStorage.getItem('tutorials-dojo-project-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.lastSaved ? [{ name: projectName, lastSaved: parsed.lastSaved }] : [];
      } catch {
        return [];
      }
    }
    return [];
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
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowRecentProjects(!showRecentProjects)}
          className="flex items-center gap-2 relative"
        >
          <Clock className="w-4 h-4" />
          Recent
          {getRecentProjects().length > 0 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
        
        <div className="text-muted-foreground">|</div>
        <span className="text-foreground font-medium">{projectName}</span>
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
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}