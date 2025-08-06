import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Edit3, Plus, Calendar, FileText, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description?: string;
  lastModified: string;
  fileCount: number;
  template?: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const savedProjects = localStorage.getItem('tutorials-dojo-projects');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }

    // Check if there's a current project state
    const currentProjectState = localStorage.getItem('tutorials-dojo-project-state');
    if (currentProjectState) {
      try {
        const state = JSON.parse(currentProjectState);
        const currentProject: Project = {
          id: 'current',
          name: state.projectName || 'Untitled Project',
          description: 'Your current project',
          lastModified: state.lastSaved || new Date().toISOString(),
          fileCount: state.files?.length || 0,
          template: state.template || 'vanilla'
        };
        
        setProjects(prev => {
          const existing = prev.find(p => p.id === 'current');
          if (existing) {
            return prev.map(p => p.id === 'current' ? currentProject : p);
          }
          return [currentProject, ...prev];
        });
      } catch (error) {
        console.error('Error loading current project:', error);
      }
    }
  };

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('tutorials-dojo-projects', JSON.stringify(updatedProjects.filter(p => p.id !== 'current')));
  };

  const createNewProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive"
      });
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: 'New project',
      lastModified: new Date().toISOString(),
      fileCount: 3,
      template: 'vanilla'
    };

    const updatedProjects = [newProject, ...projects.filter(p => p.id !== 'current')];
    setProjects([...updatedProjects]);
    saveProjects(updatedProjects);
    
    setNewProjectName("");
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Success",
      description: "New project created successfully!"
    });
  };

  const renameProject = (projectId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid project name",
        variant: "destructive"
      });
      return;
    }

    const updatedProjects = projects.map(project => 
      project.id === projectId 
        ? { ...project, name: newName.trim(), lastModified: new Date().toISOString() }
        : project
    );
    
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    setEditingProject(null);

    // If renaming current project, update the project state
    if (projectId === 'current') {
      const currentState = localStorage.getItem('tutorials-dojo-project-state');
      if (currentState) {
        try {
          const state = JSON.parse(currentState);
          state.projectName = newName.trim();
          localStorage.setItem('tutorials-dojo-project-state', JSON.stringify(state));
        } catch (error) {
          console.error('Error updating current project name:', error);
        }
      }
    }
    
    toast({
      title: "Success",
      description: "Project renamed successfully!"
    });
  };

  const deleteProject = (projectId: string) => {
    if (projectId === 'current') {
      // Clear current project state
      localStorage.removeItem('tutorials-dojo-project-state');
    }
    
    const updatedProjects = projects.filter(project => project.id !== projectId);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    
    toast({
      title: "Success",
      description: "Project deleted successfully!"
    });
  };

  const openProject = (project: Project) => {
    if (project.id === 'current') {
      navigate('/');
    } else {
      // For now, just navigate to editor - in a real app, you'd load the project data
      navigate(`/?project=${project.id}`);
    }
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

  const getTemplateIcon = (template?: string) => {
    switch (template) {
      case 'react':
      case 'react-ts':
        return '⚛️';
      case 'vue':
        return '🟢';
      case 'vanilla-ts':
        return '🔷';
      case 'node-express':
        return '🟢';
      default:
        return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                ← Back to Editor
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
                <p className="text-muted-foreground">Manage and organize your coding projects</p>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      onKeyDown={(e) => e.key === 'Enter' && createNewProject()}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createNewProject}>
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">Create your first project to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingProject?.id === project.id ? (
                        <Input
                          value={editingProject.name}
                          onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                          onBlur={() => renameProject(project.id, editingProject.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameProject(project.id, editingProject.name);
                            }
                            if (e.key === 'Escape') {
                              setEditingProject(null);
                            }
                          }}
                          autoFocus
                          className="text-lg font-semibold"
                        />
                      ) : (
                        <CardTitle 
                          className="flex items-center gap-2 text-lg group-hover:text-primary transition-colors"
                          onClick={() => openProject(project)}
                        >
                          <span>{getTemplateIcon(project.template)}</span>
                          {project.name}
                          {project.id === 'current' && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </CardTitle>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      {project.id !== 'current' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3" onClick={() => openProject(project)}>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {project.fileCount} files
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(project.lastModified)}
                    </div>
                  </div>
                  
                  {project.template && (
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                      {project.template.replace('-', ' ').toUpperCase()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;