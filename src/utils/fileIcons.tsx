import React from 'react';
import {
  FileText,
  Code,
  Image,
  Video,
  Music,
  Archive,
  Database,
  Settings,
  FileJson,
  Globe,
  Palette,
  Terminal,
  Book,
  Package,
  Lock,
  File,
  GitBranch,
  Folder,
  FolderOpen,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCheck,
  FileCog,
  FileKey,
  FileX,
  Braces,
  Hash,
  Camera,
  Play,
  Headphones,
  Download,
  Shield,
  Eye,
  FileQuestion
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FileIconMapping {
  [key: string]: {
    icon: LucideIcon;
    color: string;
  };
}

const fileIconMap: FileIconMapping = {
  // JavaScript/TypeScript
  'js': { icon: FileCode, color: 'text-yellow-500' },
  'jsx': { icon: FileCode, color: 'text-blue-400' },
  'ts': { icon: FileCode, color: 'text-blue-600' },
  'tsx': { icon: FileCode, color: 'text-blue-400' },
  'mjs': { icon: FileCode, color: 'text-yellow-500' },
  'cjs': { icon: FileCode, color: 'text-yellow-500' },
  
  // Web technologies
  'html': { icon: Globe, color: 'text-orange-500' },
  'htm': { icon: Globe, color: 'text-orange-500' },
  'css': { icon: Palette, color: 'text-blue-500' },
  'scss': { icon: Palette, color: 'text-pink-500' },
  'sass': { icon: Palette, color: 'text-pink-500' },
  'less': { icon: Palette, color: 'text-blue-600' },
  'xml': { icon: Code, color: 'text-orange-400' },
  'svg': { icon: FileImage, color: 'text-orange-500' },
  
  // Data formats
  'json': { icon: Braces, color: 'text-yellow-600' },
  'yaml': { icon: FileText, color: 'text-purple-500' },
  'yml': { icon: FileText, color: 'text-purple-500' },
  'toml': { icon: FileText, color: 'text-gray-500' },
  'csv': { icon: FileSpreadsheet, color: 'text-green-500' },
  
  // Configuration files
  'config': { icon: Settings, color: 'text-gray-500' },
  'conf': { icon: Settings, color: 'text-gray-500' },
  'ini': { icon: Settings, color: 'text-gray-500' },
  'env': { icon: FileKey, color: 'text-green-600' },
  'gitignore': { icon: GitBranch, color: 'text-orange-500' },
  'gitattributes': { icon: GitBranch, color: 'text-orange-500' },
  'dockerignore': { icon: FileX, color: 'text-blue-500' },
  'editorconfig': { icon: Settings, color: 'text-gray-500' },
  'eslintrc': { icon: FileCheck, color: 'text-purple-500' },
  'prettierrc': { icon: FileCheck, color: 'text-pink-500' },
  
  // Package managers
  'package': { icon: Package, color: 'text-red-500' },
  'lock': { icon: Lock, color: 'text-yellow-600' },
  'lockb': { icon: Lock, color: 'text-orange-500' },
  'shrinkwrap': { icon: Package, color: 'text-red-500' },
  
  // Images
  'jpg': { icon: Camera, color: 'text-green-500' },
  'jpeg': { icon: Camera, color: 'text-green-500' },
  'png': { icon: Camera, color: 'text-green-500' },
  'gif': { icon: FileImage, color: 'text-purple-500' },
  'webp': { icon: Camera, color: 'text-green-600' },
  'ico': { icon: Camera, color: 'text-blue-500' },
  'bmp': { icon: Camera, color: 'text-blue-400' },
  'tiff': { icon: Camera, color: 'text-green-400' },
  
  // Video
  'mp4': { icon: Play, color: 'text-red-500' },
  'avi': { icon: FileVideo, color: 'text-red-500' },
  'mov': { icon: FileVideo, color: 'text-red-500' },
  'wmv': { icon: FileVideo, color: 'text-red-500' },
  'flv': { icon: FileVideo, color: 'text-red-500' },
  'webm': { icon: FileVideo, color: 'text-green-600' },
  
  // Audio
  'mp3': { icon: Headphones, color: 'text-purple-500' },
  'wav': { icon: FileAudio, color: 'text-blue-500' },
  'flac': { icon: FileAudio, color: 'text-green-500' },
  'aac': { icon: FileAudio, color: 'text-orange-500' },
  'ogg': { icon: FileAudio, color: 'text-red-500' },
  
  // Archives
  'zip': { icon: Archive, color: 'text-yellow-500' },
  'rar': { icon: Archive, color: 'text-yellow-500' },
  '7z': { icon: Archive, color: 'text-yellow-500' },
  'tar': { icon: Archive, color: 'text-yellow-600' },
  'gz': { icon: Archive, color: 'text-red-500' },
  'bz2': { icon: Archive, color: 'text-red-600' },
  
  // Documents
  'pdf': { icon: FileText, color: 'text-red-600' },
  'doc': { icon: FileText, color: 'text-blue-600' },
  'docx': { icon: FileText, color: 'text-blue-600' },
  'xls': { icon: FileSpreadsheet, color: 'text-green-600' },
  'xlsx': { icon: FileSpreadsheet, color: 'text-green-600' },
  'ppt': { icon: FileText, color: 'text-orange-600' },
  'pptx': { icon: FileText, color: 'text-orange-600' },
  'txt': { icon: FileText, color: 'text-gray-500' },
  'rtf': { icon: FileText, color: 'text-blue-500' },
  
  // Programming languages
  'py': { icon: FileCode, color: 'text-yellow-600' },
  'java': { icon: FileCode, color: 'text-red-600' },
  'c': { icon: FileCode, color: 'text-blue-600' },
  'cpp': { icon: FileCode, color: 'text-blue-700' },
  'h': { icon: FileCode, color: 'text-purple-600' },
  'cs': { icon: FileCode, color: 'text-green-600' },
  'php': { icon: FileCode, color: 'text-purple-700' },
  'rb': { icon: FileCode, color: 'text-red-500' },
  'go': { icon: FileCode, color: 'text-blue-500' },
  'rs': { icon: FileCode, color: 'text-orange-600' },
  'swift': { icon: FileCode, color: 'text-orange-500' },
  'kt': { icon: FileCode, color: 'text-purple-500' },
  'dart': { icon: FileCode, color: 'text-blue-500' },
  
  // Shell scripts
  'sh': { icon: Terminal, color: 'text-green-500' },
  'bash': { icon: Terminal, color: 'text-green-500' },
  'zsh': { icon: Terminal, color: 'text-green-600' },
  'fish': { icon: Terminal, color: 'text-green-400' },
  'ps1': { icon: Terminal, color: 'text-blue-500' },
  'bat': { icon: Terminal, color: 'text-gray-500' },
  'cmd': { icon: Terminal, color: 'text-gray-500' },
  
  // Database
  'sql': { icon: Database, color: 'text-orange-500' },
  'db': { icon: Database, color: 'text-green-500' },
  'sqlite': { icon: Database, color: 'text-blue-500' },
  
  // Special files
  'md': { icon: Book, color: 'text-blue-500' },
  'mdx': { icon: Book, color: 'text-blue-600' },
  'readme': { icon: Book, color: 'text-green-500' },
  'license': { icon: FileText, color: 'text-yellow-500' },
  'dockerfile': { icon: Settings, color: 'text-blue-500' },
  'makefile': { icon: Settings, color: 'text-red-500' },
  'rakefile': { icon: Settings, color: 'text-red-600' },
  'gemfile': { icon: Package, color: 'text-red-500' },
  'composer': { icon: Package, color: 'text-orange-500' },
  'requirements': { icon: FileText, color: 'text-blue-500' },
  'pipfile': { icon: Package, color: 'text-yellow-600' },
  'cargo': { icon: Package, color: 'text-orange-600' },
};

// Special filename mappings (for files without extensions or special cases)
const specialFiles: { [key: string]: { icon: LucideIcon; color: string } } = {
  'dockerfile': { icon: Settings, color: 'text-blue-500' },
  'makefile': { icon: Settings, color: 'text-red-500' },
  'rakefile': { icon: Settings, color: 'text-red-600' },
  'gemfile': { icon: Package, color: 'text-red-500' },
  'package.json': { icon: Package, color: 'text-red-500' },
  'package-lock.json': { icon: Lock, color: 'text-red-600' },
  'yarn.lock': { icon: Lock, color: 'text-blue-500' },
  'bun.lockb': { icon: Lock, color: 'text-orange-500' },
  'composer.json': { icon: Package, color: 'text-orange-500' },
  'composer.lock': { icon: Lock, color: 'text-orange-600' },
  'requirements.txt': { icon: FileText, color: 'text-blue-500' },
  'pipfile': { icon: Package, color: 'text-yellow-600' },
  'cargo.toml': { icon: Package, color: 'text-orange-600' },
  'cargo.lock': { icon: Lock, color: 'text-orange-700' },
  '.gitignore': { icon: GitBranch, color: 'text-orange-500' },
  '.gitattributes': { icon: GitBranch, color: 'text-orange-500' },
  '.dockerignore': { icon: FileX, color: 'text-blue-500' },
  '.editorconfig': { icon: Settings, color: 'text-gray-500' },
  '.eslintrc': { icon: FileCheck, color: 'text-purple-500' },
  '.eslintrc.js': { icon: FileCheck, color: 'text-purple-500' },
  '.eslintrc.json': { icon: FileCheck, color: 'text-purple-500' },
  '.prettierrc': { icon: FileCheck, color: 'text-pink-500' },
  '.prettierrc.js': { icon: FileCheck, color: 'text-pink-500' },
  '.prettierrc.json': { icon: FileCheck, color: 'text-pink-500' },
  'tsconfig.json': { icon: Settings, color: 'text-blue-600' },
  'jsconfig.json': { icon: Settings, color: 'text-yellow-500' },
  'vite.config.js': { icon: Settings, color: 'text-purple-500' },
  'vite.config.ts': { icon: Settings, color: 'text-purple-500' },
  'webpack.config.js': { icon: Settings, color: 'text-blue-500' },
  'rollup.config.js': { icon: Settings, color: 'text-red-500' },
  'tailwind.config.js': { icon: Settings, color: 'text-cyan-500' },
  'tailwind.config.ts': { icon: Settings, color: 'text-cyan-500' },
  'postcss.config.js': { icon: Settings, color: 'text-orange-500' },
  'babel.config.js': { icon: Settings, color: 'text-yellow-600' },
  '.babelrc': { icon: Settings, color: 'text-yellow-600' },
  'readme.md': { icon: Book, color: 'text-green-500' },
  'license': { icon: FileText, color: 'text-yellow-500' },
  'license.md': { icon: FileText, color: 'text-yellow-500' },
  'changelog.md': { icon: FileText, color: 'text-blue-500' },
  '.env': { icon: FileKey, color: 'text-green-600' },
  '.env.local': { icon: FileKey, color: 'text-green-600' },
  '.env.development': { icon: FileKey, color: 'text-green-600' },
  '.env.production': { icon: FileKey, color: 'text-green-600' },
};

export function getFileIcon(fileName: string, isFolder: boolean = false, isExpanded: boolean = false) {
  if (isFolder) {
    return {
      icon: isExpanded ? FolderOpen : Folder,
      color: 'text-blue-500'
    };
  }

  const lowerFileName = fileName.toLowerCase();
  
  // Check special files first
  if (specialFiles[lowerFileName]) {
    return specialFiles[lowerFileName];
  }
  
  // Check by extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && fileIconMap[extension]) {
    return fileIconMap[extension];
  }
  
  // Default file icon
  return {
    icon: File,
    color: 'text-gray-500'
  };
}

export function FileIcon({ 
  fileName, 
  isFolder = false, 
  isExpanded = false, 
  size = 16,
  className = '' 
}: {
  fileName: string;
  isFolder?: boolean;
  isExpanded?: boolean;
  size?: number;
  className?: string;
}) {
  const { icon: IconComponent, color } = getFileIcon(fileName, isFolder, isExpanded);
  
  return (
    <IconComponent 
      size={size} 
      className={`${color} ${className}`} 
    />
  );
}

// Default export for convenience
export default FileIcon;