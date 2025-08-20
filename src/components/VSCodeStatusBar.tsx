import { useState, useEffect } from 'react';
import { GitBranch, AlertCircle, CheckCircle, Zap, Terminal, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileNode } from '../types/FileTypes';

interface VSCodeStatusBarProps {
  selectedFile: FileNode | null;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
}

export function VSCodeStatusBar({ selectedFile, isTerminalOpen, onToggleTerminal }: VSCodeStatusBarProps) {
  const [time, setTime] = useState(new Date());
  const [vmStatus, setVmStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lineCol, setLineCol] = useState({ line: 1, column: 1 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Simulate VM connection status
    const timeout = setTimeout(() => {
      setVmStatus('connected');
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  const getFileLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'JavaScript';
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'json':
        return 'JSON';
      case 'md':
        return 'Markdown';
      case 'py':
        return 'Python';
      default:
        return 'Plain Text';
    }
  };

  const getStatusIcon = () => {
    switch (vmStatus) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'connecting':
        return <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (vmStatus) {
      case 'connected':
        return 'Firecracker VM Connected';
      case 'disconnected':
        return 'Firecracker VM Disconnected';
      case 'connecting':
        return 'Connecting to Firecracker VM...';
    }
  };

  return (
    <div className="h-6 bg-status-bar border-t border-border flex items-center justify-between px-2 text-xs">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Git branch */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-auto px-1 text-xs hover:bg-accent/50"
        >
          <GitBranch className="w-3 h-3 mr-1" />
          <span>main</span>
        </Button>

        {/* VM Status */}
        <div className="flex items-center gap-1 px-1">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>

        {/* Errors/Warnings */}
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span>0</span>
          <AlertCircle className="w-3 h-3 text-yellow-500" />
          <span>0</span>
        </div>
      </div>

      {/* Center - File info */}
      <div className="flex items-center gap-3">
        {selectedFile && (
          <>
            <span>Ln {lineCol.line}, Col {lineCol.column}</span>
            <span>{getFileLanguage(selectedFile.name)}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Terminal toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-auto px-1 text-xs hover:bg-accent/50"
          onClick={onToggleTerminal}
        >
          <Terminal className="w-3 h-3 mr-1" />
          <span>{isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}</span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-accent/50"
        >
          <Settings className="w-3 h-3" />
        </Button>

        {/* Time */}
        <span className="text-muted-foreground">
          {time.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}