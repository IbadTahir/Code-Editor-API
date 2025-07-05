import { DynamicDockerService } from './dynamicDockerService';
import { languageTiers } from '../config/dynamicLanguages';
import path from 'path';

interface SessionFreeExecutionRequest {
  code: string;
  language: string;
  fileName?: string;
  input?: string;
  packages?: string[];
  userId?: string;
  timeout?: number;
}

interface SessionFreeExecutionResult {
  output: string;
  error: string;
  executionTime: number;
  exitCode: number;
  files?: string[];
  contextId: string;
}

interface PersistentExecutionContext {
  contextId: string;
  containerId: string;
  language: string;
  workingDir: string;
  installedPackages: Set<string>;
  userId: string;
  lastUsed: Date;
  createdAt: Date;
}

export class SessionFreeExecutionService {
  private dockerService: DynamicDockerService;
  private persistentContexts: Map<string, PersistentExecutionContext> = new Map();
  private readonly CONTEXT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CONTEXTS_PER_USER = 5;
  
  constructor() {
    this.dockerService = DynamicDockerService.getInstance();
    
    // Start cleanup interval for inactive contexts
    setInterval(() => {
      this.cleanupInactiveContexts();
    }, 5 * 60 * 1000);
  }

  async executeCode(request: SessionFreeExecutionRequest): Promise<SessionFreeExecutionResult> {
    const startTime = Date.now();
    const userId = request.userId || 'anonymous';
    
    try {
      const context = await this.getOrCreatePersistentContext(userId, request.language);
      
      if (request.packages && request.packages.length > 0) {
        await this.installPackages(context, request.packages);
      }
      
      const result = await this.executeCodeInContext(context, request);
      context.lastUsed = new Date();
      
      return {
        ...result,
        executionTime: Date.now() - startTime,
        contextId: context.contextId
      };
      
    } catch (error: any) {
      console.error('Session-free execution error:', error);
      return {
        output: '',
        error: `Execution failed: ${error.message}`,
        executionTime: Date.now() - startTime,
        exitCode: 1,
        contextId: 'error'
      };
    }
  }

  private async getOrCreatePersistentContext(
    userId: string, 
    language: string
  ): Promise<PersistentExecutionContext> {
    const contextKey = `${userId}:${language}`;
    
    let context = this.persistentContexts.get(contextKey);
    
    if (context) {
      try {
        await this.dockerService.executeCommand(context.containerId, 'echo "alive"');
        return context;
      } catch (error) {
        console.log(`Container ${context.containerId} is not responding, recreating...`);
        this.persistentContexts.delete(contextKey);
      }
    }
    
    await this.enforceUserContextLimit(userId);
    
    const languageConfig = languageTiers[language];
    if (!languageConfig) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const contextId = `${userId}-${language}-${Date.now()}`;
    const workingDir = `/app/workspace/${contextId}`;
    
    console.log(`Creating persistent context for ${userId}:${language}`);
    
    const containerConfig = {
      language,
      isPersistent: true,
      roomId: contextId
    };
    
    const containerId = await this.dockerService.createDynamicContainer(containerConfig);
    
    if (languageConfig.setupCommands && languageConfig.setupCommands.length > 0) {
      console.log(`Running setup commands for ${language}...`);
      for (const command of languageConfig.setupCommands) {
        try {
          await this.dockerService.executeCommand(containerId, command);
        } catch (error) {
          console.warn(`Setup command failed: ${command}`, error);
        }
      }
    }
    
    context = {
      contextId,
      containerId,
      language,
      workingDir,
      installedPackages: new Set(),
      userId,
      lastUsed: new Date(),
      createdAt: new Date()
    };
    
    this.persistentContexts.set(contextKey, context);
    console.log(`Persistent context created: ${contextId}`);
    
    return context;
  }

  private async executeCodeInContext(
    context: PersistentExecutionContext,
    request: SessionFreeExecutionRequest
  ): Promise<Omit<SessionFreeExecutionResult, 'executionTime' | 'contextId'>> {
    const languageConfig = languageTiers[context.language];
    if (!languageConfig) {
      throw new Error(`Language configuration not found: ${context.language}`);
    }
    
    const fileName = request.fileName || this.generateFileName(context.language);
    const fullPath = path.join(context.workingDir, fileName);
    
    await this.writeCodeToContainer(context.containerId, fullPath, request.code);
    
    const executeCommands = languageConfig.executeCommand(fileName);
    let finalCommand = executeCommands.join(' ');
    
    if (request.input) {
      finalCommand = `echo "${request.input.replace(/"/g, '\\"')}" | ${finalCommand}`;
    }
    
    const fullCommand = `cd "${context.workingDir}" && ${finalCommand}`;
    
    const result = await this.dockerService.executeCommand(context.containerId, fullCommand);
    
    const files = await this.getCreatedFiles(context.containerId, context.workingDir);
    
    return {
      output: result.output || '',
      error: result.error || '',
      exitCode: 0,
      files
    };
  }

  private async installPackages(context: PersistentExecutionContext, packages: string[]): Promise<void> {
    const languageConfig = languageTiers[context.language];
    if (!languageConfig || !languageConfig.packageInstallCommand) {
      throw new Error(`Package installation not supported for ${context.language}`);
    }
    
    const newPackages = packages.filter(pkg => !context.installedPackages.has(pkg));
    if (newPackages.length === 0) {
      return;
    }
    
    console.log(`Installing packages in context ${context.contextId}:`, newPackages);
    
    for (const packageName of newPackages) {
      try {
        const installCommandParts = [...languageConfig.packageInstallCommand, packageName];
        const installCommand = installCommandParts.join(' ');
        
        await this.dockerService.executeCommand(context.containerId, installCommand);
        context.installedPackages.add(packageName);
        console.log(`Package installed: ${packageName}`);
      } catch (error) {
        console.error(`Failed to install package ${packageName}:`, error);
        throw new Error(`Failed to install package: ${packageName}`);
      }
    }
  }

  private async writeCodeToContainer(containerId: string, filePath: string, code: string): Promise<void> {
    const dirPath = path.dirname(filePath);
    await this.dockerService.executeCommand(containerId, `mkdir -p "${dirPath}"`);
    
    const escapedCode = code.replace(/'/g, "'\"'\"'");
    await this.dockerService.executeCommand(
      containerId,
      `echo '${escapedCode}' > "${filePath}"`
    );
  }

  private async getCreatedFiles(containerId: string, workingDir: string): Promise<string[]> {
    try {
      const result = await this.dockerService.executeCommand(
        containerId,
        `find "${workingDir}" -type f 2>/dev/null || echo ""`
      );
      
      if (result.output) {
        return result.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => path.basename(line.trim()));
      }
    } catch (error) {
      console.warn('Failed to get created files:', error);
    }
    
    return [];
  }

  private generateFileName(language: string): string {
    const extensions: { [key: string]: string } = {
      'python': 'py',
      'javascript': 'js',
      'java': 'java',
      'cpp': 'cpp',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb'
    };
    
    const ext = extensions[language.toLowerCase()] || 'txt';
    return `code_${Date.now()}.${ext}`;
  }

  private async enforceUserContextLimit(userId: string): Promise<void> {
    const userContexts = Array.from(this.persistentContexts.entries())
      .filter(([key, context]) => context.userId === userId)
      .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());
    
    while (userContexts.length >= this.MAX_CONTEXTS_PER_USER) {
      const [key, context] = userContexts.shift()!;
      console.log(`Removing old context for user ${userId}: ${context.contextId}`);
      
      try {
        await this.dockerService.destroyContainer(context.containerId);
      } catch (error) {
        console.warn(`Failed to destroy container ${context.containerId}:`, error);
      }
      
      this.persistentContexts.delete(key);
    }
  }

  private async cleanupInactiveContexts(): Promise<void> {
    const now = Date.now();
    const contextsToRemove: string[] = [];
    
    for (const [key, context] of this.persistentContexts.entries()) {
      if (now - context.lastUsed.getTime() > this.CONTEXT_TIMEOUT) {
        contextsToRemove.push(key);
      }
    }
    
    for (const key of contextsToRemove) {
      const context = this.persistentContexts.get(key);
      if (context) {
        console.log(`Cleaning up inactive context: ${context.contextId}`);
        try {
          await this.dockerService.destroyContainer(context.containerId);
        } catch (error) {
          console.warn(`Failed to destroy container ${context.containerId}:`, error);
        }
        this.persistentContexts.delete(key);
      }
    }
    
    if (contextsToRemove.length > 0) {
      console.log(`Cleaned up ${contextsToRemove.length} inactive contexts`);
    }
  }

  async getUserContexts(userId: string): Promise<Array<{
    contextId: string;
    language: string;
    lastUsed: Date;
    createdAt: Date;
    installedPackages: string[];
  }>> {
    return Array.from(this.persistentContexts.values())
      .filter(context => context.userId === userId)
      .map(context => ({
        contextId: context.contextId,
        language: context.language,
        lastUsed: context.lastUsed,
        createdAt: context.createdAt,
        installedPackages: Array.from(context.installedPackages)
      }));
  }

  async cleanupContext(userId: string, language: string): Promise<boolean> {
    const contextKey = `${userId}:${language}`;
    const context = this.persistentContexts.get(contextKey);
    
    if (!context) {
      return false;
    }
    
    try {
      await this.dockerService.destroyContainer(context.containerId);
      this.persistentContexts.delete(contextKey);
      console.log(`Manually cleaned up context: ${context.contextId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cleanup context ${context.contextId}:`, error);
      return false;
    }
  }

  getStats(): {
    totalContexts: number;
    contextsByLanguage: { [language: string]: number };
    contextsByUser: { [userId: string]: number };
  } {
    const contextsByLanguage: { [language: string]: number } = {};
    const contextsByUser: { [userId: string]: number } = {};
    
    for (const context of this.persistentContexts.values()) {
      contextsByLanguage[context.language] = (contextsByLanguage[context.language] || 0) + 1;
      contextsByUser[context.userId] = (contextsByUser[context.userId] || 0) + 1;
    }
    
    return {
      totalContexts: this.persistentContexts.size,
      contextsByLanguage,
      contextsByUser
    };
  }
}
