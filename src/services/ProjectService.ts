import { FileNode } from "@/types/FileTypes";

export interface Project {
  id: string;
  name: string;
  description?: string;
  template: string;
  isPublic: boolean;
  isForked: boolean;
  forkedFromId?: string;
  lastModified: string;
  fileCount: number;
  files: FileNode[];
}

export interface ProjectState {
  currentProject: Project | null;
  projectName: string;
  template: string;
  files: FileNode[];
  lastSaved: string;
}

const PROJECTS_STORAGE_KEY = 'tutorials-dojo-projects';
const PROJECT_STATE_STORAGE_KEY = 'tutorials-dojo-project-state';

export class ProjectService {
  static getCurrentProject(): Project | null {
    try {
      const state = localStorage.getItem(PROJECT_STATE_STORAGE_KEY);
      if (!state) return null;
      
      const parsedState: ProjectState = JSON.parse(state);
      
      return {
        id: 'current',
        name: parsedState.projectName || 'Untitled Project',
        description: 'Your current project',
        template: parsedState.template || 'vanilla',
        isPublic: false,
        isForked: false,
        lastModified: parsedState.lastSaved || new Date().toISOString(),
        fileCount: parsedState.files?.length || 0,
        files: parsedState.files || []
      };
    } catch (error) {
      console.error('Error getting current project:', error);
      return null;
    }
  }

  static saveCurrentProject(project: Partial<Project>, files: FileNode[]): void {
    try {
      const state: ProjectState = {
        currentProject: project.id ? project as Project : null,
        projectName: project.name || 'Untitled Project',
        template: project.template || 'vanilla',
        files,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(PROJECT_STATE_STORAGE_KEY, JSON.stringify(state));
      
      // Update projects list
      this.updateProjectInList({
        id: 'current',
        name: state.projectName,
        description: 'Your current project',
        template: state.template,
        isPublic: false,
        isForked: false,
        lastModified: state.lastSaved,
        fileCount: files.length,
        files
      });
    } catch (error) {
      console.error('Error saving current project:', error);
    }
  }

  static getAllProjects(): Project[] {
    try {
      const projects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  static saveProject(project: Project): void {
    try {
      const projects = this.getAllProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.unshift(project);
      }
      
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }

  static updateProjectInList(project: Project): void {
    try {
      const projects = this.getAllProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.unshift(project);
      }
      
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error updating project in list:', error);
    }
  }

  static deleteProject(projectId: string): void {
    try {
      if (projectId === 'current') {
        localStorage.removeItem(PROJECT_STATE_STORAGE_KEY);
      }
      
      const projects = this.getAllProjects().filter(p => p.id !== projectId);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  static loadProject(projectId: string): Project | null {
    try {
      if (projectId === 'current') {
        return this.getCurrentProject();
      }
      
      const projects = this.getAllProjects();
      return projects.find(p => p.id === projectId) || null;
    } catch (error) {
      console.error('Error loading project:', error);
      return null;
    }
  }

  static createNewProject(name: string, template: string = 'vanilla', files: FileNode[]): Project {
    const project: Project = {
      id: Date.now().toString(),
      name: name.trim(),
      description: 'New project',
      template,
      isPublic: false,
      isForked: false,
      lastModified: new Date().toISOString(),
      fileCount: files.length,
      files
    };
    
    this.saveProject(project);
    return project;
  }

  static renameProject(projectId: string, newName: string): void {
    try {
      if (projectId === 'current') {
        // Update current project state
        const state = localStorage.getItem(PROJECT_STATE_STORAGE_KEY);
        if (state) {
          const parsedState: ProjectState = JSON.parse(state);
          parsedState.projectName = newName.trim();
          parsedState.lastSaved = new Date().toISOString();
          localStorage.setItem(PROJECT_STATE_STORAGE_KEY, JSON.stringify(parsedState));
        }
      }
      
      // Update in projects list
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex >= 0) {
        projects[projectIndex] = {
          ...projects[projectIndex],
          name: newName.trim(),
          lastModified: new Date().toISOString()
        };
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      }
    } catch (error) {
      console.error('Error renaming project:', error);
    }
  }

  static getProjectState(): ProjectState | null {
    try {
      const state = localStorage.getItem(PROJECT_STATE_STORAGE_KEY);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('Error getting project state:', error);
      return null;
    }
  }

  static switchToProject(project: Project): void {
    try {
      // Simply switch to the new project without saving current as duplicate
      const state: ProjectState = {
        currentProject: project,
        projectName: project.name,
        template: project.template,
        files: project.files,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(PROJECT_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error switching to project:', error);
    }
  }
}