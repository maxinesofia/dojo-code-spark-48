import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { EnhancedFileExplorer } from "./EnhancedFileExplorer";
import { FileNode } from "../types/FileTypes";
import { CodeEditor } from "./CodeEditor";
import { DynamicPreview } from "./DynamicPreview";
import { PackageManager } from "./PackageManager";
import { Terminal } from "./Terminal";
import { useToast } from "@/hooks/use-toast";

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

p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
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
            
            // Add some fun animations
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        });
    }
    
    // Add some dynamic content
    setTimeout(() => {
        const container = document.querySelector('.container');
        if (container) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.innerHTML = '<p><em>✨ Ready to start coding? Edit the files and see the magic happen!</em></p>';
            welcomeMsg.style.animation = 'fadeIn 0.5s ease-in';
            container.appendChild(welcomeMsg);
        }
    }, 1000);
});

// Add CSS animation keyframes
const style = document.createElement('style');
style.textContent = \`
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
\`;
document.head.appendChild(style);`
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
    ${templateId === 'react-ts' ? '<script src="https://unpkg.com/typescript@5/lib/typescript.js"></script>' : ''}
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" ${templateId === 'react-ts' ? 'data-type="module"' : ''} src="App.${templateId === 'react-ts' ? 'tsx' : 'js'}"></script>
</body>
</html>`
        },
        {
          id: templateId === 'react-ts' ? 'App.tsx' : 'App.js',
          name: templateId === 'react-ts' ? 'App.tsx' : 'App.js',
          type: 'file',
          content: templateId === 'react-ts' ? 
`import React, { useState } from 'react';

interface CounterProps {
  initialCount?: number;
}

const App: React.FC<CounterProps> = ({ initialCount = 0 }) => {
  const [count, setCount] = useState<number>(initialCount);

  const handleIncrement = (): void => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = (): void => {
    setCount(prev => prev - 1);
  };

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '400px',
      margin: '50px auto',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h1 style={{ color: '#1e293b', marginBottom: '20px' }}>
        Welcome to React + TypeScript! 🚀
      </h1>
      <div style={{ 
        fontSize: '24px', 
        margin: '20px 0',
        color: '#475569'
      }}>
        Count: <strong style={{ color: '#3b82f6' }}>{count}</strong>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={handleDecrement}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <button 
          onClick={handleIncrement}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
      <p style={{ 
        marginTop: '20px', 
        color: '#64748b',
        fontSize: '14px'
      }}>
        ✨ Edit this component and see the magic happen!
      </p>
    </div>
  );
};

// @ts-ignore
ReactDOM.render(<App />, document.getElementById('root'));` :
`function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '400px',
      margin: '50px auto',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h1 style={{ color: '#1e293b', marginBottom: '20px' }}>
        Welcome to React! ⚛️
      </h1>
      <div style={{ 
        fontSize: '24px', 
        margin: '20px 0',
        color: '#475569'
      }}>
        Count: <strong style={{ color: '#3b82f6' }}>{count}</strong>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={() => setCount(count - 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
      <p style={{ 
        marginTop: '20px', 
        color: '#64748b',
        fontSize: '14px'
      }}>
        ✨ Edit this component and see the magic happen!
      </p>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));`
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
    <title>TypeScript Project</title>
    <script src="https://unpkg.com/typescript@5/lib/typescript.js"></script>
</head>
<body>
    <div id="app">
        <h1>Welcome to TypeScript!</h1>
        <p id="counter">Count: 0</p>
        <button id="increment">+</button>
        <button id="decrement">-</button>
    </div>
    <script src="main.ts"></script>
</body>
</html>`
        },
        {
          id: 'main.ts',
          name: 'main.ts',
          type: 'file',
          content: `interface Counter {
  value: number;
  increment(): void;
  decrement(): void;
}

class CounterApp implements Counter {
  value: number = 0;
  private counterElement: HTMLElement;

  constructor() {
    this.counterElement = document.getElementById('counter')!;
    this.setupEventListeners();
    this.render();
  }

  increment(): void {
    this.value++;
    this.render();
  }

  decrement(): void {
    this.value--;
    this.render();
  }

  private setupEventListeners(): void {
    document.getElementById('increment')?.addEventListener('click', () => this.increment());
    document.getElementById('decrement')?.addEventListener('click', () => this.decrement());
  }

  private render(): void {
    this.counterElement.textContent = \`Count: \${this.value}\`;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CounterApp();
});`
        }
      ];
    case 'next-js':
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
    <title>Next.js-like App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="pages/index.js"></script>
</body>
</html>`
        },
        {
          id: 'pages/index.js',
          name: 'pages/index.js',
          type: 'file',
          content: `function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Welcome to Next.js-like App! 🚀</h1>
      <p>This simulates a Next.js structure in the browser.</p>
      <div style={{ marginTop: '20px' }}>
        <a href="#" style={{ color: '#0070f3', textDecoration: 'none' }}>
          Learn more about Next.js →
        </a>
      </div>
    </div>
  );
}

ReactDOM.render(<HomePage />, document.getElementById('root'));`
        }
      ];
    case 'vue':
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
    <title>Vue.js App</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body>
    <div id="app">
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <button @click="increment">Count: {{ count }}</button>
    </div>
    <script src="app.js"></script>
</body>
</html>`
        },
        {
          id: 'app.js',
          name: 'app.js',
          type: 'file',
          content: `const { createApp } = Vue;

createApp({
  data() {
    return {
      title: 'Welcome to Vue.js! 🔧',
      message: 'Start building amazing reactive apps!',
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
}).mount('#app');`
        }
      ];
    case 'node-express':
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
    <title>Node.js Express Simulation</title>
</head>
<body>
    <div id="app">
        <h1>Node.js Express API Simulation 🟢</h1>
        <p>This simulates a Node.js Express server in the browser.</p>
        <button id="fetchData">Fetch Data from "API"</button>
        <div id="result"></div>
    </div>
    <script src="server.js"></script>
</body>
</html>`
        },
        {
          id: 'server.js',
          name: 'server.js',
          type: 'file',
          content: `// Simulated Express server in the browser
class MockExpress {
  constructor() {
    this.routes = new Map();
    this.setupRoutes();
  }

  get(path, handler) {
    this.routes.set(\`GET:\${path}\`, handler);
  }

  post(path, handler) {
    this.routes.set(\`POST:\${path}\`, handler);
  }

  async request(method, path) {
    const key = \`\${method}:\${path}\`;
    const handler = this.routes.get(key);
    if (handler) {
      return await handler();
    }
    return { error: 'Route not found' };
  }

  setupRoutes() {
    this.get('/api/users', () => ({
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]
    }));

    this.get('/api/health', () => ({
      status: 'OK',
      timestamp: new Date().toISOString()
    }));
  }
}

// Initialize mock server
const app = new MockExpress();

// Frontend interaction
document.addEventListener('DOMContentLoaded', () => {
  const fetchButton = document.getElementById('fetchData');
  const resultDiv = document.getElementById('result');

  fetchButton.addEventListener('click', async () => {
    const data = await app.request('GET', '/api/users');
    resultDiv.innerHTML = \`
      <h3>API Response:</h3>
      <pre>\${JSON.stringify(data, null, 2)}</pre>
    \`;
  });
});`
        }
      ];
  }
};

// Load project state from localStorage
const loadProjectState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        files: parsed.files || defaultFiles,
        fileContents: parsed.fileContents || {},
        activeFileId: parsed.activeFileId || null
      };
    }
  } catch (error) {
    console.error('Failed to load project state:', error);
  }
  return null;
};

export function EditorLayout() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const [projectName, setProjectName] = useState("My Awesome Project");
  
  // Initialize state from localStorage or template/default
  const initialFiles = templateId ? getTemplateFiles(templateId) : defaultFiles;
  const savedState = !templateId ? loadProjectState() : null;
  
  const [files, setFiles] = useState<FileNode[]>(savedState?.files || initialFiles);
  const [activeFile, setActiveFile] = useState<FileNode | null>(() => {
    if (savedState?.activeFileId) {
      const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findFileById(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      return findFileById(savedState.files, savedState.activeFileId);
    }
    return initialFiles[0];
  });
  
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    if (savedState?.fileContents && Object.keys(savedState.fileContents).length > 0) {
      return savedState.fileContents;
    }
    return initialFiles.reduce((acc, file) => {
      if (file.content) {
        acc[file.id] = file.content;
      }
      return acc;
    }, {} as Record<string, string>);
  });
  
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // Save project state to localStorage whenever it changes
  useEffect(() => {
    if (!templateId) { // Only save if not using a template (preserves user work)
      setIsSaving(true);
      const saveTimeout = setTimeout(() => {
        try {
          const now = new Date().toISOString();
          const stateToSave = {
            files,
            fileContents,
            activeFileId: activeFile?.id || null,
            lastSaved: now
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
          setLastSaved(now);
        } catch (error) {
          console.error('Failed to save project state:', error);
        } finally {
          setIsSaving(false);
        }
      }, 500); // Debounce saves by 500ms

      return () => clearTimeout(saveTimeout);
    }
  }, [files, fileContents, activeFile, templateId]);

  const handleProjectNameChange = useCallback((newName: string) => {
    setProjectName(newName);
  }, []);

  const saveToLocalStorage = useCallback(() => {
    const state = {
      files,
      fileContents,
      activeFileId: activeFile?.id || null,
      lastSaved: new Date().toISOString(),
      projectName,
      template: searchParams.get('template') || 'vanilla'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setLastSaved(state.lastSaved);
  }, [files, fileContents, activeFile, projectName, searchParams]);

  // Load saved project name on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.projectName) {
          setProjectName(state.projectName);
        }
      } catch (error) {
        console.error('Error loading project name:', error);
      }
    }
  }, []);

  const handleFileSelect = useCallback((file: FileNode) => {
    setActiveFile(file);
  }, []);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      setFileContents(prev => ({
        ...prev,
        [activeFile.id]: value
      }));
    }
  }, [activeFile]);

  const handleSave = useCallback(() => {
    toast({
      title: "Project saved!",
      description: "Your changes have been saved successfully.",
    });
  }, [toast]);

  const handleRun = useCallback(() => {
    toast({
      title: "Running project...",
      description: "Preview has been updated with your latest changes.",
    });
  }, [toast]);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/editor?template=${templateId || 'vanilla-js'}&name=${encodeURIComponent(projectName)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Shareable link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share link",
        description: shareUrl,
      });
    });
  }, [toast, templateId, projectName]);

  const handleCreateFile = useCallback((fileName: string, fileType: string) => {
    if (fileName && fileName.trim()) {
      // Get default content based on file type
      const getDefaultContent = (name: string, type: string) => {
        switch (type) {
          case 'javascript':
            return `// ${name}\nconsole.log("Hello from ${name}");`;
          case 'typescript':
            return `// ${name}\nconst message: string = "Hello from ${name}";\nconsole.log(message);`;
          case 'react-js':
            return `import React from 'react';\n\nfunction ${name.replace(/\.[^/.]+$/, "")} () {\n  return (\n    <div>\n      <h1>Hello from ${name}</h1>\n    </div>\n  );\n}\n\nexport default ${name.replace(/\.[^/.]+$/, "")};`;
          case 'react-ts':
            return `import React from 'react';\n\ninterface ${name.replace(/\.[^/.]+$/, "")}Props {\n  // Define props here\n}\n\nconst ${name.replace(/\.[^/.]+$/, "")}: React.FC<${name.replace(/\.[^/.]+$/, "")}Props> = () => {\n  return (\n    <div>\n      <h1>Hello from ${name}</h1>\n    </div>\n  );\n};\n\nexport default ${name.replace(/\.[^/.]+$/, "")};`;
          case 'html':
            return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${name.replace(/\.[^/.]+$/, "")}</title>\n</head>\n<body>\n    <h1>Hello from ${name}</h1>\n</body>\n</html>`;
          case 'css':
            return `/* ${name} */\n\n/* Add your styles here */\n.container {\n  padding: 20px;\n}`;
          case 'json':
            return `{\n  "name": "${name.replace(/\.[^/.]+$/, "")}",\n  "version": "1.0.0"\n}`;
          case 'text':
            return `${name}\n\nAdd your content here...`;
          default:
            return `// ${name}\n`;
        }
      };

      const newFile: FileNode = {
        id: fileName.trim(),
        name: fileName.trim(),
        type: 'file',
        content: getDefaultContent(fileName.trim(), fileType)
      };
      
      // Add to files array
      setFiles(prev => [...prev, newFile]);
      
      // Add to file contents
      setFileContents(prev => ({
        ...prev,
        [fileName.trim()]: getDefaultContent(fileName.trim(), fileType)
      }));

      // Set as active file
      setActiveFile(newFile);
      
      toast({
        title: "File created!",
        description: `${fileName} has been created successfully.`,
      });
    }
  }, [toast]);

  const handleCreateFolder = useCallback((folderName: string) => {
    if (folderName && folderName.trim()) {
      const newFolder: FileNode = {
        id: folderName.trim(),
        name: folderName.trim(),
        type: 'folder',
        children: [],
        isOpen: true
      };
      
      setFiles(prev => [...prev, newFolder]);
      
      toast({
        title: "Folder created!",
        description: `${folderName} folder has been created successfully.`,
      });
    }
  }, [toast]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFiles(prevFiles => {
      const toggleFolder = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === folderId && node.type === 'folder') {
            return { ...node, isOpen: !node.isOpen };
          }
          if (node.children) {
            return { ...node, children: toggleFolder(node.children) };
          }
          return node;
        });
      };
      return toggleFolder(prevFiles);
    });
  }, []);

  const handleDeleteFile = useCallback((fileId: string) => {
    setFiles(prevFiles => {
      const deleteFromNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.filter(node => {
          if (node.id === fileId) {
            return false;
          }
          if (node.children) {
            node.children = deleteFromNodes(node.children);
          }
          return true;
        });
      };
      return deleteFromNodes(prevFiles);
    });

    // If the deleted file was active, clear it
    if (activeFile?.id === fileId) {
      setActiveFile(null);
      setFileContents(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    }

    toast({
      title: "File deleted",
      description: "The file has been successfully deleted.",
    });
  }, [activeFile, toast]);

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    setFiles(prevFiles => {
      const renameInNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === fileId) {
            return { ...node, name: newName };
          }
          if (node.children) {
            return { ...node, children: renameInNodes(node.children) };
          }
          return node;
        });
      };
      return renameInNodes(prevFiles);
    });

    toast({
      title: "File renamed",
      description: `File renamed to "${newName}".`,
    });
  }, [toast]);

  const handleMoveFile = useCallback((fileId: string, targetFolderId: string | null, position?: 'before' | 'after', targetFileId?: string) => {
    setFiles(prevFiles => {
      // Find and remove the file from its current location
      const removeFileFromTree = (nodes: FileNode[]): { updatedNodes: FileNode[], removedFile: FileNode | null } => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === fileId) {
            const removedFile = nodes[i];
            const updatedNodes = [...nodes.slice(0, i), ...nodes.slice(i + 1)];
            return { updatedNodes, removedFile };
          }
          if (nodes[i].children) {
            const result = removeFileFromTree(nodes[i].children);
            if (result.removedFile) {
              return {
                updatedNodes: nodes.map((node, index) => 
                  index === i ? { ...node, children: result.updatedNodes } : node
                ),
                removedFile: result.removedFile
              };
            }
          }
        }
        return { updatedNodes: nodes, removedFile: null };
      };

      // Add file to target location with positioning
      const addFileToLocation = (nodes: FileNode[], file: FileNode, folderId: string | null, position?: 'before' | 'after', targetFileId?: string): FileNode[] => {
        if (folderId === null && !targetFileId) {
          // Add to root
          return [...nodes, file];
        }
        
        if (folderId !== null) {
          // Add to specific folder
          return nodes.map(node => {
            if (node.id === folderId && node.type === 'folder') {
              return {
                ...node,
                children: [...(node.children || []), file],
                isOpen: true
              };
            }
            if (node.children) {
              return {
                ...node,
                children: addFileToLocation(node.children, file, folderId, position, targetFileId)
              };
            }
            return node;
          });
        }
        
        if (targetFileId && position) {
          // Add relative to specific file
          const targetIndex = nodes.findIndex(node => node.id === targetFileId);
          if (targetIndex !== -1) {
            const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
            return [
              ...nodes.slice(0, insertIndex),
              file,
              ...nodes.slice(insertIndex)
            ];
          }
          
          // If not found at this level, search in children
          return nodes.map(node => {
            if (node.children) {
              return {
                ...node,
                children: addFileToLocation(node.children, file, folderId, position, targetFileId)
              };
            }
            return node;
          });
        }
        
        return nodes;
      };

      const { updatedNodes, removedFile } = removeFileFromTree(prevFiles);
      if (removedFile) {
        const finalNodes = addFileToLocation(updatedNodes, removedFile, targetFolderId, position, targetFileId);
        toast({
          title: "File moved!",
          description: `${removedFile.name} has been moved successfully.`,
        });
        return finalNodes;
      }
      return prevFiles;
    });
  }, [toast]);
  const htmlContent = fileContents['index.html'] || '';
  const cssContent = fileContents['styles.css'] || '';
  const jsContent = fileContents['script.js'] || '';

  // Extract and inject CSS into HTML
  const processedHtml = htmlContent.replace(
    '</head>',
    `<link rel="stylesheet" href="styles.css">\n<script src="script.js"></script>\n</head>`
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        projectName={projectName}
        onSave={handleSave}
        onRun={handleRun}
        onShare={handleShare}
        onTogglePackageManager={() => setShowPackageManager(!showPackageManager)}
        onToggleTerminal={() => {
          console.log('Terminal toggle clicked, current state:', showTerminal);
          setShowTerminal(!showTerminal);
        }}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onProjectNameChange={handleProjectNameChange}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <EnhancedFileExplorer
          files={files}
          activeFile={activeFile?.id || null}
          onFileSelect={handleFileSelect}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onMoveFile={handleMoveFile}
          onToggleFolder={handleToggleFolder}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onUpdateFile={(fileId, content) => {
            setFileContents(prev => ({ ...prev, [fileId]: content }));
          }}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            <CodeEditor
              value={activeFile ? (fileContents[activeFile.id] || '') : ''}
              language="javascript"
              onChange={handleCodeChange}
              fileName={activeFile?.name}
            />
            
            <DynamicPreview
              files={files.map(f => ({
                ...f,
                content: fileContents[f.id] || f.content
              }))}
            />
          </div>
          
          {showTerminal && (
            <div className="h-64 border-t border-border">
              <Terminal
                files={files.map(f => ({
                  ...f,
                  content: fileContents[f.id] || f.content
                }))}
                onCommandExecuted={(command, output) => {
                  console.log('Terminal command executed:', command, output);
                }}
              />
            </div>
          )}
        </div>

        {showPackageManager && (
          <PackageManager 
            isOpen={showPackageManager}
            onClose={() => setShowPackageManager(false)} 
          />
        )}
      </div>
    </div>
  );
}