import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Smartphone, Tablet, Monitor, Play, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileNode } from "./FileExplorer";
import { CodeExecutionService, ExecutionResult } from "@/services/CodeExecutionService";
import { PackageManagerService } from "@/services/PackageManagerService";

interface DynamicPreviewProps {
  files: FileNode[];
  activeFile: string | null;
  packageService: PackageManagerService;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export function DynamicPreview({ files, activeFile, packageService }: DynamicPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const executionService = useRef(new CodeExecutionService());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  const getViewportDimensions = (size: ViewportSize) => {
    switch (size) {
      case 'mobile':
        return { width: '375px', height: '100%' };
      case 'tablet':
        return { width: '768px', height: '100%' };
      case 'desktop':
        return { width: '100%', height: '100%' };
    }
  };

  const executeCode = async () => {
    if (!files.length) return;

    setIsExecuting(true);
    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      // Find entry point (index.html or main file)
      let entryPoint = 'index.html';
      const htmlFile = files.find(f => f.name === 'index.html');
      if (!htmlFile) {
        // Try to find a main JS/TS file
        const mainFile = files.find(f => 
          f.name.match(/^(main|app|index)\.(js|ts|jsx|tsx)$/i)
        );
        entryPoint = mainFile?.name || files[0]?.name || 'index.html';
      }

      const context = {
        files,
        entryPoint,
        language: entryPoint.endsWith('.ts') || entryPoint.endsWith('.tsx') ? 'typescript' as const : 'javascript' as const,
        imports: new Map(Object.entries(packageService.getImportMap()))
      };

      const result = await executionService.current.executeCode(context);
      setExecutionResult(result);
      setLogs(result.logs);

      if (result.success) {
        // Update the iframe with the executed content
        updatePreview();
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        logs: []
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const stopExecution = () => {
    executionService.current.cleanup();
    setIsRunning(false);
    setExecutionResult(null);
    
    // Clear the iframe
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write('<html><body><div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #666; font-family: system-ui;">Execution stopped</div></body></html>');
        doc.close();
      }
    }
  };

  const updatePreview = () => {
    if (!iframeRef.current || !files.length) return;
    
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Find the HTML file
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    let htmlContent = htmlFile?.content || `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
      </head>
      <body>
        <div style="padding: 20px; text-align: center; color: #666; font-family: system-ui;">
          <h2>No HTML file found</h2>
          <p>Add an index.html file to see the preview</p>
        </div>
      </body>
      </html>
    `;

    // Inject import map if packages are installed
    const importMapScript = packageService.generateImportMapScript();
    if (importMapScript && packageService.getInstalledPackages().length > 0) {
      htmlContent = htmlContent.replace('<head>', '<head>' + importMapScript);
    }

    // Inject CSS files
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    for (const cssFile of cssFiles) {
      if (cssFile.content) {
        const styleTag = `<style>/* ${cssFile.name} */\n${cssFile.content}</style>`;
        htmlContent = htmlContent.replace('</head>', styleTag + '</head>');
      }
    }

    // Inject JS files
    const jsFiles = files.filter(f => 
      f.name.endsWith('.js') || f.name.endsWith('.ts') || 
      f.name.endsWith('.jsx') || f.name.endsWith('.tsx')
    );
    
    for (const jsFile of jsFiles) {
      if (jsFile.content && !htmlContent.includes(jsFile.name)) {
        const scriptTag = jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.jsx')
          ? `<script type="text/babel">${jsFile.content}</script>`
          : `<script>${jsFile.content}</script>`;
        htmlContent = htmlContent.replace('</body>', scriptTag + '</body>');
      }
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();
  };

  // Auto-execute when files change (if currently running)
  useEffect(() => {
    if (isRunning && !isExecuting) {
      executeCode();
    }
  }, [files, isRunning]);

  const dimensions = getViewportDimensions(viewport);

  return (
    <div className="flex-1 bg-editor-preview border-l border-editor-border flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-editor-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Preview</span>
          {isExecuting && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
          {executionResult && (
            <Badge variant={executionResult.success ? "default" : "destructive"} className="text-xs">
              {executionResult.success ? "Running" : "Error"}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Execution Controls */}
          {!isRunning ? (
            <Button
              variant="default"
              size="sm"
              className="h-7 px-3"
              onClick={executeCode}
              disabled={isExecuting || files.length === 0}
            >
              <Play className="w-3 h-3 mr-1" />
              Run
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 px-3"
              onClick={stopExecution}
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          
          <div className="w-px h-4 bg-border mx-2" />
          
          {/* Console Toggle */}
          <Button
            variant={showConsole ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => setShowConsole(!showConsole)}
          >
            Console {logs.length > 0 && `(${logs.length})`}
          </Button>
          
          <div className="w-px h-4 bg-border mx-2" />
          
          {/* Viewport Controls */}
          <Button
            variant={viewport === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewport('mobile')}
          >
            <Smartphone className="w-3 h-3" />
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewport('tablet')}
          >
            <Tablet className="w-3 h-3" />
          </Button>
          <Button
            variant={viewport === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewport('desktop')}
          >
            <Monitor className="w-3 h-3" />
          </Button>
          
          <div className="w-px h-4 bg-border mx-2" />
          
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={updatePreview}>
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview */}
        <div className={cn("flex-1 overflow-hidden flex justify-center", showConsole && "flex-1")}>
          <div 
            className={cn(
              "transition-all duration-300 bg-white",
              viewport !== 'desktop' && "border-x border-editor-border"
            )}
            style={dimensions}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
        
        {/* Console */}
        {showConsole && (
          <div className="h-48 border-t border-editor-border bg-background flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-editor-border">
              <span className="text-sm font-medium">Console</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogs([])}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No console output</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono flex items-start gap-2">
                      {log.startsWith('ERROR:') && <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />}
                      <span className={cn(
                        log.startsWith('ERROR:') && "text-red-600",
                        log.startsWith('WARN:') && "text-yellow-600",
                        log.startsWith('LOG:') && "text-foreground"
                      )}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
                
                {executionResult && !executionResult.success && (
                  <div className="text-xs font-mono flex items-start gap-2 border-t border-border pt-2 mt-2">
                    <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-600">EXECUTION ERROR: {executionResult.error}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}