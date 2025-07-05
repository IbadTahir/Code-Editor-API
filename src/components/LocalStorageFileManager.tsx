import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { LocalStorageManager } from '../utils/localStorageUtils';
import type { LocalStorageFile, LocalStorageProject } from '../utils/localStorageUtils';

interface FileManagerProps {
  onFileSelect: (file: LocalStorageFile) => void;
  onFileImport: (file: LocalStorageFile) => void;
  currentFiles: any[];
}

export const LocalStorageFileManager: React.FC<FileManagerProps> = ({
  onFileSelect,
  onFileImport,
  currentFiles
}) => {
  const [savedFiles, setSavedFiles] = useState<LocalStorageFile[]>([]);
  const [recentFiles, setRecentFiles] = useState<LocalStorageFile[]>([]);
  const [projects, setProjects] = useState<LocalStorageProject[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedTab, setSelectedTab] = useState<'files' | 'projects' | 'recent'>('files');
  const [storageUsage, setStorageUsage] = useState({ used: 0, available: 0, percentage: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSavedFiles(LocalStorageManager.getAllFiles());
    setRecentFiles(LocalStorageManager.getRecentFiles());
    setProjects(LocalStorageManager.getAllProjects());
    setStorageUsage(LocalStorageManager.getStorageUsage());
  };

  const handleSaveCurrentFile = () => {
    if (!saveAsName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    if (currentFiles.length === 0) {
      toast.error('No files to save');
      return;
    }

    // Save the currently active file
    const activeFile = currentFiles.find(f => f.isActive) || currentFiles[0];
    if (!activeFile) {
      toast.error('No active file to save');
      return;
    }

    try {
      const localFile: LocalStorageFile = {
        id: Date.now().toString(),
        name: saveAsName.includes('.') ? saveAsName : `${saveAsName}.${getFileExtension(activeFile.language)}`,
        content: activeFile.content,
        language: activeFile.language,
        lastModified: Date.now(),
        size: new Blob([activeFile.content]).size
      };

      LocalStorageManager.saveFile(localFile);
      loadData();
      setShowSaveDialog(false);
      setSaveAsName('');
      toast.success(`File saved as ${localFile.name}`);
    } catch (error) {
      toast.error('Failed to save file');
      console.error(error);
    }
  };

  const handleSaveProject = () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    if (currentFiles.length === 0) {
      toast.error('No files to save');
      return;
    }

    try {
      const project: LocalStorageProject = {
        id: Date.now().toString(),
        name: projectName,
        files: currentFiles.map(f => ({
          id: f.id,
          name: f.name,
          content: f.content,
          language: f.language,
          lastModified: Date.now(),
          size: new Blob([f.content]).size
        })),
        lastModified: Date.now(),
        activeFileId: currentFiles.find(f => f.isActive)?.id
      };

      LocalStorageManager.saveProject(project);
      loadData();
      setShowProjectDialog(false);
      setProjectName('');
      toast.success(`Project saved as ${project.name}`);
    } catch (error) {
      toast.error('Failed to save project');
      console.error(error);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (LocalStorageManager.deleteFile(fileId)) {
      loadData();
      toast.success('File deleted');
    } else {
      toast.error('Failed to delete file');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (LocalStorageManager.deleteProject(projectId)) {
      loadData();
      toast.success('Project deleted');
    } else {
      toast.error('Failed to delete project');
    }
  };

  const handleExportFile = (fileId: string) => {
    try {
      LocalStorageManager.exportFile(fileId);
      toast.success('File exported');
    } catch (error) {
      toast.error('Failed to export file');
      console.error(error);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    LocalStorageManager.importFile(file)
      .then((localFile) => {
        onFileImport(localFile);
        loadData();
        toast.success(`Imported ${file.name}`);
      })
      .catch((error) => {
        toast.error('Failed to import file');
        console.error(error);
      });
  };

  const handleLoadProject = (project: LocalStorageProject) => {
    // This would need to be handled by the parent component
    // For now, we'll load the first file from the project
    if (project.files.length > 0) {
      const fileToLoad = project.activeFileId 
        ? project.files.find(f => f.id === project.activeFileId) || project.files[0]
        : project.files[0];
      
      onFileSelect(fileToLoad);
      toast.success(`Loaded project: ${project.name}`);
    }
  };

  const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      go: 'go',
      cpp: 'cpp',
      java: 'java',
      rust: 'rs',
      html: 'html',
      css: 'css'
    };
    return extensions[language] || 'txt';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className="w-full">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Local Storage Manager</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSaveDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
              title="Save current file to local storage"
            >
              💾 Save File
            </Button>
            <Button
              onClick={() => setShowProjectDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
              title="Save all files as project"
            >
              📁 Save Project
            </Button>
            <label className="cursor-pointer">
              <div className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-sm rounded cursor-pointer transition-colors">
                📂 Import
              </div>
              <input
                type="file"
                onChange={handleImportFile}
                className="hidden"
                accept=".py,.js,.ts,.go,.cpp,.c,.java,.rs,.html,.css,.json,.xml,.md,.txt"
              />
            </label>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="flex justify-between text-sm">
            <span>Storage Usage: {formatFileSize(storageUsage.used)}</span>
            <span>{storageUsage.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2 mt-1">
            {/* Dynamic width for progress bar requires inline style */}
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(storageUsage.percentage || 0, 100)}%`
              }}
            ></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setSelectedTab('files')}
            className={`px-4 py-2 text-sm font-medium ${
              selectedTab === 'files'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Files ({savedFiles.length})
          </button>
          <button
            onClick={() => setSelectedTab('projects')}
            className={`px-4 py-2 text-sm font-medium ${
              selectedTab === 'projects'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setSelectedTab('recent')}
            className={`px-4 py-2 text-sm font-medium ${
              selectedTab === 'recent'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent ({recentFiles.length})
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {selectedTab === 'files' && (
            <div className="space-y-2">
              {savedFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No saved files</p>
              ) : (
                savedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {file.language} • {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => onFileSelect(file)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs"
                        title="Load file"
                      >
                        📁
                      </Button>
                      <Button
                        onClick={() => handleExportFile(file.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
                        title="Export file"
                      >
                        ⬇️
                      </Button>
                      <Button
                        onClick={() => handleDeleteFile(file.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                        title="Delete file"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'projects' && (
            <div className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No saved projects</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-500">
                        {project.files.length} files • {formatDate(project.lastModified)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleLoadProject(project)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs"
                        title="Load project"
                      >
                        📁
                      </Button>
                      <Button
                        onClick={() => handleDeleteProject(project.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                        title="Delete project"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'recent' && (
            <div className="space-y-2">
              {recentFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent files</p>
              ) : (
                recentFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {file.language} • {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => onFileSelect(file)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs"
                        title="Load file"
                      >
                        📁
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save File Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Save File</h3>
            <Input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="Enter file name"
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowSaveDialog(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCurrentFile}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Project Dialog */}
      {showProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Save Project</h3>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowProjectDialog(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProject}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
