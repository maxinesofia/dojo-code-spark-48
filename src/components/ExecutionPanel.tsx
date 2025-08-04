import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Loader2, Terminal, Clock, Cpu, MemoryStick } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface ExecutionPanelProps {
  files: Record<string, string>;
  selectedFile: string;
}

interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
  vmId?: string;
}

interface VMStatus {
  id: string;
  status: 'running' | 'stopped' | 'not_found';
  uptime?: number;
  pid?: string;
}

const GCP_VM_IP = '35.231.126.19'; // Your GCP VM IP
const API_BASE_URL = `http://${GCP_VM_IP}:3001/api`;

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ files, selectedFile }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [vmStatus, setVmStatus] = useState<VMStatus | null>(null);
  const [vmId, setVmId] = useState<string | null>(null);
  const { toast } = useToast();

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'py': return 'python';
      case 'html': return 'html';
      case 'tsx':
      case 'jsx': return 'react';
      default: return 'javascript';
    }
  };

  const executeCode = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      const language = getLanguageFromFile(selectedFile);
      
      const response = await fetch(`${API_BASE_URL}/execution/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          language,
          options: {
            timeout: 30000,
            memory: 256
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setExecutionResult(result);
      setVmId(result.vmId);
      
      // Fetch VM status
      if (result.vmId) {
        fetchVMStatus(result.vmId);
      }
      
      toast({
        title: "Code executed successfully",
        description: `Execution completed in ${result.executionTime}ms`,
      });
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Failed to connect to execution server",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const stopExecution = async () => {
    if (!vmId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/execution/${vmId}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop execution');
      }
      
      setVmId(null);
      setExecutionResult(null);
      setVmStatus(null);
      
      toast({
        title: "Execution stopped",
        description: "VM has been terminated",
      });
    } catch (error) {
      console.error('Stop execution error:', error);
      toast({
        title: "Failed to stop execution",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const fetchVMStatus = async (vmId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/execution/${vmId}/status`);
      if (response.ok) {
        const status = await response.json();
        setVmStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch VM status:', error);
    }
  };

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Poll VM status every 5 seconds when VM is running
  useEffect(() => {
    if (!vmId) return;
    
    const interval = setInterval(() => {
      fetchVMStatus(vmId);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [vmId]);

  return (
    <div className="flex-1 bg-background border-l border-border flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Firecracker Execution</span>
          {vmStatus && (
            <Badge variant={vmStatus.status === 'running' ? 'default' : 'secondary'}>
              {vmStatus.status}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {vmId && vmStatus?.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopExecution}
              className="h-7"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={executeCode}
            disabled={isExecuting}
            className="h-7"
          >
            {isExecuting ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-1" />
            )}
            {isExecuting ? 'Executing...' : 'Run'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* VM Status Card */}
        {vmStatus && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                VM Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={vmStatus.status === 'running' ? 'default' : 'secondary'} className="text-xs">
                    {vmStatus.status}
                  </Badge>
                </div>
                {vmStatus.uptime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{formatUptime(vmStatus.uptime)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MemoryStick className="w-3 h-3 text-muted-foreground" />
                  <span>256MB RAM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-muted-foreground" />
                  <span>1 vCPU</span>
                </div>
              </div>
              {vmId && (
                <div className="text-xs text-muted-foreground">
                  VM ID: <code className="bg-muted px-1 rounded">{vmId.substring(0, 8)}...</code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Execution Output */}
        {executionResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Output</span>
                <Badge variant="outline" className="text-xs">
                  {executionResult.executionTime}ms
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executionResult.error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <div className="text-sm font-medium text-destructive mb-1">Error:</div>
                  <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                    {executionResult.error}
                  </pre>
                </div>
              ) : (
                <div className="bg-muted rounded p-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {executionResult.output || 'No output'}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!executionResult && !isExecuting && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Firecracker VM Execution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Click "Run" to execute your code in a secure Firecracker microVM.</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Hardware-level isolation for security</li>
                <li>Fast startup (~125ms)</li>
                <li>Automatic cleanup after execution</li>
                <li>Support for JavaScript, Python, HTML, and React</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};