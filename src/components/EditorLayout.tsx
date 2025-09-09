import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { VSCodeFileExplorer } from "./VSCodeFileExplorer";
import { FileNode } from "../types/FileTypes";
import { SplitEditor } from "./SplitEditor";
import { DynamicPreview } from "./DynamicPreview";
import { PackageManager } from "./PackageManager";
import { Terminal } from "./Terminal";
import { useToast } from "@/hooks/use-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, GitBranch, Settings, Package, X, Trash2, SplitSquareVertical } from "lucide-react";
import { ProjectService } from "@/services/ProjectService";
import type { Project } from "@/services/ProjectService";

const STORAGE_KEY = 'tutorials-dojo-project-state';

// Default project files
const defaultFiles: FileNode[] = [
  {
    id: 'index.html',
    name: 'index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tutorials Dojo Project</title>
</head>
<body>
    <div class="container">
        <h1>Welcome to Tutorials Dojo!</h1>
        <p>Start building your amazing project here.</p>
        <button id="clickMe">Click me!</button>
    </div>
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
    content: `// Welcome to Tutorials Dojo JavaScript!
console.log('Welcome to Tutorials Dojo!');

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

// Template-specific files
const getTemplateFiles = (templateId: string): FileNode[] => {
  switch (templateId) {
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
    <title>${templateId === 'react-ts' ? 'React TypeScript App' : 'React App'}</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="App.${templateId === 'react-ts' ? 'tsx' : 'js'}"></script>
</body>
</html>`
        },
        {
          id: templateId === 'react-ts' ? 'App.tsx' : 'App.js',
          name: templateId === 'react-ts' ? 'App.tsx' : 'App.js',
          type: 'file',
          content: templateId === 'react-ts' ? 
`import React, { useState } from 'react';

const App: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>React + TypeScript + Firecracker VM! 🚀</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));` :
`function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>React + Firecracker VM! ⚛️</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));`
        }
      ];

    case 'vanilla-js':
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
    <title>JavaScript App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to Vanilla JavaScript! 🟨</h1>
        <div class="counter">
            <p>Count: <span id="counter-value">0</span></p>
            <div class="buttons">
                <button id="decrement">-</button>
                <button id="increment">+</button>
            </div>
        </div>
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
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    background: white;
    padding: 40px;
    border-radius: 12px;
    text-align: center;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

h1 {
    color: #d97706;
    margin-bottom: 30px;
}

.counter {
    margin: 20px 0;
}

.buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
}

button {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s;
}

button:hover {
    background: #d97706;
}`
        },
        {
          id: 'script.js',
          name: 'script.js',
          type: 'file',
          content: `let count = 0;
const counterValue = document.getElementById('counter-value');
const incrementBtn = document.getElementById('increment');
const decrementBtn = document.getElementById('decrement');

function updateCounter() {
    counterValue.textContent = count;
}

incrementBtn.addEventListener('click', () => {
    count++;
    updateCounter();
});

decrementBtn.addEventListener('click', () => {
    count--;
    updateCounter();
});

console.log('Vanilla JavaScript app loaded!');`
        }
      ];

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
    <title>HTML + CSS Template</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <div class="logo">🌐 HTML + CSS</div>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section id="home" class="hero">
            <h1>Welcome to HTML + CSS</h1>
            <p>A beautiful static website template</p>
            <button class="cta-button">Get Started</button>
        </section>
        
        <section id="about" class="content">
            <h2>About This Template</h2>
            <p>This is a simple HTML and CSS template that demonstrates modern web design principles.</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 HTML + CSS Template. Built with ❤️</p>
    </footer>
</body>
</html>`
        },
        {
          id: 'styles.css',
          name: 'styles.css',
          type: 'file',
          content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
}

nav ul {
    list-style: none;
    display: flex;
    gap: 2rem;
}

nav a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s;
}

nav a:hover {
    opacity: 0.8;
}

main {
    margin-top: 70px;
}

.hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    padding: 100px 2rem;
}

.hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
}

.cta-button {
    background: white;
    color: #667eea;
    border: none;
    padding: 12px 30px;
    font-size: 1.1rem;
    border-radius: 25px;
    cursor: pointer;
    transition: transform 0.3s;
}

.cta-button:hover {
    transform: translateY(-2px);
}

.content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 2rem;
    text-align: center;
}

.content h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: #667eea;
}

footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem;
}`
        }
      ];

    case 'node-express':
      return [
        {
          id: 'package.json',
          name: 'package.json',
          type: 'file',
          content: `{
  "name": "node-express-app",
  "version": "1.0.0",
  "description": "A simple Express.js application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["express", "node", "api"],
  "author": "",
  "license": "MIT"
}`
        },
        {
          id: 'server.js',
          name: 'server.js',
          type: 'file',
          content: `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Express.js + Firecracker VM! 🚀',
    timestamp: new Date().toISOString(),
    status: 'running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = {
    id: Date.now(),
    name,
    email
  };
  res.status(201).json(newUser);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log(\`📱 API endpoints available at http://localhost:\${PORT}\`);
});`
        },
        {
          id: 'README.md',
          name: 'README.md',
          type: 'file',
          content: `# Express.js + Firecracker VM

A simple Express.js application running on Firecracker VM.

## Features

- ✅ Express.js server
- ✅ CORS enabled
- ✅ Security headers with Helmet
- ✅ JSON parsing
- ✅ Error handling
- ✅ Health check endpoint

## API Endpoints

### GET /
Welcome message with server status

### GET /api/health
Health check endpoint with system info

### GET /api/users
Get list of users

### POST /api/users
Create a new user
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Visit http://localhost:3000

## Scripts

- \`npm start\` - Start production server
- \`npm run dev\` - Start development server with nodemon
- \`npm test\` - Run tests
`
        }
      ];

    case 'vanilla-ts':
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
    <title>TypeScript App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Vanilla TypeScript 🔷</h1>
        <div class="app">
            <div class="counter">
                <h2>Counter: <span id="counter">0</span></h2>
                <div class="buttons">
                    <button id="decrease">-</button>
                    <button id="increase">+</button>
                    <button id="reset">Reset</button>
                </div>
            </div>
            <div class="todo">
                <h2>Todo List</h2>
                <div class="input-group">
                    <input type="text" id="todoInput" placeholder="Add a todo...">
                    <button id="addTodo">Add</button>
                </div>
                <ul id="todoList"></ul>
            </div>
        </div>
    </div>
    <script type="module" src="script.ts"></script>
</body>
</html>`
        },
        {
          id: 'script.ts',
          name: 'script.ts',
          type: 'file',
          content: `interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

class TodoApp {
  private counter: number = 0;
  private todos: Todo[] = [];
  private nextId: number = 1;

  constructor() {
    this.initCounter();
    this.initTodoList();
  }

  private initCounter(): void {
    const counterElement = document.getElementById('counter')!;
    const decreaseBtn = document.getElementById('decrease')!;
    const increaseBtn = document.getElementById('increase')!;
    const resetBtn = document.getElementById('reset')!;

    decreaseBtn.addEventListener('click', () => {
      this.counter--;
      this.updateCounter();
    });

    increaseBtn.addEventListener('click', () => {
      this.counter++;
      this.updateCounter();
    });

    resetBtn.addEventListener('click', () => {
      this.counter = 0;
      this.updateCounter();
    });
  }

  private updateCounter(): void {
    const counterElement = document.getElementById('counter')!;
    counterElement.textContent = this.counter.toString();
  }

  private initTodoList(): void {
    const todoInput = document.getElementById('todoInput') as HTMLInputElement;
    const addTodoBtn = document.getElementById('addTodo')!;

    addTodoBtn.addEventListener('click', () => {
      this.addTodo(todoInput.value);
      todoInput.value = '';
    });

    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTodo(todoInput.value);
        todoInput.value = '';
      }
    });
  }

  private addTodo(text: string): void {
    if (text.trim() === '') return;

    const todo: Todo = {
      id: this.nextId++,
      text: text.trim(),
      completed: false
    };

    this.todos.push(todo);
    this.renderTodos();
  }

  private renderTodos(): void {
    const todoList = document.getElementById('todoList')!;
    todoList.innerHTML = '';

    this.todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = todo.completed ? 'completed' : '';
      li.innerHTML = \`
        <span>\${todo.text}</span>
        <button onclick="app.deleteTodo(\${todo.id})">Delete</button>
      \`;
      
      li.addEventListener('click', () => {
        this.toggleTodo(todo.id);
      });

      todoList.appendChild(li);
    });
  }

  public deleteTodo(id: number): void {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.renderTodos();
  }

  private toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.renderTodos();
    }
  }
}

const app = new TodoApp();
console.log('TypeScript app initialized!');`
        },
        {
          id: 'styles.css',
          name: 'styles.css',
          type: 'file',
          content: `body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
    min-height: 100vh;
    color: #333;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

h1 {
    text-align: center;
    color: #1e40af;
    margin-bottom: 30px;
}

.app {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
}

.counter, .todo {
    padding: 20px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
}

.buttons {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #1e40af;
}

.input-group {
    display: flex;
    gap: 10px;
    margin: 15px 0;
}

input {
    flex: 1;
    padding: 10px;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
}

input:focus {
    outline: none;
    border-color: #3b82f6;
}

#todoList {
    list-style: none;
    padding: 0;
}

#todoList li {
    background: #f9fafb;
    margin: 5px 0;
    padding: 10px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.3s;
}

#todoList li:hover {
    background: #e5e7eb;
}

#todoList li.completed {
    text-decoration: line-through;
    opacity: 0.6;
}

@media (max-width: 768px) {
    .app {
        grid-template-columns: 1fr;
    }
}`
        }
      ];

    default:
      return defaultFiles;
  }
};

export function EditorLayout() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileNode[]>(() => {
    const template = searchParams.get('template');
    const projectId = searchParams.get('project');
    
    if (template && template !== 'default') {
      const templateFiles = getTemplateFiles(template);
      // Initialize project state for new template
      ProjectService.saveCurrentProject({ name: 'New Project', template }, templateFiles);
      return templateFiles;
    }
    
    if (projectId) {
      const project = ProjectService.loadProject(projectId);
      if (project) {
        ProjectService.switchToProject(project);
        return project.files;
      }
    }
    
    // Load current project state or default
    const projectState = ProjectService.getProjectState();
    if (projectState) {
      return projectState.files;
    }
    
    // Initialize with default files
    ProjectService.saveCurrentProject({ name: 'Untitled Project', template: 'vanilla' }, defaultFiles);
    return defaultFiles;
  });

  const [projectName, setProjectName] = useState<string>(() => {
    const projectState = ProjectService.getProjectState();
    return projectState?.projectName || 'Untitled Project';
  });
  
  const [projectTitle, setProjectTitle] = useState(() => {
    const projectState = ProjectService.getProjectState();
    const currentProject = ProjectService.getCurrentProject();
    return currentProject?.name || projectState?.projectName || "TUTORIALS DOJO";
  });
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);
  const [packageManagerKey, setPackageManagerKey] = useState(0); // Force re-render of PackageManager
  const [terminalSessions, setTerminalSessions] = useState<{ id: string; title: string; active: boolean }[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Auto-save functionality with project updates
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      const currentProject = ProjectService.getCurrentProject();
      const updatedProject = {
        name: projectName, 
        template: currentProject?.template || 'vanilla'
      };
      
      // Save current project state
      ProjectService.saveCurrentProject(updatedProject, files);
      
      // Also update the project in the projects list if it has an ID
      if (currentProject?.id && currentProject.id !== 'current') {
        const projectToSave: Project = {
          ...currentProject,
          name: projectName,
          files: files,
          fileCount: files.length,
          lastModified: new Date().toISOString()
        };
        ProjectService.saveProject(projectToSave);
      }
    }, 1000);
    
    return () => clearTimeout(saveTimer);
  }, [files, projectName]);

  // Sync project title with project name
  useEffect(() => {
    const projectState = ProjectService.getProjectState();
    const currentProject = ProjectService.getCurrentProject();
    const name = currentProject?.name || projectState?.projectName || "TUTORIALS DOJO";
    
    if (projectTitle !== name) {
      setProjectTitle(name);
    }
    if (projectName !== name && name !== "TUTORIALS DOJO") {
      setProjectName(name);
    }
  }, []);

  // Select first file on mount
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const firstFile = findFirstFile(files);
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    }
  }, [files, selectedFile]);

  // Helper function to find file by ID
  const findFileById = (files: FileNode[], id: string): FileNode | null => {
    for (const file of files) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const findFirstFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.type === 'file') {
        return node;
      }
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileSelect = useCallback((file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = useCallback((content: string | undefined) => {
    if (!selectedFile || content === undefined) return;

    const updateFileContent = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === selectedFile.id) {
          return { ...node, content };
        }
        if (node.children) {
          return { ...node, children: updateFileContent(node.children) };
        }
        return node;
      });
    };

    const updatedFiles = updateFileContent(files);
    setFiles(updatedFiles);
    
    // Immediately save the changes to ensure they persist when switching projects
    const currentProject = ProjectService.getCurrentProject();
    const updatedProject = {
      name: projectName, 
      template: currentProject?.template || 'vanilla'
    };
    
    // Save current project state with updated files
    ProjectService.saveCurrentProject(updatedProject, updatedFiles);
    
    // Also update the project in the projects list if it has an ID
    if (currentProject?.id && currentProject.id !== 'current') {
      const projectToSave: Project = {
        ...currentProject,
        name: projectName,
        files: updatedFiles,
        fileCount: updatedFiles.length,
        lastModified: new Date().toISOString()
      };
      ProjectService.saveProject(projectToSave);
    }
  }, [selectedFile, files, projectName]);

  const handleFileCreate = useCallback((name: string, type: 'file' | 'folder', content?: string, parentId?: string) => {
    const newNode: FileNode = {
      id: `${Date.now()}-${name}`,
      name,
      type,
      content: content || (type === 'file' ? '' : undefined),
      children: type === 'folder' ? [] : undefined,
    };

    if (!parentId) {
      setFiles([...files, newNode]);
    } else {
      const addToParent = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.children) {
            return { ...node, children: [...node.children, newNode] };
          }
          if (node.children) {
            return { ...node, children: addToParent(node.children) };
          }
          return node;
        });
      };
      setFiles(addToParent(files));
    }

    if (type === 'file') {
      setSelectedFile(newNode);
    }

    toast({
      title: `${type === 'file' ? 'File' : 'Folder'} created`,
      description: `${name} has been created successfully.`,
    });
  }, [files, toast]);

  const handleFileDelete = useCallback((fileId: string) => {
    const deleteNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) {
          return false;
        }
        if (node.children) {
          node.children = deleteNode(node.children);
        }
        return true;
      });
    };

    setFiles(deleteNode(files));
    
    if (selectedFile?.id === fileId) {
      const firstFile = findFirstFile(files);
      setSelectedFile(firstFile);
    }

    toast({
      title: "File deleted",
      description: "The file has been deleted successfully.",
    });
  }, [files, selectedFile, toast]);

  const handleFileRename = useCallback((fileId: string, newName: string) => {
    const renameNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === fileId) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: renameNode(node.children) };
        }
        return node;
      });
    };

    setFiles(renameNode(files));
    
    if (selectedFile?.id === fileId) {
      setSelectedFile({ ...selectedFile, name: newName });
    }

    toast({
      title: "File renamed",
      description: `File renamed to ${newName} successfully.`,
    });
  }, [files, selectedFile, toast]);

  const handleFileMove = useCallback((fileId: string, newParentId?: string, targetNodeId?: string, position?: 'above' | 'below') => {
    console.log('Moving file:', fileId, 'to parent:', newParentId, 'target:', targetNodeId, 'position:', position);
    
    // Find and remove the file from its current location
    let fileToMove: FileNode | null = null;
    
    const removeFile = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = [];
      
      for (const node of nodes) {
        if (node.id === fileId) {
          fileToMove = node;
          // Don't add this node to result - effectively removing it
          continue;
        }
        
        if (node.children && Array.isArray(node.children)) {
          // Recursively remove from children
          const updatedChildren = removeFile(node.children);
          result.push({ ...node, children: updatedChildren });
        } else {
          result.push(node);
        }
      }
      
      return result;
    };

    // Add file to new location (either parent folder or reorder)
    const addFileToLocation = (nodes: FileNode[]): FileNode[] => {
      if (targetNodeId && position) {
        // Reordering - find the target node and insert before/after it
        return reorderNodes(nodes, targetNodeId, position);
      } else if (newParentId) {
        // Moving to a parent folder
        return addToParentFolder(nodes, newParentId);
      } else {
        // Moving to root
        return [...nodes, fileToMove!];
      }
    };

    const addToParentFolder = (nodes: FileNode[], parentId: string): FileNode[] => {
      return nodes.map(node => {
        if (node.id === parentId && node.type === 'folder') {
          // Add to this folder's children
          const updatedChildren = [...(node.children || []), fileToMove!];
          return { ...node, children: updatedChildren };
        }
        
        if (node.children && Array.isArray(node.children)) {
          // Recursively check children
          const updatedChildren = addToParentFolder(node.children, parentId);
          return { ...node, children: updatedChildren };
        }
        
        return node;
      });
    };

    const reorderNodes = (nodes: FileNode[], targetId: string, insertPosition: 'above' | 'below'): FileNode[] => {
      const result: FileNode[] = [];
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.id === targetId) {
          if (insertPosition === 'above') {
            // Insert before this node
            result.push(fileToMove!);
            result.push(node);
          } else {
            // Insert after this node
            result.push(node);
            result.push(fileToMove!);
          }
        } else {
          if (node.children && Array.isArray(node.children)) {
            // Recursively check children for reordering
            const updatedChildren = reorderNodes(node.children, targetId, insertPosition);
            result.push({ ...node, children: updatedChildren });
          } else {
            result.push(node);
          }
        }
      }
      
      return result;
    };

    console.log('Starting file removal process');
    const updatedFiles = removeFile([...files]);
    console.log('File to move:', fileToMove);
    
    if (fileToMove) {
      console.log('Adding file to new location');
      const finalFiles = addFileToLocation(updatedFiles);
      setFiles(finalFiles);
      
      const action = targetNodeId ? 'reordered' : 'moved';
      toast({
        title: `File ${action}`,
        description: `${fileToMove.name} has been ${action} successfully.`,
      });
    } else {
      console.log('File not found:', fileId);
    }
  }, [files, toast]);

  const handleSave = useCallback(() => {
    const currentProject = ProjectService.getCurrentProject();
    const updatedProject = { 
      name: projectName, 
      template: currentProject?.template || 'vanilla' 
    };
    
    // Save current project state
    ProjectService.saveCurrentProject(updatedProject, files);
    
    // Also update the project in the projects list if it has an ID
    if (currentProject?.id && currentProject.id !== 'current') {
      const projectToSave: Project = {
        ...currentProject,
        name: projectName,
        files: files,
        fileCount: files.length,
        lastModified: new Date().toISOString()
      };
      ProjectService.saveProject(projectToSave);
    }
    
    toast({
      title: "Project saved",
      description: "Your project has been saved locally.",
    });
  }, [files, projectName, toast]);

  const handleProjectNameChange = useCallback((newName: string) => {
    setProjectName(newName);
    setProjectTitle(newName); // Keep both in sync
    // Update both current state and projects list
    const currentProject = ProjectService.getCurrentProject();
    ProjectService.saveCurrentProject(
      { 
        name: newName, 
        template: currentProject?.template || 'vanilla' 
      }, 
      files
    );
  }, [files]);

  const handleRun = useCallback(() => {
    toast({
      title: "Running project",
      description: "Executing code in Firecracker VM...",
    });
  }, [toast]);

  const handleShare = useCallback(() => {
    toast({
      title: "Share project",
      description: "Generating shareable link...",
    });
  }, [toast]);

  const handleCommandExecute = useCallback((command: string) => {
    console.log('Executing command:', command);
    // Check if command affects packages and refresh PackageManager
    if (command.trim().match(/^(npm|yarn|pnpm)\s+(install|i|uninstall|remove)/)) {
      setPackageManagerKey(prev => prev + 1);
    }
  }, []);

  const handleFileSystemChange = useCallback((newFiles: FileNode[]) => {
    setFiles(newFiles);
  }, []);

  // Terminal session management
  const createNewTerminal = useCallback(() => {
    const sessionId = `terminal-${Date.now()}`;
    const newSession = {
      id: sessionId,
      title: `Terminal ${terminalSessions.length + 1}`,
      active: true
    };
    
    setTerminalSessions(prev => [
      ...prev.map(s => ({ ...s, active: false })),
      newSession
    ]);
    setActiveTerminalId(sessionId);
    setIsTerminalOpen(true);
  }, [terminalSessions]);

  const closeTerminal = useCallback((sessionId: string) => {
    setTerminalSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (filtered.length === 0) {
        setIsTerminalOpen(false);
        setActiveTerminalId(null);
        return [];
      }
      // Activate the last terminal if we closed the active one
      if (sessionId === activeTerminalId) {
        const lastTerminal = filtered[filtered.length - 1];
        lastTerminal.active = true;
        setActiveTerminalId(lastTerminal.id);
      }
      return filtered;
    });
  }, [activeTerminalId]);

  const switchTerminal = useCallback((sessionId: string) => {
    setTerminalSessions(prev => prev.map(s => ({
      ...s,
      active: s.id === sessionId
    })));
    setActiveTerminalId(sessionId);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+` (backtick) - Toggle terminal
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault();
        if (isTerminalOpen) {
          setIsTerminalOpen(false);
        } else {
          if (terminalSessions.length === 0) {
            createNewTerminal();
          } else {
            setIsTerminalOpen(true);
          }
        }
      }
      
      // Ctrl+Shift+` - Create new terminal
      if (event.ctrlKey && event.shiftKey && event.key === '`') {
        event.preventDefault();
        createNewTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalOpen, terminalSessions, createNewTerminal]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        projectName={projectName}
        onSave={handleSave}
        onRun={handleRun}
        onShare={handleShare}
        onProjectNameChange={handleProjectNameChange}
        projectTitle={projectTitle}
        onProjectTitleChange={(newTitle) => {
          setProjectTitle(newTitle);
          setProjectName(newTitle); // Keep both in sync
          // Update both current state and projects list
          const currentProject = ProjectService.getCurrentProject();
          ProjectService.saveCurrentProject(
            { 
              name: newTitle, 
              template: currentProject?.template || 'vanilla' 
            }, 
            files
          );
        }}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* File Explorer - VS Code Style */}
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
              {/* File Explorer */}
              <div className="flex-1 min-h-0">
                <VSCodeFileExplorer 
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onFileCreate={handleFileCreate}
                  onFileDelete={handleFileDelete}
                  onFileRename={handleFileRename}
                  onFileMove={handleFileMove}
                  projectTitle={projectTitle}
                  onProjectTitleChange={setProjectTitle}
                />
              </div>
              
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Main Editor Area */}
          <ResizablePanel defaultSize={65}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={isTerminalOpen ? 70 : 100}>
                <div className="h-full bg-background flex flex-col">
                  {/* Editor Toolbar */}
                  <div className="h-8 bg-muted/30 border-b border-border flex items-center justify-between px-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Editor</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-auto px-2 text-xs"
                        onClick={() => {
                          // Trigger split editor programmatically
                          const event = new KeyboardEvent('keydown', {
                            key: '\\',
                            ctrlKey: true,
                            bubbles: true
                          });
                          window.dispatchEvent(event);
                        }}
                        title="Split Editor (Ctrl+\)"
                      >
                        <SplitSquareVertical className="w-3 h-3 mr-1" />
                        Split
                      </Button>
                    </div>
                  </div>
                  
                  {/* Editor Content */}
                  <div className="flex-1">
                    <SplitEditor
                      files={files}
                      activeFileId={selectedFile?.id || null}
                      onFileSelect={(fileId) => {
                        const file = findFileById(files, fileId);
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      onFileChange={(fileId, content) => {
                        handleFileChange(content);
                      }}
                      className="h-full"
                    />
                  </div>
                </div>
              </ResizablePanel>
              
              {/* Terminal Panel - Always render but hide when closed */}
              <ResizableHandle style={{ display: isTerminalOpen ? 'flex' : 'none' }} />
              <ResizablePanel 
                defaultSize={isTerminalOpen ? 40 : 0} 
                minSize={isTerminalOpen ? 15 : 0}
                maxSize={isTerminalOpen ? 70 : 0}
                style={{ display: isTerminalOpen ? 'block' : 'none' }}
              >
                <div className="h-full bg-background flex flex-col">
                  {/* Terminal Tabs */}
                  <div className="border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center">
                      {terminalSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`
                            flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-border
                            ${session.active ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                          `}
                          onClick={() => switchTerminal(session.id)}
                        >
                          <TerminalIcon className="w-3 h-3" />
                          <span>{session.title}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTerminal(session.id);
                            }}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center px-2 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          // Clear active terminal
                          const activeSession = terminalSessions.find(s => s.active);
                          if (activeSession) {
                            // Trigger clear for active terminal - we'll need to implement this
                            const event = new CustomEvent('clearTerminal', { detail: { sessionId: activeSession.id } });
                            window.dispatchEvent(event);
                          }
                        }}
                        title="Clear Terminal (Ctrl+L)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={createNewTerminal}
                        title="New Terminal (Ctrl+Shift+`)"
                      >
                        <TerminalIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsTerminalOpen(false)}
                        title="Close Panel"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* All Terminal Sessions - Render all but only show active */}
                  <div className="flex-1 relative">
                    {terminalSessions.map((session) => (
                      <div
                        key={session.id}
                        className="absolute inset-0"
                        style={{ display: session.active ? 'block' : 'none' }}
                      >
                        <Terminal
                          files={files}
                          onCommandExecuted={handleCommandExecute}
                          onFileSystemChange={handleFileSystemChange}
                          onClose={() => closeTerminal(session.id)}
                          sessionId={session.id}
                          showHeader={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Right Panel - Preview Only */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full bg-background border-l border-border">
              <DynamicPreview files={files} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* VS Code Style Status Bar */}
      <div className="h-6 bg-sidebar-accent border-t border-sidebar-border flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-3">
          
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-auto px-1 text-xs hover:bg-sidebar-accent/50"
            onClick={() => {
              if (isTerminalOpen) {
                setIsTerminalOpen(false);
              } else {
                if (terminalSessions.length === 0) {
                  createNewTerminal();
                } else {
                  setIsTerminalOpen(true);
                }
              }
            }}
            title="Toggle Terminal (Ctrl+`)"
          >
            <TerminalIcon className="w-3 h-3 mr-1" />
            <span className="text-sidebar-foreground">
              {isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
              {terminalSessions.length > 0 && ` (${terminalSessions.length})`}
            </span>
          </Button>
        </div>
      </div>
      
      {/* Package Manager Modal */}
      {isPackageManagerOpen && (
        <PackageManager 
          key={packageManagerKey}
          isOpen={isPackageManagerOpen}
          onClose={() => setIsPackageManagerOpen(false)}
        />
      )}
    </div>
  );
}