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

    case 'python-flask':
      return [
        {
          id: 'app.py',
          name: 'app.py',
          type: 'file',
          content: `from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/')
def home():
    return jsonify({
        'message': 'Welcome to Flask + Firecracker VM! 🐍',
        'status': 'running',
        'framework': 'Flask'
    })

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'python_version': '3.x',
        'framework': 'Flask'
    })

@app.route('/api/users', methods=['GET'])
def get_users():
    users = [
        {'id': 1, 'name': 'Alice Johnson', 'role': 'developer'},
        {'id': 2, 'name': 'Bob Smith', 'role': 'designer'}
    ]
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    new_user = {
        'id': 3,
        'name': data.get('name', 'Unknown'),
        'role': data.get('role', 'user')
    }
    return jsonify(new_user), 201

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Route not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
`
        },
        {
          id: 'requirements.txt',
          name: 'requirements.txt',
          type: 'file',
          content: `Flask==2.3.3
Flask-CORS==4.0.0
Werkzeug==2.3.7
`
        },
        {
          id: 'README.md',
          name: 'README.md',
          type: 'file',
          content: `# Flask + Firecracker VM

A simple Flask web application running on Firecracker VM.

## Features

- ✅ Flask web framework
- ✅ CORS enabled
- ✅ JSON API endpoints
- ✅ Error handling
- ✅ Health check endpoint

## API Endpoints

### GET /
Welcome message with server status

### GET /api/health
Health check endpoint

### GET /api/users
Get list of users

### POST /api/users
Create a new user

## Getting Started

1. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

2. Run the application:
\`\`\`bash
python app.py
\`\`\`

3. Visit http://localhost:5000
`
        }
      ];

    case 'python-basic':
      return [
        {
          id: 'main.py',
          name: 'main.py',
          type: 'file',
          content: `#!/usr/bin/env python3
"""
Python Basic Template - Running on Firecracker VM! 🐍
"""

import math
import datetime
from typing import List, Dict

def fibonacci(n: int) -> int:
    """Calculate fibonacci number using recursion with memoization"""
    memo = {}
    
    def fib_helper(num):
        if num in memo:
            return memo[num]
        if num <= 1:
            return num
        memo[num] = fib_helper(num - 1) + fib_helper(num - 2)
        return memo[num]
    
    return fib_helper(n)

def prime_numbers(limit: int) -> List[int]:
    """Generate prime numbers up to limit using Sieve of Eratosthenes"""
    if limit < 2:
        return []
    
    sieve = [True] * (limit + 1)
    sieve[0] = sieve[1] = False
    
    for i in range(2, int(math.sqrt(limit)) + 1):
        if sieve[i]:
            for j in range(i*i, limit + 1, i):
                sieve[j] = False
    
    return [i for i in range(2, limit + 1) if sieve[i]]

def analyze_text(text: str) -> Dict[str, int]:
    """Analyze text and return statistics"""
    words = text.lower().split()
    return {
        'total_characters': len(text),
        'total_words': len(words),
        'unique_words': len(set(words)),
        'total_lines': text.count('\\n') + 1
    }

def main():
    print("🐍 Python + Firecracker VM Demo")
    print("=" * 40)
    print(f"Current time: {datetime.datetime.now()}")
    print()
    
    # Fibonacci demo
    print("📊 Fibonacci Numbers:")
    for i in range(10):
        print(f"F({i}) = {fibonacci(i)}")
    print()
    
    # Prime numbers demo
    print("🔢 Prime numbers up to 50:")
    primes = prime_numbers(50)
    print(primes)
    print()
    
    # Text analysis demo
    sample_text = """Python is a high-level programming language.
It's great for web development, data science, and automation.
This code is running on a Firecracker VM!"""
    
    print("📝 Text Analysis:")
    stats = analyze_text(sample_text)
    for key, value in stats.items():
        print(f"{key.replace('_', ' ').title()}: {value}")
    print()
    
    print("✅ Python demo completed successfully!")

if __name__ == "__main__":
    main()
`
        },
        {
          id: 'utils.py',
          name: 'utils.py',
          type: 'file',
          content: `"""
Utility functions for the Python basic template
"""

import random
from typing import List, Any

def generate_random_data(size: int = 10) -> List[int]:
    """Generate a list of random integers"""
    return [random.randint(1, 100) for _ in range(size)]

def sort_data(data: List[Any], reverse: bool = False) -> List[Any]:
    """Sort data in ascending or descending order"""
    return sorted(data, reverse=reverse)

def calculate_statistics(numbers: List[int]) -> dict:
    """Calculate basic statistics for a list of numbers"""
    if not numbers:
        return {}
    
    return {
        'count': len(numbers),
        'min': min(numbers),
        'max': max(numbers),
        'sum': sum(numbers),
        'average': sum(numbers) / len(numbers),
        'median': sorted(numbers)[len(numbers) // 2]
    }

class SimpleCalculator:
    """A simple calculator class"""
    
    @staticmethod
    def add(a: float, b: float) -> float:
        return a + b
    
    @staticmethod
    def subtract(a: float, b: float) -> float:
        return a - b
    
    @staticmethod
    def multiply(a: float, b: float) -> float:
        return a * b
    
    @staticmethod
    def divide(a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b

if __name__ == "__main__":
    print("🧮 Testing utility functions...")
    
    # Test random data generation
    data = generate_random_data(5)
    print(f"Random data: {data}")
    
    # Test sorting
    sorted_data = sort_data(data)
    print(f"Sorted data: {sorted_data}")
    
    # Test statistics
    stats = calculate_statistics(data)
    print(f"Statistics: {stats}")
    
    # Test calculator
    calc = SimpleCalculator()
    print(f"Calculator test: 10 + 5 = {calc.add(10, 5)}")
`
        }
      ];

    case 'c-basic':
      return [
        {
          id: 'main.c',
          name: 'main.c',
          type: 'file',
          content: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// Function prototypes
int fibonacci(int n);
int is_prime(int num);
void print_primes(int limit);
int factorial(int n);
void bubble_sort(int arr[], int size);
void print_array(int arr[], int size);

int main() {
    printf("🔧 C Programming + Firecracker VM Demo\\n");
    printf("=====================================\\n\\n");
    
    // Fibonacci demo
    printf("📊 Fibonacci Numbers (0-10):\\n");
    for (int i = 0; i <= 10; i++) {
        printf("F(%d) = %d\\n", i, fibonacci(i));
    }
    printf("\\n");
    
    // Prime numbers demo
    printf("🔢 Prime numbers up to 30:\\n");
    print_primes(30);
    printf("\\n");
    
    // Factorial demo
    printf("🧮 Factorials:\\n");
    for (int i = 1; i <= 8; i++) {
        printf("%d! = %d\\n", i, factorial(i));
    }
    printf("\\n");
    
    // Array sorting demo
    printf("📋 Array Sorting Demo:\\n");
    int numbers[] = {64, 34, 25, 12, 22, 11, 90, 88, 76, 50};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    printf("Original array: ");
    print_array(numbers, size);
    
    bubble_sort(numbers, size);
    
    printf("Sorted array:   ");
    print_array(numbers, size);
    printf("\\n");
    
    printf("✅ C program completed successfully!\\n");
    
    return 0;
}

// Calculate fibonacci number recursively
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Check if a number is prime
int is_prime(int num) {
    if (num <= 1) return 0;
    if (num == 2) return 1;
    if (num % 2 == 0) return 0;
    
    for (int i = 3; i <= sqrt(num); i += 2) {
        if (num % i == 0) {
            return 0;
        }
    }
    return 1;
}

// Print all prime numbers up to limit
void print_primes(int limit) {
    for (int i = 2; i <= limit; i++) {
        if (is_prime(i)) {
            printf("%d ", i);
        }
    }
    printf("\\n");
}

// Calculate factorial
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

// Bubble sort algorithm
void bubble_sort(int arr[], int size) {
    for (int i = 0; i < size - 1; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap elements
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

// Print array elements
void print_array(int arr[], int size) {
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
}
`
        },
        {
          id: 'utils.c',
          name: 'utils.c',
          type: 'file',
          content: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "utils.h"

// Generate random numbers
void generate_random_array(int arr[], int size, int max_value) {
    srand(time(NULL));
    for (int i = 0; i < size; i++) {
        arr[i] = rand() % max_value + 1;
    }
}

// Find maximum element in array
int find_max(int arr[], int size) {
    int max = arr[0];
    for (int i = 1; i < size; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

// Find minimum element in array
int find_min(int arr[], int size) {
    int min = arr[0];
    for (int i = 1; i < size; i++) {
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    return min;
}

// Calculate sum of array elements
int array_sum(int arr[], int size) {
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum += arr[i];
    }
    return sum;
}

// Calculate average of array elements
double array_average(int arr[], int size) {
    return (double)array_sum(arr, size) / size;
}

// Reverse a string
void reverse_string(char str[]) {
    int length = strlen(str);
    for (int i = 0; i < length / 2; i++) {
        char temp = str[i];
        str[i] = str[length - 1 - i];
        str[length - 1 - i] = temp;
    }
}

// Count words in a string
int count_words(char str[]) {
    int count = 0;
    int in_word = 0;
    
    for (int i = 0; str[i] != '\\0'; i++) {
        if (str[i] != ' ' && str[i] != '\\t' && str[i] != '\\n') {
            if (!in_word) {
                count++;
                in_word = 1;
            }
        } else {
            in_word = 0;
        }
    }
    
    return count;
}
`
        },
        {
          id: 'utils.h',
          name: 'utils.h',
          type: 'file',
          content: `#ifndef UTILS_H
#define UTILS_H

// Function declarations
void generate_random_array(int arr[], int size, int max_value);
int find_max(int arr[], int size);
int find_min(int arr[], int size);
int array_sum(int arr[], int size);
double array_average(int arr[], int size);
void reverse_string(char str[]);
int count_words(char str[]);

#endif // UTILS_H
`
        }
      ];

    case 'cpp-basic':
      return [
        {
          id: 'main.cpp',
          name: 'main.cpp',
          type: 'file',
          content: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <memory>
#include <map>
#include "Calculator.h"
#include "Person.h"

using namespace std;

void demonstrateSTL() {
    cout << "🔧 STL Container Demo:" << endl;
    
    // Vector demo
    vector<int> numbers = {5, 2, 8, 1, 9, 3};
    cout << "Original vector: ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    sort(numbers.begin(), numbers.end());
    cout << "Sorted vector:   ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl << endl;
    
    // Map demo
    map<string, int> ages = {
        {"Alice", 25},
        {"Bob", 30},
        {"Charlie", 35}
    };
    
    cout << "Age map:" << endl;
    for (const auto& pair : ages) {
        cout << pair.first << ": " << pair.second << " years old" << endl;
    }
    cout << endl;
}

void demonstrateSmartPointers() {
    cout << "🧠 Smart Pointers Demo:" << endl;
    
    // Unique pointer
    auto calc = make_unique<Calculator>();
    cout << "Using unique_ptr Calculator:" << endl;
    cout << "10 + 5 = " << calc->add(10, 5) << endl;
    cout << "20 * 3 = " << calc->multiply(20, 3) << endl;
    
    // Shared pointer
    auto person1 = make_shared<Person>("John Doe", 28);
    auto person2 = person1; // Shared ownership
    
    cout << "Shared pointer person: " << person1->getName() 
         << " (age: " << person1->getAge() << ")" << endl;
    cout << "Reference count: " << person1.use_count() << endl;
    cout << endl;
}

void demonstrateTemplates() {
    cout << "📋 Template Demo:" << endl;
    
    // Function template usage
    cout << "Max of 10 and 20: " << max(10, 20) << endl;
    cout << "Max of 3.14 and 2.71: " << max(3.14, 2.71) << endl;
    cout << "Max of 'a' and 'z': " << max('a', 'z') << endl;
    cout << endl;
}

int main() {
    cout << "⚡ C++ Programming + Firecracker VM Demo" << endl;
    cout << "=======================================" << endl << endl;
    
    // Demonstrate various C++ features
    demonstrateSTL();
    demonstrateSmartPointers();
    demonstrateTemplates();
    
    // Object-oriented programming demo
    cout << "🎯 OOP Demo:" << endl;
    Person person("Alice Johnson", 30);
    person.displayInfo();
    person.haveBirthday();
    person.displayInfo();
    cout << endl;
    
    // Calculator demo
    cout << "🧮 Calculator Demo:" << endl;
    Calculator calc;
    cout << "15 + 7 = " << calc.add(15, 7) << endl;
    cout << "25 - 8 = " << calc.subtract(25, 8) << endl;
    cout << "6 * 7 = " << calc.multiply(6, 7) << endl;
    cout << "100 / 4 = " << calc.divide(100, 4) << endl;
    cout << endl;
    
    // Lambda function demo
    cout << "🔧 Lambda Function Demo:" << endl;
    auto square = [](int x) { return x * x; };
    auto is_even = [](int x) { return x % 2 == 0; };
    
    vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    
    cout << "Squares: ";
    for (int num : nums) {
        cout << square(num) << " ";
    }
    cout << endl;
    
    cout << "Even numbers: ";
    for (int num : nums) {
        if (is_even(num)) {
            cout << num << " ";
        }
    }
    cout << endl << endl;
    
    cout << "✅ C++ demo completed successfully!" << endl;
    
    return 0;
}
`
        },
        {
          id: 'Calculator.h',
          name: 'Calculator.h',
          type: 'file',
          content: `#ifndef CALCULATOR_H
#define CALCULATOR_H

class Calculator {
public:
    Calculator() = default;
    ~Calculator() = default;
    
    double add(double a, double b);
    double subtract(double a, double b);
    double multiply(double a, double b);
    double divide(double a, double b);
    
private:
    // Could add history or other state here
};

#endif // CALCULATOR_H
`
        },
        {
          id: 'Calculator.cpp',
          name: 'Calculator.cpp',
          type: 'file',
          content: `#include "Calculator.h"
#include <stdexcept>

double Calculator::add(double a, double b) {
    return a + b;
}

double Calculator::subtract(double a, double b) {
    return a - b;
}

double Calculator::multiply(double a, double b) {
    return a * b;
}

double Calculator::divide(double a, double b) {
    if (b == 0) {
        throw std::invalid_argument("Division by zero is not allowed");
    }
    return a / b;
}
`
        },
        {
          id: 'Person.h',
          name: 'Person.h',
          type: 'file',
          content: `#ifndef PERSON_H
#define PERSON_H

#include <string>

class Person {
private:
    std::string name;
    int age;

public:
    // Constructor
    Person(const std::string& name, int age);
    
    // Destructor
    ~Person() = default;
    
    // Getters
    std::string getName() const;
    int getAge() const;
    
    // Setters
    void setName(const std::string& name);
    void setAge(int age);
    
    // Methods
    void displayInfo() const;
    void haveBirthday();
};

#endif // PERSON_H
`
        },
        {
          id: 'Person.cpp',
          name: 'Person.cpp',
          type: 'file',
          content: `#include "Person.h"
#include <iostream>

Person::Person(const std::string& name, int age) : name(name), age(age) {
    // Constructor implementation
}

std::string Person::getName() const {
    return name;
}

int Person::getAge() const {
    return age;
}

void Person::setName(const std::string& name) {
    this->name = name;
}

void Person::setAge(int age) {
    if (age >= 0) {
        this->age = age;
    }
}

void Person::displayInfo() const {
    std::cout << "Name: " << name << ", Age: " << age << " years old" << std::endl;
}

void Person::haveBirthday() {
    age++;
    std::cout << "Happy Birthday " << name << "! You are now " << age << " years old." << std::endl;
}
`
        }
      ];

    case 'bash-script':
      return [
        {
          id: 'main.sh',
          name: 'main.sh',
          type: 'file',
          content: `#!/bin/bash

# Bash Script Template - Running on Firecracker VM! 🐚

set -e  # Exit on any error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}🐚 Bash Script + Firecracker VM Demo${NC}"
    echo "====================================="
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# System information
show_system_info() {
    print_info "System Information:"
    echo "Hostname: $(hostname)"
    echo "Date: $(date)"
    echo "Uptime: $(uptime)"
    echo "Current User: $(whoami)"
    echo "Working Directory: $(pwd)"
    echo ""
}

# File operations demo
file_operations() {
    print_info "File Operations Demo:"
    
    # Create a test directory
    mkdir -p temp_demo
    cd temp_demo
    
    # Create some test files
    echo "Hello from Firecracker VM!" > greeting.txt
    echo -e "Line 1\\nLine 2\\nLine 3" > numbers.txt
    
    # List files
    echo "Files created:"
    ls -la
    
    # Read files
    echo ""
    echo "Content of greeting.txt:"
    cat greeting.txt
    
    # Count lines
    echo ""
    echo "Line count in numbers.txt: $(wc -l < numbers.txt)"
    
    # Clean up
    cd ..
    rm -rf temp_demo
    print_success "File operations completed"
    echo ""
}

# Network operations
network_check() {
    print_info "Network Operations:"
    
    # Check if we can resolve DNS
    if nslookup google.com > /dev/null 2>&1; then
        print_success "DNS resolution working"
    else
        print_warning "DNS resolution failed"
    fi
    
    # Check network interfaces
    echo "Network interfaces:"
    ip addr show | grep -E "^[0-9]+" | cut -d: -f2 | tr -d ' '
    echo ""
}

# Process management demo
process_demo() {
    print_info "Process Management Demo:"
    
    # Show current processes (limited)
    echo "Top 5 processes by CPU usage:"
    ps aux --sort=-%cpu | head -n 6
    
    # Memory usage
    echo ""
    echo "Memory usage:"
    free -h
    echo ""
}

# Math operations
math_demo() {
    print_info "Math Operations Demo:"
    
    local num1=42
    local num2=17
    
    echo "Number 1: $num1"
    echo "Number 2: $num2"
    echo "Addition: $((num1 + num2))"
    echo "Subtraction: $((num1 - num2))"
    echo "Multiplication: $((num1 * num2))"
    echo "Division: $((num1 / num2))"
    echo "Modulo: $((num1 % num2))"
    
    # Calculate factorial
    factorial() {
        local n=$1
        if [ $n -le 1 ]; then
            echo 1
        else
            echo $((n * $(factorial $((n - 1)))))
        fi
    }
    
    echo "Factorial of 5: $(factorial 5)"
    echo ""
}

# Array operations
array_demo() {
    print_info "Array Operations Demo:"
    
    # Create an array
    fruits=("apple" "banana" "orange" "grape" "kiwi")
    
    echo "Fruits array:"
    for i in "${!fruits[@]}"; do
        echo "  [$i]: ${fruits[$i]}"
    done
    
    echo ""
    echo "Array length: ${#fruits[@]}"
    echo "First fruit: ${fruits[0]}"
    echo "Last fruit: ${fruits[-1]}"
    echo ""
}

# String operations
string_demo() {
    print_info "String Operations Demo:"
    
    local text="Hello, Firecracker VM World!"
    
    echo "Original string: '$text'"
    echo "Length: ${#text}"
    echo "Uppercase: ${text^^}"
    echo "Lowercase: ${text,,}"
    echo "Substring (0-5): ${text:0:5}"
    echo "Replace 'World' with 'Universe': ${text/World/Universe}"
    echo ""
}

# Main execution
main() {
    print_header
    
    show_system_info
    file_operations
    network_check
    process_demo
    math_demo
    array_demo
    string_demo
    
    print_success "Bash script demo completed successfully!"
}

# Error handling
trap 'print_error "Script failed on line $LINENO"' ERR

# Run the main function
main "$@"
`
        },
        {
          id: 'utils.sh',
          name: 'utils.sh',
          type: 'file',
          content: `#!/bin/bash

# Utility functions for bash scripts

# Logging functions
log_info() {
    echo -e "\\033[0;34m[INFO]\\033[0m $1" >&2
}

log_success() {
    echo -e "\\033[0;32m[SUCCESS]\\033[0m $1" >&2
}

log_warning() {
    echo -e "\\033[1;33m[WARNING]\\033[0m $1" >&2
}

log_error() {
    echo -e "\\033[0;31m[ERROR]\\033[0m $1" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Check if running as root
is_root() {
    [ "$EUID" -eq 0 ]
}

# Ask for confirmation
confirm() {
    local prompt="$1"
    local response
    
    echo -n "$prompt (y/N): "
    read -r response
    
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Create backup of file
backup_file() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$file" ]; then
        cp "$file" "$backup"
        log_success "Backed up $file to $backup"
        return 0
    else
        log_error "File $file does not exist"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local path="${1:-/}"
    local threshold="${2:-90}"
    
    local usage=$(df "$path" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        log_warning "Disk usage on $path is ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        log_info "Disk usage on $path is ${usage}%"
        return 0
    fi
}

# Simple file download function
download_file() {
    local url="$1"
    local output="$2"
    
    if command_exists curl; then
        curl -L -o "$output" "$url"
    elif command_exists wget; then
        wget -O "$output" "$url"
    else
        log_error "Neither curl nor wget is available"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here
    trap - EXIT
}

# Set up signal handlers
setup_signal_handlers() {
    trap cleanup EXIT
    trap 'log_error "Script interrupted"; exit 130' INT TERM
}

# Example usage function
show_usage() {
    cat << EOF
Bash Utilities Library

Available functions:
  - log_info, log_success, log_warning, log_error
  - command_exists
  - get_timestamp
  - is_root
  - confirm
  - backup_file
  - check_disk_space
  - download_file
  - cleanup
  - setup_signal_handlers

To use these functions, source this script:
  source utils.sh
EOF
}

# If script is run directly, show usage
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    show_usage
fi
`
        }
      ];

    case 'next-js':
      return [
        {
          id: 'package.json',
          name: 'package.json',
          type: 'file',
          content: `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.0.0",
    "typescript": "^5"
  }
}`
        },
        {
          id: 'next.config.js',
          name: 'next.config.js',
          type: 'file',
          content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
`
        },
        {
          id: 'app/layout.tsx',
          name: 'app/layout.tsx',
          type: 'file',
          content: `import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Next.js + Firecracker VM',
  description: 'Next.js application running on Firecracker VM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`
        },
        {
          id: 'app/page.tsx',
          name: 'app/page.tsx',
          type: 'file',
          content: `'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <main className="container">
      <h1>Next.js + Firecracker VM! ⚡</h1>
      
      <div className="hero">
        <p>Welcome to your Next.js application running on Firecracker VM</p>
        
        <div className="counter">
          <p>Counter: {count}</p>
          <div className="buttons">
            <button onClick={() => setCount(count - 1)}>-</button>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount(0)}>Reset</button>
          </div>
        </div>
        
        <div className="features">
          <h2>Features</h2>
          <ul>
            <li>✅ Server-side rendering (SSR)</li>
            <li>✅ Client-side routing</li>
            <li>✅ API routes</li>
            <li>✅ TypeScript support</li>
            <li>✅ Fast refresh</li>
          </ul>
        </div>
        
        <div className="navigation">
          <Link href="/about" className="link">About Page</Link>
        </div>
      </div>
    </main>
  )
}
`
        },
        {
          id: 'app/about/page.tsx',
          name: 'app/about/page.tsx',
          type: 'file',
          content: `import Link from 'next/link'

export default function About() {
  return (
    <main className="container">
      <h1>About Next.js + Firecracker</h1>
      
      <div className="content">
        <p>
          This is a Next.js application running on a Firecracker microVM. 
          Firecracker provides secure, fast, and lightweight virtualization 
          for modern containerized workloads.
        </p>
        
        <h2>Technology Stack</h2>
        <ul>
          <li><strong>Next.js 14</strong> - React framework with SSR</li>
          <li><strong>React 18</strong> - UI library</li>
          <li><strong>TypeScript</strong> - Type-safe JavaScript</li>
          <li><strong>Firecracker VM</strong> - Secure microVM</li>
        </ul>
        
        <h2>Benefits</h2>
        <ul>
          <li>🚀 <strong>Performance</strong> - Fast cold starts and low overhead</li>
          <li>🔒 <strong>Security</strong> - Hardware-level isolation</li>
          <li>💰 <strong>Cost-effective</strong> - Efficient resource utilization</li>
          <li>📦 <strong>Scalable</strong> - Easy to scale and manage</li>
        </ul>
        
        <div className="navigation">
          <Link href="/" className="link">← Back to Home</Link>
        </div>
      </div>
    </main>
  )
}
`
        },
        {
          id: 'app/globals.css',
          name: 'app/globals.css',
          type: 'file',
          content: `* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

h1 {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 2rem;
  background: linear-gradient(45deg, #fff, #ddd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 {
  font-size: 1.8rem;
  margin: 2rem 0 1rem;
  color: #f0f0f0;
}

.hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.counter {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.counter p {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.features {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: left;
}

.features ul,
.content ul {
  list-style: none;
  padding: 0;
}

.features li,
.content li {
  padding: 0.5rem 0;
  font-size: 1.1rem;
}

.content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.content p {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  opacity: 0.9;
}

.navigation {
  margin-top: 3rem;
}

.link {
  display: inline-block;
  color: white;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.2);
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  font-weight: 500;
}

.link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  
  .container {
    padding: 20px 15px;
  }
  
  .buttons {
    flex-direction: column;
    align-items: center;
  }
  
  button {
    width: 200px;
  }
}
`
        }
      ];

    case 'vue':
      return [
        {
          id: 'package.json',
          name: 'package.json',
          type: 'file',
          content: `{
  "name": "vue-firecracker-app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.4"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.3",
    "vite": "^4.4.5"
  }
}`
        },
        {
          id: 'vite.config.js',
          name: 'vite.config.js',
          type: 'file',
          content: `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 3000
  }
})
`
        },
        {
          id: 'index.html',
          name: 'index.html',
          type: 'file',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue.js + Firecracker VM</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`
        },
        {
          id: 'src/main.js',
          name: 'src/main.js',
          type: 'file',
          content: `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
`
        },
        {
          id: 'src/App.vue',
          name: 'src/App.vue',
          type: 'file',
          content: `<template>
  <div id="app">
    <header class="header">
      <h1>{{ title }} 🌟</h1>
      <p>{{ subtitle }}</p>
    </header>

    <main class="main">
      <!-- Counter Component -->
      <div class="card">
        <h2>Interactive Counter</h2>
        <div class="counter">
          <p class="count-display">Count: {{ count }}</p>
          <div class="button-group">
            <button @click="decrement" class="btn btn-secondary">-</button>
            <button @click="increment" class="btn btn-primary">+</button>
            <button @click="reset" class="btn btn-outline">Reset</button>
          </div>
        </div>
      </div>

      <!-- Todo List Component -->
      <div class="card">
        <h2>Todo List</h2>
        <div class="todo-section">
          <div class="input-group">
            <input
              v-model="newTodo"
              @keyup.enter="addTodo"
              placeholder="Add a new todo..."
              class="todo-input"
            />
            <button @click="addTodo" class="btn btn-primary">Add</button>
          </div>
          
          <ul class="todo-list" v-if="todos.length > 0">
            <li
              v-for="todo in todos"
              :key="todo.id"
              :class="{ completed: todo.completed }"
              class="todo-item"
            >
              <span @click="toggleTodo(todo.id)" class="todo-text">
                {{ todo.text }}
              </span>
              <button @click="removeTodo(todo.id)" class="btn btn-danger btn-sm">
                Delete
              </button>
            </li>
          </ul>
          
          <p v-else class="empty-state">No todos yet. Add one above!</p>
        </div>
      </div>

      <!-- Features List -->
      <div class="card">
        <h2>Vue.js Features</h2>
        <div class="features">
          <div class="feature" v-for="feature in features" :key="feature.name">
            <span class="feature-icon">{{ feature.icon }}</span>
            <div class="feature-content">
              <h3>{{ feature.name }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>&copy; 2024 Vue.js + Firecracker VM. Built with ❤️ and Vue.js</p>
    </footer>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'App',
  setup() {
    // Reactive data
    const title = ref('Vue.js + Firecracker VM')
    const subtitle = ref('A progressive JavaScript framework running on secure microVM')
    const count = ref(0)
    const newTodo = ref('')
    const nextTodoId = ref(1)
    const todos = ref([])

    const features = reactive([
      {
        name: 'Reactive Data Binding',
        description: 'Automatic UI updates when data changes',
        icon: '🔄'
      },
      {
        name: 'Component-Based',
        description: 'Build encapsulated components with their own state',
        icon: '🧩'
      },
      {
        name: 'Single File Components',
        description: 'Template, script, and style in one file',
        icon: '📄'
      },
      {
        name: 'Composition API',
        description: 'Flexible composition of component logic',
        icon: '⚡'
      },
      {
        name: 'Virtual DOM',
        description: 'Efficient rendering and updating',
        icon: '🌳'
      },
      {
        name: 'Firecracker VM',
        description: 'Secure and fast microVM execution',
        icon: '🚀'
      }
    ])

    // Methods
    const increment = () => {
      count.value++
    }

    const decrement = () => {
      count.value--
    }

    const reset = () => {
      count.value = 0
    }

    const addTodo = () => {
      if (newTodo.value.trim()) {
        todos.value.push({
          id: nextTodoId.value++,
          text: newTodo.value.trim(),
          completed: false
        })
        newTodo.value = ''
      }
    }

    const toggleTodo = (id) => {
      const todo = todos.value.find(t => t.id === id)
      if (todo) {
        todo.completed = !todo.completed
      }
    }

    const removeTodo = (id) => {
      todos.value = todos.value.filter(t => t.id !== id)
    }

    return {
      title,
      subtitle,
      count,
      newTodo,
      todos,
      features,
      increment,
      decrement,
      reset,
      addTodo,
      toggleTodo,
      removeTodo
    }
  }
}
</script>
`
        },
        {
          id: 'src/style.css',
          name: 'src/style.css',
          type: 'file',
          content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  min-height: 100vh;
  color: #2c3e50;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  text-align: center;
  padding: 3rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #fff, #ddd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.card h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.5rem;
}

.counter {
  text-align: center;
}

.count-display {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  color: #42b883;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-primary {
  background: #42b883;
  color: white;
}

.btn-primary:hover {
  background: #369870;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #42b883;
  border: 2px solid #42b883;
}

.btn-outline:hover {
  background: #42b883;
  color: white;
  transform: translateY(-2px);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.8rem;
  min-width: auto;
}

.todo-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  gap: 10px;
}

.todo-input {
  flex: 1;
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.todo-input:focus {
  outline: none;
  border-color: #42b883;
}

.todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.todo-item:hover {
  background: #e9ecef;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  opacity: 0.6;
}

.todo-text {
  cursor: pointer;
  flex: 1;
  margin-right: 1rem;
}

.empty-state {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 2rem;
}

.features {
  display: grid;
  gap: 1rem;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: background 0.3s ease;
}

.feature:hover {
  background: #e9ecef;
}

.feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature-content h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.feature-content p {
  color: #6c757d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.footer {
  background: rgba(0, 0, 0, 0.1);
  color: white;
  text-align: center;
  padding: 2rem;
  margin-top: auto;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }
  
  .main {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  
  .button-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-group {
    flex-direction: column;
  }
}
`
        }
      ];

    default:

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