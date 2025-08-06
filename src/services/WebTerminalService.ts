import { FileNode } from '../types/FileTypes';

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

  constructor() {
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
          terminalCommand.output = this.handleLs(args);
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
        case 'echo':
          terminalCommand.output = args.join(' ');
          break;
        case 'env':
          terminalCommand.output = Array.from(this.environment.entries())
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
          break;
        case 'export':
          terminalCommand.output = this.handleExport(args);
          break;
        case 'history':
          terminalCommand.output = this.commandHistory
            .map((cmd, index) => `${index + 1}  ${cmd.command} ${cmd.args.join(' ')}`)
            .join('\n');
          break;
        case 'clear':
          terminalCommand.output = '';
          break;
        case 'npm':
          terminalCommand.output = this.handleNpmCommands(args);
          break;
        case 'node':
          terminalCommand.output = await this.handleNodeCommand(args);
          break;
        case 'git':
          terminalCommand.output = this.handleGitCommands(args);
          break;
        case 'code':
          terminalCommand.output = this.handleCodeCommand(args);
          break;
        case 'touch':
          terminalCommand.output = await this.handleTouch(args);
          break;
        case 'nano':
        case 'vim':
        case 'edit':
          terminalCommand.output = this.handleEdit(args);
          break;
        case 'cp':
          terminalCommand.output = await this.handleCp(args);
          break;
        case 'mv':
          terminalCommand.output = await this.handleMv(args);
          break;
        case 'find':
          terminalCommand.output = this.handleFind(args);
          break;
        case 'grep':
          terminalCommand.output = await this.handleGrep(args);
          break;
        case 'tree':
          terminalCommand.output = this.handleTree(args);
          break;
        case 'curl':
          terminalCommand.output = await this.handleCurl(args);
          break;
        case 'wget':
          terminalCommand.output = await this.handleWget(args);
          break;
        case 'ps':
          terminalCommand.output = this.handlePs();
          break;
        case 'which':
          terminalCommand.output = this.handleWhich(args);
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

    this.commandHistory.push(terminalCommand);
    return terminalCommand.output;
  }

  private expandAliases(command: string): string {
    const [cmd, ...args] = command.trim().split(/\s+/);
    const expanded = this.aliases.get(cmd);
    return expanded ? `${expanded} ${args.join(' ')}`.trim() : command;
  }

  private parseCommand(command: string): string[] {
    return command.trim().split(/\s+/).filter(arg => arg.length > 0);
  }

  getCurrentDirectory(): string {
    return this.vfs.currentDirectory;
  }

  getEnvironment(key: string): string | undefined {
    return this.environment.get(key);
  }

  clearTerminal(): void {
    // This method can be called by the clear command
  }

  private handleLs(args: string[]): string {
    let showHidden = false;
    let longFormat = false;
    let path = this.vfs.currentDirectory;

    // Parse arguments
    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('a')) showHidden = true;
        if (arg.includes('l')) longFormat = true;
      } else {
        path = this.resolvePath(arg);
      }
    }

    const items: string[] = [];
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, path) && dir !== path) {
        const name = dir.substring(path.length + 1);
        if (!name.includes('/') && (showHidden || !name.startsWith('.'))) {
          if (longFormat) {
            items.push(`drwxr-xr-x 2 developer developer 4096 ${new Date().toLocaleDateString()} ${name}/`);
          } else {
            items.push(name + '/');
          }
        }
      }
    }

    // Add files
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, path)) {
        const name = filePath.substring(path.length + 1);
        if (!name.includes('/') && (showHidden || !name.startsWith('.'))) {
          if (longFormat) {
            const file = this.vfs.files.get(filePath);
            const size = file?.content?.length || 0;
            items.push(`-rw-r--r-- 1 developer developer ${size} ${new Date().toLocaleDateString()} ${name}`);
          } else {
            items.push(name);
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

  private handleExport(args: string[]): string {
    if (args.length === 0) {
      return Array.from(this.environment.entries())
        .map(([key, value]) => `declare -x ${key}="${value}"`)
        .join('\n');
    }

    for (const arg of args) {
      const [key, value] = arg.split('=');
      if (key && value !== undefined) {
        this.environment.set(key, value);
      }
    }

    return '';
  }

  private handleNpmCommands(args: string[]): string {
    const [subCommand] = args;
    
    switch (subCommand) {
      case 'init':
        return 'Initialized a new npm project!\n✓ package.json created';
      case 'install':
      case 'i':
        const packageName = args[1] || 'dependencies';
        return `Installing ${packageName}...\n✓ Package installed successfully!`;
      case 'start':
        return '🚀 Starting development server...\n✓ Server running on http://localhost:3000';
      case 'build':
        return '📦 Building project...\n✓ Build completed successfully!';
      case 'test':
        return '🧪 Running tests...\n✓ All tests passed!';
      case 'version':
        return 'npm v9.8.1';
      case 'list':
      case 'ls':
        return 'project@1.0.0\n├── react@18.2.0\n├── typescript@5.1.0\n└── vite@4.4.0';
      default:
        return `npm ${subCommand || ''}\nUsage: npm <command>\n\nCommands:\n  init     Initialize a new project\n  install  Install dependencies\n  start    Start development server\n  build    Build for production\n  test     Run tests`;
    }
  }

  private async handleNodeCommand(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'Node.js v18.17.0\nWelcome to Node.js REPL (simulated)';
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
    return `\x1b[1m\x1b[36mTutorials Dojo Terminal - Available Commands\x1b[0m

\x1b[1m\x1b[33mFile System:\x1b[0m
\x1b[32mls\x1b[0m [options] [path]      List directory contents
\x1b[32mcd\x1b[0m [path]               Change directory  
\x1b[32mpwd\x1b[0m                      Print working directory
\x1b[32mmkdir\x1b[0m <name>             Create directory
\x1b[32mrm\x1b[0m [options] <file>      Remove files/directories
\x1b[32mcat\x1b[0m <file>               Display file contents
\x1b[32mtouch\x1b[0m <file>             Create empty file
\x1b[32medit\x1b[0m <file>              View file content
\x1b[32mnano\x1b[0m, \x1b[32mvim\x1b[0m <file>        View file content
\x1b[32mcp\x1b[0m <src> <dest>          Copy files
\x1b[32mmv\x1b[0m <src> <dest>          Move/rename files
\x1b[32mfind\x1b[0m <path> <name>       Find files
\x1b[32mtree\x1b[0m [path]              Display directory tree

\x1b[1m\x1b[33mText Processing:\x1b[0m
\x1b[32mgrep\x1b[0m <pattern> <file>    Search for pattern in file
\x1b[32mecho\x1b[0m <text>              Display text

\x1b[1m\x1b[33mSystem:\x1b[0m
\x1b[32menv\x1b[0m                      Show environment variables
\x1b[32mexport\x1b[0m <var>=<value>     Set environment variable
\x1b[32mhistory\x1b[0m                  Show command history
\x1b[32mclear\x1b[0m                    Clear terminal
\x1b[32mps\x1b[0m                       List running processes
\x1b[32mwhich\x1b[0m <command>          Show command location

\x1b[1m\x1b[33mDevelopment:\x1b[0m
\x1b[32mnpm\x1b[0m <command>            NPM package manager
\x1b[32mnode\x1b[0m <file>              Run Node.js script
\x1b[32mgit\x1b[0m <command>            Git version control
\x1b[32mcode\x1b[0m <file>              Open file in editor

\x1b[1m\x1b[33mNetwork:\x1b[0m
\x1b[32mcurl\x1b[0m <url>               Download from URL
\x1b[32mwget\x1b[0m <url>               Download file

\x1b[1m\x1b[33mShortcuts:\x1b[0m
\x1b[32mll\x1b[0m, \x1b[32mla\x1b[0m                  ls -la
\x1b[32m..\x1b[0m                       cd ..
\x1b[32mcls\x1b[0m                      clear

\x1b[1m\x1b[33mHelp:\x1b[0m
\x1b[32mhelp\x1b[0m                     Show this help message

\x1b[90mTip: Use \x1b[33mTab\x1b[90m for auto-completion and \x1b[33m↑/↓\x1b[90m for command history\x1b[0m`;
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path === '/' ? '/' : path.replace(/\/$/, '');
    }
    
    if (path === '.') {
      return this.vfs.currentDirectory;
    }
    
    if (path === '..') {
      if (this.vfs.currentDirectory === '/') return '/';
      const parts = this.vfs.currentDirectory.split('/').filter(p => p);
      parts.pop();
      return parts.length === 0 ? '/' : '/' + parts.join('/');
    }
    
    const base = this.vfs.currentDirectory === '/' ? '' : this.vfs.currentDirectory;
    return `${base}/${path}`.replace(/\/+/g, '/');
  }

  private isInDirectory(filePath: string, dirPath: string): boolean {
    if (dirPath === '/') {
      return filePath.startsWith('/') && filePath !== '/';
    }
    return filePath.startsWith(dirPath + '/');
  }

  getAutoComplete(partial: string): string[] {
    const suggestions: string[] = [];
    const parts = partial.split(' ');
    const lastPart = parts[parts.length - 1];
    
    if (parts.length === 1) {
      // Command completion
      const commands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'grep', 'echo', 'env', 'export', 'history', 'clear', 'npm', 'node', 'git', 'code', 'touch', 'cp', 'mv', 'find', 'ps', 'which', 'tree', 'curl', 'wget', 'help'];
      commands.forEach(cmd => {
        if (cmd.startsWith(lastPart)) {
          suggestions.push(cmd);
        }
      });
    } else {
      // File/directory completion
      const currentDir = this.vfs.currentDirectory;
      
      for (const dir of this.vfs.directories) {
        if (this.isInDirectory(dir, currentDir) && dir !== currentDir) {
          const name = dir.substring(currentDir.length + 1);
          if (!name.includes('/') && name.startsWith(lastPart)) {
            suggestions.push(name + '/');
          }
        }
      }
      
      for (const [filePath] of this.vfs.files) {
        if (this.isInDirectory(filePath, currentDir)) {
          const name = filePath.substring(currentDir.length + 1);
          if (!name.includes('/') && name.startsWith(lastPart)) {
            suggestions.push(name);
          }
        }
      }
    }
    
    return suggestions.sort();
  }

  private handleGitCommands(args: string[]): string {
    const [subCommand] = args;
    
    switch (subCommand) {
      case 'init':
        return 'Initialized empty Git repository in /project/.git/';
      case 'status':
        return `On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   src/App.js

no changes added to commit (use "git add" to stage them)`;
      case 'add':
        const files = args.slice(1);
        return files.length > 0 ? `Added ${files.join(', ')} to staging area` : 'Nothing specified, nothing added.';
      case 'commit':
        return 'Committed changes to local repository\n✓ 1 file changed, 5 insertions(+), 2 deletions(-)';
      case 'push':
        return 'Pushing to origin main...\n✓ Successfully pushed changes';
      case 'pull':
        return 'Pulling from origin main...\n✓ Already up to date';
      case 'branch':
        return '* main\n  feature/new-component';
      case 'log':
        return `commit abc123def456 (HEAD -> main)
Author: Developer <dev@example.com>
Date:   ${new Date().toLocaleDateString()}

    Add new features and improvements`;
      default:
        return `git ${subCommand || ''}\nUsage: git <command> [<args>]\n\nCommands:\n  init     Initialize repository\n  status   Show working tree status\n  add      Add file contents to index\n  commit   Record changes to repository\n  push     Update remote refs\n  pull     Fetch and integrate changes\n  branch   List branches\n  log      Show commit logs`;
    }
  }

  private handleCodeCommand(args: string[]): string {
    if (args.length === 0) {
      return 'Opening VS Code...\n✓ Code editor launched';
    }
    
    const filename = args[0];
    return `Opening ${filename} in VS Code...\n✓ File opened in editor`;
  }

  private async handleTouch(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('touch: missing file operand');
    }

    for (const arg of args) {
      const path = this.resolvePath(arg);
      if (!this.vfs.files.has(path)) {
        this.vfs.files.set(path, { content: '' });
        console.log(`Created new file: ${path}`);
      } else {
        console.log(`File already exists: ${path}`);
      }
    }

    return '';
  }

  private handleEdit(args: string[]): string {
    if (args.length === 0) {
      return 'Usage: edit <filename>\nNote: This will show file content. Use the code editor to make changes.';
    }
    
    const filename = args[0];
    const path = this.resolvePath(filename);
    const file = this.vfs.files.get(path);
    
    if (!file) {
      return `edit: ${filename}: No such file or directory`;
    }
    
    return `Opening ${filename} in editor...\n\nCurrent content:\n${file.content}\n\n✓ Use the code editor panel to modify this file.`;
  }

  private async handleCp(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('cp: missing destination file operand');
    }

    const [source, destination] = args;
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);
    
    const sourceFile = this.vfs.files.get(sourcePath);
    if (!sourceFile) {
      throw new Error(`cp: cannot stat '${source}': No such file or directory`);
    }

    this.vfs.files.set(destPath, { ...sourceFile });
    return '';
  }

  private async handleMv(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('mv: missing destination file operand');
    }

    const [source, destination] = args;
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);
    
    const sourceFile = this.vfs.files.get(sourcePath);
    if (!sourceFile) {
      throw new Error(`mv: cannot stat '${source}': No such file or directory`);
    }

    this.vfs.files.set(destPath, sourceFile);
    this.vfs.files.delete(sourcePath);
    return '';
  }

  private async handleGrep(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('grep: missing pattern or file');
    }

    const [pattern, filename] = args;
    const path = this.resolvePath(filename);
    const file = this.vfs.files.get(path);
    
    if (!file) {
      throw new Error(`grep: ${filename}: No such file or directory`);
    }

    const lines = file.content.split('\n');
    const matches = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => line.includes(pattern))
      .map(({ line, number }) => `${number}:${line}`);

    return matches.length > 0 ? matches.join('\n') : '';
  }

  private handleFind(args: string[]): string {
    const startPath = args[0] || this.vfs.currentDirectory;
    const resolvedPath = this.resolvePath(startPath);
    const results: string[] = [];

    for (const [filePath] of this.vfs.files) {
      if (filePath.startsWith(resolvedPath)) {
        results.push(filePath);
      }
    }

    for (const dirPath of this.vfs.directories) {
      if (dirPath.startsWith(resolvedPath)) {
        results.push(dirPath);
      }
    }

    return results.sort().join('\n');
  }

  private handlePs(): string {
    return 'PID TTY          TIME CMD\n  1 pts/0    00:00:00 bash\n  2 pts/0    00:00:00 node\n  3 pts/0    00:00:00 ps';
  }

  private handleWhich(args: string[]): string {
    if (args.length === 0) {
      return 'which: missing operand';
    }

    const command = args[0];
    const commands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'grep', 'echo', 'env', 'export', 'history', 'clear', 'npm', 'node', 'git', 'code', 'touch', 'cp', 'mv', 'find', 'ps', 'which', 'tree', 'curl', 'wget'];
    
    if (commands.includes(command)) {
      return `/usr/bin/${command}`;
    }
    
    return `which: no ${command} in (/usr/bin:/bin:/usr/local/bin)`;
  }

  private handleTree(args: string[]): string {
    const startPath = args[0] || this.vfs.currentDirectory;
    const resolvedPath = this.resolvePath(startPath);
    
    let output = resolvedPath + '\n';
    const items: string[] = [];

    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, resolvedPath) && dir !== resolvedPath) {
        const relativePath = dir.substring(resolvedPath.length + 1);
        if (!relativePath.includes('/')) {
          items.push(`├── ${relativePath}/`);
        }
      }
    }

    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, resolvedPath)) {
        const relativePath = filePath.substring(resolvedPath.length + 1);
        if (!relativePath.includes('/')) {
          items.push(`├── ${relativePath}`);
        }
      }
    }

    output += items.join('\n');
    return output;
  }

  private async handleCurl(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'curl: try \'curl --help\' for more information';
    }
    
    return `Downloading ${args[0]}...\n✓ Download completed`;
  }

  private async handleWget(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'wget: missing URL';
    }
    
    return `--2024-01-01 12:00:00--  ${args[0]}\nResolving host... done.\nConnecting... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: unspecified [text/html]\nSaving to: 'index.html'\n\n100%[===================>] downloaded`;
  }
}