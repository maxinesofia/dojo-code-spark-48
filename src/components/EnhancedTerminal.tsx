import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  X, 
  Terminal as TerminalIcon, 
  Copy, 
  Search,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface TerminalTab {
  id: string;
  title: string;
  terminal: XTerminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  connected: boolean;
  lastActivity: Date;
}

interface EnhancedTerminalProps {
  projectId?: string;
  userId?: string;
  className?: string;
  onClose?: () => void;
}

export function EnhancedTerminal({ projectId, userId, className, onClose }: EnhancedTerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const wsConnections = useRef<Map<string, WebSocket>>(new Map());

  // Create new terminal tab
  const createNewTab = useCallback(() => {
    const tabId = `terminal-${Date.now()}`;
    const terminal = new XTerminal({
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#ffffff40',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6'
      },
      allowTransparency: true,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(webLinksAddon);

    const newTab: TerminalTab = {
      id: tabId,
      title: `Terminal ${tabs.length + 1}`,
      terminal,
      fitAddon,
      searchAddon,
      connected: false,
      lastActivity: new Date()
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(tabId);

    return newTab;
  }, [tabs.length]);

  // Connect terminal to WebSocket
  const connectTerminal = useCallback((tab: TerminalTab) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal`;
    
    const ws = new WebSocket(wsUrl);
    wsConnections.current.set(tab.id, ws);

    ws.onopen = () => {
      console.log(`Terminal ${tab.id} connected`);
      setTabs(prev => prev.map(t => 
        t.id === tab.id ? { ...t, connected: true } : t
      ));

      // Start terminal session
      ws.send(JSON.stringify({
        type: 'start_terminal',
        data: { projectId, userId }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'session_init':
          tab.terminal.writeln('\x1b[32mTerminal session initialized\x1b[0m');
          break;
        case 'terminal_started':
          tab.terminal.writeln('\x1b[32m✓ Terminal ready\x1b[0m');
          break;
        case 'output':
          tab.terminal.write(message.data);
          setTabs(prev => prev.map(t => 
            t.id === tab.id ? { ...t, lastActivity: new Date() } : t
          ));
          break;
        case 'error':
          tab.terminal.writeln(`\x1b[31mError: ${message.data}\x1b[0m`);
          break;
        case 'process_exit':
          tab.terminal.writeln(`\x1b[33mProcess exited with code ${message.code}\x1b[0m`);
          break;
      }
    };

    ws.onclose = () => {
      console.log(`Terminal ${tab.id} disconnected`);
      setTabs(prev => prev.map(t => 
        t.id === tab.id ? { ...t, connected: false } : t
      ));
    };

    ws.onerror = (error) => {
      console.error(`Terminal ${tab.id} error:`, error);
      tab.terminal.writeln('\x1b[31mConnection error\x1b[0m');
    };

    // Handle terminal input
    tab.terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Handle special key combinations
        if (data === '\x03') { // Ctrl+C
          ws.send(JSON.stringify({
            type: 'command',
            data: { type: 'signal', signal: 'SIGINT' }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'command',
            data: { type: 'input', data }
          }));
        }
      }
    });

    // Handle terminal resize
    tab.terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          data: { cols, rows }
        }));
      }
    });

  }, [projectId, userId]);

  // Close terminal tab
  const closeTab = useCallback((tabId: string) => {
    const ws = wsConnections.current.get(tabId);
    if (ws) {
      ws.send(JSON.stringify({ type: 'stop' }));
      ws.close();
      wsConnections.current.delete(tabId);
    }

    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      tab.terminal.dispose();
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (newTabs.length === 0 && onClose) {
        onClose();
      } else if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[0].id);
      }
      return newTabs;
    });
  }, [tabs, activeTab, onClose]);

  // Copy terminal content to clipboard
  const copyToClipboard = useCallback(() => {
    const activeTerminal = tabs.find(t => t.id === activeTab)?.terminal;
    if (activeTerminal) {
      const selection = activeTerminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  }, [tabs, activeTab]);

  // Search in terminal
  const searchInTerminal = useCallback((term: string) => {
    const activeTerminal = tabs.find(t => t.id === activeTab);
    if (activeTerminal && term) {
      activeTerminal.searchAddon.findNext(term);
    }
  }, [tabs, activeTab]);

  // Initialize first tab
  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [createNewTab, tabs.length]);

  // Setup terminal when tab becomes active
  useEffect(() => {
    const activeTerminal = tabs.find(t => t.id === activeTab);
    if (!activeTerminal) return;

    const terminalElement = terminalRefs.current.get(activeTab);
    if (!terminalElement) return;

    // Open terminal in DOM
    activeTerminal.terminal.open(terminalElement);
    activeTerminal.fitAddon.fit();

    // Connect to WebSocket if not already connected
    if (!activeTerminal.connected) {
      connectTerminal(activeTerminal);
    }

    // Handle window resize
    const handleResize = () => {
      activeTerminal.fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, tabs, connectTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsConnections.current.forEach(ws => {
        ws.send(JSON.stringify({ type: 'stop' }));
        ws.close();
      });
      tabs.forEach(tab => tab.terminal.dispose());
    };
  }, [tabs]);

  return (
    <div className={`flex flex-col h-full bg-background border border-border rounded-lg ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Git Bash Terminal</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyToClipboard}
            title="Copy Selection"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSearchVisible(!searchVisible)}
            title="Search"
          >
            <Search className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
              title="Close Terminal"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {searchVisible && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
          <Input
            placeholder="Search terminal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchInTerminal(searchTerm);
              }
            }}
            className="flex-1 h-8"
          />
          <Button
            size="sm"
            onClick={() => searchInTerminal(searchTerm)}
            disabled={!searchTerm}
          >
            Find
          </Button>
        </div>
      )}

      {/* Terminal Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
          <TabsList className="h-8 p-0 bg-transparent">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex items-center">
                <TabsTrigger 
                  value={tab.id} 
                  className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      tab.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {tab.title}
                  </div>
                </TabsTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={() => closeTab(tab.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </TabsList>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={createNewTab}
            title="New Terminal"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Terminal Content */}
        {tabs.map((tab) => (
          <TabsContent 
            key={tab.id} 
            value={tab.id} 
            className="flex-1 m-0 p-2"
            style={{ height: isMaximized ? 'calc(100vh - 200px)' : '400px' }}
          >
            <div
              ref={(el) => {
                if (el) terminalRefs.current.set(tab.id, el);
              }}
              className="w-full h-full bg-[#1a1a1a] rounded"
              style={{ minHeight: '100%' }}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Terminals: {tabs.length}</span>
          <span>Connected: {tabs.filter(t => t.connected).length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Git Bash Ready
          </Badge>
        </div>
      </div>
    </div>
  );
}