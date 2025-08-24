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
  FileQuestion,
  Zap,
  Server,
  Cloud,
  Cpu,
  Command,
  Box,
  Layers,
  Component,
  Workflow,
  Activity,
  Puzzle,
  Wrench,
  Rocket,
  Smartphone,
  Monitor,
  Triangle
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FileIconMapping {
  [key: string]: {
    icon: LucideIcon;
    color: string;
  };
}

const fileIconMap: FileIconMapping = {
  // JavaScript/TypeScript - Enhanced with framework context
  'js': { icon: FileCode, color: 'text-yellow-500' },
  'jsx': { icon: Component, color: 'text-blue-400' }, // React component
  'ts': { icon: FileCode, color: 'text-blue-600' },
  'tsx': { icon: Component, color: 'text-blue-400' }, // React TypeScript component
  'mjs': { icon: FileCode, color: 'text-yellow-500' },
  'cjs': { icon: FileCode, color: 'text-yellow-500' },
  'vue': { icon: Component, color: 'text-green-500' }, // Vue component
  'svelte': { icon: Component, color: 'text-orange-600' }, // Svelte component
  
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
  
  // Programming languages - Enhanced with technology branding
  'py': { icon: FileCode, color: 'text-blue-500' }, // Python blue
  'java': { icon: FileCode, color: 'text-red-600' },
  'c': { icon: FileCode, color: 'text-blue-600' },
  'cpp': { icon: FileCode, color: 'text-blue-700' },
  'h': { icon: FileCode, color: 'text-purple-600' },
  'cs': { icon: FileCode, color: 'text-purple-600' }, // C# purple
  'php': { icon: FileCode, color: 'text-indigo-600' }, // PHP indigo
  'rb': { icon: FileCode, color: 'text-red-500' }, // Ruby red
  'go': { icon: FileCode, color: 'text-cyan-500' }, // Go cyan
  'rs': { icon: FileCode, color: 'text-orange-600' }, // Rust orange
  'swift': { icon: FileCode, color: 'text-orange-500' },
  'kt': { icon: FileCode, color: 'text-purple-500' }, // Kotlin purple
  'dart': { icon: FileCode, color: 'text-blue-500' }, // Dart blue
  'elm': { icon: FileCode, color: 'text-blue-400' }, // Elm
  'clj': { icon: FileCode, color: 'text-green-600' }, // Clojure
  'scala': { icon: FileCode, color: 'text-red-600' }, // Scala
  'haskell': { icon: FileCode, color: 'text-purple-600' }, // Haskell
  'lua': { icon: FileCode, color: 'text-blue-600' }, // Lua
  'r': { icon: FileCode, color: 'text-blue-500' }, // R
  'matlab': { icon: FileCode, color: 'text-orange-500' }, // MATLAB
  
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
  
  // Special files - Enhanced with technology branding
  'md': { icon: Book, color: 'text-blue-500' },
  'mdx': { icon: Book, color: 'text-blue-600' },
  'readme': { icon: Book, color: 'text-green-500' },
  'license': { icon: FileText, color: 'text-yellow-500' },
  'dockerfile': { icon: Box, color: 'text-blue-500' }, // Docker blue
  'makefile': { icon: Wrench, color: 'text-red-500' },
  'rakefile': { icon: Wrench, color: 'text-red-600' },
  'gemfile': { icon: Package, color: 'text-red-500' }, // Ruby gem
  'composer': { icon: Package, color: 'text-orange-500' }, // PHP Composer
  'requirements': { icon: FileText, color: 'text-blue-500' }, // Python
  'pipfile': { icon: Package, color: 'text-yellow-600' }, // Python Pipenv
  'cargo': { icon: Package, color: 'text-orange-600' }, // Rust Cargo
  'podfile': { icon: Package, color: 'text-blue-500' }, // iOS CocoaPods
  'pubspec': { icon: Package, color: 'text-blue-500' }, // Flutter/Dart
  'mix': { icon: Package, color: 'text-purple-500' }, // Elixir
  'sbt': { icon: Package, color: 'text-red-600' }, // Scala SBT
  'gradle': { icon: Wrench, color: 'text-green-600' }, // Gradle
  'maven': { icon: Wrench, color: 'text-orange-600' }, // Maven
};

// Enhanced special filename mappings with technology branding
const specialFiles: { [key: string]: { icon: LucideIcon; color: string } } = {
  // Docker
  'dockerfile': { icon: Box, color: 'text-blue-500' },
  'docker-compose.yml': { icon: Layers, color: 'text-blue-600' },
  'docker-compose.yaml': { icon: Layers, color: 'text-blue-600' },
  '.dockerignore': { icon: FileX, color: 'text-blue-500' },
  
  // Build tools
  'makefile': { icon: Wrench, color: 'text-red-500' },
  'cmake': { icon: Wrench, color: 'text-red-600' },
  'rakefile': { icon: Wrench, color: 'text-red-600' },
  'gulpfile.js': { icon: Workflow, color: 'text-red-500' },
  'gruntfile.js': { icon: Workflow, color: 'text-orange-500' },
  
  // Package managers
  'package.json': { icon: Server, color: 'text-green-600' }, // Node.js green
  'package-lock.json': { icon: Lock, color: 'text-green-700' },
  'yarn.lock': { icon: Lock, color: 'text-blue-500' },
  'bun.lockb': { icon: Lock, color: 'text-orange-500' },
  'pnpm-lock.yaml': { icon: Lock, color: 'text-yellow-600' },
  'gemfile': { icon: Package, color: 'text-red-500' },
  'gemfile.lock': { icon: Lock, color: 'text-red-600' },
  'composer.json': { icon: Package, color: 'text-purple-600' }, // PHP purple
  'composer.lock': { icon: Lock, color: 'text-purple-700' },
  'requirements.txt': { icon: FileText, color: 'text-blue-500' }, // Python blue
  'pipfile': { icon: Package, color: 'text-yellow-600' },
  'pipfile.lock': { icon: Lock, color: 'text-yellow-700' },
  'cargo.toml': { icon: Package, color: 'text-orange-600' }, // Rust orange
  'cargo.lock': { icon: Lock, color: 'text-orange-700' },
  'pubspec.yaml': { icon: Package, color: 'text-blue-500' }, // Flutter/Dart
  'pubspec.lock': { icon: Lock, color: 'text-blue-600' },
  'podfile': { icon: Package, color: 'text-blue-500' }, // iOS
  'podfile.lock': { icon: Lock, color: 'text-blue-600' },
  
  // Configuration files with technology branding
  'webpack.config.js': { icon: Box, color: 'text-blue-500' }, // Webpack blue
  'webpack.config.ts': { icon: Box, color: 'text-blue-500' },
  'rollup.config.js': { icon: Puzzle, color: 'text-red-500' }, // Rollup red
  'rollup.config.ts': { icon: Puzzle, color: 'text-red-500' },
  'vite.config.js': { icon: Zap, color: 'text-purple-500' }, // Vite purple/lightning
  'vite.config.ts': { icon: Zap, color: 'text-purple-500' },
  'parcel.config.js': { icon: Box, color: 'text-orange-500' },
  'snowpack.config.js': { icon: Activity, color: 'text-blue-400' },
  
  // Framework configs
  'next.config.js': { icon: Triangle, color: 'text-gray-900' }, // Next.js black
  'next.config.ts': { icon: Triangle, color: 'text-gray-900' },
  'nuxt.config.js': { icon: Component, color: 'text-green-500' }, // Nuxt green
  'nuxt.config.ts': { icon: Component, color: 'text-green-500' },
  'gatsby-config.js': { icon: Rocket, color: 'text-purple-600' }, // Gatsby purple
  'svelte.config.js': { icon: Component, color: 'text-orange-600' }, // Svelte orange
  'angular.json': { icon: Component, color: 'text-red-600' }, // Angular red
  
  // Styling and CSS frameworks
  'tailwind.config.js': { icon: Palette, color: 'text-cyan-500' }, // Tailwind cyan
  'tailwind.config.ts': { icon: Palette, color: 'text-cyan-500' },
  'postcss.config.js': { icon: Palette, color: 'text-orange-500' },
  'babel.config.js': { icon: Settings, color: 'text-yellow-600' }, // Babel yellow
  '.babelrc': { icon: Settings, color: 'text-yellow-600' },
  '.babelrc.js': { icon: Settings, color: 'text-yellow-600' },
  '.babelrc.json': { icon: Settings, color: 'text-yellow-600' },
  
  // TypeScript configs
  'tsconfig.json': { icon: Settings, color: 'text-blue-600' }, // TypeScript blue
  'tsconfig.app.json': { icon: Settings, color: 'text-blue-600' },
  'tsconfig.node.json': { icon: Settings, color: 'text-blue-600' },
  'jsconfig.json': { icon: Settings, color: 'text-yellow-500' },
  
  // Linting and formatting
  '.eslintrc': { icon: FileCheck, color: 'text-purple-500' }, // ESLint purple
  '.eslintrc.js': { icon: FileCheck, color: 'text-purple-500' },
  '.eslintrc.json': { icon: FileCheck, color: 'text-purple-500' },
  '.eslintrc.yml': { icon: FileCheck, color: 'text-purple-500' },
  'eslint.config.js': { icon: FileCheck, color: 'text-purple-500' },
  '.prettierrc': { icon: FileCheck, color: 'text-pink-500' }, // Prettier pink
  '.prettierrc.js': { icon: FileCheck, color: 'text-pink-500' },
  '.prettierrc.json': { icon: FileCheck, color: 'text-pink-500' },
  '.prettierrc.yml': { icon: FileCheck, color: 'text-pink-500' },
  'prettier.config.js': { icon: FileCheck, color: 'text-pink-500' },
  
  // Version control
  '.gitignore': { icon: GitBranch, color: 'text-orange-500' },
  '.gitattributes': { icon: GitBranch, color: 'text-orange-500' },
  '.gitmodules': { icon: GitBranch, color: 'text-orange-500' },
  
  // Documentation and project files
  'readme.md': { icon: Book, color: 'text-green-500' },
  'readme.txt': { icon: Book, color: 'text-green-500' },
  'license': { icon: FileText, color: 'text-yellow-500' },
  'license.md': { icon: FileText, color: 'text-yellow-500' },
  'license.txt': { icon: FileText, color: 'text-yellow-500' },
  'changelog.md': { icon: FileText, color: 'text-blue-500' },
  'changelog.txt': { icon: FileText, color: 'text-blue-500' },
  'contributing.md': { icon: Book, color: 'text-green-600' },
  'code_of_conduct.md': { icon: Book, color: 'text-purple-500' },
  
  // Environment and secrets
  '.env': { icon: FileKey, color: 'text-green-600' },
  '.env.local': { icon: FileKey, color: 'text-green-600' },
  '.env.development': { icon: FileKey, color: 'text-green-600' },
  '.env.production': { icon: FileKey, color: 'text-green-600' },
  '.env.staging': { icon: FileKey, color: 'text-green-600' },
  '.env.test': { icon: FileKey, color: 'text-green-600' },
  '.env.example': { icon: FileKey, color: 'text-gray-500' },
  
  // Editor configs
  '.editorconfig': { icon: Settings, color: 'text-gray-500' },
  '.vscode/settings.json': { icon: Settings, color: 'text-blue-500' },
  
  // CI/CD and deployment
  '.github/workflows': { icon: Workflow, color: 'text-gray-900' },
  'vercel.json': { icon: Cloud, color: 'text-gray-900' }, // Vercel black
  'netlify.toml': { icon: Cloud, color: 'text-teal-500' }, // Netlify teal
  'firebase.json': { icon: Cloud, color: 'text-orange-500' }, // Firebase orange
  'serverless.yml': { icon: Cloud, color: 'text-red-500' },
  'azure-pipelines.yml': { icon: Workflow, color: 'text-blue-600' }, // Azure blue
  '.travis.yml': { icon: Workflow, color: 'text-green-600' },
  'circle.yml': { icon: Workflow, color: 'text-green-500' },
  'jenkins.yml': { icon: Workflow, color: 'text-blue-500' },
  
  // Mobile development
  'android/': { icon: Smartphone, color: 'text-green-500' }, // Android green
  'ios/': { icon: Smartphone, color: 'text-gray-700' }, // iOS gray
  'flutter/': { icon: Smartphone, color: 'text-blue-500' }, // Flutter blue
  'react-native/': { icon: Smartphone, color: 'text-blue-400' }, // React Native
  
  // Server files
  'server.js': { icon: Server, color: 'text-green-500' }, // Node.js server
  'server.ts': { icon: Server, color: 'text-green-500' },
  'app.js': { icon: Server, color: 'text-green-500' },
  'app.ts': { icon: Server, color: 'text-green-500' },
  'index.js': { icon: Server, color: 'text-yellow-500' },
  'index.ts': { icon: Server, color: 'text-blue-600' },
  'main.js': { icon: Server, color: 'text-yellow-500' },
  'main.ts': { icon: Server, color: 'text-blue-600' },
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