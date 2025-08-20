import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { VSCodeFileExplorer } from "./VSCodeFileExplorer";
import { FileNode } from "../types/FileTypes";
import { CodeEditor } from "./CodeEditor";
import { DynamicPreview } from "./DynamicPreview";
import { PackageManager } from "./PackageManager";
import { Terminal } from "./Terminal";
import { useToast } from "@/hooks/use-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, GitBranch, Settings, Package } from "lucide-react";

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
      return getTemplateFiles(template);
    }
    
    if (projectId) {
      // Try to load project files
      const savedProjects = localStorage.getItem('tutorials-dojo-projects');
      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          const project = projects.find((p: any) => p.id === projectId);
          if (project && project.files) {
            return project.files;
          }
        } catch (error) {
          console.error('Error loading project:', error);
        }
      }
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultFiles;
  });
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);

  // Auto-save functionality with project updates
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      
      // Update project metadata if this is a project
      const projectId = searchParams.get('project');
      if (projectId) {
        const savedProjects = localStorage.getItem('tutorials-dojo-projects');
        if (savedProjects) {
          try {
            const projects = JSON.parse(savedProjects);
            const projectIndex = projects.findIndex((p: any) => p.id === projectId);
            if (projectIndex >= 0) {
              projects[projectIndex] = {
                ...projects[projectIndex],
                files: files,
                fileCount: files.length,
                lastModified: new Date().toISOString()
              };
              localStorage.setItem('tutorials-dojo-projects', JSON.stringify(projects));
            }
          } catch (error) {
            console.error('Error updating project:', error);
          }
        }
      }
    }, 1000);
    
    return () => clearTimeout(saveTimer);
  }, [files, searchParams]);

  // Select first file on mount
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const firstFile = findFirstFile(files);
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    }
  }, [files, selectedFile]);

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
    if (!selectedFile || !content) return;

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

    setFiles(updateFileContent(files));
  }, [selectedFile, files]);

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

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    toast({
      title: "Project saved",
      description: "Your project has been saved locally.",
    });
  }, [files, toast]);

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
  }, []);

  const handleFileSystemChange = useCallback((newFiles: FileNode[]) => {
    setFiles(newFiles);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        projectName="Tutorials Dojo Project"
        onSave={handleSave}
        onRun={handleRun}
        onShare={handleShare}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* File Explorer - VS Code Style */}
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
              {/* File Explorer */}
              <div className="flex-1">
                <VSCodeFileExplorer
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onFileCreate={handleFileCreate}
                  onFileDelete={handleFileDelete}
                  onFileRename={handleFileRename}
                />
              </div>
              
              {/* Package Manager Button */}
              <div className="border-t border-sidebar-border p-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center gap-2"
                  onClick={() => setIsPackageManagerOpen(true)}
                >
                  <Package className="w-4 h-4" />
                  Manage Packages
                </Button>
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Main Editor Area */}
          <ResizablePanel defaultSize={65}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={isTerminalOpen ? 70 : 100}>
                <div className="h-full bg-background">
                  {selectedFile ? (
                    <CodeEditor
                      value={selectedFile.content || ''}
                      language="javascript"
                      onChange={handleFileChange}
                      fileName={selectedFile.name}
                    />
                  ) : (
                  <div className="h-full flex items-center justify-center bg-background">
                    <div className="text-center text-muted-foreground">
                      <h2 className="text-2xl font-semibold mb-2">Welcome to Tutorials Dojo</h2>
                      <p>Select a file from the explorer to start coding</p>
                    </div>
                  </div>
                  )}
                </div>
              </ResizablePanel>
              
              {/* Terminal */}
              {isTerminalOpen && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <Terminal
                      files={files}
                      onCommandExecuted={handleCommandExecute}
                      onFileSystemChange={handleFileSystemChange}
                      onClose={() => setIsTerminalOpen(false)}
                    />
                  </ResizablePanel>
                </>
              )}
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
          <Button variant="ghost" size="icon" className="h-5 w-auto px-1 text-xs hover:bg-sidebar-accent/50">
            <GitBranch className="w-3 h-3 mr-1" />
            <span className="text-sidebar-foreground">main</span>
          </Button>
          <span className="text-sidebar-foreground/70">Ready • Firecracker VM</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-auto px-1 text-xs hover:bg-sidebar-accent/50"
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          >
            <TerminalIcon className="w-3 h-3 mr-1" />
            <span className="text-sidebar-foreground">{isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-sidebar-accent/50">
            <Settings className="w-3 h-3 text-sidebar-foreground" />
          </Button>
        </div>
      </div>
      
      {/* Package Manager Modal */}
      {isPackageManagerOpen && (
        <PackageManager 
          isOpen={isPackageManagerOpen}
          onClose={() => setIsPackageManagerOpen(false)}
        />
      )}
    </div>
  );
}