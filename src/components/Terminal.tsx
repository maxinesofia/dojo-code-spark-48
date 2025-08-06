import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebTerminalService } from '../services/WebTerminalService';
import { FileNode } from '../types/FileTypes';
import 'xterm/css/xterm.css';

interface TerminalProps {
  files: FileNode[];
  onCommandExecuted?: (command: string, output: string) => void;
  className?: string;
}

export function Terminal({ files, onCommandExecuted, className = '' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalServiceRef = useRef<WebTerminalService | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
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
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      cols: 80,
      rows: 24
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Initialize terminal service
    const terminalService = new WebTerminalService();
    terminalService.setupVirtualFS(files);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminalServiceRef.current = terminalService;

    // Print welcome message
    terminal.writeln('\x1b[32mWelcome to Tutorials Dojo Terminal\x1b[0m');
    terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m');
    terminal.writeln('');
    
    const prompt = () => {
      const cwd = terminalService.getCurrentDirectory();
      const user = terminalService.getEnvironment('USER') || 'developer';
      terminal.write(`\x1b[32m${user}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);
    };

    prompt();

    // Handle user input
    let currentInput = '';
    let commandHistory: string[] = [];
    let historyIdx = -1;

    terminal.onData(async (data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        terminal.writeln('');
        
        if (currentInput.trim()) {
          commandHistory.unshift(currentInput);
          if (commandHistory.length > 100) {
            commandHistory = commandHistory.slice(0, 100);
          }
          
          try {
            const output = await terminalService.executeCommand(currentInput);
            if (output) {
              terminal.writeln(output);
            }
            onCommandExecuted?.(currentInput, output);
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
          }
        }
        
        currentInput = '';
        historyIdx = -1;
        prompt();
      } else if (code === 127) { // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (code === 27) { // Escape sequences (arrows)
        // Handle arrow keys for command history
        terminal.onData((escData) => {
          if (escData === '[A') { // Up arrow
            if (historyIdx < commandHistory.length - 1) {
              historyIdx++;
              // Clear current line
              terminal.write('\r\x1b[K');
              const cwd = terminalService.getCurrentDirectory();
              const user = terminalService.getEnvironment('USER') || 'developer';
              terminal.write(`\x1b[32m${user}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);
              
              currentInput = commandHistory[historyIdx];
              terminal.write(currentInput);
            }
          } else if (escData === '[B') { // Down arrow
            if (historyIdx > 0) {
              historyIdx--;
              // Clear current line
              terminal.write('\r\x1b[K');
              const cwd = terminalService.getCurrentDirectory();
              const user = terminalService.getEnvironment('USER') || 'developer';
              terminal.write(`\x1b[32m${user}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);
              
              currentInput = commandHistory[historyIdx];
              terminal.write(currentInput);
            } else if (historyIdx === 0) {
              historyIdx = -1;
              // Clear current line
              terminal.write('\r\x1b[K');
              const cwd = terminalService.getCurrentDirectory();
              const user = terminalService.getEnvironment('USER') || 'developer';
              terminal.write(`\x1b[32m${user}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);
              
              currentInput = '';
            }
          }
        });
      } else if (code === 9) { // Tab (auto-completion)
        const suggestions = terminalService.getAutoComplete(currentInput);
        if (suggestions.length === 1) {
          const completion = suggestions[0].substring(currentInput.length);
          currentInput += completion;
          terminal.write(completion);
        } else if (suggestions.length > 1) {
          terminal.writeln('');
          terminal.writeln(suggestions.join('  '));
          prompt();
          terminal.write(currentInput);
        }
      } else if (code === 3) { // Ctrl+C
        terminal.writeln('^C');
        currentInput = '';
        historyIdx = -1;
        prompt();
      } else if (code === 12) { // Ctrl+L
        terminal.clear();
        prompt();
      } else if (code >= 32 && code <= 126) { // Printable characters
        currentInput += data;
        terminal.write(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [files, onCommandExecuted]);

  // Update file system when files change
  useEffect(() => {
    if (terminalServiceRef.current) {
      terminalServiceRef.current.setupVirtualFS(files);
    }
  }, [files]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleResize = () => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  };

  return (
    <div className={`relative h-full bg-[#1e1e1e] ${className}`}>
      <div 
        ref={terminalRef} 
        className="h-full p-2 overflow-hidden"
        style={{ 
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace' 
        }}
      />
    </div>
  );
}