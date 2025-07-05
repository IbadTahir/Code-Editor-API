import { Request, Response } from 'express';
import SharedTerminalService from '../services/sharedTerminalService';
import EnhancedCodeExecutionService from '../services/enhancedCodeExecutionService';
import { languageTiers } from '../config/dynamicLanguages';

// Global instance for enhanced code execution
let enhancedCodeService: EnhancedCodeExecutionService | null = null;

function getEnhancedCodeService(): EnhancedCodeExecutionService {
    if (!enhancedCodeService) {
        enhancedCodeService = new EnhancedCodeExecutionService();
    }
    return enhancedCodeService;
}

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        tier: 'free' | 'pro' | 'enterprise';
    };
}

/**
 * Execute code with enhanced features (loops, functions, imports)
 * POST /api/enhanced-execution/execute
 */
export const executeEnhancedCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { code, language, packages, fileName, input, timeout } = req.body;

        if (!code) {
            res.status(400).json({ error: 'Code is required' });
            return;
        }

        if (!language) {
            res.status(400).json({ error: 'Language is required' });
            return;
        }

        // Validate language is supported
        const languageConfig = languageTiers[language.toLowerCase()];
        if (!languageConfig || languageConfig.active === false) {
            res.status(400).json({ 
                error: `Language '${language}' is not supported`,
                supportedLanguages: Object.keys(languageTiers).filter(key => 
                    languageTiers[key].active !== false
                )
            });
            return;
        }

        const result = await getEnhancedCodeService().executeCode({
            code,
            language: language.toLowerCase(),
            packages,
            fileName,
            input,
            timeout
        });

        res.json({
            success: true,
            data: {
                language,
                result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error in enhanced code execution:', error);
        res.status(500).json({ 
            error: 'Enhanced code execution failed',
            details: error.message 
        });
    }
};

/**
 * Execute interactive code (REPL-like experience)
 * POST /api/enhanced-execution/interactive
 */
export const executeInteractiveCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { code, language, contextId } = req.body;

        if (!code) {
            res.status(400).json({ error: 'Code is required' });
            return;
        }

        if (!language) {
            res.status(400).json({ error: 'Language is required' });
            return;
        }

        // For stateless API, we create a temporary context
        const finalContextId = contextId || 'temp-' + Date.now();
        
        const result = await getEnhancedCodeService().executeInteractiveCode(
            finalContextId,
            code,
            language.toLowerCase()
        );

        res.json({
            success: true,
            data: {
                contextId: finalContextId,
                language,
                result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error in interactive code execution:', error);
        res.status(500).json({ 
            error: 'Interactive code execution failed',
            details: error.message 
        });
    }
};

/**
 * Install packages for a specific language
 * POST /api/enhanced-execution/install-packages
 */
export const installPackages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { packages, language, contextId } = req.body;

        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            res.status(400).json({ error: 'Packages array is required' });
            return;
        }

        if (!language) {
            res.status(400).json({ error: 'Language is required' });
            return;
        }

        // Validate language supports package installation
        const languageConfig = languageTiers[language.toLowerCase()];
        if (!languageConfig || !languageConfig.packageInstallCommand) {
            res.status(400).json({ 
                error: `Package installation not supported for language '${language}'`,
                supportedLanguages: Object.keys(languageTiers).filter(key => 
                    languageTiers[key].packageInstallCommand && languageTiers[key].active !== false
                )
            });
            return;
        }

        // Create a temporary context for package installation if none provided
        const finalContextId = contextId || 'temp-' + Date.now();
        
        // Create mock context (in real implementation, you'd get this from a context store)
        const context = {
            containerId: finalContextId, // This would be a real container ID
            language: language.toLowerCase(),
            workingDir: '/workspace',
            installedPackages: new Set<string>()
        };

        await getEnhancedCodeService().installPackages(context, packages);

        res.json({
            success: true,
            data: {
                contextId: finalContextId,
                language,
                installedPackages: packages,
                message: `Successfully installed: ${packages.join(', ')}`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error installing packages:', error);
        res.status(500).json({ 
            error: 'Package installation failed',
            details: error.message 
        });
    }
};

/**
 * Get supported languages with their capabilities
 * GET /api/enhanced-execution/languages
 */
export const getSupportedLanguages = async (req: Request, res: Response): Promise<void> => {
    try {
        const languages = Object.keys(languageTiers)
            .filter(key => languageTiers[key].active !== false)
            .map(lang => ({
                name: lang,
                displayName: languageTiers[lang].name,
                fileExtension: languageTiers[lang].fileExtension,
                commonPackages: languageTiers[lang].commonPackages || [],
                supportsPackageInstall: !!languageTiers[lang].packageInstallCommand,
                packageInstallCommand: languageTiers[lang].packageInstallCommand,
                memoryLimit: languageTiers[lang].memoryLimit,
                executionTimeout: languageTiers[lang].executionTimeout,
                cost: languageTiers[lang].cost,
                concurrentLimit: languageTiers[lang].concurrentLimit
            }));

        res.json({
            success: true,
            data: {
                languages,
                totalLanguages: languages.length,
                supportedFeatures: [
                    'loops',
                    'functions',
                    'library_imports',
                    'dynamic_package_installation',
                    'interactive_execution',
                    'file_operations',
                    'multi_language_support'
                ]
            }
        });

    } catch (error: any) {
        console.error('Error getting supported languages:', error);
        res.status(500).json({ 
            error: 'Failed to get supported languages',
            details: error.message 
        });
    }
};

/**
 * Get language-specific information
 * GET /api/enhanced-execution/languages/:language
 */
export const getLanguageInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { language } = req.params;
        
        const languageConfig = languageTiers[language.toLowerCase()];
        if (!languageConfig || languageConfig.active === false) {
            res.status(404).json({ 
                error: `Language '${language}' not found or not supported`,
                availableLanguages: Object.keys(languageTiers).filter(key => 
                    languageTiers[key].active !== false
                )
            });
            return;
        }

        res.json({
            success: true,
            data: {
                name: language.toLowerCase(),
                displayName: languageConfig.name,
                fileExtension: languageConfig.fileExtension,
                executeCommand: languageConfig.executeCommand('example' + languageConfig.fileExtension),
                packageInstallCommand: languageConfig.packageInstallCommand,
                commonPackages: languageConfig.commonPackages || [],
                supportsPackageInstall: !!languageConfig.packageInstallCommand,
                memoryLimit: languageConfig.memoryLimit,
                cpuLimit: languageConfig.cpuLimit,
                executionTimeout: languageConfig.executionTimeout,
                concurrentLimit: languageConfig.concurrentLimit,
                cost: languageConfig.cost,
                baseImage: languageConfig.baseImage,
                setupCommands: languageConfig.setupCommands,
                capabilities: {
                    loops: true,
                    functions: true,
                    imports: true,
                    packageInstallation: !!languageConfig.packageInstallCommand,
                    interactiveExecution: ['python', 'javascript', 'go'].includes(language.toLowerCase())
                }
            }
        });

    } catch (error: any) {
        console.error('Error getting language info:', error);
        res.status(500).json({ 
            error: 'Failed to get language information',
            details: error.message 
        });
    }
};

/**
 * Test code execution with examples
 * POST /api/enhanced-execution/test
 */
export const testCodeExecution = async (req: Request, res: Response): Promise<void> => {
    try {
        const { language } = req.body;
        
        if (!language) {
            res.status(400).json({ error: 'Language is required' });
            return;
        }

        const languageConfig = languageTiers[language.toLowerCase()];
        if (!languageConfig || languageConfig.active === false) {
            res.status(400).json({ 
                error: `Language '${language}' not supported`,
                supportedLanguages: Object.keys(languageTiers).filter(key => 
                    languageTiers[key].active !== false
                )
            });
            return;
        }

        // Example code for each language
        const examples: Record<string, string> = {
            python: `
# Test loops, functions, and imports
import math
import random

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print("Testing Python execution:")
print("1. Loop test:")
for i in range(5):
    print(f"  Count: {i}")

print("2. Function test:")
print(f"  Fibonacci(10): {fibonacci(10)}")

print("3. Import test:")
print(f"  Square root of 16: {math.sqrt(16)}")
print(f"  Random number: {random.randint(1, 100)}")

print("4. List comprehension:")
squares = [x**2 for x in range(10)]
print(f"  Squares: {squares}")
`,
            javascript: `
// Test loops, functions, and modules
const fs = require('fs');
const path = require('path');

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

console.log("Testing JavaScript execution:");
console.log("1. Loop test:");
for (let i = 0; i < 5; i++) {
    console.log(\`  Count: \${i}\`);
}

console.log("2. Function test:");
console.log(\`  Factorial(10): \${factorial(10)}\`);

console.log("3. Module test:");
console.log(\`  Current directory: \${process.cwd()}\`);

console.log("4. Array methods:");
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
console.log(\`  Doubled: \${doubled}\`);
`,
            go: `
package main

import (
    "fmt"
    "math"
    "math/rand"
    "time"
)

func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}

func main() {
    rand.Seed(time.Now().UnixNano())
    
    fmt.Println("Testing Go execution:")
    fmt.Println("1. Loop test:")
    for i := 0; i < 5; i++ {
        fmt.Printf("  Count: %d\\n", i)
    }
    
    fmt.Println("2. Function test:")
    fmt.Printf("  Fibonacci(10): %d\\n", fibonacci(10))
    
    fmt.Println("3. Math package test:")
    fmt.Printf("  Square root of 16: %f\\n", math.Sqrt(16))
    fmt.Printf("  Random number: %d\\n", rand.Intn(100))
    
    fmt.Println("4. Slice operations:")
    slice := []int{1, 2, 3, 4, 5}
    fmt.Printf("  Original slice: %v\\n", slice)
}
`
        };

        const testCode = examples[language.toLowerCase()];
        if (!testCode) {
            res.status(400).json({ 
                error: `No test example available for language '${language}'`
            });
            return;
        }

        const result = await getEnhancedCodeService().executeCode({
            code: testCode,
            language: language.toLowerCase()
        });

        res.json({
            success: true,
            data: {
                language,
                testCode,
                result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error in test code execution:', error);
        res.status(500).json({ 
            error: 'Test code execution failed',
            details: error.message 
        });
    }
};

export default {
    executeEnhancedCode,
    executeInteractiveCode,
    installPackages,
    getSupportedLanguages,
    getLanguageInfo,
    testCodeExecution
};
