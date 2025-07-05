import { DynamicDockerService } from './dynamicDockerService';
import { languageTiers, LanguageTier } from '../config/dynamicLanguages';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface CodeExecutionRequest {
  code: string;
  language: string;
  fileName?: string;
  input?: string;
  packages?: string[]; // Additional packages to install
  workingDirectory?: string;
  timeout?: number;
}

interface CodeExecutionResult {
  output: string;
  error: string;
  executionTime: number;
  memoryUsage?: number;
  exitCode: number;
  files?: string[]; // Files created during execution
}

interface ExecutionContext {
  containerId: string;
  language: string;
  workingDir: string;
  installedPackages: Set<string>;
}

export class EnhancedCodeExecutionService {
  private dockerService: DynamicDockerService;
  private executionContexts: Map<string, ExecutionContext> = new Map();
  
  constructor() {
    this.dockerService = DynamicDockerService.getInstance();
  }

  /**
   * Execute any type of code with full language support
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get or create execution context
      const context = await this.getOrCreateContext(request.language);
      
      // Install additional packages if specified
      if (request.packages && request.packages.length > 0) {
        await this.installPackages(context, request.packages);
      }
      
      // Prepare code file
      const fileName = request.fileName || this.generateFileName(request.language);
      const fullPath = path.join(context.workingDir, fileName);
      
      // Write code to file
      await this.writeCodeToContainer(context.containerId, fullPath, request.code);
      
      // Execute the code
      const result = await this.executeCodeInContainer(
        context.containerId, 
        request.language, 
        fileName, 
        request.input,
        request.timeout
      );
      
      // Get created files
      const files = await this.getCreatedFiles(context.containerId, context.workingDir);
      
      return {
        ...result,
        executionTime: Date.now() - startTime,
        files
      };
      
    } catch (error: any) {
      return {
        output: '',
        error: `Execution failed: ${error.message}`,
        executionTime: Date.now() - startTime,
        exitCode: 1
      };
    }
  }

  /**
   * Execute interactive code (for loops, functions, etc.)
   * Simplified to use the main execution method with context awareness
   */
  async executeInteractiveCode(
    contextId: string, 
    code: string, 
    language: string
  ): Promise<CodeExecutionResult> {
    const context = this.executionContexts.get(contextId);
    if (!context) {
      throw new Error('Execution context not found');
    }
    
    // Use the existing context to execute code
    const startTime = Date.now();
    
    try {
      // Prepare code file
      const fileName = this.generateFileName(language);
      const fullPath = path.join(context.workingDir, fileName);
      
      // Write code to file
      await this.writeCodeToContainer(context.containerId, fullPath, code);
      
      // Execute the code
      const result = await this.executeCodeInContainer(
        context.containerId, 
        language, 
        fileName
      );
      
      // Get created files
      const files = await this.getCreatedFiles(context.containerId, context.workingDir);
      
      return {
        ...result,
        executionTime: Date.now() - startTime,
        files
      };
      
    } catch (error: any) {
      return {
        output: '',
        error: `Interactive execution failed: ${error.message}`,
        executionTime: Date.now() - startTime,
        exitCode: 1
      };
    }
  }

  /**
   * Install packages dynamically
   */
  async installPackages(context: ExecutionContext, packages: string[]): Promise<void> {
    const languageConfig = languageTiers[context.language];
    if (!languageConfig || !languageConfig.packageInstallCommand) {
      throw new Error(`Package installation not supported for ${context.language}`);
    }
    
    const newPackages = packages.filter(pkg => !context.installedPackages.has(pkg));
    if (newPackages.length === 0) return;
    
    for (const pkg of newPackages) {
      const installCommand = [...languageConfig.packageInstallCommand, pkg].join(' ');
      
      try {
        await this.dockerService.executeCommand(context.containerId, installCommand);
        context.installedPackages.add(pkg);
        console.log(`Successfully installed package: ${pkg}`);
      } catch (error) {
        console.error(`Failed to install package ${pkg}:`, error);
        throw new Error(`Failed to install package: ${pkg}`);
      }
    }
  }

  /**
   * Get or create execution context for persistent sessions
   */
  private async getOrCreateContext(language: string): Promise<ExecutionContext> {
    // For now, create new context each time
    // In production, you might want to reuse contexts
    const contextId = uuidv4();
    
    const languageConfig = languageTiers[language];
    if (!languageConfig) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    // Create container
    const containerId = await this.dockerService.createDynamicContainer({
      language,
      isPersistent: true,
      customPackages: languageConfig.commonPackages
    });
    
    const workingDir = '/workspace';
    
    // Setup working directory
    await this.dockerService.executeCommand(containerId, `mkdir -p ${workingDir}`);
    await this.dockerService.executeCommand(containerId, `cd ${workingDir}`);
    
    const context: ExecutionContext = {
      containerId,
      language,
      workingDir,
      installedPackages: new Set(languageConfig.commonPackages || [])
    };
    
    this.executionContexts.set(contextId, context);
    return context;
  }

  /**
   * Execute Python code with full support for imports, loops, functions
   */
  private async executePythonInteractive(
    context: ExecutionContext, 
    code: string
  ): Promise<CodeExecutionResult> {
    // Create a Python script that handles interactive execution
    const pythonWrapper = `
import sys
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr

# Capture stdout and stderr
stdout_buffer = io.StringIO()
stderr_buffer = io.StringIO()

try:
    # Create a global namespace for persistent variables
    global_namespace = globals().copy()
    
    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
        # Execute the user code
        exec("""${code.replace(/"/g, '\\"')}""", global_namespace)
    
    # Get output
    output = stdout_buffer.getvalue()
    error = stderr_buffer.getvalue()
    exit_code = 0

except Exception as e:
    output = stdout_buffer.getvalue()
    error = f"{stderr_buffer.getvalue()}\\n{traceback.format_exc()}"
    exit_code = 1

print("===OUTPUT_START===")
print(output)
print("===OUTPUT_END===")
print("===ERROR_START===")
print(error)
print("===ERROR_END===")
print(f"===EXIT_CODE==={exit_code}===")
`;

    const fileName = `interactive_${Date.now()}.py`;
    await this.writeCodeToContainer(context.containerId, `${context.workingDir}/${fileName}`, pythonWrapper);
    
    const result = await this.dockerService.executeCommand(
      context.containerId, 
      `cd ${context.workingDir} && python ${fileName}`
    );
    
    return this.parseInteractiveResult(result.output);
  }

  /**
   * Execute JavaScript code with full Node.js support
   */
  private async executeJavaScriptInteractive(
    context: ExecutionContext, 
    code: string
  ): Promise<CodeExecutionResult> {
    const jsWrapper = `
const vm = require('vm');
const util = require('util');

let output = '';
let error = '';
let exitCode = 0;

// Capture console output
const originalLog = console.log;
console.log = (...args) => {
  output += args.map(arg => util.inspect(arg, { depth: null, colors: false })).join(' ') + '\\n';
};

try {
  // Create context with common modules
  const context = {
    console,
    require,
    module,
    exports,
    __dirname: process.cwd(),
    __filename: 'interactive.js',
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Buffer,
    process: {
      ...process,
      exit: (code) => { exitCode = code || 0; }
    }
  };
  
  // Execute the code
  vm.runInNewContext(\`${code.replace(/`/g, '\\`')}\`, context, {
    timeout: 30000,
    displayErrors: true
  });
  
} catch (e) {
  error = e.stack || e.message;
  exitCode = 1;
}

console.log = originalLog;

console.log("===OUTPUT_START===");
console.log(output);
console.log("===OUTPUT_END===");
console.log("===ERROR_START===");
console.log(error);
console.log("===ERROR_END===");
console.log(\`===EXIT_CODE===\${exitCode}===\`);
`;

    const fileName = `interactive_${Date.now()}.js`;
    await this.writeCodeToContainer(context.containerId, `${context.workingDir}/${fileName}`, jsWrapper);
    
    const result = await this.dockerService.executeCommand(
      context.containerId, 
      `cd ${context.workingDir} && node ${fileName}`
    );
    
    return this.parseInteractiveResult(result.output);
  }

  /**
   * Execute Go code with full package support
   */
  private async executeGoInteractive(
    context: ExecutionContext, 
    code: string
  ): Promise<CodeExecutionResult> {
    // Initialize Go module if not exists
    await this.dockerService.executeCommand(
      context.containerId, 
      `cd ${context.workingDir} && if [ ! -f go.mod ]; then go mod init workspace; fi`
    );

    const fileName = `interactive_${Date.now()}.go`;
    const fullPath = `${context.workingDir}/${fileName}`;
    
    // Wrap code in main function if needed
    let wrappedCode = code;
    if (!code.includes('func main()') && !code.includes('package main')) {
      wrappedCode = `package main

import (
    "fmt"
    "os"
)

func main() {
${code.split('\n').map(line => '    ' + line).join('\n')}
}`;
    }
    
    await this.writeCodeToContainer(context.containerId, fullPath, wrappedCode);
    
    const result = await this.dockerService.executeCommand(
      context.containerId, 
      `cd ${context.workingDir} && go run ${fileName}`
    );
    
    return {
      output: result.output,
      error: result.error,
      executionTime: 0,
      exitCode: result.error ? 1 : 0
    };
  }

  /**
   * Parse interactive execution results
   */
  private parseInteractiveResult(rawOutput: string): CodeExecutionResult {
    // Use [\s\S] instead of . with s flag for cross-compatibility
    const outputMatch = rawOutput.match(/===OUTPUT_START===([\s\S]*?)===OUTPUT_END===/);
    const errorMatch = rawOutput.match(/===ERROR_START===([\s\S]*?)===ERROR_END===/);
    const exitCodeMatch = rawOutput.match(/===EXIT_CODE===(\d+)===/);
    
    return {
      output: outputMatch ? outputMatch[1].trim() : '',
      error: errorMatch ? errorMatch[1].trim() : '',
      executionTime: 0,
      exitCode: exitCodeMatch ? parseInt(exitCodeMatch[1]) : 0
    };
  }

  /**
   * Write code to container file
   */
  private async writeCodeToContainer(
    containerId: string, 
    filePath: string, 
    code: string
  ): Promise<void> {
    // Escape the code for shell
    const escapedCode = code.replace(/'/g, "'\"'\"'");
    const command = `echo '${escapedCode}' > ${filePath}`;
    
    await this.dockerService.executeCommand(containerId, command);
  }

  /**
   * Execute code in container with proper error handling
   */
  private async executeCodeInContainer(
    containerId: string,
    language: string,
    fileName: string,
    input?: string,
    timeout?: number
  ): Promise<CodeExecutionResult> {
    const languageConfig = languageTiers[language];
    if (!languageConfig) {
      throw new Error(`Language configuration not found: ${language}`);
    }
    
    const executeCmd = languageConfig.executeCommand(fileName).join(' ');
    const fullCommand = input 
      ? `echo '${input}' | ${executeCmd}`
      : executeCmd;
    
    const result = await this.dockerService.executeCommand(containerId, fullCommand);
    
    return {
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      exitCode: result.error ? 1 : 0
    };
  }

  /**
   * Generate appropriate file name for language
   */
  private generateFileName(language: string): string {
    const languageConfig = languageTiers[language];
    const extension = languageConfig?.fileExtension || '.txt';
    return `code_${Date.now()}${extension}`;
  }

  /**
   * Get files created during execution
   */
  private async getCreatedFiles(containerId: string, workingDir: string): Promise<string[]> {
    try {
      const result = await this.dockerService.executeCommand(
        containerId, 
        `ls -la ${workingDir} 2>/dev/null || echo ""`
      );
      
      return result.output
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('total'))
        .map(line => {
          const parts = line.split(/\s+/);
          return parts.length >= 9 ? parts.slice(8).join(' ') : '';
        })
        .filter(name => name && !name.startsWith('.'));
    } catch {
      return [];
    }
  }

  /**
   * Clean up execution context
   */
  async cleanupContext(contextId: string): Promise<void> {
    const context = this.executionContexts.get(contextId);
    if (context) {
      try {
        await this.dockerService.destroyContainer(context.containerId);
      } catch (error) {
        console.error('Error cleaning up context:', error);
      }
      this.executionContexts.delete(contextId);
    }
  }


}

export default EnhancedCodeExecutionService;
