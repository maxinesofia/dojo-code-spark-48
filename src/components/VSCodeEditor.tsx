import { useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/components/ui/theme-provider';
// Monaco editor will be available from @monaco-editor/react

interface VSCodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
  fileName?: string;
}

export function VSCodeEditor({ value, language, onChange, fileName }: VSCodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

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
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'json';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'php':
        return 'php';
      case 'rb':
        return 'ruby';
      case 'md':
        return 'markdown';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'javascript';
    }
  };

  const editorLanguage = fileName ? getLanguageFromFileName(fileName) : language;

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // VS Code-like features
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save command
      console.log('Save triggered');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      // Quick open command
      console.log('Quick open triggered');
    });

    // Enable advanced IntelliSense features
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });
  };

  // VS Code-like theme configuration
  useEffect(() => {
    // Theme will be handled by Monaco editor's built-in theme system
  }, [theme, isEditorReady]);

  return (
    <div className="flex-1 bg-editor-bg h-full">
      <div className="h-8 border-b border-editor-border flex items-center px-3 bg-background text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-foreground/80">{fileName || 'Untitled'}</span>
        </div>
      </div>
      
      <div className="h-[calc(100%-2rem)]">
        <Editor
          height="100%"
          language={editorLanguage}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            // VS Code-like configuration
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            fontLigatures: true,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            glyphMargin: true,
            folding: true,
            showFoldingControls: 'always',
            foldingHighlight: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
              highlightActiveIndentation: true
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showClasses: true,
              showFunctions: true,
              showVariables: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showUsers: true,
              showIssues: true,
              showColors: true,
              showFiles: true,
              showStructs: true
            },
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            parameterHints: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoSurround: 'languageDefined',
            formatOnPaste: true,
            formatOnType: true,
            multiCursorModifier: 'ctrlCmd',
            accessibilitySupport: 'auto',
            links: true,
            colorDecorators: true,
            contextmenu: true,
            mouseWheelZoom: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: true,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 10,
              arrowSize: 11
            }
          }}
        />
      </div>
    </div>
  );
}