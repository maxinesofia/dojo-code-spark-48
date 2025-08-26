import { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { EditorPane } from './EditorPane';
import { SplitControls } from './SplitControls';
import { FileTabs } from './FileTabs';
import { FileNode } from '@/types/FileTypes';
import { Grip } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorPaneData {
  id: string;
  files: FileNode[];
  activeFileId: string | null;
  openFiles: string[]; // Track which files are open as tabs
  cursorPosition?: { lineNumber: number; column: number };
  scrollPosition?: { scrollTop: number; scrollLeft: number };
}

export interface SplitEditorProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileChange: (fileId: string, content: string) => void;
  className?: string;
}

export type SplitMode = 'vertical' | 'horizontal';

export function SplitEditor({
  files,
  activeFileId,
  onFileSelect,
  onFileChange,
  className
}: SplitEditorProps) {
  const [panes, setPanes] = useState<EditorPaneData[]>([
    {
      id: 'main',
      files: files,
      activeFileId: activeFileId,
      openFiles: activeFileId ? [activeFileId] : [] // Only show tab if there's an active file
    }
  ]);
  
  const [splitMode, setSplitMode] = useState<SplitMode>('vertical');
  const [syncScrolling, setSyncScrolling] = useState(false);
  const [focusedPaneId, setFocusedPaneId] = useState('main');
  const panelGroupRef = useRef<any>(null);

  // Persist layout to localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('split-editor-layout');
    if (savedLayout) {
      try {
        const { panes: savedPanes, splitMode: savedSplitMode } = JSON.parse(savedLayout);
        if (savedPanes?.length > 0) {
          setPanes(savedPanes);
          setSplitMode(savedSplitMode || 'vertical');
        }
      } catch (error) {
        console.error('Failed to restore editor layout:', error);
      }
    }
  }, []);

  // Save layout when it changes
  useEffect(() => {
    if (panes.length > 0) {
      localStorage.setItem('split-editor-layout', JSON.stringify({
        panes,
        splitMode
      }));
    }
  }, [panes, splitMode]);

  // Update panes when files change
  useEffect(() => {
    setPanes(prev => prev.map(pane => ({
      ...pane,
      files: files
    })));
  }, [files]);

  // Keyboard shortcuts - simplified
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === '\\') {
        e.preventDefault();
        handleSplitPane();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [panes]);

  const handleSplitPane = useCallback(() => {
    const newPaneId = `pane-${Date.now()}`;
    const focusedPane = panes.find(p => p.id === focusedPaneId);
    
    const newPane: EditorPaneData = {
      id: newPaneId,
      files: files,
      activeFileId: focusedPane?.activeFileId || activeFileId,
      openFiles: focusedPane?.activeFileId ? [focusedPane.activeFileId] : []
    };

    setPanes(prev => [...prev, newPane]);
  }, [panes, focusedPaneId, files, activeFileId]);

  const handleClosePane = useCallback((paneId: string) => {
    if (panes.length <= 1) return;
    
    setPanes(prev => prev.filter(p => p.id !== paneId));
    
    if (focusedPaneId === paneId) {
      const remainingPanes = panes.filter(p => p.id !== paneId);
      if (remainingPanes.length > 0) {
        setFocusedPaneId(remainingPanes[0].id);
      }
    }
  }, [panes, focusedPaneId]);

  const handlePaneFileSelect = useCallback((paneId: string, fileId: string) => {
    setPanes(prev => prev.map(pane => {
      if (pane.id === paneId) {
        // Add file to openFiles if not already there
        const openFiles = pane.openFiles.includes(fileId) 
          ? pane.openFiles 
          : [...pane.openFiles, fileId];
        
        return { 
          ...pane, 
          activeFileId: fileId,
          openFiles 
        };
      }
      return pane;
    }));
    onFileSelect(fileId);
  }, [onFileSelect]);

  const handleFileClose = useCallback((paneId: string, fileId: string) => {
    setPanes(prev => prev.map(pane => {
      if (pane.id === paneId) {
        const newOpenFiles = pane.openFiles.filter(id => id !== fileId);
        let newActiveFileId = pane.activeFileId;
        
        // If we're closing the active file, switch to another open file
        if (pane.activeFileId === fileId) {
          newActiveFileId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
        }
        
        return {
          ...pane,
          openFiles: newOpenFiles,
          activeFileId: newActiveFileId
        };
      }
      return pane;
    }));
  }, []);

  const handleMoveFileToPane = useCallback((fileId: string, targetPaneId: string, sourcePaneId?: string) => {
    // If moving from one pane to another, this would be for drag-and-drop
    // For now, we'll just set the file as active in the target pane
    handlePaneFileSelect(targetPaneId, fileId);
  }, [handlePaneFileSelect]);

  const toggleSplitMode = useCallback(() => {
    setSplitMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  }, []);

  const handleMergePanes = useCallback(() => {
    if (panes.length <= 1) return;
    
    const mainPane = panes[0];
    setPanes([{
      ...mainPane,
      files: files
    }]);
    setFocusedPaneId(mainPane.id);
  }, [panes, files]);

  const renderPanes = () => {
    if (panes.length === 1) {
      const pane = panes[0];
      return (
        <div className="h-full flex flex-col">
          <FileTabs
            paneId={pane.id}
            files={pane.files}
            activeFileId={pane.activeFileId}
            onFileSelect={(fileId) => handlePaneFileSelect(pane.id, fileId)}
            onFileClose={(fileId) => handleFileClose(pane.id, fileId)}
            openFiles={pane.openFiles}
            showSplitOption={true}
            onSplitWith={(fileId) => {
              handleSplitPane();
              setTimeout(() => {
                const newPanes = [...panes, {
                  id: `pane-${Date.now()}`,
                  files: files,
                  activeFileId: fileId,
                  openFiles: [fileId]
                }];
                setPanes(newPanes);
              }, 10);
            }}
          />
          <EditorPane
            pane={pane}
            onFileChange={onFileChange}
            onFocus={() => setFocusedPaneId(pane.id)}
            isFocused={focusedPaneId === pane.id}
            syncScrolling={false}
            onStateChange={(updates) => {
              setPanes(prev => prev.map(p => 
                p.id === pane.id ? { ...p, ...updates } : p
              ));
            }}
          />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <SplitControls
          paneCount={panes.length}
          splitMode={splitMode}
          onSplit={handleSplitPane}
          onToggleSplitMode={toggleSplitMode}
          onMergePanes={handleMergePanes}
        />
        <div className="flex-1">
          <PanelGroup
            ref={panelGroupRef}
            direction={splitMode}
            className="h-full"
          >
            {panes.map((pane, index) => (
              <>
                <Panel 
                  key={pane.id}
                  defaultSize={100 / panes.length}
                  minSize={25}
                  className="flex flex-col"
                >
                  <FileTabs
                    paneId={pane.id}
                    files={pane.files}
                    activeFileId={pane.activeFileId}
                    onFileSelect={(fileId) => handlePaneFileSelect(pane.id, fileId)}
                    onFileClose={(fileId) => handleFileClose(pane.id, fileId)}
                    onMoveToPane={handleMoveFileToPane}
                    availablePanes={panes}
                    onClose={panes.length > 1 ? () => handleClosePane(pane.id) : undefined}
                    openFiles={pane.openFiles}
                  />
                  <EditorPane
                    pane={pane}
                    onFileChange={onFileChange}
                    onFocus={() => setFocusedPaneId(pane.id)}
                    isFocused={focusedPaneId === pane.id}
                    syncScrolling={false}
                    onStateChange={(updates) => {
                      setPanes(prev => prev.map(p => 
                        p.id === pane.id ? { ...p, ...updates } : p
                      ));
                    }}
                  />
                </Panel>
                {index < panes.length - 1 && (
                  <PanelResizeHandle className={cn(
                    "bg-border hover:bg-accent transition-colors group",
                    splitMode === 'vertical' ? "w-1" : "h-1",
                    "flex items-center justify-center"
                  )}>
                    <div className={cn(
                      "bg-muted-foreground/50 group-hover:bg-foreground/50 transition-colors",
                      splitMode === 'vertical' ? "w-0.5 h-6" : "w-6 h-0.5"
                    )} />
                  </PanelResizeHandle>
                )}
              </>
            ))}
          </PanelGroup>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("h-full", className)}>
      {renderPanes()}
    </div>
  );
}
