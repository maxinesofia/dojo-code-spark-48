import { FileNode } from '@/components/FileExplorer';

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'update';
  fileId: string;
  timestamp: Date;
  oldName?: string;
  newName?: string;
  oldParent?: string;
  newParent?: string;
  oldContent?: string;
  newContent?: string;
}

export interface SearchResult {
  file: FileNode;
  matches: Array<{
    line: number;
    text: string;
    startIndex: number;
    endIndex: number;
  }>;
}

export interface ClipboardItem {
  files: FileNode[];
  operation: 'cut' | 'copy';
  timestamp: Date;
}

export class FileSystemService {
  private history: FileOperation[] = [];
  private clipboard: ClipboardItem | null = null;
  private maxHistorySize = 100;

  recordOperation(operation: FileOperation): void {
    this.history.push(operation);
    
    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  getHistory(): FileOperation[] {
    return [...this.history];
  }

  searchFiles(files: FileNode[], query: string, useRegex = false, caseSensitive = false): SearchResult[] {
    const results: SearchResult[] = [];
    
    const searchRecursive = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.content) {
          const matches = this.searchInContent(node.content, query, useRegex, caseSensitive);
          if (matches.length > 0) {
            results.push({ file: node, matches });
          }
        } else if (node.type === 'folder' && node.children) {
          searchRecursive(node.children);
        }
      }
    };

    searchRecursive(files);
    return results;
  }

  private searchInContent(
    content: string,
    query: string,
    useRegex: boolean,
    caseSensitive: boolean
  ): Array<{ line: number; text: string; startIndex: number; endIndex: number; }> {
    const matches: Array<{ line: number; text: string; startIndex: number; endIndex: number; }> = [];
    const lines = content.split('\n');
    
    try {
      let searchRegex: RegExp;
      
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        searchRegex = new RegExp(query, flags);
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        searchRegex = new RegExp(escapedQuery, flags);
      }

      lines.forEach((line, lineIndex) => {
        let match;
        searchRegex.lastIndex = 0; // Reset regex
        
        while ((match = searchRegex.exec(line)) !== null) {
          matches.push({
            line: lineIndex + 1,
            text: line,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
          
          // Prevent infinite loop for zero-length matches
          if (match.index === searchRegex.lastIndex) {
            searchRegex.lastIndex++;
          }
        }
      });
    } catch (error) {
      console.error('Search regex error:', error);
    }

    return matches;
  }

  copyFiles(files: FileNode[]): void {
    this.clipboard = {
      files: this.deepCloneFiles(files),
      operation: 'copy',
      timestamp: new Date()
    };
  }

  cutFiles(files: FileNode[]): void {
    this.clipboard = {
      files: this.deepCloneFiles(files),
      operation: 'cut',
      timestamp: new Date()
    };
  }

  getClipboard(): ClipboardItem | null {
    return this.clipboard;
  }

  clearClipboard(): void {
    this.clipboard = null;
  }

  private deepCloneFiles(files: FileNode[]): FileNode[] {
    return files.map(file => ({
      ...file,
      children: file.children ? this.deepCloneFiles(file.children) : undefined
    }));
  }

  detectMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: Record<string, string> = {
      // Text
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      
      // Web
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'jsx': 'text/jsx',
      'tsx': 'text/tsx',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      
      // Video
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      
      // Fonts
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'otf': 'font/otf',
      
      // Archives
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      
      // Documents
      'pdf': 'application/pdf'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  async handleFileUpload(file: File): Promise<FileNode> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        const fileNode: FileNode = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: 'file',
          content: content
        };
        
        resolve(fileNode);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // Detect if file is binary or text
      const mimeType = this.detectMimeType(file.name);
      
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        reader.readAsText(file);
      } else {
        // For binary files, convert to base64
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
          const base64 = btoa(binary);
          
          const fileNode: FileNode = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: 'file',
            content: `data:${mimeType};base64,${base64}`
          };
          
          resolve(fileNode);
        };
        
        reader.readAsArrayBuffer(file);
      }
    });
  }

  getFileStats(file: FileNode): { size: number; lines?: number; characters?: number } {
    if (!file.content) {
      return { size: 0 };
    }

    const size = new Blob([file.content]).size;
    
    // For text files, also count lines and characters
    const mimeType = this.detectMimeType(file.name);
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      const lines = file.content.split('\n').length;
      const characters = file.content.length;
      
      return { size, lines, characters };
    }
    
    return { size };
  }
}
