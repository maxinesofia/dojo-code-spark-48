import { FileNode } from '../types/FileTypes';

export interface TerminalCommand {
  command: string;
  args: string[];
  timestamp: Date;
  output: string;
  exitCode: number;
}

export interface VirtualFileSystem {
  currentDirectory: string;
  files: Map<string, FileNode>;
  directories: Set<string>;
}

export class WebTerminalService {
  private history: TerminalCommand[] = [];
  private vfs: VirtualFileSystem;
  private environment: Map<string, string> = new Map();
  private aliases: Map<string, string> = new Map();

  constructor() {
    this.vfs = {
      currentDirectory: '/',
      files: new Map(),
      directories: new Set(['/'])
    };
    
    this.setupDefaultEnvironment();
    this.setupDefaultAliases();
  }

  private setupDefaultEnvironment(): void {
    this.environment.set('PWD', '/');
    this.environment.set('HOME', '/');
    this.environment.set('USER', 'developer');
    this.environment.set('SHELL', '/bin/bash');
    this.environment.set('TERM', 'xterm-256color');
    this.environment.set('PATH', '/bin:/usr/bin:/usr/local/bin:/node_modules/.bin');
  }

  private setupDefaultAliases(): void {
    this.aliases.set('ll', 'ls -la');
    this.aliases.set('la', 'ls -la');
    this.aliases.set('..', 'cd ..');
    this.aliases.set('...', 'cd ../..');
    this.aliases.set('cls', 'clear');
  }

  setupVirtualFS(files: FileNode[]): void {
    this.vfs.files.clear();
    this.vfs.directories.clear();
    this.vfs.directories.add('/');

    this.processFileNodes(files, '/');
  }

  private processFileNodes(nodes: FileNode[], currentPath: string): void {
    nodes.forEach(node => {
      const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
      
      if (node.type === 'folder') {
        this.vfs.directories.add(fullPath);
        if (node.children) {
          this.processFileNodes(node.children, fullPath);
        }
      } else {
        this.vfs.files.set(fullPath, node);
        // Also add parent directories
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        if (parentPath !== '/') {
          this.vfs.directories.add(parentPath);
        }
      }
    });
  }

  async executeCommand(command: string): Promise<string> {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return '';

    // Expand aliases
    const expandedCommand = this.expandAliases(trimmedCommand);
    
    // Parse command and arguments
    const parts = this.parseCommand(expandedCommand);
    const cmd = parts[0];
    const args = parts.slice(1);

    const terminalCommand: TerminalCommand = {
      command: trimmedCommand,
      args,
      timestamp: new Date(),
      output: '',
      exitCode: 0
    };

    try {
      switch (cmd) {
        case 'ls':
          terminalCommand.output = await this.handleLs(args);
          break;
        case 'cd':
          terminalCommand.output = await this.handleCd(args);
          break;
        case 'pwd':
          terminalCommand.output = this.vfs.currentDirectory;
          break;
        case 'mkdir':
          terminalCommand.output = await this.handleMkdir(args);
          break;
        case 'rm':
          terminalCommand.output = await this.handleRm(args);
          break;
        case 'cat':
          terminalCommand.output = await this.handleCat(args);
          break;
        case 'grep':
          terminalCommand.output = await this.handleGrep(args);
          break;
        case 'echo':
          terminalCommand.output = args.join(' ');
          break;
        case 'env':
          terminalCommand.output = this.handleEnv();
          break;
        case 'export':
          terminalCommand.output = this.handleExport(args);
          break;
        case 'history':
          terminalCommand.output = this.handleHistory();
          break;
        case 'clear':
          terminalCommand.output = '\x1b[2J\x1b[H';
          break;
        case 'npm':
          terminalCommand.output = await this.handleNpmCommands(args);
          break;
        case 'node':
          terminalCommand.output = await this.handleNodeCommand(args);
          break;
        case 'help':
          terminalCommand.output = this.handleHelp();
          break;
        default:
          terminalCommand.output = `bash: ${cmd}: command not found`;
          terminalCommand.exitCode = 127;
      }
    } catch (error) {
      terminalCommand.output = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      terminalCommand.exitCode = 1;
    }

    this.history.push(terminalCommand);
    return terminalCommand.output;
  }

  private expandAliases(command: string): string {
    const parts = command.split(' ');
    const cmd = parts[0];
    
    if (this.aliases.has(cmd)) {
      const aliasValue = this.aliases.get(cmd)!;
      return aliasValue + ' ' + parts.slice(1).join(' ');
    }
    
    return command;
  }

  private parseCommand(command: string): string[] {
    // Simple command parsing (doesn't handle complex shell features)
    return command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  }

  private async handleLs(args: string[]): Promise<string> {
    let path = this.vfs.currentDirectory;
    let showHidden = false;
    let longFormat = false;
    let showAll = false;

    // Parse flags
    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('a')) showAll = true;
        if (arg.includes('l')) longFormat = true;
        if (arg.includes('h')) showHidden = true;
      } else {
        path = this.resolvePath(arg);
      }
    }

    const items: string[] = [];
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, path) && dir !== path) {
        const name = dir.substring(path.length + (path === '/' ? 0 : 1));
        if (name && !name.includes('/')) {
          if (showAll || !name.startsWith('.')) {
            items.push(longFormat ? `drwxr-xr-x  2 developer developer  4096 ${new Date().toDateString()} ${name}/` : `${name}/`);
          }
        }
      }
    }

    // Add files
    for (const [filePath, file] of this.vfs.files) {
      if (this.isInDirectory(filePath, path)) {
        const name = filePath.substring(path.length + (path === '/' ? 0 : 1));
        if (name && !name.includes('/')) {
          if (showAll || !name.startsWith('.')) {
            if (longFormat) {
              const size = file.content?.length || 0;
              items.push(`-rw-r--r--  1 developer developer  ${size.toString().padStart(6)} ${new Date().toDateString()} ${name}`);
            } else {
              items.push(name);
            }
          }
        }
      }
    }

    return items.sort().join('\n');
  }

  private async handleCd(args: string[]): Promise<string> {
    const target = args[0] || this.environment.get('HOME') || '/';
    const newPath = this.resolvePath(target);

    if (this.vfs.directories.has(newPath)) {
      this.vfs.currentDirectory = newPath;
      this.environment.set('PWD', newPath);
      return '';
    } else {
      throw new Error(`cd: ${target}: No such file or directory`);
    }
  }

  private async handleMkdir(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('mkdir: missing operand');
    }

    for (const arg of args) {
      const path = this.resolvePath(arg);
      this.vfs.directories.add(path);
    }

    return '';
  }

  private async handleRm(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('rm: missing operand');
    }

    let recursive = false;
    const files: string[] = [];

    for (const arg of args) {
      if (arg === '-r' || arg === '-rf') {
        recursive = true;
      } else {
        files.push(arg);
      }
    }

    for (const file of files) {
      const path = this.resolvePath(file);
      
      if (this.vfs.files.has(path)) {
        this.vfs.files.delete(path);
      } else if (this.vfs.directories.has(path)) {
        if (recursive) {
          // Remove directory and all contents
          for (const [filePath] of this.vfs.files) {
            if (filePath.startsWith(path + '/')) {
              this.vfs.files.delete(filePath);
            }
          }
          for (const dir of Array.from(this.vfs.directories)) {
            if (dir.startsWith(path + '/') || dir === path) {
              this.vfs.directories.delete(dir);
            }
          }
        } else {
          throw new Error(`rm: ${file}: is a directory`);
        }
      } else {
        throw new Error(`rm: ${file}: No such file or directory`);
      }
    }

    return '';
  }

  private async handleCat(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('cat: missing operand');
    }

    const outputs: string[] = [];
    
    for (const arg of args) {
      const path = this.resolvePath(arg);
      const file = this.vfs.files.get(path);
      
      if (file) {
        outputs.push(file.content || '');
      } else {
        throw new Error(`cat: ${arg}: No such file or directory`);
      }
    }

    return outputs.join('\n');
  }

  private async handleGrep(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('grep: missing pattern or file');
    }

    const pattern = args[0];
    const file = args[1];
    const path = this.resolvePath(file);
    const fileNode = this.vfs.files.get(path);

    if (!fileNode) {
      throw new Error(`grep: ${file}: No such file or directory`);
    }

    const lines = (fileNode.content || '').split('\n');
    const matches = lines.filter(line => line.includes(pattern));
    
    return matches.join('\n');
  }

  private handleEnv(): string {
    const envVars: string[] = [];
    for (const [key, value] of this.environment) {
      envVars.push(`${key}=${value}`);
    }
    return envVars.sort().join('\n');
  }

  private handleExport(args: string[]): string {
    if (args.length === 0) {
      return this.handleEnv();
    }

    for (const arg of args) {
      const [key, value] = arg.split('=', 2);
      if (value !== undefined) {
        this.environment.set(key, value);
      }
    }

    return '';
  }

  private handleHistory(): string {
    return this.history
      .map((cmd, index) => `${index + 1}  ${cmd.command}`)
      .join('\n');
  }

  private async handleNpmCommands(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'npm <command>\n\nUsage:\n  npm install\n  npm run <script>\n  npm test\n  npm start\n  npm build';
    }

    const subcommand = args[0];

    switch (subcommand) {
      case 'install':
      case 'i':
        return this.handleNpmInstall(args.slice(1));
      case 'run':
        return this.handleNpmRun(args.slice(1));
      case 'test':
        return 'Running tests...\n✓ All tests passed!';
      case 'start':
        return 'Starting development server...\n✓ Server running on http://localhost:3000';
      case 'build':
        return 'Building project...\n✓ Build completed successfully!';
      case 'version':
        return 'npm: 9.0.0\nnode: 18.0.0';
      default:
        return `npm: '${subcommand}' is not a npm command. See 'npm help'.`;
    }
  }

  private handleNpmInstall(packages: string[]): string {
    if (packages.length === 0) {
      return 'Installing dependencies...\n✓ Dependencies installed successfully!';
    }

    return `Installing ${packages.join(', ')}...\n✓ Packages installed successfully!`;
  }

  private handleNpmRun(args: string[]): string {
    if (args.length === 0) {
      return 'Available scripts:\n  dev: vite\n  build: vite build\n  preview: vite preview';
    }

    const script = args[0];
    switch (script) {
      case 'dev':
        return 'Starting development server...\n✓ Server running on http://localhost:3000';
      case 'build':
        return 'Building project...\n✓ Build completed successfully!';
      case 'preview':
        return 'Starting preview server...\n✓ Preview server running on http://localhost:4173';
      default:
        return `Error: Missing script: "${script}"`;
    }
  }

  private async handleNodeCommand(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'Node.js v18.0.0\nType ".help" for more information.';
    }

    if (args[0] === '--version' || args[0] === '-v') {
      return 'v18.0.0';
    }

    const filename = args[0];
    const path = this.resolvePath(filename);
    const file = this.vfs.files.get(path);

    if (!file) {
      throw new Error(`Error: Cannot find module '${filename}'`);
    }

    return `Executing ${filename}...\n✓ Script executed successfully!`;
  }

  private handleHelp(): string {
    return `Available commands:
  ls [options] [path]     - List directory contents
  cd [path]              - Change directory
  pwd                    - Print working directory
  mkdir <name>           - Create directory
  rm [options] <file>    - Remove files/directories
  cat <file>             - Display file contents
  grep <pattern> <file>  - Search for pattern in file
  echo <text>            - Display text
  env                    - Show environment variables
  export <var>=<value>   - Set environment variable
  history                - Show command history
  clear                  - Clear terminal
  npm <command>          - NPM package manager
  node [file]            - Run Node.js
  help                   - Show this help

Shortcuts:
  ll, la                 - ls -la
  ..                     - cd ..
  cls                    - clear`;
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path === '/' ? '/' : path.replace(/\/$/, '');
    }

    let resolved = this.vfs.currentDirectory;
    const parts = path.split('/');

    for (const part of parts) {
      if (part === '' || part === '.') {
        continue;
      } else if (part === '..') {
        if (resolved !== '/') {
          resolved = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
        }
      } else {
        resolved = resolved === '/' ? `/${part}` : `${resolved}/${part}`;
      }
    }

    return resolved;
  }

  private isInDirectory(filePath: string, dirPath: string): boolean {
    if (dirPath === '/') {
      return true;
    }
    return filePath.startsWith(dirPath + '/');
  }

  showCommandHistory(): string[] {
    return this.history.map(cmd => cmd.command);
  }

  getEnvironment(key: string): string | undefined {
    return this.environment.get(key);
  }

  setEnvironment(key: string, value: string): void {
    this.environment.set(key, value);
  }

  getCurrentDirectory(): string {
    return this.vfs.currentDirectory;
  }

  getAutoComplete(partial: string): string[] {
    const suggestions: string[] = [];
    
    // Command suggestions
    const commands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'grep', 'echo', 'env', 'export', 'history', 'clear', 'npm', 'node', 'help'];
    suggestions.push(...commands.filter(cmd => cmd.startsWith(partial)));

    // File/directory suggestions for current directory
    const currentDir = this.vfs.currentDirectory;
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, currentDir) && dir !== currentDir) {
        const name = dir.substring(currentDir.length + (currentDir === '/' ? 0 : 1));
        if (name && !name.includes('/') && name.startsWith(partial)) {
          suggestions.push(name + '/');
        }
      }
    }

    // Add files
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, currentDir)) {
        const name = filePath.substring(currentDir.length + (currentDir === '/' ? 0 : 1));
        if (name && !name.includes('/') && name.startsWith(partial)) {
          suggestions.push(name);
        }
      }
    }

    return suggestions.sort();
  }
}