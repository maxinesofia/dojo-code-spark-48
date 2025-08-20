import { Editor } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
  fileName?: string;
}

export function CodeEditor({ value, language, onChange, fileName }: CodeEditorProps) {
  const { theme } = useTheme();
  
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
    <div className="flex-1 flex flex-col bg-background">
      <div className="h-10 border-b border-border flex items-center px-4 bg-background">
        <span className="text-sm text-foreground">{fileName || 'Untitled'}</span>
      </div>
      
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={editorLanguage}
          value={value}
          onChange={handleEditorChange}
          theme={editorTheme}
          loading={
            <div className="flex items-center justify-center h-full bg-background">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
    </div>
  );
}