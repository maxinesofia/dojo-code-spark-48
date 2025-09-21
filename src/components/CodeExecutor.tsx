import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Square, RefreshCw, Server, Globe } from 'lucide-react';
import { FileNode } from '@/types/FileTypes';
import { CodeExecutionService, ExecutionResult } from '@/services/CodeExecutionService';
import { LanguageSelector } from './LanguageSelector';

interface CodeExecutorProps {
  files: FileNode[];
  language?: string;
}

export function CodeExecutor({ files, language: initialLanguage = 'javascript' }: CodeExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const executionService = new CodeExecutionService();

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      python: 'bg-blue-500',
      javascript: 'bg-yellow-500',
      typescript: 'bg-blue-600',
      java: 'bg-red-500',
      cpp: 'bg-purple-500',
      c: 'bg-gray-500',
      go: 'bg-cyan-500',
      rust: 'bg-orange-500',
      bash: 'bg-green-500',
      shell: 'bg-green-600',
      react: 'bg-cyan-500',
      nodejs: 'bg-green-600',
    };
    return colors[lang.toLowerCase()] || 'bg-gray-400';
  };

  const isServerSideLanguage = (lang: string) => {
    // Only actual server-side languages that need Firecracker VMs
    const serverLanguages = ['nodejs', 'node', 'python', 'py', 'c', 'cpp', 'c++', 'bash', 'shell', 'java', 'go', 'rust'];
    return serverLanguages.includes(lang.toLowerCase());
  };

  const handleExecute = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    try {
      const executionResult = await executionService.executeCode(files, selectedLanguage);
      setResult(executionResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <LanguageSelector
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        files={files}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className={`${getLanguageColor(selectedLanguage)} text-white`}>
            {selectedLanguage.toUpperCase()}
          </Badge>
          <span className="text-sm text-gray-600">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          {isServerSideLanguage(selectedLanguage) ? (
            <Badge variant="secondary" className="text-xs">
              <Server className="w-3 h-3 mr-1" />
              Firecracker VM
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Globe className="w-3 h-3 mr-1" />
              Browser
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleExecute}
            disabled={isExecuting || files.length === 0}
            size="sm"
            className="flex items-center space-x-1"
          >
            {isExecuting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isExecuting ? 'Running...' : 'Run'}</span>
          </Button>
          {result && (
            <Button onClick={handleClear} variant="outline" size="sm">
              <Square className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Execution Environment Info */}
      {isServerSideLanguage(selectedLanguage) && (
        <Alert>
          <Server className="h-4 w-4" />
          <AlertDescription>
            This code will execute in a secure Firecracker microVM on the server.
            {selectedLanguage === 'nodejs' && ' Node.js application will be executed.'}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Execution Result</span>
              {result.executionTime && (
                <Badge variant="secondary">
                  {result.executionTime}ms
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-3">
                {/* HTML output for client-side code */}
                {result.html && (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <h4 className="text-xs font-medium mb-2 text-gray-700">Preview</h4>
                    <iframe
                      srcDoc={result.html}
                      className="w-full h-64 border rounded"
                      title="Preview"
                    />
                  </div>
                )}
                
                {/* Text output for server-side code */}
                {result.output && (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <h4 className="text-xs font-medium mb-2 text-gray-700">Output</h4>
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {result.output}
                    </pre>
                  </div>
                )}

                {/* Logs */}
                {result.logs && result.logs.length > 0 && (
                  <div className="border rounded-md p-3 bg-blue-50">
                    <h4 className="text-xs font-medium mb-2 text-blue-700">Logs</h4>
                    <pre className="text-sm whitespace-pre-wrap font-mono text-blue-900">
                      {result.logs.join('\n')}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-md p-3 bg-red-50">
                <h4 className="text-xs font-medium mb-2 text-red-700">Error</h4>
                <pre className="text-sm whitespace-pre-wrap font-mono text-red-900">
                  {result.error}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
