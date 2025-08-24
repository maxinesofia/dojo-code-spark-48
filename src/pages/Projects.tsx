import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit3, Plus, Calendar, FileText, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ProjectService, Project } from "@/services/ProjectService";
import { FileNode } from "@/types/FileTypes";

// Template configurations
const templates = {
  vanilla: {
    name: 'Vanilla HTML/CSS/JS',
    description: 'Basic HTML, CSS, and JavaScript project',
    icon: '📄',
    files: (projectName: string): FileNode[] => [
      {
        id: 'index.html',
        name: 'index.html',
        type: 'file',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${projectName}!</h1>
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
        type: 'file',
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
        type: 'file',
        content: `// ${projectName} JavaScript
console.log('Welcome to ${projectName}!');

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
  },
  react: {
    name: 'React + TypeScript',
    description: 'Modern React with TypeScript setup',
    icon: '⚛️',
    files: (projectName: string): FileNode[] => [
      {
        id: 'index.html',
        name: 'index.html',
        type: 'file',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
      },
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          {
            id: 'main.tsx',
            name: 'main.tsx',
            type: 'file',
            content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
          },
          {
            id: 'App.tsx',
            name: 'App.tsx',
            type: 'file',
            content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>${projectName}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  )
}

export default App`
          },
          {
            id: 'App.css',
            name: 'App.css',
            type: 'file',
            content: `.App {
  text-align: center;
  padding: 2rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}`
          },
          {
            id: 'index.css',
            name: 'index.css',
            type: 'file',
            content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}`
          }
        ]
      }
    ]
  },
  vanilla_ts: {
    name: 'TypeScript',
    description: 'TypeScript project with modern tooling',
    icon: '🔷',
    files: (projectName: string): FileNode[] => [
      {
        id: 'index.html',
        name: 'index.html',
        type: 'file',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${projectName}!</h1>
        <p>TypeScript project ready to go!</p>
        <button id="clickMe">Click me!</button>
    </div>
    <script type="module" src="main.ts"></script>
</body>
</html>`
      },
      {
        id: 'main.ts',
        name: 'main.ts',
        type: 'file',
        content: `// ${projectName} TypeScript
interface ButtonHandler {
  element: HTMLElement;
  clickCount: number;
  handleClick(): void;
}

class ClickCounter implements ButtonHandler {
  element: HTMLElement;
  clickCount: number = 0;

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener('click', () => this.handleClick());
  }

  handleClick(): void {
    this.clickCount++;
    this.element.textContent = \`Clicked \${this.clickCount} time\${this.clickCount !== 1 ? 's' : ''}!\`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('clickMe') as HTMLButtonElement;
  if (button) {
    new ClickCounter(button);
  }
});`
      },
      {
        id: 'styles.css',
        name: 'styles.css',
        type: 'file',
        content: `body {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
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
      }
    ]
  }
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectTemplate, setNewProjectTemplate] = useState("vanilla");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const allProjects = ProjectService.getAllProjects();
      const currentProject = ProjectService.getCurrentProject();
      
      // Combine saved projects with current project
      const projectsList = currentProject 
        ? [currentProject, ...allProjects.filter(p => p.id !== 'current')]
        : allProjects;
      
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
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

    try {
      // FIRST: Save the current project if it has content
      const currentProject = ProjectService.getCurrentProject();
      if (currentProject && currentProject.files.length > 0) {
        // Save current project as a separate saved project with unique ID
        const savedCurrentProject = {
          id: `project-${Date.now()}`, // Unique ID
          name: currentProject.name,
          description: currentProject.description || 'Saved project',
          template: currentProject.template,
          isPublic: false,
          isForked: false,
          lastModified: new Date().toISOString(),
          fileCount: currentProject.files.length,
          files: currentProject.files
        };
        
        // Save it to the projects list (NOT as current)
        ProjectService.saveProject(savedCurrentProject);
      }

      // SECOND: Create the NEW project with selected template
      const selectedTemplate = templates[newProjectTemplate as keyof typeof templates];
      const projectFiles = selectedTemplate.files(newProjectName.trim());
      
      const newProject = {
        id: 'current', // This becomes the new current project
        name: newProjectName.trim(),
        description: selectedTemplate.description,
        template: newProjectTemplate,
        isPublic: false,
        isForked: false,
        lastModified: new Date().toISOString(),
        fileCount: projectFiles.length,
        files: projectFiles
      };

      // THIRD: Switch to the new project (replaces current project state)
      ProjectService.switchToProject(newProject);
      
      loadProjects(); // Reload to show updated projects list
      
      setNewProjectName("");
      setNewProjectTemplate("vanilla");
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: `New ${selectedTemplate.name} project "${newProjectName.trim()}" created!`
      });
      
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
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

    ProjectService.renameProject(projectId, newName.trim());
    loadProjects(); // Reload to get the updated list
    setEditingProject(null);
    
    toast({
      title: "Success",
      description: "Project renamed successfully!"
    });
  };

  const deleteProject = (projectId: string) => {
    ProjectService.deleteProject(projectId);
    loadProjects(); // Reload to get the updated list
    
    toast({
      title: "Success",
      description: "Project deleted successfully!"
    });
  };

  const openProject = (project: Project) => {
    if (project.id === 'current') {
      navigate('/editor');
    } else {
      // Switch to the selected project
      ProjectService.switchToProject(project);
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
                  
                  <div>
                    <Label htmlFor="template">Choose Template</Label>
                    <Select value={newProjectTemplate} onValueChange={setNewProjectTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(templates).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{template.icon}</span>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-muted-foreground">{template.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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