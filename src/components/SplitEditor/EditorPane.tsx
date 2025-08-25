import { useRef, useEffect, useState } from 'react';
import { Editor, OnMount } from '@monaco-editor/react';
import { useTheme } from '@/components/ui/theme-provider';
import { FileNode } from '@/types/FileTypes';
import { EditorPaneData } from './SplitEditor';
import { cn } from '@/lib/utils';

interface EditorPaneProps {
  pane: EditorPaneData;
  onFileChange: (fileId: string, content: string) => void;
  onFocus: () => void;
  isFocused: boolean;
  syncScrolling: boolean;
  onStateChange: (updates: Partial<EditorPaneData>) => void;
}

export function EditorPane({
  pane,
  onFileChange,
  onFocus,
  isFocused,
  syncScrolling,
  onStateChange
}: EditorPaneProps) {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const [editorContent, setEditorContent] = useState('');

  const activeFile = pane.files.find(f => f.id === pane.activeFileId);

  useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content || '');
    }
  }, [activeFile]);

  // Restore cursor and scroll position when switching files
  useEffect(() => {
    if (editorRef.current && pane.cursorPosition) {
      editorRef.current.setPosition(pane.cursorPosition);
    }
  }, [pane.activeFileId]);

  useEffect(() => {
    if (editorRef.current && pane.scrollPosition) {
      editorRef.current.setScrollPosition(pane.scrollPosition);
    }
  }, [pane.activeFileId]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      automaticLayout: true,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      unfoldOnClickAfterEndOfLine: false,
      scrollBeyondLastLine: false,
      smoothScrolling: true
    });

    // Handle focus
    editor.onDidFocusEditorWidget(() => {
      onFocus();
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      onStateChange({
        cursorPosition: {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      });
    });

    // Track scroll position
    editor.onDidScrollChange((e) => {
      onStateChange({
        scrollPosition: {
          scrollTop: e.scrollTop,
          scrollLeft: e.scrollLeft
        }
      });
    });

    // Set initial position if available
    if (pane.cursorPosition) {
      editor.setPosition(pane.cursorPosition);
    }
    if (pane.scrollPosition) {
      editor.setScrollPosition(pane.scrollPosition);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFile) {
      setEditorContent(value);
      onFileChange(activeFile.id, value);
    }
  };

  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
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
      case 'scss':
      case 'sass':
        return 'scss';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'c':
        return 'cpp';
      case 'rs':
        return 'rust';
      case 'go':
        return 'go';
      case 'php':
        return 'php';
      case 'rb':
        return 'ruby';
      case 'sql':
        return 'sql';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Choose a file from the explorer to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex-1 min-h-0 border-2 border-transparent transition-colors",
        isFocused && "border-primary/20"
      )}
      onClick={onFocus}
    >
      <Editor
        height="100%"
        defaultLanguage={getLanguageFromFilename(activeFile.name)}
        language={getLanguageFromFilename(activeFile.name)}
        value={editorContent}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly: false,
          selectOnLineNumbers: true,
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          minimap: {
            enabled: true
          }
        }}
      />
    </div>
  );
}