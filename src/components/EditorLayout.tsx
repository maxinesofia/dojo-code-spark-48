import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { EnhancedFileExplorer } from "./EnhancedFileExplorer";
import { DragDropFileManager } from "./DragDropFileManager";
import { FileNode } from "../types/FileTypes";
import { CodeEditor } from "./CodeEditor";
import { DynamicPreview } from "./DynamicPreview";
import { PackageManager } from "./PackageManager";
import { Terminal } from "./Terminal";
import { useToast } from "@/hooks/use-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, GitBranch, Settings } from "lucide-react";

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
});`
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
    if (template && template !== 'default') {
      return getTemplateFiles(template);
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultFiles;
  });
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

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

  const handleFileCreate = useCallback((name: string, type: 'file' | 'folder', parentId?: string) => {
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
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full bg-sidebar border-r border-sidebar-border">
              <EnhancedFileExplorer
                files={files}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                onFileRename={handleFileRename}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Main Editor Area */}
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={isTerminalOpen ? 70 : 100}>
                <div className="h-full">
                  {selectedFile ? (
                    <CodeEditor
                      value={selectedFile.content || ''}
                      language="javascript"
                      onChange={handleFileChange}
                      fileName={selectedFile.name}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-editor-bg">
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
          
          {/* Right Panel - Preview & Package Manager */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full bg-sidebar border-l border-sidebar-border flex flex-col">
              {/* Preview */}
              <div className="flex-1 flex flex-col">
                <div className="h-8 border-b border-sidebar-border flex items-center px-3 bg-sidebar-accent">
                  <span className="text-sm font-medium text-sidebar-foreground">Preview</span>
                </div>
                <div className="flex-1">
                  <DynamicPreview files={files} />
                </div>
              </div>

              {/* Package Manager */}
              <div className="h-64 border-t border-sidebar-border">
                <div className="h-8 border-b border-sidebar-border flex items-center px-3 bg-sidebar-accent">
                  <span className="text-sm font-medium text-sidebar-foreground">Package Manager</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PackageManager 
                    isOpen={true}
                    onClose={() => {}}
                  />
                </div>
              </div>
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
    </div>
  );
}