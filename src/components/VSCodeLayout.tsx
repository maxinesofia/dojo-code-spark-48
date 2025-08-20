import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { VSCodeSidebar } from "./VSCodeSidebar";
import { VSCodeEditor } from "./VSCodeEditor";
import { VSCodeTerminal } from "./VSCodeTerminal";
import { VSCodeStatusBar } from "./VSCodeStatusBar";
import { FileNode } from "../types/FileTypes";
import { useToast } from "@/hooks/use-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const STORAGE_KEY = 'vscode-project-state';

// Default VS Code project structure
const defaultFiles: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'index.js',
        name: 'index.js',
        type: 'file',
        content: `// Welcome to VS Code in the browser!
console.log('Hello from VS Code!');

function main() {
    const message = 'VS Code integration with Firecracker VM';
    console.log(message);
    
    // Your code here
    return message;
}

main();`
      },
      {
        id: 'App.js',
        name: 'App.js',
        type: 'file',
        content: `import React, { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('Connected to Firecracker VM');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Simulate VM connection
    const interval = setInterval(() => {
      setLogs(prev => [...prev.slice(-9), \`[\${new Date().toLocaleTimeString()}] VM Status: Active\`]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🚀 VS Code + Firecracker VM Integration</h1>
      <div style={{ 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Status: {status}</h2>
        <p>This editor is running with full VS Code functionality!</p>
      </div>
      
      <div style={{ 
        background: '#1e1e1e', 
        color: '#d4d4d4', 
        padding: '15px', 
        borderRadius: '8px',
        fontFamily: 'Monaco, monospace',
        fontSize: '12px',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <h3 style={{ color: '#569cd6', margin: '0 0 10px 0' }}>VM Logs:</h3>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}

export default App;`
      }
    ]
  },
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file',
    content: `{
  "name": "vscode-firecracker-project",
  "version": "1.0.0",
  "description": "VS Code project with Firecracker VM integration",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0",
    "webpack": "^5.0.0"
  },
  "author": "VS Code User",
  "license": "MIT"
}`
  },
  {
    id: 'README.md',
    name: 'README.md',
    type: 'file',
    content: `# VS Code + Firecracker VM Project

This project demonstrates the integration of VS Code web interface with Firecracker VM execution on Google Cloud Platform.

## Features

- 🖥️ Full VS Code editor experience in the browser
- 🔥 Firecracker VM integration for secure code execution
- 🌐 Remote development capabilities
- 📁 File system management
- 🖥️ Integrated terminal with VM connection
- 🎨 VS Code themes and extensions support

## Getting Started

1. Open any file in the editor
2. Use the integrated terminal to run commands
3. Your code executes in a secure Firecracker VM on GCP
4. Real-time collaboration and file synchronization

## Terminal Commands

- \`npm start\` - Run the application
- \`npm run dev\` - Start development mode
- \`ls\` - List files in current directory
- \`cat filename\` - View file contents
- \`node filename.js\` - Execute JavaScript files

## Architecture

\`\`\`
Browser (VS Code Web) → WebSocket → Backend → GCP → Firecracker VM
\`\`\`

The integrated terminal connects directly to your Firecracker VM, providing a seamless development experience.
`
  }
];

export function VSCodeLayout() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileNode[]>(() => {
    const template = searchParams.get('template');
    if (template && template !== 'default') {
      return getTemplateFiles(template);
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultFiles;
  });
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    }, 1000);
    
    return () => clearTimeout(saveTimer);
  }, [files]);

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

  const handleCreateFile = useCallback((name: string, type: 'file' | 'folder', parentId?: string) => {
    const newNode: FileNode = {
      id: `${Date.now()}-${name}`,
      name,
      type,
      content: type === 'file' ? '' : undefined,
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

  const handleDeleteFile = useCallback((fileId: string) => {
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

  const toggleTerminal = useCallback(() => {
    setIsTerminalOpen(!isTerminalOpen);
  }, [isTerminalOpen]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        projectName="VS Code Project"
        onSave={() => console.log('Save')}
        onRun={() => console.log('Run')}
        onShare={() => console.log('Share')}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <VSCodeSidebar
              files={files}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Main Content */}
          <ResizablePanel defaultSize={80}>
            <ResizablePanelGroup direction="vertical">
              {/* Editor */}
              <ResizablePanel defaultSize={isTerminalOpen ? 70 : 100}>
                <div className="h-full">
                  {selectedFile ? (
                    <VSCodeEditor
                      value={selectedFile.content || ''}
                      language="javascript"
                      onChange={handleFileChange}
                      fileName={selectedFile.name}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-editor-bg">
                      <div className="text-center text-muted-foreground">
                        <h2 className="text-2xl font-semibold mb-2">Welcome to VS Code</h2>
                        <p>Select a file from the explorer to start editing</p>
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
                    <VSCodeTerminal
                      files={files}
                      onClose={() => setIsTerminalOpen(false)}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <VSCodeStatusBar
        selectedFile={selectedFile}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={toggleTerminal}
      />
    </div>
  );
}

// Template files helper (simplified for VS Code layout)
const getTemplateFiles = (templateId: string): FileNode[] => {
  switch (templateId) {
    case 'react':
      return [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          children: [
            {
              id: 'App.jsx',
              name: 'App.jsx',
              type: 'file',
              content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>React + VS Code + Firecracker VM</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;`
            }
          ]
        }
      ];
    
    case 'node':
      return [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          children: [
            {
              id: 'server.js',
              name: 'server.js',
              type: 'file',
              content: `const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from Node.js in Firecracker VM!',
    timestamp: new Date().toISOString(),
    vm: 'firecracker',
    platform: 'gcp'
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
            }
          ]
        }
      ];
    
    default:
      return defaultFiles;
  }
};