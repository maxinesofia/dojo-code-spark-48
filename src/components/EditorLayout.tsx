import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "./Header";
import { FileExplorer, FileNode } from "./FileExplorer";
import { CodeEditor } from "./CodeEditor";
import { Preview } from "./Preview";
import { useToast } from "@/hooks/use-toast";

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
    <title>React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="script.js"></script>
</body>
</html>`
        },
        {
          id: 'script.js',
          name: 'script.js',
          type: 'file',
          content: `function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to React!</h1>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));`
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
    <div id="app">{{ message }}</div>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          id: 'script.js',
          name: 'script.js',
          type: 'file',
          content: `const { createApp } = Vue;

createApp({
  data() {
    return {
      message: 'Hello Vue.js!'
    }
  }
}).mount('#app');`
        }
      ];
    default:
      return defaultFiles;
  }
};

export function EditorLayout() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const projectName = searchParams.get('name') || 'My Awesome Project';
  
  const initialFiles = templateId ? getTemplateFiles(templateId) : defaultFiles;
  const [files] = useState<FileNode[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<FileNode | null>(initialFiles[0]);
  const [fileContents, setFileContents] = useState<Record<string, string>>(
    initialFiles.reduce((acc, file) => {
      if (file.content) {
        acc[file.id] = file.content;
      }
      return acc;
    }, {} as Record<string, string>)
  );
  const { toast } = useToast();

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

  const handleCreateFile = useCallback(() => {
    toast({
      title: "Create file",
      description: "File creation coming soon!",
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
      />
      
      <div className="flex-1 flex overflow-hidden">
        <FileExplorer
          files={files}
          activeFile={activeFile?.id || null}
          onFileSelect={handleFileSelect}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFile}
        />
        
        <CodeEditor
          value={activeFile ? (fileContents[activeFile.id] || '') : ''}
          language="javascript"
          onChange={handleCodeChange}
          fileName={activeFile?.name}
        />
        
        <Preview
          htmlContent={processedHtml}
          cssContent={cssContent}
          jsContent={jsContent}
        />
      </div>
    </div>
  );
}