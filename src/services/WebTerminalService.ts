import { FileNode } from '../types/FileTypes';
import { PackageManagerService } from './PackageManagerService';

interface TerminalCommand {
  command: string;
  args: string[];
  output: string;
  exitCode: number;
  timestamp: Date;
}

interface VirtualFileSystem {
  currentDirectory: string;
  files: Map<string, { content: string; mimeType?: string }>;
  directories: Set<string>;
}

export class WebTerminalService {
  private vfs: VirtualFileSystem;
  private environment: Map<string, string>;
  private commandHistory: TerminalCommand[];
  private aliases: Map<string, string>;
  private onFileSystemChange?: (files: FileNode[]) => void;
  private sessionInitialized = false;
  private packageManager: PackageManagerService;

  constructor(onFileSystemChange?: (files: FileNode[]) => void) {
    this.onFileSystemChange = onFileSystemChange;
    this.packageManager = new PackageManagerService();
    this.vfs = {
      currentDirectory: '/',
      files: new Map(),
      directories: new Set(['/'])
    };
    
    this.environment = new Map([
      ['HOME', '/'],
      ['PWD', '/'],
      ['USER', 'developer'],
      ['SHELL', '/bin/bash'],
      ['PATH', '/usr/bin:/bin:/usr/local/bin']
    ]);
    
    this.commandHistory = [];
    
    this.aliases = new Map([
      ['ll', 'ls -la'],
      ['la', 'ls -la'],
      ['..', 'cd ..'],
      ['cls', 'clear']
    ]);
  }

  setupVirtualFS(files: FileNode[]) {
    this.vfs.files.clear();
    this.vfs.directories.clear();
    this.vfs.directories.add('/');
    
    const processNode = (node: FileNode, parentPath: string = '') => {
      const fullPath = parentPath === '' ? `/${node.name}` : `${parentPath}/${node.name}`;
      
      if (node.type === 'file') {
        this.vfs.files.set(fullPath, {
          content: node.content || '',
          mimeType: node.mimeType
        });
        
        // Ensure parent directory exists
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        if (dirPath !== '/' && !this.vfs.directories.has(dirPath)) {
          this.vfs.directories.add(dirPath);
        }
      } else if (node.type === 'folder') {
        this.vfs.directories.add(fullPath);
        if (node.children) {
          node.children.forEach(child => processNode(child, fullPath));
        }
      }
    };
    
    files.forEach(file => processNode(file));
    
    // Debug: Log current file system state
    console.log('Virtual FS updated:', {
      directories: Array.from(this.vfs.directories),
      files: Array.from(this.vfs.files.keys())
    });
  }

  getSessionInitMessage(): string {
    this.sessionInitialized = true;
    return '';
  }

  getPrompt(): string {
    const pwd = this.vfs.currentDirectory;
    const user = this.environment.get('USER') || 'developer';
    
    // Add ANSI colors and formatting like real terminal emulators
    if (pwd === '/') {
      return `\x1b[32m${user}\x1b[0m:\x1b[34m/\x1b[0m$`;
    } else {
      // Convert absolute path to home-relative if in home directory
      const home = this.environment.get('HOME') || '/';
      if (pwd.startsWith(home) && pwd !== home) {
        const relativePath = pwd.slice(home.length);
        return `\x1b[32m${user}\x1b[0m:\x1b[34m~${relativePath}\x1b[0m $`;
      } else {
        return `\x1b[32m${user}\x1b[0m:\x1b[34m${pwd}\x1b[0m $`;
      }
    }
  }

  async executeCommand(command: string): Promise<string> {
    const expandedCommand = this.expandAliases(command);
    const [cmd, ...args] = this.parseCommand(expandedCommand);
    
    const terminalCommand: TerminalCommand = {
      command: cmd,
      args,
      output: '',
      exitCode: 0,
      timestamp: new Date()
    };

    try {
      switch (cmd.toLowerCase()) {
        case 'ls':
        case 'dir':
          terminalCommand.output = this.handleLs(args);
          break;

        case 'cd':
          terminalCommand.output = this.handleCd(args);
          break;

        case 'pwd':
          terminalCommand.output = this.vfs.currentDirectory;
          break;

        case 'mkdir':
          terminalCommand.output = this.handleMkdir(args);
          break;

        case 'rmdir':
        case 'rm':
          terminalCommand.output = this.handleRm(args);
          break;

        case 'cat':
        case 'type':
          terminalCommand.output = this.handleCat(args);
          break;

        case 'touch':
          terminalCommand.output = this.handleTouch(args);
          break;

        case 'echo':
          terminalCommand.output = args.join(' ');
          break;

        case 'clear':
        case 'cls':
          return '\x1b[2J\x1b[H';

        case 'cp':
        case 'copy':
          terminalCommand.output = this.handleCp(args);
          break;

        case 'mv':
        case 'move':
          terminalCommand.output = this.handleMv(args);
          break;

        case 'grep':
        case 'findstr':
          terminalCommand.output = this.handleGrep(args);
          break;

        case 'find':
          terminalCommand.output = this.handleFind(args);
          break;

        case 'tree':
          terminalCommand.output = this.handleTree(args);
          break;

        case 'code':
        case 'edit':
          terminalCommand.output = this.handleCodeCommand(args);
          break;

        case 'npm':
        case 'yarn':
        case 'pnpm':
          terminalCommand.output = await this.handlePackageManager(cmd, args);
          break;

        case 'node':
          terminalCommand.output = this.handleNode(args);
          break;

        case 'git':
          terminalCommand.output = this.handleGitCommands(args);
          break;

        case 'curl':
          terminalCommand.output = await this.handleCurl(args);
          break;

        case 'wget':
          terminalCommand.output = await this.handleWget(args);
          break;

        case 'env':
        case 'set':
          terminalCommand.output = this.handleEnv(args);
          break;

        case 'history':
          terminalCommand.output = this.handleHistory();
          break;

        case 'ps':
          terminalCommand.output = this.handlePs();
          break;

        case 'which':
        case 'where':
          terminalCommand.output = this.handleWhich(args);
          break;

        case 'whoami':
          terminalCommand.output = this.environment.get('USER') || 'developer';
          break;

        case 'date':
          terminalCommand.output = new Date().toString();
          break;

        case 'uptime':
          terminalCommand.output = `Virtual terminal - active since startup`;
          break;

        case 'help':
        case '--help':
          terminalCommand.output = this.getHelpText();
          break;

        case 'python':
        case 'python3':
          terminalCommand.output = this.handlePython(args);
          break;

        case 'pip':
        case 'pip3':
          terminalCommand.output = this.handlePip(args);
          break;

        case 'serve':
        case 'http-server':
          terminalCommand.output = this.handleServe(args);
          break;

        case 'exit':
        case 'quit':
          terminalCommand.output = 'Terminal session ended. Use Ctrl+C to close.';
          break;

        default:
          terminalCommand.output = `\x1b[31mCommand not found: ${cmd}\x1b[0m\nType 'help' for available commands.`;
          terminalCommand.exitCode = 1;
      }
    } catch (error) {
      terminalCommand.output = `\x1b[31mError executing command: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`;
      terminalCommand.exitCode = 1;
    }

    this.commandHistory.unshift(terminalCommand);
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(0, 100);
    }

    return terminalCommand.output;
  }

  private expandAliases(command: string): string {
    const [cmd, ...args] = this.parseCommand(command);
    const expandedCmd = this.aliases.get(cmd) || cmd;
    return `${expandedCmd} ${args.join(' ')}`.trim();
  }

  private parseCommand(command: string): string[] {
    return command.trim().split(/\s+/).filter(part => part.length > 0);
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    
    if (path === '.') {
      return this.vfs.currentDirectory;
    }
    
    if (path === '..') {
      const segments = this.vfs.currentDirectory.split('/').filter(s => s);
      segments.pop();
      return '/' + segments.join('/');
    }
    
    if (this.vfs.currentDirectory === '/') {
      return `/${path}`;
    }
    
    return `${this.vfs.currentDirectory}/${path}`;
  }

  private isInDirectory(filePath: string, dirPath: string): boolean {
    if (dirPath === '/') {
      // For root directory, check if file is directly in root or one level deep
      const pathSegments = filePath.split('/').filter(s => s);
      return pathSegments.length > 0;
    }
    return filePath.startsWith(dirPath + '/') && filePath !== dirPath;
  }

  private handleLs(args: string[]): string {
    const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');
    
    const targetPath = args.find(arg => !arg.startsWith('-')) || this.vfs.currentDirectory;
    const resolvedPath = this.resolvePath(targetPath);
    
    if (!this.vfs.directories.has(resolvedPath)) {
      return `ls: cannot access '${targetPath}': No such file or directory`;
    }
    
    const items: string[] = [];
    
    // Add directories that are direct children of the target path
    for (const dir of this.vfs.directories) {
      if (dir === resolvedPath) continue; // Skip the current directory itself
      
      // Check if this directory is a direct child of the resolved path
      const parentPath = dir.substring(0, dir.lastIndexOf('/')) || '/';
      if (parentPath === resolvedPath) {
        const name = dir.substring(dir.lastIndexOf('/') + 1);
        if (showAll || !name.startsWith('.')) {
          items.push(longFormat ? `drwxr-xr-x 2 developer developer 4096 ${new Date().toDateString()} ${name}/` : `${name}/`);
        }
      }
    }
    
    // Add files that are direct children of the target path
    for (const [filePath] of this.vfs.files) {
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      if (parentPath === resolvedPath) {
        const name = filePath.substring(filePath.lastIndexOf('/') + 1);
        if (showAll || !name.startsWith('.')) {
          const file = this.vfs.files.get(filePath)!;
          const size = file.content.length;
          items.push(longFormat ? `-rw-r--r-- 1 developer developer ${size} ${new Date().toDateString()} ${name}` : name);
        }
      }
    }
    
    if (items.length === 0) {
      return longFormat ? `total 0` : '';
    }
    
    const result = items.sort().join('\n');
    return longFormat ? `total ${items.length}\n${result}` : result;
  }

  private handleCd(args: string[]): string {
    const target = args[0] || this.environment.get('HOME') || '/';
    const resolvedPath = this.resolvePath(target);
    
    if (!this.vfs.directories.has(resolvedPath)) {
      return `cd: no such file or directory: ${target}`;
    }
    
    this.vfs.currentDirectory = resolvedPath;
    this.environment.set('PWD', resolvedPath);
    return '';
  }

  private handleMkdir(args: string[]): string {
    if (args.length === 0) {
      return 'mkdir: missing operand';
    }
    
    const dirName = args[0];
    const resolvedPath = this.resolvePath(dirName);
    
    if (this.vfs.directories.has(resolvedPath) || this.vfs.files.has(resolvedPath)) {
      return `mkdir: cannot create directory '${dirName}': File exists`;
    }
    
    this.vfs.directories.add(resolvedPath);
    this.notifyFileSystemChange();
    return '';
  }

  private handleRm(args: string[]): string {
    if (args.length === 0) {
      return 'rm: missing operand';
    }
    
    const target = args[0];
    const resolvedPath = this.resolvePath(target);
    const isRecursive = args.includes('-r') || args.includes('-rf');
    
    if (this.vfs.files.has(resolvedPath)) {
      this.vfs.files.delete(resolvedPath);
      this.notifyFileSystemChange();
      return '';
    }
    
    if (this.vfs.directories.has(resolvedPath)) {
      if (!isRecursive) {
        // Check if directory is empty
        const hasContents = Array.from(this.vfs.directories).some(dir => 
          dir !== resolvedPath && this.isInDirectory(dir, resolvedPath)
        ) || Array.from(this.vfs.files.keys()).some(file => 
          this.isInDirectory(file, resolvedPath)
        );
        
        if (hasContents) {
          return `rm: cannot remove '${target}': Directory not empty`;
        }
      }
      
      // Remove directory and all contents
      this.vfs.directories.delete(resolvedPath);
      
      // Remove all subdirectories and files
      if (isRecursive) {
        const toDelete = Array.from(this.vfs.directories).filter(dir => 
          this.isInDirectory(dir, resolvedPath)
        );
        toDelete.forEach(dir => this.vfs.directories.delete(dir));
        
        const filesToDelete = Array.from(this.vfs.files.keys()).filter(file => 
          this.isInDirectory(file, resolvedPath)
        );
        filesToDelete.forEach(file => this.vfs.files.delete(file));
      }
      
      this.notifyFileSystemChange();
      return '';
    }
    
    return `rm: cannot remove '${target}': No such file or directory`;
  }

  private handleCat(args: string[]): string {
    if (args.length === 0) {
      return 'cat: missing operand';
    }
    
    const fileName = args[0];
    const resolvedPath = this.resolvePath(fileName);
    const file = this.vfs.files.get(resolvedPath);
    
    if (!file) {
      return `cat: ${fileName}: No such file or directory`;
    }
    
    return file.content;
  }

  getAutoComplete(partial: string): string[] {
    const suggestions: string[] = [];
    
    // Command suggestions
    const commands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'touch', 'echo', 'clear',
      'cp', 'mv', 'grep', 'find', 'tree', 'code', 'edit', 'npm', 'yarn',
      'node', 'git', 'curl', 'wget', 'env', 'history', 'ps', 'which',
      'help', 'python', 'pip', 'serve', 'exit'
    ];
    
    // Add matching commands
    commands.forEach(cmd => {
      if (cmd.startsWith(partial)) {
        suggestions.push(cmd);
      }
    });
    
    // Add file/directory suggestions for current directory
    const currentDir = this.vfs.currentDirectory;
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, currentDir) && dir !== currentDir) {
        const segments = dir.split('/');
        const dirSegments = currentDir.split('/');
        if (segments.length === dirSegments.length + 1) {
          const name = segments[segments.length - 1];
          if (name.startsWith(partial)) {
            suggestions.push(name + '/');
          }
        }
      }
    }
    
    // Add files
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, currentDir)) {
        const segments = filePath.split('/');
        const dirSegments = currentDir.split('/');
        if (segments.length === dirSegments.length + 1) {
          const name = segments[segments.length - 1];
          if (name.startsWith(partial)) {
            suggestions.push(name);
          }
        }
      }
    }
    
    return suggestions.slice(0, 10); // Limit suggestions
  }

  private notifyFileSystemChange() {
    if (this.onFileSystemChange) {
      const files = this.convertToFileNodes();
      this.onFileSystemChange(files);
    }
  }

  private convertToFileNodes(): FileNode[] {
    const nodes: Map<string, FileNode> = new Map();
    
    // Create file nodes
    for (const [filePath, fileData] of this.vfs.files) {
      const segments = filePath.split('/').filter(s => s);
      const name = segments[segments.length - 1];
      
      nodes.set(filePath, {
        id: filePath,
        name,
        type: 'file',
        content: fileData.content,
        mimeType: fileData.mimeType
      });
    }
    
    // Create directory nodes
    for (const dirPath of this.vfs.directories) {
      if (dirPath === '/') continue;
      
      const segments = dirPath.split('/').filter(s => s);
      const name = segments[segments.length - 1];
      
      if (!nodes.has(dirPath)) {
        nodes.set(dirPath, {
          id: dirPath,
          name,
          type: 'folder',
          children: []
        });
      }
    }
    
    // Build hierarchy
    const rootNodes: FileNode[] = [];
    const sortedPaths = Array.from(nodes.keys()).sort();
    
    for (const path of sortedPaths) {
      const node = nodes.get(path)!;
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      
      if (parentPath === '/') {
        rootNodes.push(node);
      } else {
        const parent = nodes.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    }
    
    return rootNodes;
  }

  getCurrentDirectory(): string {
    return this.vfs.currentDirectory;
  }

  getEnvironment(key: string): string | undefined {
    return this.environment.get(key);
  }

  private handleGitCommands(args: string[]): string {
    const command = args[0] || '';
    
    switch (command) {
      case 'status':
        return `On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean`;
      
      case 'add':
        const files = args.slice(1);
        return files.length > 0 
          ? `Added ${files.join(', ')} to staging area`
          : 'Nothing specified, nothing added.';
      
      case 'commit':
        const message = args.find(arg => arg.startsWith('-m'))
          ? args[args.indexOf('-m') + 1]
          : 'Initial commit';
        return `[main ${Math.random().toString(36).substr(2, 7)}] ${message}\n 1 file changed, 1 insertion(+)`;
      
      case 'push':
        return `Enumerating objects: 3, done.\nCounting objects: 100% (3/3), done.\nWriting objects: 100% (3/3), 250 bytes | 250.00 KiB/s, done.\nTotal 3 (delta 0), reused 0 (delta 0), pack-reused 0\nTo origin\n   abc123..def456  main -> main`;
      
      case 'pull':
        return `Already up to date.`;
      
      case 'branch':
        return `* main\n  develop`;
      
      case 'log':
        return `commit def456789 (HEAD -> main, origin/main)\nAuthor: Developer <dev@example.com>\nDate:   ${new Date().toDateString()}\n\n    Latest changes\n\ncommit abc123456\nAuthor: Developer <dev@example.com>\nDate:   ${new Date().toDateString()}\n\n    Initial commit`;
      
      case 'clone':
        const repo = args[1];
        return repo 
          ? `Cloning into '${repo.split('/').pop()?.replace('.git', '') || 'repository'}'...\nremote: Enumerating objects: 10, done.\nremote: Total 10 (delta 0), reused 0 (delta 0), pack-reused 10\nReceiving objects: 100% (10/10), done.`
          : 'fatal: You must specify a repository to clone.';
      
      case 'init':
        return `Initialized empty Git repository in ${this.vfs.currentDirectory}/.git/`;
      
      default:
        return `git: Available commands:\n  status     Show the working tree status\n  add        Add file contents to the index\n  commit     Record changes to the repository\n  push       Update remote refs\n  pull       Fetch and integrate changes\n  branch     List, create, or delete branches\n  log        Show commit logs\n  clone      Clone a repository\n  init       Create an empty Git repository`;
    }
  }

  private handleCodeCommand(args: string[]): string {
    if (args.length === 0) {
      return 'Usage: code <filename>';
    }
    
    const fileName = args[0];
    const resolvedPath = this.resolvePath(fileName);
    
    if (this.vfs.files.has(resolvedPath)) {
      return `Opening ${fileName} in editor...`;
    } else {
      return `File ${fileName} not found. Create it first with: touch ${fileName}`;
    }
  }

  private handleTouch(args: string[]): string {
    if (args.length === 0) {
      return 'touch: missing file operand';
    }
    
    const fileName = args[0];
    const resolvedPath = this.resolvePath(fileName);
    
    if (!this.vfs.files.has(resolvedPath)) {
      this.vfs.files.set(resolvedPath, { content: '' });
      this.notifyFileSystemChange();
      return '';
    } else {
      // File exists, just update timestamp (simulated)
      return '';
    }
  }

  private handleEdit(args: string[]): string {
    if (args.length === 0) {
      return 'edit: missing file operand';
    }
    
    const fileName = args[0];
    const resolvedPath = this.resolvePath(fileName);
    const file = this.vfs.files.get(resolvedPath);
    
    if (!file) {
      return `edit: ${fileName}: No such file or directory`;
    }
    
    return `Editing ${fileName}...\n${file.content}`;
  }

  private handleCp(args: string[]): string {
    if (args.length < 2) {
      return 'cp: missing destination file operand';
    }
    
    const source = args[0];
    const dest = args[1];
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(dest);
    
    const sourceFile = this.vfs.files.get(sourcePath);
    if (!sourceFile) {
      return `cp: cannot stat '${source}': No such file or directory`;
    }
    
    this.vfs.files.set(destPath, { ...sourceFile });
    this.notifyFileSystemChange();
    return '';
  }

  private handleMv(args: string[]): string {
    if (args.length < 2) {
      return 'mv: missing destination file operand';
    }
    
    const source = args[0];
    const dest = args[1];
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(dest);
    
    const sourceFile = this.vfs.files.get(sourcePath);
    if (!sourceFile) {
      return `mv: cannot stat '${source}': No such file or directory`;
    }
    
    this.vfs.files.set(destPath, { ...sourceFile });
    this.vfs.files.delete(sourcePath);
    this.notifyFileSystemChange();
    return '';
  }

  private handleGrep(args: string[]): string {
    if (args.length < 2) {
      return 'grep: missing pattern or file';
    }
    
    const pattern = args[0];
    const fileName = args[1];
    const resolvedPath = this.resolvePath(fileName);
    const file = this.vfs.files.get(resolvedPath);
    
    if (!file) {
      return `grep: ${fileName}: No such file or directory`;
    }
    
    const lines = file.content.split('\n');
    const matches = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => line.includes(pattern))
      .map(({ line, number }) => `${number}:${line}`)
      .join('\n');
    
    return matches || `grep: no matches found for '${pattern}'`;
  }

  private handleFind(args: string[]): string {
    const pattern = args[0] || '*';
    const searchPath = this.vfs.currentDirectory;
    const results: string[] = [];
    
    // Find matching files
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, searchPath)) {
        const fileName = filePath.split('/').pop() || '';
        if (pattern === '*' || fileName.includes(pattern)) {
          results.push(filePath);
        }
      }
    }
    
    // Find matching directories
    for (const dirPath of this.vfs.directories) {
      if (this.isInDirectory(dirPath, searchPath) && dirPath !== searchPath) {
        const dirName = dirPath.split('/').pop() || '';
        if (pattern === '*' || dirName.includes(pattern)) {
          results.push(dirPath);
        }
      }
    }
    
    return results.join('\n') || `find: no matches found for '${pattern}'`;
  }

  private handlePs(): string {
    return `  PID TTY          TIME CMD
    1 ?        00:00:01 init
 1234 pts/0    00:00:00 bash
 5678 pts/0    00:00:00 node
 9012 pts/0    00:00:00 ps`;
  }

  private handleWhich(args: string[]): string {
    if (args.length === 0) {
      return 'which: missing command';
    }
    
    const command = args[0];
    const commonCommands = new Map([
      ['node', '/usr/bin/node'],
      ['npm', '/usr/bin/npm'],
      ['git', '/usr/bin/git'],
      ['python', '/usr/bin/python'],
      ['bash', '/bin/bash'],
      ['curl', '/usr/bin/curl'],
      ['wget', '/usr/bin/wget']
    ]);
    
    const path = commonCommands.get(command);
    return path || `which: no ${command} in (/usr/bin:/bin:/usr/local/bin)`;
  }

  private handleTree(args: string[]): string {
    const targetPath = args[0] ? this.resolvePath(args[0]) : this.vfs.currentDirectory;
    
    if (!this.vfs.directories.has(targetPath)) {
      return `tree: ${args[0] || '.'}: No such file or directory`;
    }
    
    const result: string[] = [targetPath];
    const items: Array<{ path: string; isFile: boolean; depth: number }> = [];
    
    // Collect all items
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, targetPath) && dir !== targetPath) {
        const depth = dir.split('/').length - targetPath.split('/').length;
        items.push({ path: dir, isFile: false, depth });
      }
    }
    
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, targetPath)) {
        const depth = filePath.split('/').length - targetPath.split('/').length;
        items.push({ path: filePath, isFile: true, depth });
      }
    }
    
    // Sort by depth and name
    items.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.path.localeCompare(b.path);
    });
    
    // Generate tree structure
    items.forEach((item, index) => {
      const name = item.path.split('/').pop() || '';
      const isLast = index === items.length - 1 || 
        items[index + 1]?.depth < item.depth;
      const prefix = '│   '.repeat(item.depth - 1) + 
        (isLast ? '└── ' : '├── ');
      result.push(prefix + name + (item.isFile ? '' : '/'));
    });
    
    const fileCount = items.filter(i => i.isFile).length;
    const dirCount = items.filter(i => !i.isFile).length;
    result.push(`\n${dirCount} directories, ${fileCount} files`);
    
    return result.join('\n');
  }

  private async handleCurl(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'curl: try \'curl --help\' for more information';
    }

    const url = args[args.length - 1];
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`<!DOCTYPE html>
<html>
<head>
    <title>Example Response</title>
</head>
<body>
    <h1>Simulated HTTP Response</h1>
    <p>This is a simulated response from ${url}</p>
    <p>Status: 200 OK</p>
</body>
</html>`);
      }, 1000);
    });
  }

  private async handleWget(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'wget: missing URL\nUsage: wget [URL]';
    }

    const url = args[0];
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Simulated download from ${url}\n--2024-01-01 12:00:00--  ${url}\nResolving hostname... done.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 [text/html]\nSaving to: 'index.html'\n\nindex.html saved [1024/1024]`);
      }, 1000);
    });
  }

  private async handlePackageManager(cmd: string, args: string[]): Promise<string> {
    const command = args[0] || '';
    
    switch (command) {
      case 'install':
      case 'i':
        const packages = args.slice(1);
        if (packages.length === 0) {
          return `${cmd}: Reading package.json...\n✓ All dependencies installed!`;
        }
        
        // Install packages one by one
        const results: string[] = [`${cmd}: Installing ${packages.join(', ')}...`];
        for (const pkg of packages) {
          try {
            const installed = await this.packageManager.installPackage(pkg);
            if (installed) {
              results.push(`✓ ${pkg}@${installed.installedVersion} installed successfully`);
            } else {
              results.push(`✗ Failed to install ${pkg}`);
            }
          } catch (error) {
            results.push(`✗ Error installing ${pkg}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        return results.join('\n');
      
      case 'list':
      case 'ls':
        const installedPackages = this.packageManager.getInstalledPackages();
        if (installedPackages.length === 0) {
          return `${cmd}: No packages installed`;
        }
        const packageList = installedPackages
          .map(pkg => `${pkg.name}@${pkg.installedVersion}`)
          .join('\n');
        return `${cmd}: Installed packages:\n${packageList}`;
      
      case 'uninstall':
      case 'remove':
        const toRemove = args.slice(1);
        if (toRemove.length === 0) {
          return `${cmd}: missing package name`;
        }
        const removeResults: string[] = [`${cmd}: Removing ${toRemove.join(', ')}...`];
        for (const pkg of toRemove) {
          const success = this.packageManager.uninstallPackage(pkg);
          if (success) {
            removeResults.push(`✓ ${pkg} removed successfully`);
          } else {
            removeResults.push(`✗ Package ${pkg} not found`);
          }
        }
        return removeResults.join('\n');
      
      case 'run':
        const script = args[1];
        return script 
          ? `${cmd}: Running script "${script}"...\n> ${script}\n✓ Script executed successfully!`
          : `${cmd}: Available scripts:\n  start    Start development server\n  build    Build for production\n  test     Run tests`;
      
      case 'start':
        return `${cmd}: Starting development server...\n🚀 Server running at http://localhost:3000`;
      
      case 'build':
        return `${cmd}: Building for production...\n📦 Build completed successfully!`;
      
      case 'test':
        return `${cmd}: Running tests...\n✅ All tests passed!`;
      
      case 'init':
        return `${cmd}: Initializing new project...\n📄 package.json created successfully!`;
      
      case 'version':
      case '--version':
      case '-v':
        return `${cmd} version 8.19.2`;
      
      default:
        return `${cmd}: Available commands:\n  install, i       Install dependencies\n  uninstall        Remove dependencies\n  list, ls         List installed packages\n  run              Run script\n  start            Start development server\n  build            Build for production\n  test             Run tests\n  init             Initialize project`;
    }
  }

  private handleNode(args: string[]): string {
    if (args.length === 0) {
      return 'Node.js REPL (simulated)\nWelcome to Node.js v18.17.0.\nType ".help" for more information.\n> Use Ctrl+C to exit';
    }
    
    const filename = args[0];
    if (filename === '--version' || filename === '-v') {
      return 'v18.17.0';
    }
    
    const filePath = this.resolvePath(filename);
    if (this.vfs.files.has(filePath)) {
      return `Executing ${filename}...\n✓ Script executed successfully!`;
    } else {
      return `Error: Cannot find module '${filename}'`;
    }
  }

  private handlePython(args: string[]): string {
    if (args.length === 0) {
      return 'Python 3.9.7 (simulated)\nType "help", "copyright", "credits" or "license" for more information.\n>>> Use Ctrl+C to exit';
    }
    
    const filename = args[0];
    if (filename === '--version' || filename === '-V') {
      return 'Python 3.9.7';
    }
    
    const filePath = this.resolvePath(filename);
    if (this.vfs.files.has(filePath)) {
      return `Executing ${filename}...\n✓ Python script executed successfully!`;
    } else {
      return `python: can't open file '${filename}': [Errno 2] No such file or directory`;
    }
  }

  private handlePip(args: string[]): string {
    const command = args[0] || '';
    
    switch (command) {
      case 'install':
        const packages = args.slice(1);
        return packages.length > 0 
          ? `Installing ${packages.join(', ')}...\n✓ Successfully installed packages!`
          : 'pip install: missing package name';
      
      case 'list':
        return 'Package    Version\n---------- -------\npip        21.2.4\nsetuptools 58.0.4\nwheel      0.37.1';
      
      case '--version':
        return 'pip 21.2.4';
      
      default:
        return 'pip: Available commands:\n  install    Install packages\n  list       List installed packages\n  --version  Show version';
    }
  }

  private handleServe(args: string[]): string {
    const port = args.find(arg => arg.match(/^\d+$/)) || '8000';
    return `Starting HTTP server on port ${port}...\n🌐 Server running at http://localhost:${port}\n📁 Serving files from current directory\nPress Ctrl+C to stop`;
  }

  private handleEnv(args: string[]): string {
    if (args.length === 0) {
      const envVars = Array.from(this.environment.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      return envVars;
    }
    
    const varName = args[0];
    const value = this.environment.get(varName);
    return value || `${varName}: environment variable not set`;
  }

  private handleHistory(): string {
    return this.commandHistory
      .slice(-20) // Show last 20 commands
      .map((cmd, index) => `${index + 1}  ${cmd.command} ${cmd.args.join(' ')}`)
      .join('\n');
  }

  private getHelpText(): string {
    return `
File System Commands:
  ls, dir           List directory contents (-la for detailed)
  cd <path>         Change directory
  pwd               Print working directory
  mkdir <name>      Create directory
  rm, rmdir <path>  Remove file/directory (-rf for recursive)
  cat, type <file>  Display file contents
  touch <file>      Create or update file
  cp, copy          Copy files
  mv, move          Move/rename files
  find <pattern>    Find files
  tree              Display directory tree

Development Tools:
  npm, yarn, pnpm   Package managers (install, run, build, test)
  node <file>       Run Node.js scripts
  python <file>     Run Python scripts  
  pip               Python package manager
  git               Version control (status, add, commit, push, pull)
  code, edit        Open files in editor

Network & System:
  curl <url>        Download from URL
  wget <url>        Download files
  serve, http-server Start HTTP server
  env, set          Environment variables
  ps                List processes
  which <cmd>       Locate command
  whoami            Current user
  date              Current date/time
  uptime            System uptime
  history           Command history

Utilities:
  echo <text>       Display text
  grep <pattern>    Search in files
  clear, cls        Clear screen
  help              Show this help
  exit, quit        Exit terminal

`;
  }
}