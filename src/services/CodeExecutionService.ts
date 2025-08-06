import { FileNode } from '@/components/FileExplorer';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  logs: string[];
}

export interface ExecutionContext {
  files: FileNode[];
  entryPoint: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  imports: Map<string, string>;
}

export class CodeExecutionService {
  private timeout = 10000; // 10 seconds
  private iframe: HTMLIFrameElement | null = null;
  private executionId = 0;

  async executeCode(context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [];
    
    try {
      // Create fresh iframe for each execution
      this.iframe = this.createSandboxedIframe();
      
      // Set up error handling and logging
      const doc = this.iframe.contentDocument!;
      const result = await this.runInSandbox(context, doc, logs);
      
      return { success: true, ...result, logs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        logs
      };
    }
  }

  private createSandboxedIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-same-origin');
    document.body.appendChild(iframe);
    return iframe;
  }

  private async runInSandbox(
    context: ExecutionContext, 
    doc: Document, 
    logs: string[]
  ): Promise<{ output?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      const executionId = ++this.executionId;
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout (10 seconds)'));
      }, this.timeout);

      try {
        // Prepare the HTML structure
        const htmlFile = context.files.find(f => f.name.endsWith('.html'));
        const cssFiles = context.files.filter(f => f.name.endsWith('.css'));
        const jsFiles = context.files.filter(f => 
          f.name.endsWith('.js') || f.name.endsWith('.ts') || 
          f.name.endsWith('.jsx') || f.name.endsWith('.tsx')
        );

        // Build HTML content
        let htmlContent = htmlFile?.content || `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Execution</title>
          </head>
          <body>
            <div id="root"></div>
          </body>
          </html>
        `;

        // Inject CSS
        const cssContent = cssFiles.map(f => f.content).join('\n');
        if (cssContent) {
          htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
        }

        // Process JavaScript/TypeScript files
        let processedJs = '';
        for (const file of jsFiles) {
          const compiled = this.compileCode(file.content || '', file.name);
          processedJs += compiled + '\n';
        }

        // Inject the execution script
        const executionScript = `
          <script>
            window.executionLogs = [];
            window.executionId = ${executionId};
            
            // Override console methods to capture logs
            const originalConsole = { ...console };
            console.log = (...args) => {
              window.executionLogs.push('LOG: ' + args.join(' '));
              originalConsole.log(...args);
            };
            console.error = (...args) => {
              window.executionLogs.push('ERROR: ' + args.join(' '));
              originalConsole.error(...args);
            };
            console.warn = (...args) => {
              window.executionLogs.push('WARN: ' + args.join(' '));
              originalConsole.warn(...args);
            };

            // Error boundary
            window.addEventListener('error', (e) => {
              window.executionLogs.push('RUNTIME ERROR: ' + e.message);
              window.parent.postMessage({
                type: 'execution-error',
                executionId: ${executionId},
                error: e.message,
                logs: window.executionLogs
              }, '*');
            });

            // Execute user code
            try {
              ${processedJs}
              
              // Send success message
              setTimeout(() => {
                window.parent.postMessage({
                  type: 'execution-complete',
                  executionId: ${executionId},
                  logs: window.executionLogs
                }, '*');
              }, 100);
            } catch (error) {
              window.parent.postMessage({
                type: 'execution-error',
                executionId: ${executionId},
                error: error.message,
                logs: window.executionLogs
              }, '*');
            }
          </script>
        `;

        htmlContent = htmlContent.replace('</body>', executionScript + '</body>');

        // Set up message listener
        const messageHandler = (event: MessageEvent) => {
          if (event.data.executionId === executionId) {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            
            logs.push(...event.data.logs);
            
            if (event.data.type === 'execution-complete') {
              resolve({ output: 'Execution completed successfully' });
            } else if (event.data.type === 'execution-error') {
              resolve({ error: event.data.error });
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Write to iframe
        doc.open();
        doc.write(htmlContent);
        doc.close();

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private compileCode(code: string, filename: string): string {
    // Simple compilation - in a real implementation, you'd use Babel/TypeScript APIs
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
      return this.compileJSX(code);
    } else if (filename.endsWith('.ts')) {
      return this.compileTypeScript(code);
    }
    return code;
  }

  private compileJSX(code: string): string {
    // Very basic JSX transformation (in production, use Babel)
    return code
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '') // Remove imports for now
      .replace(/export\s+default\s+/g, '') // Remove default exports
      .replace(/export\s+/g, ''); // Remove other exports
  }

  private compileTypeScript(code: string): string {
    // Very basic TS stripping (in production, use TypeScript compiler API)
    return code
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,)])/g, '') // Remove type annotations
      .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type aliases
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '') // Remove imports
      .replace(/export\s+default\s+/g, '') // Remove default exports
      .replace(/export\s+/g, ''); // Remove other exports
  }

  cleanup(): void {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;
    }
  }
}