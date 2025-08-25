import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Code, Zap, Globe, Server, Database, Smartphone, FileText, Component, Triangle, Box, FileCode, Layers, Star, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ProjectService, Project } from "@/services/ProjectService";
import { FileNode } from "@/types/FileTypes";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any; // Changed to accept Lucide icon components
  iconColor: string; // Added color for proper branding
  category: string;
  tags: string[];
  usageCount: number;
  preview?: string;
}

const templates: Template[] = [
  {
    id: "react",
    name: "React",
    description: "React example starter project",
    icon: Component,
    iconColor: "text-blue-400", // React blue
    category: "Frontend",
    tags: ["React", "JavaScript", "SPA"],
    usageCount: 8400000
  },
  {
    id: "vanilla-js",
    name: "JavaScript",
    description: "The JavaScript template",
    icon: FileCode,
    iconColor: "text-yellow-500", // JavaScript yellow
    category: "Frontend",
    tags: ["Vanilla", "JavaScript", "ES6"],
    usageCount: 3400000
  },
  {
    id: "html-css",
    name: "HTML + CSS",
    description: "A template for HTML and CSS",
    icon: Globe,
    iconColor: "text-orange-500", // HTML orange
    category: "Frontend",
    tags: ["HTML", "CSS", "Static"],
    usageCount: 2700000
  },
  {
    id: "react-ts",
    name: "React (TS)",
    description: "React and TypeScript example starter project",
    icon: Layers, // Different from regular React to show TS+React combo
    iconColor: "text-blue-500", // Slightly different blue
    category: "Frontend",
    tags: ["React", "TypeScript", "SPA"],
    usageCount: 995500
  },
  {
    id: "vanilla-ts",
    name: "Vanilla TypeScript",
    description: "JavaScript and TypeScript example starter project",
    icon: Code, // Unique icon for TypeScript
    iconColor: "text-blue-600", // TypeScript blue
    category: "Frontend",
    tags: ["TypeScript", "Vanilla", "ES6"],
    usageCount: 315900
  },
  {
    id: "node-express",
    name: "Node.js Express",
    description: "Node.js with Express server starter project",
    icon: Server,
    iconColor: "text-green-500", // Node.js green
    category: "Backend",
    tags: ["Node.js", "Express", "API"],
    usageCount: 243200
  },
  {
    id: "next-js",
    name: "Next.js",
    description: "Full-stack React framework with SSR",
    icon: Triangle,
    iconColor: "text-gray-900", // Next.js black/dark
    category: "Full Stack",
    tags: ["Next.js", "React", "SSR"],
    usageCount: 180500
  },
  {
    id: "vue",
    name: "Vue.js",
    description: "Progressive JavaScript framework",
    icon: Star, // Unique icon for Vue (star shape resembles Vue logo)
    iconColor: "text-green-500", // Vue green
    category: "Frontend",
    tags: ["Vue", "JavaScript", "SPA"],
    usageCount: 156700
  }
];

const categories = [
  { name: "Popular", icon: Zap },
  { name: "Frontend", icon: Globe },
  { name: "Backend", icon: Server },
  { name: "Full Stack", icon: Code },
  { name: "Database", icon: Database },
  { name: "Mobile", icon: Smartphone }
];

const Templates = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "Popular" || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatUsageCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Template file generators (copied from Projects.tsx)
  const generateTemplateFiles = (templateId: string, projectName: string): FileNode[] => {
    switch (templateId) {
      case 'vanilla-js':
      case 'html-css':
        return [
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
        ];
      
      case 'react':
      case 'react-ts':
        return [
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
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="App.js"></script>
</body>
</html>`
          },
          {
            id: 'App.js',
            name: 'App.js',
            type: 'file',
            content: `function App() {
    const [count, setCount] = React.useState(0);

    return React.createElement('div', { style: { padding: '20px', textAlign: 'center' } },
        React.createElement('h1', null, '${projectName}'),
        React.createElement('p', null, 'Welcome to React!'),
        React.createElement('button', 
            { 
                onClick: () => setCount(count + 1),
                style: {
                    background: '#61dafb',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }
            }, 
            \`Count: \${count}\`
        )
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));`
          }
        ];
      
      default:
        return [
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
    <h1>Welcome to ${projectName}!</h1>
    <p>Template: ${templateId}</p>
</body>
</html>`
          }
        ];
    }
  };

  const generateUniqueName = (baseName: string, templateType: string): string => {
    const existingProjects = ProjectService.getAllProjects();
    const baseNameTrimmed = baseName.trim();
    
    // Check if base name is available
    const existingWithSameName = existingProjects.filter(p => 
      p.name.startsWith(baseNameTrimmed)
    );
    
    if (!existingWithSameName.find(p => p.name === baseNameTrimmed)) {
      return baseNameTrimmed;
    }
    
    // Generate numbered version
    let counter = 1;
    let uniqueName = `${baseNameTrimmed} (${counter})`;
    
    while (existingWithSameName.find(p => p.name === uniqueName)) {
      counter++;
      uniqueName = `${baseNameTrimmed} (${counter})`;
    }
    
    return uniqueName;
  };

  const handleCreateProject = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setProjectName(`New ${template.name} Project`);
      setIsCreateDialogOpen(true);
    }
  };

  const createProjectFromTemplate = () => {
    if (!projectName.trim() || !selectedTemplate) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate unique name
      const uniqueName = generateUniqueName(projectName, selectedTemplate.id);
      
      // Generate template files
      const templateFiles = generateTemplateFiles(selectedTemplate.id, uniqueName);
      
      // Create project object
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: uniqueName,
        description: selectedTemplate.description,
        template: selectedTemplate.id,
        isPublic: false,
        isForked: false,
        lastModified: new Date().toISOString(),
        fileCount: templateFiles.length,
        files: templateFiles
      };

      // Save and switch to project
      ProjectService.saveProject(newProject);
      ProjectService.switchToProject(newProject);

      toast({
        title: "Project created",
        description: `Created "${newProject.name}" successfully`,
      });

      // Navigate to editor
      navigate('/');
      
    } catch (error) {
      console.error('Error creating project from template:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleBackToEditor = () => {
    navigate(-1); // Go back to previous page instead of fresh editor
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tutorials Dojo templates</h1>
              <p className="text-muted-foreground mt-2">Start your new project with one of our official templates.</p>
            </div>
            <Button onClick={handleBackToEditor} variant="outline">
              Back to Editor
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Categories and Search */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.name)}
                className="flex items-center gap-2"
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </Button>
            ))}
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <template.icon className={`w-8 h-8 ${template.iconColor}`} />
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Zap className="w-3 h-3" />
                    {formatUsageCount(template.usageCount)}
                  </div>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <Button 
                  onClick={() => handleCreateProject(template.id)}
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  variant="outline"
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">Try adjusting your search or selecting a different category.</p>
          </div>
        )}

        {/* Create Project Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project from Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {selectedTemplate && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <selectedTemplate.icon className={`w-6 h-6 ${selectedTemplate.iconColor}`} />
                  <div>
                    <div className="font-medium">{selectedTemplate.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedTemplate.description}</div>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  onKeyDown={(e) => e.key === 'Enter' && createProjectFromTemplate()}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProjectFromTemplate}>
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Templates;