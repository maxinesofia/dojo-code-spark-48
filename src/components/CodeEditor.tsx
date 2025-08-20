import { Editor } from "@monaco-editor/react";
import { Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
  fileName?: string;
}

export function CodeEditor({ value, language, onChange, fileName }: CodeEditorProps) {
  const { theme } = useTheme();
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);
  
  const getLanguageFromFileName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'javascript';
    }
  };

  const editorLanguage = fileName ? getLanguageFromFileName(fileName) : language;

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  const editorTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    ? 'vs-dark' 
    : 'vs';

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="h-10 border-b border-border flex items-center px-4 bg-background flex-shrink-0">
        <span className="text-sm text-foreground">{fileName || 'Untitled'}</span>
        {!isEditorLoaded && !editorError && (
          <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading editor...
          </div>
        )}
        {editorError && (
          <div className="ml-2 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            Error loading editor
          </div>
        )}
      </div>
      
      {editorError ? (
        <div className="flex-1 p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load code editor: {editorError}
              <br />
              <span className="text-xs mt-2 block">Try refreshing the page or check your internet connection.</span>
            </AlertDescription>
          </Alert>
          
          {/* Fallback textarea */}
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Fallback Editor:</label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-96 p-3 border border-border rounded-md bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your code here..."
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 relative min-h-0">
          <Editor
            height="100%"
            width="100%"
            language={editorLanguage}
            value={value || ''}
            onChange={handleEditorChange}
            theme={editorTheme}
            onMount={() => {
              setIsEditorLoaded(true);
              setEditorError(null);
            }}
            onValidate={(markers) => {
              // Log validation markers for debugging
              if (markers.length > 0) {
                console.log('Editor validation markers:', markers);
              }
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-background">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading Monaco Editor...</p>
                </div>
              </div>
            }
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Monaco, Menlo, "Ubuntu Mono", monospace',
              renderLineHighlight: 'line',
              selectOnLineNumbers: true,
              glyphMargin: false,
              folding: true,
              showFoldingControls: 'mouseover',
              contextmenu: true,
              mouseWheelZoom: true,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              renderWhitespace: 'selection',
              readOnly: false,
              domReadOnly: false,
              padding: { top: 10, bottom: 10 },
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false,
              },
            }}
          />
        </div>
      )}
    </div>
  );
}