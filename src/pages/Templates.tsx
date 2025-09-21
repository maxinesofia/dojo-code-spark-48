import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Code, Zap, Globe, Server, Database, Smartphone, FileText, Component, Triangle, Box, FileCode, Layers, Star, Settings, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ProjectService, Project } from "@/services/ProjectService";
import { FileNode } from "@/types/FileTypes";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
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
    iconColor: "text-blue-400",
    category: "Frontend",
    tags: ["React", "JavaScript", "SPA"],
    usageCount: 8400000
  },
  {
    id: "vanilla-js",
    name: "JavaScript",
    description: "The JavaScript template",
    icon: FileCode,
    iconColor: "text-yellow-500",
    category: "Frontend",
    tags: ["Vanilla", "JavaScript", "ES6"],
    usageCount: 3400000
  },
  {
    id: "html-css",
    name: "HTML + CSS",
    description: "A template for HTML and CSS",
    icon: Globe,
    iconColor: "text-orange-500",
    category: "Frontend",
    tags: ["HTML", "CSS", "Static"],
    usageCount: 2700000
  },
  {
    id: "python",
    name: "Python",
    description: "Python starter project with examples",
    icon: Code,
    iconColor: "text-blue-500",
    category: "Backend",
    tags: ["Python", "Scripting", "ML"],
    usageCount: 1850000
  },
  {
    id: "java",
    name: "Java",
    description: "Java console application starter",
    icon: FileCode,
    iconColor: "text-red-600",
    category: "Backend",
    tags: ["Java", "OOP", "Enterprise"],
    usageCount: 1650000
  },
  {
    id: "cpp",
    name: "C++",
    description: "C++ console application starter",
    icon: Settings,
    iconColor: "text-blue-600",
    category: "Backend",
    tags: ["C++", "System", "Performance"],
    usageCount: 1420000
  },
  {
    id: "go",
    name: "Go",
    description: "Go web server starter project",
    icon: Server,
    iconColor: "text-cyan-500",
    category: "Backend",
    tags: ["Go", "Concurrency", "Web"],
    usageCount: 980000
  },
  {
    id: "rust",
    name: "Rust",
    description: "Rust system programming starter",
    icon: Box,
    iconColor: "text-orange-600",
    category: "Backend",
    tags: ["Rust", "System", "Safety"],
    usageCount: 720000
  },
  {
    id: "bash",
    name: "Bash",
    description: "Bash scripting and automation",
    icon: Terminal,
    iconColor: "text-green-600",
    category: "Backend",
    tags: ["Bash", "Scripting", "DevOps"],
    usageCount: 560000
  },
  {
    id: "react-ts",
    name: "React (TS)",
    description: "React and TypeScript example starter project",
    icon: Layers,
    iconColor: "text-blue-500",
    category: "Frontend",
    tags: ["React", "TypeScript", "SPA"],
    usageCount: 995500
  },
  {
    id: "vanilla-ts",
    name: "Vanilla TypeScript",
    description: "JavaScript and TypeScript example starter project",
    icon: Code,
    iconColor: "text-blue-600",
    category: "Frontend",
    tags: ["TypeScript", "Vanilla", "ES6"],
    usageCount: 315900
  },
  {
    id: "node-express",
    name: "Node.js Express",
    description: "Node.js with Express server starter project",
    icon: Server,
    iconColor: "text-green-500",
    category: "Backend",
    tags: ["Node.js", "Express", "API"],
    usageCount: 243200
  },
  {
    id: "next-js",
    name: "Next.js",
    description: "Full-stack React framework with SSR",
    icon: Triangle,
    iconColor: "text-gray-900",
    category: "Full Stack",
    tags: ["Next.js", "React", "SSR"],
    usageCount: 180500
  },
  {
    id: "vue",
    name: "Vue.js",
    description: "Progressive JavaScript framework",
    icon: Star,
    iconColor: "text-green-500",
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

  // Template file generators
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

      case 'python':
        return [
          {
            id: 'main.py',
            name: 'main.py',
            type: 'file',
            content: `#!/usr/bin/env python3
"""
${projectName} - Python Application
A simple Python starter project with examples of basic functionality.
"""

import math
import random
from datetime import datetime

def main():
    print(f"🐍 Welcome to {projectName.split(' ')[0]}!")
    print("=" * 50)
    
    # Basic calculations
    print("\\n📊 Calculator Demo:")
    print(f"5 + 3 = {5 + 3}")
    print(f"7 * 4 = {7 * 4}")
    
    # Random numbers
    print("\\n🎲 Random numbers:")
    random_numbers = [random.randint(1, 100) for _ in range(5)]
    print(f"Five random numbers: {random_numbers}")
    print(f"Sum: {sum(random_numbers)}")
    print(f"Average: {sum(random_numbers) / len(random_numbers):.2f}")
    
    # Date and time
    print("\\n⏰ Current date and time:")
    now = datetime.now()
    print(f"Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    
    print("\\n✅ Program completed successfully!")

if __name__ == "__main__":
    main()`
          }
        ];

      case 'java':
        return [
          {
            id: 'Main.java',
            name: 'Main.java',
            type: 'file',
            content: `import java.util.*;
import java.time.LocalDateTime;

public class Main {
    public static void main(String[] args) {
        System.out.println("☕ Welcome to ${projectName.split(' ')[0]}!");
        System.out.println("=".repeat(50));
        
        // Basic operations
        System.out.println("\\n🔢 Basic Operations:");
        int a = 15, b = 7;
        System.out.printf("%d + %d = %d%n", a, b, a + b);
        System.out.printf("%d * %d = %d%n", a, b, a * b);
        
        // Collections
        System.out.println("\\n📚 Collections Demo:");
        List<String> fruits = Arrays.asList("Apple", "Banana", "Orange");
        System.out.println("Fruits: " + fruits);
        
        System.out.println("\\n✅ Program completed successfully!");
    }
}`
          }
        ];

      case 'cpp':
        return [
          {
            id: 'main.cpp',
            name: 'main.cpp',
            type: 'file',
            content: `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "⚙️ Welcome to ${projectName.split(' ')[0]}!" << std::endl;
    std::cout << std::string(50, '=') << std::endl;
    
    // Basic operations
    std::cout << "\\n🔢 Basic Operations:" << std::endl;
    int a = 15, b = 7;
    std::cout << a << " + " << b << " = " << (a + b) << std::endl;
    std::cout << a << " * " << b << " = " << (a * b) << std::endl;
    
    // Vector example
    std::cout << "\\n📚 Vector Demo:" << std::endl;
    std::vector<std::string> fruits = {"Apple", "Banana", "Orange"};
    std::cout << "Fruits: ";
    for (const auto& fruit : fruits) {
        std::cout << fruit << " ";
    }
    std::cout << std::endl;
    
    std::cout << "\\n✅ Program completed successfully!" << std::endl;
    return 0;
}`
          },
          {
            id: 'Makefile',
            name: 'Makefile',
            type: 'file',
            content: `CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
TARGET = main
SOURCES = main.cpp

all: $(TARGET)

$(TARGET): $(SOURCES)
\t$(CXX) $(CXXFLAGS) -o $(TARGET) $(SOURCES)

clean:
\trm -f $(TARGET)

run: $(TARGET)
\t./$(TARGET)

.PHONY: all clean run`
          }
        ];

      case 'go':
        return [
          {
            id: 'main.go',
            name: 'main.go',
            type: 'file',
            content: `package main

import (
\t"fmt"
\t"time"
)

func main() {
\tfmt.Println("🐹 Welcome to ${projectName.split(' ')[0]}!")
\tfmt.Println("==================================================")
\t
\t// Basic operations
\tfmt.Println("\\n🔢 Basic Operations:")
\ta, b := 15, 7
\tfmt.Printf("%d + %d = %d\\n", a, b, a+b)
\tfmt.Printf("%d * %d = %d\\n", a, b, a*b)
\t
\t// Slice example
\tfmt.Println("\\n📚 Slice Demo:")
\tfruits := []string{"Apple", "Banana", "Orange"}
\tfmt.Printf("Fruits: %v\\n", fruits)
\t
\t// Time example
\tfmt.Println("\\n⏰ Current time:")
\tnow := time.Now()
\tfmt.Printf("Current time: %s\\n", now.Format("2006-01-02 15:04:05"))
\t
\tfmt.Println("\\n✅ Program completed successfully!")
}`
          },
          {
            id: 'go.mod',
            name: 'go.mod',
            type: 'file',
            content: `module ${projectName.toLowerCase().replace(/\s+/g, '-')}

go 1.21`
          }
        ];

      case 'rust':
        return [
          {
            id: 'main.rs',
            name: 'main.rs',
            type: 'file',
            content: `use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    println!("🦀 Welcome to ${projectName.split(' ')[0]}!");
    println!("{}", "=".repeat(50));
    
    // Basic operations
    println!("\\n🔢 Basic Operations:");
    let a = 15;
    let b = 7;
    println!("{} + {} = {}", a, b, a + b);
    println!("{} * {} = {}", a, b, a * b);
    
    // Vector example
    println!("\\n📚 Vector Demo:");
    let fruits = vec!["Apple", "Banana", "Orange"];
    println!("Fruits: {:?}", fruits);
    
    // Time example
    println!("\\n⏰ Current timestamp:");
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();
    println!("Unix timestamp: {}", timestamp);
    
    println!("\\n✅ Program completed successfully!");
}`
          },
          {
            id: 'Cargo.toml',
            name: 'Cargo.toml',
            type: 'file',
            content: `[package]
name = "${projectName.toLowerCase().replace(/\s+/g, '-')}"
version = "0.1.0"
edition = "2021"

[dependencies]`
          }
        ];

      case 'bash':
        return [
          {
            id: 'main.sh',
            name: 'main.sh',
            type: 'file',
            content: `#!/bin/bash

echo "🐚 Welcome to ${projectName.split(' ')[0]}!"
echo "=================================================="

# Basic operations
echo ""
echo "🔢 Basic Operations:"
a=15
b=7
echo "$a + $b = $((a + b))"
echo "$a * $b = $((a * b))"

# Array example
echo ""
echo "📚 Array Demo:"
fruits=("Apple" "Banana" "Orange")
echo "Fruits: \${fruits[@]}"

# Time example
echo ""
echo "⏰ Current date and time:"
echo "Current time: $(date)"

echo ""
echo "✅ Program completed successfully!"`
          },
          {
            id: 'run.sh',
            name: 'run.sh',
            type: 'file',
            content: `#!/bin/bash
echo "🚀 Starting ${projectName}..."
chmod +x main.sh
./main.sh
echo "🏁 Execution completed!"`
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
    
    const existingWithSameName = existingProjects
      .filter(p => p.id !== 'current')
      .filter(p => {
        return p.name === baseNameTrimmed || 
               p.name.match(new RegExp(`^${baseNameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(\\d+\\)$`));
      });
    
    if (existingWithSameName.length === 0) {
      return baseNameTrimmed;
    }
    
    let maxNumber = 0;
    existingWithSameName.forEach(project => {
      if (project.name === baseNameTrimmed) {
        maxNumber = Math.max(maxNumber, 0);
      } else {
        const match = project.name.match(/\((\d+)\)$/);
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1]));
        }
      }
    });
    
    return `${baseNameTrimmed} (${maxNumber + 1})`;
  };

  const handleCreateProject = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setProjectName(`${template.name} Project`);
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
      const uniqueName = generateUniqueName(projectName, selectedTemplate.id);
      const templateFiles = generateTemplateFiles(selectedTemplate.id, uniqueName);
      
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

      ProjectService.saveProject(newProject);
      ProjectService.switchToProject(newProject);

      toast({
        title: "Project created",
        description: `Created "${newProject.name}" successfully`,
      });

      setIsCreateDialogOpen(false);
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
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Templates</h1>
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
                  {/* Add executable badge for server-side languages */}
                  {['python', 'java', 'cpp', 'go', 'rust', 'bash', 'node-express'].includes(template.id) && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Executable
                    </Badge>
                  )}
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