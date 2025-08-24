import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Terminal } from './Terminal';

// Simple terminal descriptor
interface ManagedTerminal {
  id: string;
  title: string;
  createdAt: number;
  active: boolean;
}

interface TerminalManagerContextShape {
  terminals: ManagedTerminal[];
  activeId: string | null;
  createTerminal: () => void;
  closeTerminal: (id: string) => void;
  setActive: (id: string) => void;
  renameTerminal: (id: string, title: string) => void;
}

const TerminalManagerContext = createContext<TerminalManagerContextShape | undefined>(undefined);

export const useTerminalManager = () => {
  const ctx = useContext(TerminalManagerContext);
  if (!ctx) throw new Error('useTerminalManager must be used within <TerminalManagerProvider/>');
  return ctx;
};

const genId = () => Math.random().toString(36).slice(2, 10);

export const TerminalManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [terminals, setTerminals] = useState<ManagedTerminal[]>(() => [{ id: genId(), title: 'Terminal', createdAt: Date.now(), active: true }]);
  const activeId = terminals.find(t => t.active)?.id || null;

  const createTerminal = useCallback(() => {
    setTerminals(list => {
      const nextIndex = list.length + 1;
      const title = nextIndex === 1 ? 'Terminal' : `Terminal ${nextIndex}`;
      return list.map(t => ({ ...t, active: false })).concat({ id: genId(), title, createdAt: Date.now(), active: true });
    });
  }, []);

  const closeTerminal = useCallback((id: string) => {
    setTerminals(list => {
      const idx = list.findIndex(t => t.id === id);
      if (idx === -1) return list;
      const newList = list.filter(t => t.id !== id);
      if (!newList.some(t => t.active) && newList.length) {
        const next = newList[Math.max(0, idx - 1)];
        next.active = true;
      }
      return [...newList];
    });
  }, []);

  const setActive = useCallback((id: string) => setTerminals(list => list.map(t => ({ ...t, active: t.id === id }))), []);

  const renameTerminal = useCallback((id: string, title: string) => setTerminals(list => list.map(t => t.id === id ? { ...t, title } : t)), []);

  const value = useMemo(() => ({ terminals, activeId, createTerminal, closeTerminal, setActive, renameTerminal }), [terminals, activeId, createTerminal, closeTerminal, setActive, renameTerminal]);
  return <TerminalManagerContext.Provider value={value}>{children}</TerminalManagerContext.Provider>;
};

// Container UI similar-ish to VS Code terminal tabs
export const MultiTerminalPanel: React.FC = () => {
  const { terminals, activeId, createTerminal, closeTerminal, setActive, renameTerminal } = useTerminalManager();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  return (
    <div className="flex flex-col h-full w-full bg-background/80 border rounded">
      <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/40">
        {terminals.map(t => (
          <div key={t.id} className={`group flex items-center gap-1 px-2 py-0.5 text-sm rounded cursor-pointer select-none ${t.active ? 'bg-background border border-border' : 'hover:bg-accent/30'}`} onClick={() => setActive(t.id)} onDoubleClick={() => setRenamingId(t.id)}>
            {renamingId === t.id ? (
              <input ref={inputRef} className="bg-transparent outline-none w-24 text-xs" defaultValue={t.title} onBlur={(e) => { renameTerminal(t.id, e.target.value || t.title); setRenamingId(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } else if (e.key === 'Escape') { setRenamingId(null); } }} />
            ) : (
              <span className="truncate max-w-[8rem]">{t.title}</span>
            )}
            <button className="opacity-0 group-hover:opacity-100 text-xs px-1" onClick={(e) => { e.stopPropagation(); closeTerminal(t.id); }}>×</button>
          </div>
        ))}
        <button className="ml-1 px-2 py-0.5 text-sm border rounded hover:bg-accent/30" onClick={createTerminal}>+</button>
      </div>
      <div className="flex-1 relative">
        {terminals.map(t => (
          <div key={t.id} className={`absolute inset-0 ${t.active ? 'block' : 'hidden'}`}>
            {/* Provide minimal required props; consumers can enhance via context later */}
            <Terminal key={t.id} files={[]} showHeader={false} />
          </div>
        ))}
        {!terminals.length && (
          <div className="p-4 text-sm text-muted-foreground">No terminals. Press + to create one.</div>
        )}
      </div>
    </div>
  );
};

export default MultiTerminalPanel;
