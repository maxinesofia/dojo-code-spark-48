import { FileNode } from '@/components/FileExplorer';

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'modify';
  fileId: string;
  fileName?: string;
  oldPath?: string;
  newPath?: string;
  content?: string;
  timestamp: Date;
}

export interface FileMetadata {
  size: number;
  created: Date;
  modified: Date;
  mimeType: string;
  encoding?: string;
}

export interface ClipboardOperation {
  type: 'cut' | 'copy';
  files: string[];
  timestamp: Date;
}

export class FileSystemService {
  private history: FileOperation[] = [];
  private historyIndex = -1;
  private maxHistorySize = 100;
  private clipboard: ClipboardOperation | null = null;

  // File metadata tracking
  private metadata: Map<string, FileMetadata> = new Map();

  constructor() {
    this.loadHistory();
    this.loadMetadata();
  }

  // History operations
  recordOperation(operation: FileOperation): void {
    // Remove any future operations if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(operation);
    this.historyIndex++;

    // Keep history within limits
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }

    this.saveHistory();
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  getUndoOperation(): FileOperation | null {
    if (!this.canUndo()) return null;
    return this.history[this.historyIndex];
  }

  getRedoOperation(): FileOperation | null {
    if (!this.canRedo()) return null;
    return this.history[this.historyIndex + 1];
  }

  undo(): FileOperation | null {
    if (!this.canUndo()) return null;
    const operation = this.history[this.historyIndex];
    this.historyIndex--;
    this.saveHistory();
    return operation;
  }

  redo(): FileOperation | null {
    if (!this.canRedo()) return null;
    this.historyIndex++;
    const operation = this.history[this.historyIndex];
    this.saveHistory();
    return operation;
  }

  // Clipboard operations
  cutFiles(fileIds: string[]): void {
    this.clipboard = {
      type: 'cut',
      files: fileIds,
      timestamp: new Date()
    };
  }

  copyFiles(fileIds: string[]): void {
    this.clipboard = {
      type: 'copy',
      files: fileIds,
      timestamp: new Date()
    };
  }

  getClipboard(): ClipboardOperation | null {
    return this.clipboard;
  }

  clearClipboard(): void {
    this.clipboard = null;
  }

  // File metadata
  setFileMetadata(fileId: string, content: string, mimeType?: string): void {
    const size = new Blob([content]).size;
    const now = new Date();
    
    const existing = this.metadata.get(fileId);
    const metadata: FileMetadata = {
      size,
      created: existing?.created || now,
      modified: now,
      mimeType: mimeType || this.detectMimeType(fileId),
      encoding: 'utf-8'
    };

    this.metadata.set(fileId, metadata);
    this.saveMetadata();
  }

  getFileMetadata(fileId: string): FileMetadata | null {
    return this.metadata.get(fileId) || null;
  }

  updateFileModified(fileId: string): void {
    const existing = this.metadata.get(fileId);
    if (existing) {
      existing.modified = new Date();
      this.saveMetadata();
    }
  }

  // File search
  searchFiles(files: FileNode[], query: string, useRegex = false): FileNode[] {
    const results: FileNode[] = [];
    const searchPattern = useRegex ? new RegExp(query, 'gi') : null;

    const searchInNode = (node: FileNode) => {
      if (node.type === 'file') {
        // Search in filename
        const nameMatch = useRegex 
          ? searchPattern?.test(node.name)
          : node.name.toLowerCase().includes(query.toLowerCase());

        // Search in content
        const contentMatch = node.content && (useRegex
          ? searchPattern?.test(node.content)
          : node.content.toLowerCase().includes(query.toLowerCase()));

        if (nameMatch || contentMatch) {
          results.push(node);
        }
      }

      if (node.children) {
        node.children.forEach(searchInNode);
      }
    };

    files.forEach(searchInNode);
    return results;
  }

  // File compression/archive support
  async createZipArchive(files: FileNode[], filename: string): Promise<Blob> {
    // This would require a zip library like JSZip
    // For now, return a simple text representation
    const archiveContent = this.createArchiveText(files);
    return new Blob([archiveContent], { type: 'text/plain' });
  }

  private createArchiveText(files: FileNode[], prefix = ''): string {
    let content = '';
    
    for (const file of files) {
      const path = prefix + file.name;
      if (file.type === 'file') {
        content += `// File: ${path}\n`;
        content += file.content || '';
        content += '\n\n';
      } else if (file.children) {
        content += this.createArchiveText(file.children, path + '/');
      }
    }

    return content;
  }

  // Drag and drop support
  async handleFileDrop(files: FileList): Promise<FileNode[]> {
    const fileNodes: FileNode[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await this.readFileContent(file);
      
      const fileNode: FileNode = {
        id: this.generateFileId(),
        name: file.name,
        type: 'file',
        content
      };

      this.setFileMetadata(fileNode.id, content, file.type);
      fileNodes.push(fileNode);
    }

    return fileNodes;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type.startsWith('text/') || this.isTextFile(file.name)) {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      } else {
        // For binary files, encode as base64
        reader.onload = () => {
          const result = reader.result as string;
          resolve(`data:${file.type};base64,${result.split(',')[1]}`);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }
    });
  }

  // Utility methods
  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'text/jsx',
      'tsx': 'text/tsx',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };

    return mimeTypes[ext || ''] || 'text/plain';
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'txt', 'xml', 'svg'];
    const ext = filename.split('.').pop()?.toLowerCase();
    return textExtensions.includes(ext || '');
  }

  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Persistence
  private saveHistory(): void {
    try {
      localStorage.setItem('tutorials-dojo-file-history', JSON.stringify({
        history: this.history.slice(-this.maxHistorySize),
        index: this.historyIndex
      }));
    } catch (error) {
      console.error('Failed to save file history:', error);
    }
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('tutorials-dojo-file-history');
      if (stored) {
        const data = JSON.parse(stored);
        this.history = data.history.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        this.historyIndex = data.index;
      }
    } catch (error) {
      console.error('Failed to load file history:', error);
    }
  }

  private saveMetadata(): void {
    try {
      const metadataArray = Array.from(this.metadata.entries()).map(([id, meta]) => [
        id,
        {
          ...meta,
          created: meta.created.toISOString(),
          modified: meta.modified.toISOString()
        }
      ]);
      localStorage.setItem('tutorials-dojo-file-metadata', JSON.stringify(metadataArray));
    } catch (error) {
      console.error('Failed to save file metadata:', error);
    }
  }

  private loadMetadata(): void {
    try {
      const stored = localStorage.getItem('tutorials-dojo-file-metadata');
      if (stored) {
        const metadataArray = JSON.parse(stored);
        for (const [id, meta] of metadataArray) {
          this.metadata.set(id, {
            ...meta,
            created: new Date(meta.created),
            modified: new Date(meta.modified)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load file metadata:', error);
    }
  }

  clearCache(): void {
    this.history = [];
    this.historyIndex = -1;
    this.metadata.clear();
    this.clipboard = null;
    localStorage.removeItem('tutorials-dojo-file-history');
    localStorage.removeItem('tutorials-dojo-file-metadata');
  }
}
