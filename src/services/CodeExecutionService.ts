import { FileNode } from '@/types/FileTypes';

export interface ExecutionResult {
  success: boolean;
  html?: string;
  output?: string;
  error?: string;
  logs?: string[];
  executionTime?: number;
}

export interface SandboxGlobals {
  console: Console;
  setTimeout: typeof setTimeout;
  setInterval: typeof setInterval;
  clearTimeout: typeof clearTimeout;
  clearInterval: typeof clearInterval;
  fetch: typeof fetch;
  localStorage: Storage;
  sessionStorage: Storage;
  document: Document;
  window: Window;
}

export class CodeExecutionService {
  private iframe: HTMLIFrameElement | null = null;
  private executionTimeout = 10000; // 10 seconds
  private apiBaseUrl = window.location.origin; // Use current origin for API calls

  // Supported server-side languages that need Firecracker execution
  private serverSideLanguages = ['python', 'py', 'c', 'cpp', 'c++', 'java', 'go', 'rust', 'bash', 'shell', 'nodejs', 'node'];

  async executeCode(files: FileNode[], language: string = 'javascript'): Promise<ExecutionResult> {
    try {
      // Auto-detect language if not specified or if it's generic
      const detectedLanguage = this.detectLanguage(files, language);
      
      // Determine if this is a server-side language that needs Firecracker execution
      if (this.serverSideLanguages.includes(detectedLanguage.toLowerCase())) {
        return await this.executeServerSide(files, detectedLanguage);
      } else {
        // Client-side execution for HTML/CSS/JS
        return await this.executeClientSide(files, detectedLanguage);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  /**
   * Detect the most appropriate language/framework based on file structure and content
   */
  private detectLanguage(files: FileNode[], providedLanguage: string): string {
    // If a specific language was provided and it's not generic, use it
    if (providedLanguage && !['javascript', 'js'].includes(providedLanguage.toLowerCase())) {
      return providedLanguage;
    }

    const fileNames = files.map(f => f.name.toLowerCase());
    const fileContents = files.map(f => f.content || '').join('\n');

    // Check for React project indicators
    const hasReactFiles = fileNames.some(name => 
      name.includes('.jsx') || name.includes('.tsx') || 
      name === 'app.js' || name === 'app.tsx'
    );
    const hasReactContent = fileContents.includes('import React') || 
                           fileContents.includes('from "react"') || 
                           fileContents.includes('React.createElement') ||
                           fileContents.includes('useState') ||
                           fileContents.includes('useEffect');
    const hasPackageJsonWithReact = files.some(f => 
      f.name === 'package.json' && 
      (f.content?.includes('"react"') || f.content?.includes('react-scripts'))
    );

    // Force React projects to run client-side for better reliability
    if (hasReactFiles || hasReactContent || hasPackageJsonWithReact) {
      return 'react';
    }

    // Check for Node.js server project indicators
    const hasServerFiles = fileNames.some(name => 
      name === 'server.js' || name === 'app.js' || name === 'index.js'
    );
    const hasNodeContent = fileContents.includes('require(') || 
                          fileContents.includes('express') ||
                          fileContents.includes('http.createServer') ||
                          fileContents.includes('process.env');
    const hasPackageJson = fileNames.includes('package.json');

    if ((hasServerFiles || hasNodeContent) && hasPackageJson) {
      return 'nodejs';
    }

    // Check for other languages based on file extensions
    if (fileNames.some(name => name.endsWith('.py'))) return 'python';
    if (fileNames.some(name => name.endsWith('.ts'))) return 'typescript';
    if (fileNames.some(name => name.endsWith('.c'))) return 'c';
    if (fileNames.some(name => name.endsWith('.cpp') || name.endsWith('.cc'))) return 'cpp';
    if (fileNames.some(name => name.endsWith('.sh'))) return 'bash';

    // Default to React for client-side execution (more reliable than server-side)
    return 'react';
  }

  /**
   * Execute code on the server using Firecracker microVMs
   */
  private async executeServerSide(files: FileNode[], language: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Prepare files for server execution
      const executionFiles = files
        .filter(f => f.type === 'file' && f.content)
        .map(f => ({
          name: f.name,
          content: f.content,
          path: f.name // Use name as path for now
        }));

      const response = await fetch(`${this.apiBaseUrl}/api/execution/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: executionFiles,
          language: language,
          timeout: this.executionTimeout
        })
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      if (result.success) {
        return {
          success: true,
          output: result.output || result.stdout,
          error: result.stderr,
          executionTime,
          logs: result.logs || []
        };
      } else {
        return {
          success: false,
          error: result.error || 'Server execution failed',
          executionTime
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Server execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute code on the client side (HTML/CSS/JavaScript)
   */
  /**
   * Execute code on the client side (HTML/CSS/JavaScript)
   */
  private async executeClientSide(files: FileNode[], language: string): Promise<ExecutionResult> {
    try {
      const htmlFile = files.find(f => f.name.endsWith('.html') && f.type === 'file');
      const cssFiles = files.filter(f => f.name.endsWith('.css') && f.type === 'file');
      const jsFiles = files.filter(f => 
        (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.jsx') || f.name.endsWith('.tsx')) 
        && f.type === 'file'
      );

      let htmlContent = htmlFile?.content || `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dynamic Preview</title>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `;

      // Compile CSS
      const compiledCSS = cssFiles.map(f => f.content).join('\n');

      // Compile JavaScript/TypeScript
      let compiledJS = '';
      for (const jsFile of jsFiles) {
        try {
          if (jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.jsx')) {
            compiledJS += await this.compileJSX(jsFile.content || '');
          } else if (jsFile.name.endsWith('.ts')) {
            compiledJS += await this.compileTypeScript(jsFile.content || '');
          } else {
            compiledJS += jsFile.content || '';
          }
          compiledJS += '\n';
        } catch (error) {
          return {
            success: false,
            error: `Error compiling ${jsFile.name}: ${error}`
          };
        }
      }

      // Create sandboxed iframe
      this.iframe = this.createSandboxedIframe();
      
      // Inject compiled code
      const fullHTML = await this.injectCompiledCode(htmlContent, compiledCSS, compiledJS);
      
      return {
        success: true,
        html: fullHTML
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  createSandboxedIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-forms');
    return iframe;
  }

  async compileTypeScript(code: string): Promise<string> {
    try {
      // Use TypeScript compiler if available globally
      if (typeof window !== 'undefined' && (window as any).ts) {
        const ts = (window as any).ts;
        const result = ts.transpile(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            jsx: ts.JsxEmit.React,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        });
        return result;
      }
      // Fallback: return as-is (browser may handle it)
      return code;
    } catch (error) {
      throw new Error(`TypeScript compilation failed: ${error}`);
    }
  }

  async compileJSX(code: string): Promise<string> {
    try {
      // Use Babel standalone if available
      if (typeof window !== 'undefined' && (window as any).Babel) {
        const Babel = (window as any).Babel;
        const result = Babel.transform(code, {
          presets: ['react', 'es2015'],
          plugins: ['transform-class-properties']
        });
        return result.code;
      }
      // Fallback: return as-is
      return code;
    } catch (error) {
      throw new Error(`JSX compilation failed: ${error}`);
    }
  }

  private async injectCompiledCode(html: string, css: string, js: string): Promise<string> {
    // Create error boundary
    const errorBoundary = `
      window.onerror = function(msg, url, line, col, error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 12px; margin: 8px; border-radius: 4px; border-left: 4px solid #f44336; font-family: monospace; font-size: 12px;';
        errorDiv.innerHTML = '<strong>Runtime Error:</strong><br>' + msg + '<br>Line: ' + line + ', Column: ' + col;
        document.body.appendChild(errorDiv);
        return true;
      };

      window.addEventListener('unhandledrejection', function(event) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #fff3e0; color: #ef6c00; padding: 12px; margin: 8px; border-radius: 4px; border-left: 4px solid #ff9800; font-family: monospace; font-size: 12px;';
        errorDiv.innerHTML = '<strong>Unhandled Promise Rejection:</strong><br>' + event.reason;
        document.body.appendChild(errorDiv);
      });

      // Execution timeout
      const executionTimeout = setTimeout(() => {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #fce4ec; color: #ad1457; padding: 12px; margin: 8px; border-radius: 4px; border-left: 4px solid #e91e63; font-family: monospace; font-size: 12px;';
        errorDiv.innerHTML = '<strong>Execution Timeout:</strong><br>Code execution exceeded 10 seconds and was terminated.';
        document.body.appendChild(errorDiv);
      }, ${this.executionTimeout});

      // Clear timeout when page loads
      window.addEventListener('load', () => clearTimeout(executionTimeout));
    `;

    // Inject CSS and JS into HTML
    const styleTag = css ? `<style>${css}</style>` : '';
    const scriptTag = js ? `<script>${errorBoundary}\n${js}</script>` : `<script>${errorBoundary}</script>`;

    // Insert before closing head tag
    let modifiedHTML = html.replace('</head>', `${styleTag}</head>`);
    // Insert before closing body tag
    modifiedHTML = modifiedHTML.replace('</body>', `${scriptTag}</body>`);

    return modifiedHTML;
  }

  handleRuntimeErrors(error: Error): void {
    console.error('Runtime execution error:', error);
  }

  cleanup(): void {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
  }
}