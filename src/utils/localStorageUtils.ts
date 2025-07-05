/**
 * Local Storage utilities for Code Editor
 * Provides functionality to save, load, and manage code files in browser's local storage
 */

export interface LocalStorageFile {
  id: string;
  name: string;
  content: string;
  language: string;
  lastModified: number;
  size: number;
}

export interface LocalStorageProject {
  id: string;
  name: string;
  files: LocalStorageFile[];
  lastModified: number;
  activeFileId?: string;
}

const STORAGE_KEYS = {
  FILES: 'codeEditor_files',
  PROJECTS: 'codeEditor_projects',
  SETTINGS: 'codeEditor_settings',
  RECENT_FILES: 'codeEditor_recentFiles'
} as const;

export class LocalStorageManager {
  
  // File Management
  static saveFile(file: LocalStorageFile): void {
    try {
      const files = this.getAllFiles();
      const existingIndex = files.findIndex(f => f.id === file.id);
      
      const updatedFile = {
        ...file,
        lastModified: Date.now(),
        size: new Blob([file.content]).size
      };

      if (existingIndex >= 0) {
        files[existingIndex] = updatedFile;
      } else {
        files.push(updatedFile);
      }

      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
      this.addToRecentFiles(updatedFile);
    } catch (error) {
      console.error('Failed to save file to local storage:', error);
      throw new Error('Failed to save file to local storage');
    }
  }

  static getAllFiles(): LocalStorageFile[] {
    try {
      const filesJson = localStorage.getItem(STORAGE_KEYS.FILES);
      return filesJson ? JSON.parse(filesJson) : [];
    } catch (error) {
      console.error('Failed to load files from local storage:', error);
      return [];
    }
  }

  static getFile(fileId: string): LocalStorageFile | null {
    const files = this.getAllFiles();
    return files.find(f => f.id === fileId) || null;
  }

  static deleteFile(fileId: string): boolean {
    try {
      const files = this.getAllFiles();
      const filteredFiles = files.filter(f => f.id !== fileId);
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(filteredFiles));
      this.removeFromRecentFiles(fileId);
      return true;
    } catch (error) {
      console.error('Failed to delete file from local storage:', error);
      return false;
    }
  }

  static renameFile(fileId: string, newName: string): boolean {
    try {
      const files = this.getAllFiles();
      const fileIndex = files.findIndex(f => f.id === fileId);
      
      if (fileIndex >= 0) {
        files[fileIndex].name = newName;
        files[fileIndex].lastModified = Date.now();
        localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to rename file in local storage:', error);
      return false;
    }
  }

  // Project Management
  static saveProject(project: LocalStorageProject): void {
    try {
      const projects = this.getAllProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      const updatedProject = {
        ...project,
        lastModified: Date.now()
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = updatedProject;
      } else {
        projects.push(updatedProject);
      }

      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save project to local storage:', error);
      throw new Error('Failed to save project to local storage');
    }
  }

  static getAllProjects(): LocalStorageProject[] {
    try {
      const projectsJson = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return projectsJson ? JSON.parse(projectsJson) : [];
    } catch (error) {
      console.error('Failed to load projects from local storage:', error);
      return [];
    }
  }

  static getProject(projectId: string): LocalStorageProject | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  static deleteProject(projectId: string): boolean {
    try {
      const projects = this.getAllProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filteredProjects));
      return true;
    } catch (error) {
      console.error('Failed to delete project from local storage:', error);
      return false;
    }
  }

  // Recent Files Management
  static addToRecentFiles(file: LocalStorageFile): void {
    try {
      const recentFiles = this.getRecentFiles();
      const filteredRecent = recentFiles.filter(f => f.id !== file.id);
      const updatedRecent = [file, ...filteredRecent].slice(0, 10); // Keep only 10 recent files
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updatedRecent));
    } catch (error) {
      console.error('Failed to update recent files:', error);
    }
  }

  static getRecentFiles(): LocalStorageFile[] {
    try {
      const recentJson = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
      return recentJson ? JSON.parse(recentJson) : [];
    } catch (error) {
      console.error('Failed to load recent files:', error);
      return [];
    }
  }

  static removeFromRecentFiles(fileId: string): void {
    try {
      const recentFiles = this.getRecentFiles();
      const filteredRecent = recentFiles.filter(f => f.id !== fileId);
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(filteredRecent));
    } catch (error) {
      console.error('Failed to remove from recent files:', error);
    }
  }

  // Settings Management
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static getSettings(): any {
    try {
      const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settingsJson ? JSON.parse(settingsJson) : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  // Utility Methods
  static exportFile(fileId: string): void {
    const file = this.getFile(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importFile(file: File): Promise<LocalStorageFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const localFile: LocalStorageFile = {
            id: Date.now().toString(),
            name: file.name,
            content,
            language: this.detectLanguageFromFilename(file.name),
            lastModified: Date.now(),
            size: file.size
          };
          resolve(localFile);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static detectLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'go': 'go',
      'cpp': 'cpp',
      'c': 'cpp',
      'java': 'java',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'txt': 'text'
    };
    return languageMap[ext || ''] || 'text';
  }

  static getStorageUsage(): { used: number; available: number; percentage: number } {
    try {
      const used = JSON.stringify(localStorage).length;
      const available = 5 * 1024 * 1024; // Approximate 5MB limit for localStorage
      const percentage = (used / available) * 100;
      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  static clearAllData(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
  }
}
