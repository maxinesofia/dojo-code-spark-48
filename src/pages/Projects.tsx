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
  files?: any[]; // Add files property for project data
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
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

    setIsCreatingProject(true);
    
    try {
      // Step 1: Save the current project permanently before creating a new one
    const currentProjectState = localStorage.getItem('tutorials-dojo-project-state');
    let savedProjects = [];
    
    // Load existing saved projects
    const existingProjectsData = localStorage.getItem('tutorials-dojo-projects');
    if (existingProjectsData) {
      try {
        savedProjects = JSON.parse(existingProjectsData);
      } catch (error) {
        console.error('Error loading existing projects:', error);
      }
    }
    
    if (currentProjectState) {
      try {
        const currentState = JSON.parse(currentProjectState);
        const currentProjectName = currentState.projectName || 'Untitled Project';
        
        // Only save the current project if:
        // 1. It has files (not just default/empty state)
        // 2. It's not already saved in the projects list
        // 3. Its name is different from the new project we're creating
        const hasValidFiles = currentState.files && currentState.files.length > 0;
        const isDifferentFromNewProject = currentProjectName !== newProjectName.trim();
        const notAlreadySaved = !savedProjects.find(p => p.name === currentProjectName && p.id !== 'current');
        
        if (hasValidFiles && isDifferentFromNewProject && notAlreadySaved) {
          const permanentCurrentProject = {
            id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: currentProjectName,
            description: 'Previously active project',
            lastModified: currentState.lastSaved || new Date().toISOString(),
            fileCount: currentState.files.length,
            template: currentState.template || 'vanilla',
            files: currentState.files
          };
          
          savedProjects.unshift(permanentCurrentProject);
          console.log('Saved current project as permanent:', permanentCurrentProject.name);
        }
      } catch (error) {
        console.error('Error processing current project:', error);
      }
    }

    // Step 2: Create the new project with completely fresh content
    const newProjectId = `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newProject = {
      id: newProjectId,
      name: newProjectName.trim(),
      description: 'New project',
      lastModified: new Date().toISOString(),
      fileCount: 3,
      template: 'vanilla',
      files: [
        {
          id: 'index.html',
          name: 'index.html',
          type: 'file' as const,
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newProjectName}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${newProjectName}!</h1>
        <p>Start building your amazing project here.</p>
        <button id="clickMe">Click me!</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          id: 'styles.css',
          name: 'styles.css',
          type: 'file' as const,
          content: `body {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: white;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 40px 20px;
}

h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #fff, #ddd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

button {
    background: #1e40af;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

button:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4);
}`
        },
        {
          id: 'script.js',
          name: 'script.js',
          type: 'file' as const,
          content: `// ${newProjectName} JavaScript
console.log('Welcome to ${newProjectName}!');

document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('clickMe');
    let clickCount = 0;
    
    if (button) {
        button.addEventListener('click', function() {
            clickCount++;
            button.textContent = \`Clicked \${clickCount} time\${clickCount !== 1 ? 's' : ''}!\`;
        });
    }
});`
        }
      ]
    };

    // Step 3: Add the new project to the saved projects list and update state
    const newProjectsList = [newProject, ...savedProjects];
    
    // Save the updated projects list (excluding 'current' since we'll manage that separately)
    localStorage.setItem('tutorials-dojo-projects', JSON.stringify(savedProjects));
    
    // Update the projects state for UI display
    setProjects(newProjectsList);
    
    // Step 4: Set the new project as the current project state (this replaces the old current project)
    const newProjectState = {
      projectName: newProject.name,
      template: newProject.template,
      files: newProject.files,
      lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem('tutorials-dojo-project-state', JSON.stringify(newProjectState));
    console.log('Created new project and set as current:', newProject.name);
    console.log('New project files:', newProject.files.map(f => f.name));
    
    setNewProjectName("");
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Success",
      description: "New project created successfully!"
    });
    
    // Use setTimeout to ensure localStorage operations complete before navigation
    setTimeout(() => {
      // Reload projects to update the "current" project display
      loadProjects();
      // Navigate to the editor to start working on the new project
      navigate('/editor');
    }, 50);
    
    } catch (error) {
      console.error('Error creating new project:', error);
      toast({
        title: "Error",
        description: "Failed to create new project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingProject(false);
    }
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
      navigate('/editor');
    } else {
      // Load project files and navigate to editor
      const savedProjects = localStorage.getItem('tutorials-dojo-projects');
      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          const projectData = projects.find((p: Project) => p.id === project.id);
          if (projectData && projectData.files) {
            // Store the project files as current project
            localStorage.setItem('tutorials-dojo-project-state', JSON.stringify({
              projectName: project.name,
              template: project.template,
              files: projectData.files,
              lastSaved: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error loading project files:', error);
        }
      }
      navigate(`/editor?project=${project.id}`);
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
                    <Button onClick={createNewProject} disabled={isCreatingProject}>
                      {isCreatingProject ? "Creating..." : "Create Project"}
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