import { useState, useCallback, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { FileNode } from "../types/FileTypes";
import { CodeEditor } from "./CodeEditor";
import { X, SplitSquareHorizontal, SplitSquareVertical, Plus } from "lucide-react";

interface EditorPane {
  id: string;
  file: FileNode | null;
}

interface SplitEditorProps {
  selectedFile: FileNode | null;
  onFileChange: (content: string | undefined, fileId?: string) => void;
  files: FileNode[];
}

export function SplitEditor({ selectedFile, onFileChange, files }: SplitEditorProps) {
  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    const traverse = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.type === 'file') {
          result.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return result;
  };

  const allFiles = flattenFiles(files);
  
  const [panes, setPanes] = useState<EditorPane[]>([
    { id: 'main', file: selectedFile }
  ]);
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');

  // Update main pane when selectedFile changes
  useEffect(() => {
    setPanes(prev => prev.map(pane => 
      pane.id === 'main' ? { ...pane, file: selectedFile } : pane
    ));
  }, [selectedFile]);

  const splitEditor = useCallback((direction: 'horizontal' | 'vertical') => {
    const newPane: EditorPane = {
      id: `pane-${Date.now()}`,
      file: null
    };
    setPanes(prev => [...prev, newPane]);
    setSplitDirection(direction);
  }, []);

  const closePane = useCallback((paneId: string) => {
    if (panes.length <= 1) return; // Don't close if it's the only pane
    setPanes(prev => prev.filter(pane => pane.id !== paneId));
  }, [panes.length]);

  const openFileInPane = useCallback((file: FileNode, paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId ? { ...pane, file } : pane
    ));
  }, []);

  const handleFileChangeInPane = useCallback((content: string | undefined, paneId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (pane?.file) {
      onFileChange(content, pane.file.id);
    }
  }, [panes, onFileChange]);

  if (panes.length === 1) {
    const pane = panes[0];
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Single Editor Toolbar */}
        <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {pane.file?.name || 'No file selected'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => splitEditor('horizontal')}
              className="h-7 w-7 p-0"
              title="Split horizontally"
            >
              <SplitSquareHorizontal className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => splitEditor('vertical')}
              className="h-7 w-7 p-0"
              title="Split vertically"
            >
              <SplitSquareVertical className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Single Editor */}
        <div className="flex-1">
          {pane.file ? (
            <CodeEditor
              value={pane.file.content || ''}
              language="javascript"
              onChange={(content) => handleFileChangeInPane(content, pane.id)}
              fileName={pane.file.name}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <div className="text-center text-muted-foreground">
                <h2 className="text-2xl font-semibold mb-2">Welcome to Tutorials Dojo</h2>
                <p>Select a file from the explorer to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Split Editor Toolbar */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Split Editor ({panes.length} panes)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSplitDirection(splitDirection === 'horizontal' ? 'vertical' : 'horizontal')}
            className="h-7 px-2 text-xs"
            title="Toggle split direction"
          >
            {splitDirection === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </Button>
        </div>
      </div>
      
      {/* Split Editor Panes */}
      <div className="flex-1">
        <ResizablePanelGroup direction={splitDirection}>
          {panes.map((pane, index) => (
            <div key={pane.id}>
              <ResizablePanel defaultSize={100 / panes.length} minSize={20}>
                <div className="h-full flex flex-col">
                  {/* Pane Header */}
                  <div className="h-8 border-b border-border flex items-center justify-between px-3 bg-muted/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <select 
                        value={pane.file?.id || ''}
                        onChange={(e) => {
                          const file = allFiles.find(f => f.id === e.target.value);
                          if (file) openFileInPane(file, pane.id);
                        }}
                        className="text-xs bg-transparent border-none outline-none flex-1 min-w-0"
                      >
                        <option value="">Select file...</option>
                        {allFiles.map(file => (
                          <option key={file.id} value={file.id}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => splitEditor(splitDirection)}
                        className="h-6 w-6 p-0"
                        title="Add new pane"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      {panes.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => closePane(pane.id)}
                          className="h-6 w-6 p-0"
                          title="Close pane"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Pane Content */}
                  <div className="flex-1">
                    {pane.file ? (
                      <CodeEditor
                        value={pane.file.content || ''}
                        language="javascript"
                        onChange={(content) => handleFileChangeInPane(content, pane.id)}
                        fileName={pane.file.name}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-background">
                        <div className="text-center text-muted-foreground">
                          <p className="text-sm">No file selected</p>
                          <p className="text-xs mt-1">Use the dropdown above to select a file</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
              {index < panes.length - 1 && <ResizableHandle />}
            </div>
          ))}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}