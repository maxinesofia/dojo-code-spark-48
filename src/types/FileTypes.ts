export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  mimeType?: string;
  size?: number;
  createdAt?: Date;
  modifiedAt?: Date;
  isHidden?: boolean;
  isExpanded?: boolean;
  isOpen?: boolean;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  checksum?: string;
}

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'modify';
  fileId: string;
  oldPath?: string;
  newPath?: string;
  content?: string;
  timestamp: Date;
}

export interface ClipboardOperation {
  type: 'cut' | 'copy';
  fileIds: string[];
  timestamp: Date;
}