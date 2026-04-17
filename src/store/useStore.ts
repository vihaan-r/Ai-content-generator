import { create } from 'zustand';

export interface Scene {
  id: number;
  imagePrompt: string;
  voiceOver: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface VideoProject {
  id: string;
  timestamp: number;
  story: string;
  hashtags: string[];
  captions: string;
  referenceImages: string[]; // Base64 data URLs
  scenes: Scene[];
  status: 'idle' | 'generating_script' | 'generating_images' | 'completed' | 'error';
  errorMessage?: string;
}

interface AppState {
  projects: VideoProject[];
  currentProjectId: string | null;
  createNewProject: () => void;
  setCurrentProject: (id: string) => void;
  updateProject: (id: string, partial: Partial<VideoProject>) => void;
  updateScene: (projectId: string, sceneId: number, partial: Partial<Scene>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  
  createNewProject: () => {
    const newId = Date.now().toString();
    const newProject: VideoProject = {
      id: newId,
      timestamp: Date.now(),
      story: '',
      hashtags: [],
      captions: '',
      referenceImages: [],
      scenes: [],
      status: 'idle',
    };
    
    set((state) => ({
      projects: [newProject, ...state.projects],
      currentProjectId: newId,
    }));
  },
  
  setCurrentProject: (id) => {
    set({ currentProjectId: id });
  },
  
  updateProject: (id, partial) => {
    set((state) => ({
      projects: state.projects.map((p) => 
        p.id === id ? { ...p, ...partial } : p
      )
    }));
  },
  
  updateScene: (projectId, sceneId, partial) => {
    set((state) => ({
      projects: state.projects.map((p) => 
        p.id === projectId 
          ? {
              ...p,
              scenes: p.scenes.map((s) => s.id === sceneId ? { ...s, ...partial } : s)
            }
          : p
      )
    }));
  }
}));
