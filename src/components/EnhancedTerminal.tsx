import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
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
  connected: boolean;
  lastActivity: Date;
  messageQueue: any[];
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
  const [shellIntegrationQuality, setShellIntegrationQuality] = useState<'none' | 'basic' | 'rich'>('none');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentWorkingDir, setCurrentWorkingDir] = useState('~');
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const wsConnections = useRef<Map<string, WebSocket>>(new Map());

  // Helper function to safely send WebSocket messages
  const safeSend = useCallback((ws: WebSocket, message: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    } else if (ws.readyState === WebSocket.CONNECTING) {
      // Queue message for when connection opens
      return false;
    }
    return false;
  }, []);

  // VS Code-inspired terminal settings
  const terminalConfig = {
    fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    letterSpacing: 0.5,
    cursorStyle: 'block' as const,
    cursorBlink: true,
    minimumContrastRatio: 4.5,
    drawBoldTextInBrightColors: true
  };

  // Create new terminal tab with VS Code-style configuration
  const createNewTab = useCallback(() => {
    const tabId = `terminal-${Date.now()}`;
    const terminal = new XTerminal({
      fontFamily: terminalConfig.fontFamily,
      fontSize: terminalConfig.fontSize,
      lineHeight: terminalConfig.lineHeight,
      letterSpacing: terminalConfig.letterSpacing,
      cursorBlink: terminalConfig.cursorBlink,
      cursorStyle: terminalConfig.cursorStyle,
      minimumContrastRatio: terminalConfig.minimumContrastRatio,
      drawBoldTextInBrightColors: terminalConfig.drawBoldTextInBrightColors,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#3b82f640',
        // VS Code ANSI colors
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      convertEol: true,
      scrollback: 10000,
      tabStopWidth: 4,
      windowsMode: false
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    const newTab: TerminalTab = {
      id: tabId,
      title: `Terminal ${tabs.length + 1}`,
      terminal,
      fitAddon,
      connected: false,
      lastActivity: new Date(),
      messageQueue: []
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(tabId);

    return newTab;
  }, [tabs.length, terminalConfig]);

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

      // Process queued messages
      const currentTab = tabs.find(t => t.id === tab.id);
      if (currentTab && currentTab.messageQueue.length > 0) {
        currentTab.messageQueue.forEach(message => {
          safeSend(ws, message);
        });
        currentTab.messageQueue = [];
      }

      // Start terminal session
      safeSend(ws, {
        type: 'start_terminal',
        data: { projectId, userId }
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'session_init':
          tab.terminal.writeln('\x1b[32m✓ Terminal session initialized\x1b[0m');
          tab.terminal.writeln('\x1b[36m🔧 Shell integration: Loading...\x1b[0m');
          setShellIntegrationQuality('basic');
          break;
        case 'terminal_started':
          tab.terminal.writeln('\x1b[32m✓ Terminal ready - Shell integration active\x1b[0m');
          tab.terminal.writeln('\x1b[33m📁 Working directory: ~/workspace\x1b[0m');
          setShellIntegrationQuality('rich');
          setCurrentWorkingDir('~/workspace');
          break;
        case 'output':
          // Parse output for working directory changes and commands
          const output = message.data;
          tab.terminal.write(output);
          
          // Track working directory changes (simplified)
          if (output.includes('$ cd ') || output.includes('~/')) {
            const match = output.match(/~[^\s]*/);
            if (match) {
              setCurrentWorkingDir(match[0]);
            }
          }
          
          // Track commands for history
          if (output.includes('$ ')) {
            const cmdMatch = output.match(/\$ (.+)/);
            if (cmdMatch) {
              setCommandHistory(prev => [...prev, cmdMatch[1]].slice(-100)); // Keep last 100
            }
          }
          
          setTabs(prev => prev.map(t => 
            t.id === tab.id ? { ...t, lastActivity: new Date() } : t
          ));
          break;
        case 'error':
          tab.terminal.writeln(`\x1b[31m❌ Error: ${message.data}\x1b[0m`);
          break;
        case 'process_exit':
          const exitCode = message.code;
          const decoration = exitCode === 0 ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m';
          tab.terminal.writeln(`${decoration} Process exited with code ${exitCode}`);
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
      const ws = wsConnections.current.get(tab.id);
      if (!ws) return;

      const message = {
        type: 'command',
        data: data === '\x03' ? { type: 'signal', signal: 'SIGINT' } : { type: 'input', data }
      };

      if (!safeSend(ws, message)) {
        // Queue message if connection isn't ready
        const currentTab = tabs.find(t => t.id === tab.id);
        if (currentTab) {
          currentTab.messageQueue.push(message);
        }
      }
    });

    // Handle terminal resize
    tab.terminal.onResize(({ cols, rows }) => {
      const ws = wsConnections.current.get(tab.id);
      if (!ws) return;
      
      safeSend(ws, {
        type: 'resize',
        data: { cols, rows }
      });
    });

  }, [projectId, userId]);

  // Close terminal tab
  const closeTab = useCallback((tabId: string) => {
    const ws = wsConnections.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      safeSend(ws, { type: 'stop' });
      ws.close();
    }
    wsConnections.current.delete(tabId);

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

  // Copy terminal content to clipboard with VS Code style
  const copyToClipboard = useCallback(async () => {
    const activeTerminal = tabs.find(t => t.id === activeTab)?.terminal;
    if (activeTerminal) {
      const selection = activeTerminal.getSelection();
      if (selection) {
        try {
          await navigator.clipboard.writeText(selection);
          // Show brief feedback
          activeTerminal.writeln('\x1b[90m[Copied to clipboard]\x1b[0m');
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      }
    }
  }, [tabs, activeTab]);

  // Run recent command (VS Code Ctrl+Alt+R functionality)
  const showRecentCommands = useCallback(() => {
    const activeTerminal = tabs.find(t => t.id === activeTab)?.terminal;
    if (activeTerminal && commandHistory.length > 0) {
      activeTerminal.writeln('\x1b[36m📋 Recent commands:\x1b[0m');
      commandHistory.slice(-10).forEach((cmd, index) => {
        activeTerminal.writeln(`\x1b[90m${index + 1}.\x1b[0m ${cmd}`);
      });
      activeTerminal.writeln('\x1b[90m[Type the command number or press Ctrl+R]\x1b[0m');
    }
  }, [tabs, activeTab, commandHistory]);

  // Search in terminal - simplified without SearchAddon
  const searchInTerminal = useCallback((term: string) => {
    const activeTerminal = tabs.find(t => t.id === activeTab);
    if (activeTerminal && term) {
      // Simple implementation - just display the search term
      activeTerminal.terminal.writeln(`\x1b[33m🔍 Searching for: "${term}"\x1b[0m`);
      // Note: Real search functionality would require SearchAddon
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

  // Keyboard shortcuts (VS Code style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+C - Copy
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyToClipboard();
      }
      // Ctrl+Alt+R - Recent commands
      else if (e.ctrlKey && e.altKey && e.key === 'r') {
        e.preventDefault();
        showRecentCommands();
      }
      // Ctrl+Shift+` - New terminal
      else if (e.ctrlKey && e.shiftKey && e.key === '`') {
        e.preventDefault();
        createNewTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyToClipboard, showRecentCommands, createNewTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsConnections.current.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          safeSend(ws, { type: 'stop' });
          ws.close();
        }
      });
      tabs.forEach(tab => tab.terminal.dispose());
    };
  }, [tabs, safeSend]);

  // Get shell integration status indicator
  const getShellIntegrationBadge = () => {
    const colors = {
      none: 'bg-red-500',
      basic: 'bg-yellow-500', 
      rich: 'bg-green-500'
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[shellIntegrationQuality]}/20 border-${colors[shellIntegrationQuality]}/50`}>
        Shell: {shellIntegrationQuality}
      </Badge>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-background border border-border rounded-lg ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">VS Code Terminal</span>
          <Badge variant="outline" className="text-xs">
            {currentWorkingDir}
          </Badge>
          {getShellIntegrationBadge()}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyToClipboard}
            title="Copy Selection (Ctrl+Shift+C)"
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

      {/* Status Bar - VS Code style */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Terminals: {tabs.length}</span>
          <span>Connected: {tabs.filter(t => t.connected).length}</span>
          <span>Commands: {commandHistory.length}</span>
          <span className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              shellIntegrationQuality === 'rich' ? 'bg-green-500' : 
              shellIntegrationQuality === 'basic' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            Integration: {shellIntegrationQuality}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Ctrl+Shift+C: Copy | Ctrl+Alt+R: Recent | Ctrl+Shift+`: New</span>
          <Badge variant="outline" className="text-xs">
            VS Code Terminal
          </Badge>
        </div>
      </div>
    </div>
  );
}