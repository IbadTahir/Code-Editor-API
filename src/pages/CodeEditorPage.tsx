import React, { useState, useEffect, useRef } from 'react';
import { codeEditorService } from '../services/codeEditorService';
import { interactiveExecutionService } from '../services/interactiveExecutionService';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingOverlay } from '../components/LoadingSpinner';
import { LocalStorageFileManager } from '../components/LocalStorageFileManager';
import type { LocalStorageFile } from '../utils/localStorageUtils';
import { toast } from 'react-hot-toast';

interface LanguageInfo {
  language: string;
  displayName: string;
  version: string;
  tier: string;
  description: string;
  extensions: string[];
}

interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
  isActive: boolean;
}

const CodeEditorPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [code, setCode] = useState('# Welcome to the Code Editor\nprint("Hello, World!")');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [filename, setFilename] = useState('main.py');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('python');
  const [showLocalStorageManager, setShowLocalStorageManager] = useState(false);
  
  // Interactive execution state
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [hasActiveExecution, setHasActiveExecution] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Language templates
  const languageTemplates: Record<string, string> = {
    python: '# Welcome to Python\nprint("Hello, World!")\nfor i in range(3):\n    print(f"Count: {i}")',
    javascript: '// Welcome to JavaScript\nconsole.log("Hello, World!");\nfor(let i = 0; i < 3; i++) {\n    console.log(`Count: ${i}`);\n}',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n    for i := 0; i < 3; i++ {\n        fmt.Printf("Count: %d\\n", i)\n    }\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    for(int i = 0; i < 3; i++) {\n        std::cout << "Count: " << i << std::endl;\n    }\n    return 0;\n}',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        for(int i = 0; i < 3; i++) {\n            System.out.println("Count: " + i);\n        }\n    }\n}',
    rust: 'fn main() {\n    println!("Hello, World!");\n    for i in 0..3 {\n        println!("Count: {}", i);\n    }\n}'
  };

  const getLanguageIcon = (language: string): string => {
    const icons: Record<string, string> = {
      python: '🐍',
      javascript: '🟨',
      go: '🔵',
      cpp: '⚡',
      java: '☕',
      rust: '🦀'
    };
    return icons[language] || '📝';
  };

  const getFileExtension = (language: string): string => {
    const extensionMap: Record<string, string> = {
      python: '.py',
      javascript: '.js',
      go: '.go',
      cpp: '.cpp',
      java: '.java',
      rust: '.rs'
    };
    return extensionMap[language] || '.txt';
  };

  useEffect(() => {
    loadAvailableLanguages();
    // Initialize with a default file
    const defaultFile: FileItem = {
      id: 'default',
      name: 'main.py',
      content: '# Welcome to the Code Editor\nprint("Hello, World!")',
      language: 'python',
      isActive: true
    };
    setFiles([defaultFile]);
    setActiveFileId('default');
  }, []);

  // File management functions
  const createNewFile = () => {
    if (!newFileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    const extension = getFileExtension(newFileLanguage);
    const fullFileName = newFileName.includes('.') ? newFileName : `${newFileName}${extension}`;
    
    // Check if file already exists
    if (files.some(file => file.name === fullFileName)) {
      toast.error('File already exists');
      return;
    }

    const newFile: FileItem = {
      id: Date.now().toString(),
      name: fullFileName,
      content: languageTemplates[newFileLanguage] || '// Start coding...',
      language: newFileLanguage,
      isActive: false
    };

    setFiles(prev => [...prev, newFile]);
    setShowNewFileModal(false);
    setNewFileName('');
    toast.success(`Created ${fullFileName}`);
  };

  const switchToFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Save current file content
    if (activeFileId) {
      setFiles(prev => prev.map(f => 
        f.id === activeFileId ? { ...f, content: code } : f
      ));
    }

    // Switch to new file
    setActiveFileId(fileId);
    setCode(file.content);
    setSelectedLanguage(file.language);
    setFilename(file.name);
    setOutput('');
    setError('');
  };

  const deleteFile = (fileId: string) => {
    if (files.length <= 1) {
      toast.error('Cannot delete the last file');
      return;
    }

    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    // If deleting active file, switch to first remaining file
    if (fileId === activeFileId) {
      const remainingFiles = files.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        switchToFile(remainingFiles[0].id);
      }
    }

    toast.success(`Deleted ${fileToDelete.name}`);
  };

  const saveCurrentFile = () => {
    if (activeFileId) {
      setFiles(prev => prev.map(f => 
        f.id === activeFileId ? { ...f, content: code } : f
      ));
      toast.success('File saved');
    }
  };

  // Local Storage Handlers
  const handleLoadFromLocalStorage = (localFile: LocalStorageFile) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: localFile.name,
      content: localFile.content,
      language: localFile.language,
      isActive: false
    };

    // Check if file with same name already exists
    const existingFile = files.find(f => f.name === localFile.name);
    if (existingFile) {
      // Replace existing file content
      setFiles(prev => prev.map(f => 
        f.name === localFile.name ? { ...f, content: localFile.content, language: localFile.language } : f
      ));
      switchToFile(existingFile.id);
      toast.success(`Loaded ${localFile.name} from local storage`);
    } else {
      // Add as new file
      setFiles(prev => [...prev, newFile]);
      switchToFile(newFile.id);
      toast.success(`Imported ${localFile.name} from local storage`);
    }
  };

  const handleImportFromDevice = (localFile: LocalStorageFile) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: localFile.name,
      content: localFile.content,
      language: localFile.language,
      isActive: false
    };

    setFiles(prev => [...prev, newFile]);
    switchToFile(newFile.id);
    toast.success(`Imported ${localFile.name}`);
  };

  const loadAvailableLanguages = async () => {
    try {
      setIsLoadingLanguages(true);
      const response = await codeEditorService.getAvailableLanguages();
      setAvailableLanguages(response.availableLanguages);
    } catch (error) {
      toast.error('Failed to load supported languages');
      console.error('Error loading languages:', error);
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  const handleLanguageChange = (language: string) => {
    // Save current file first
    if (activeFileId) {
      setFiles(prev => prev.map(f => 
        f.id === activeFileId ? { ...f, content: code, language: language } : f
      ));
    }

    setSelectedLanguage(language);
    setCode(languageTemplates[language] || '// Start coding...');
    setFilename(`main${getFileExtension(language)}`);
    setOutput('');
    setError('');
  };

  const executeCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to execute');
      return;
    }

    try {
      setIsExecuting(true);
      setOutput('');
      setError('');
      setExecutionOutput([]);
      setHasActiveExecution(true);
      setIsWaitingForInput(false);
      
      // Check if code contains input() function for Python
      const hasInputFunction = selectedLanguage === 'python' && code.includes('input(');
      
      if (hasInputFunction) {
        // Use interactive execution for code that requires input
        executeInteractively();
      } else {
        // Use direct execution for code that doesn't require input
        await executeDirectly();
      }
    } catch (error: any) {
      console.error('Execution error:', error);
      setError(error.message || 'Failed to execute code. Please try again.');
      toast.error(error.message || 'Execution error');
      setIsExecuting(false);
      setHasActiveExecution(false);
    }
  };

  const executeDirectly = async () => {
    try {
      const startTime = Date.now();
      
      const result = await codeEditorService.executeCodeDirect({
        code: code,
        language: selectedLanguage,
        filename: filename
      });
      
      const executionTime = Date.now() - startTime;
      
      if (result && result.error) {
        setError(result.error);
        toast.error('Code execution failed');
      } else if (result) {
        setOutput(result.output || 'Code executed successfully (no output)');
        toast.success(`Code executed in ${executionTime}ms`);
      } else {
        throw new Error('No result returned from execution');
      }
    } finally {
      setIsExecuting(false);
      setHasActiveExecution(false);
    }
  };

  const executeInteractively = () => {
    if (!interactiveExecutionService.isConnected()) {
      toast.error('Interactive execution service is not connected. Please try again.');
      setIsExecuting(false);
      setHasActiveExecution(false);
      return;
    }

    interactiveExecutionService.executeCode(code, selectedLanguage, {
      onSessionStarted: (data) => {
        console.log('Interactive session started:', data);
        setExecutionOutput(prev => [...prev, `🚀 ${data.message}`]);
      },
      onOutput: (data) => {
        const outputText = data.data;
        setExecutionOutput(prev => [...prev, outputText]);
        
        // Check if the output looks like an input prompt
        if (outputText.includes('Enter') || outputText.includes('input') || outputText.includes(':')) {
          setIsWaitingForInput(true);
        }
      },
      onComplete: (data) => {
        setExecutionOutput(prev => [...prev, `\n✅ ${data.message}`]);
        setIsExecuting(false);
        setHasActiveExecution(false);
        setIsWaitingForInput(false);
        toast.success('Code execution completed');
      },
      onError: (error) => {
        if (error.type === 'docker_unavailable') {
          setError('Docker is not running. Please start Docker Desktop and try again.');
          toast.error('Docker not available');
        } else {
          setError(error.message || 'Execution failed');
          toast.error(error.message || 'Execution error');
        }
        setIsExecuting(false);
        setHasActiveExecution(false);
        setIsWaitingForInput(false);
      }
    });
  };

  const sendUserInput = () => {
    if (!userInput.trim()) {
      toast.error('Please enter some input');
      return;
    }

    if (!interactiveExecutionService.hasActiveSession()) {
      toast.error('No active execution session');
      return;
    }

    // Add user input to output display
    setExecutionOutput(prev => [...prev, `> ${userInput}`]);
    
    // Send input to the execution service
    interactiveExecutionService.sendInput(userInput);
    
    // Clear input and waiting state
    setUserInput('');
    setIsWaitingForInput(false);
  };

  const terminateExecution = () => {
    if (hasActiveExecution) {
      interactiveExecutionService.terminateExecution();
      setIsExecuting(false);
      setHasActiveExecution(false);
      setIsWaitingForInput(false);
      setExecutionOutput(prev => [...prev, '\n🛑 Execution terminated by user']);
      toast.success('Execution terminated');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCode();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  useEffect(() => {
    // Set font size dynamically via CSS custom property
    if (textareaRef.current) {
      textareaRef.current.style.fontSize = `${fontSize}px`;
      textareaRef.current.style.lineHeight = '1.5';
    }
  }, [fontSize]);

  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-gray-100' 
    : 'bg-white text-gray-900';

  const editorThemeClasses = theme === 'dark'
    ? 'bg-gray-800 text-gray-100 border-gray-700'
    : 'bg-white text-gray-900 border-gray-300';

  return (
    <LoadingOverlay isLoading={isLoadingLanguages} text="Loading languages...">
      <div className={`min-h-screen ${themeClasses} transition-colors duration-200`}>
      {/* VS Code-like Header */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-gray-300 text-sm font-medium">
            💻 Code Editor - {filename}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLocalStorageManager(!showLocalStorageManager)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Local Storage Manager"
          >
            💾
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
          {/* Language Selection */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-3 flex items-center">
              🌍 Languages
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoadingLanguages ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-gray-400">Loading languages...</span>
                </div>
              ) : (
                availableLanguages.map((lang) => (
                  <button
                    key={lang.language}
                    onClick={() => handleLanguageChange(lang.language)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedLanguage === lang.language
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getLanguageIcon(lang.language)}</span>
                      <div>
                        <div className="font-medium">{lang.displayName}</div>
                        <div className="text-xs opacity-70">{lang.version}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* File Explorer */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center">
                📁 Explorer
              </h3>
              <button
                onClick={() => setShowNewFileModal(true)}
                className="text-blue-400 hover:text-blue-300 text-sm"
                title="New File"
              >
                ➕
              </button>
            </div>
            
            <div className="flex-1 space-y-1 max-h-64 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                    file.id === activeFileId
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                  onClick={() => switchToFile(file.id)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-sm">{getLanguageIcon(file.language)}</span>
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2"
                      title="Delete File"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                onClick={saveCurrentFile}
                className="w-full text-sm text-gray-400 hover:text-gray-300 py-1"
                title="Save (Ctrl+S)"
              >
                💾 Save File
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 border-t border-gray-700">
            <div className="text-gray-400 text-xs space-y-1">
              <div>Language: {selectedLanguage}</div>
              <div>Theme: {theme}</div>
              <div>Font: {fontSize}px</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* File Info Bar */}
          <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center px-4">
              <span className="mr-2">{getLanguageIcon(selectedLanguage)}</span>
              <span className="text-white text-sm">{filename}</span>
              <span className="ml-2 text-gray-500 text-xs">({selectedLanguage})</span>
            </div>
            <div className="px-4 text-xs text-gray-500">
              Ctrl+S to save • Ctrl+Enter to run
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex">
            <div className="flex-1 p-4">
              <Card className={`h-full ${editorThemeClasses} border-0 shadow-2xl`}>
                <div className="h-full flex flex-col">
                  {/* Editor Header */}
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getLanguageIcon(selectedLanguage)}</span>
                      <span className="font-medium">{selectedLanguage.toUpperCase()} Editor</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Ctrl+S to save • Ctrl+Enter to run
                      </span>
                      <Button
                        onClick={saveCurrentFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                      >
                        💾 Save
                      </Button>
                      <Button
                        onClick={executeCode}
                        disabled={isExecuting}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                      >
                        {isExecuting ? '⏳ Running...' : '▶️ Run'}
                      </Button>
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 p-0">
                    <textarea
                      ref={textareaRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full h-full resize-none font-mono p-4 focus:outline-none ${editorThemeClasses} border-0 leading-relaxed`}
                      placeholder="Start coding..."
                      aria-label="Code editor"
                      title="Code editor - write your code here"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Output Panel */}
            <div className="w-1/3 p-4 pl-0">
              <Card className={`h-full ${editorThemeClasses} border-0 shadow-2xl`}>
                <div className="h-full flex flex-col">
                  {/* Output Header */}
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <span className="font-medium">📊 Output</span>
                    <button
                      onClick={() => {
                        setOutput('');
                        setError('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-300"
                    >
                      🗑️ Clear
                    </button>
                  </div>

                  {/* Output Content */}
                  <div className="flex-1 p-4 overflow-auto">
                    {isExecuting ? (
                      <div className="flex items-center space-x-2 text-blue-400">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span>Executing code...</span>
                        {hasActiveExecution && (
                          <Button
                            onClick={terminateExecution}
                            variant="outline"
                            size="sm"
                            className="ml-4 text-red-400 border-red-400 hover:bg-red-400/10"
                          >
                            🛑 Stop
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Interactive Output */}
                        {executionOutput.length > 0 && (
                          <div className="mb-4">
                            <div className="text-green-400 text-sm font-medium mb-2">🔥 Interactive Output:</div>
                            <div className="bg-gray-800 p-3 rounded-lg overflow-auto max-h-48">
                              {executionOutput.map((line, index) => (
                                <div key={index} className="text-sm font-mono whitespace-pre-wrap">
                                  {line}
                                </div>
                              ))}
                            </div>
                            
                            {/* Input field for interactive execution */}
                            {isWaitingForInput && (
                              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-400 rounded-lg">
                                <div className="text-blue-300 text-sm mb-2">💬 Program is waiting for input:</div>
                                <div className="flex space-x-2">
                                  <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        sendUserInput();
                                      }
                                    }}
                                    placeholder="Enter your input..."
                                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-400 focus:outline-none"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={sendUserInput}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Send
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Regular Output */}
                        {output && (
                          <div className="mb-4">
                            <div className="text-green-400 text-sm font-medium mb-2">✅ Output:</div>
                            <pre className="text-sm bg-gray-800 p-3 rounded-lg overflow-auto">
                              {output}
                            </pre>
                          </div>
                        )}
                        
                        {error && (
                          <div className="mb-4">
                            <div className="text-red-400 text-sm font-medium mb-2">❌ Error:</div>
                            <pre className="text-sm bg-red-900/20 border border-red-700 p-3 rounded-lg overflow-auto text-red-300">
                              {error}
                            </pre>
                          </div>
                        )}
                        
                        {!output && !error && !isExecuting && executionOutput.length === 0 && (
                          <div className="text-gray-500 text-sm text-center py-8">
                            <div className="text-4xl mb-2">🚀</div>
                            <div>Run your code to see output here</div>
                            <div className="text-xs mt-2 text-gray-600">
                              💡 Interactive programs (using input()) are fully supported
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">⚙️ Editor Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    aria-label="Select editor theme"
                    title="Choose between dark and light theme"
                  >
                    <option value="dark">🌙 Dark</option>
                    <option value="light">☀️ Light</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full"
                    aria-label="Font size slider"
                    title={`Font size: ${fontSize}px`}
                  />
                  <div className="text-sm text-gray-500 mt-1">{fontSize}px</div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setShowSettings(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">📄 Create New File</h3>
                <button
                  onClick={() => {
                    setShowNewFileModal(false);
                    setNewFileName('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">File Name</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g., script, utils, main"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        createNewFile();
                      }
                    }}
                    autoFocus
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Extension will be added automatically based on language
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={newFileLanguage}
                    onChange={(e) => setNewFileLanguage(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select programming language for new file"
                    title="Choose the programming language for the new file"
                  >
                    {Object.keys(languageTemplates).map((lang) => (
                      <option key={lang} value={lang}>
                        {getLanguageIcon(lang)} {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowNewFileModal(false);
                    setNewFileName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <Button
                  onClick={createNewFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newFileName.trim()}
                >
                  Create File
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Local Storage Manager Modal */}
      {showLocalStorageManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <LocalStorageFileManager
              onFileSelect={handleLoadFromLocalStorage}
              onFileImport={handleImportFromDevice}
              currentFiles={files.map(f => ({ ...f, isActive: f.id === activeFileId }))}
            />
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowLocalStorageManager(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </LoadingOverlay>
  );
};

export default CodeEditorPage;
