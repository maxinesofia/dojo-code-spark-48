import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Smartphone, Tablet, Monitor, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CodeExecutionService, ExecutionResult } from "@/services/CodeExecutionService";
import { FileNode } from "@/types/FileTypes";
import { ApiPreview } from "./ApiPreview";

interface DynamicPreviewProps {
  files: FileNode[];
  language?: string;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export function DynamicPreview({ files, language = 'javascript' }: DynamicPreviewProps) {
  // Ensure files is always an array to prevent "some is not a function" errors
  const safeFiles = Array.isArray(files) ? files : [];
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const executionService = useRef(new CodeExecutionService());
  const [isLoading, setIsLoading] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const isNodejsProject = () => {
    return safeFiles.some(file => 
      file.name === 'package.json' || 
      file.name === 'server.js' ||
      (file.content && file.content.includes('require(')) ||
      (file.content && file.content.includes('module.exports'))
    );
  };

  const executeCode = async () => {
    if (!iframeRef.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Check if this is a Node.js project
      if (isNodejsProject()) {
        setError('This is a Node.js project. Use the Terminal to run "npm start" or "node server.js" to test your server.');
        setIsLoading(false);
        return;
      }

      const result = await executionService.current.executeCode(safeFiles, language);
      setExecutionResult(result);

      if (result.success && result.html) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(result.html);
          doc.close();
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPreview = () => {
    executeCode();
  };

  const openInNewTab = () => {
    if (executionResult?.success && executionResult.html) {
      const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (newWindow) {
        newWindow.document.write(executionResult.html);
        newWindow.document.close();
        newWindow.focus();
      }
    }
  };

  useEffect(() => {
    executeCode();
    
    // Cleanup on unmount
    return () => {
      executionService.current.cleanup();
    };
  }, [safeFiles, language]);

  const dimensions = getViewportDimensions(viewport);

  return (
    <div className="w-full h-full flex flex-col bg-editor-preview border-l border-editor-border">
      <div className="h-12 border-b border-editor-border flex items-center justify-between px-4 bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Dynamic Preview</span>
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
          {error && <AlertCircle className="w-3 h-3 text-destructive" />}
        </div>
        
        <div className="flex items-center gap-1">
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={refreshPreview}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={openInNewTab}
            disabled={!executionResult?.success}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border-b border-destructive/20 flex-shrink-0">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden min-h-0">
        {isNodejsProject() ? (
          <div className="w-full h-full">
            <ApiPreview files={safeFiles} />
          </div>
        ) : (
          <div className="w-full h-full flex justify-center bg-muted/10">
            <div 
              className={cn(
                "transition-all duration-300 bg-white shadow-sm h-full",
                viewport !== 'desktop' && "border-x border-border"
              )}
              style={dimensions}
            >
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Dynamic Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        )}
      </div>

      {executionResult?.logs && executionResult.logs.length > 0 && (
        <div className="border-t border-editor-border bg-muted/30 p-2 max-h-32 overflow-y-auto flex-shrink-0">
          <div className="text-xs text-muted-foreground font-medium mb-1">Console Output:</div>
          {executionResult.logs.map((log, index) => (
            <div key={index} className="text-xs font-mono text-foreground opacity-80">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}