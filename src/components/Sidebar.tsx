import React from 'react';
import { useStore } from '../store/useStore';
import { Plus, Video } from 'lucide-react';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
    const { projects, currentProjectId, createNewProject, setCurrentProject } = useStore();

    return (
        <aside className="bg-[rgba(10,10,10,0.6)] border-r border-[var(--glass-border)] flex flex-col py-6 shrink-0 h-full overflow-hidden relative z-10 hidden md:flex">
            <div className="px-6 pb-8 font-black tracking-[0.2em] text-[14px] text-[var(--accent)] uppercase">
                Aether.ai
            </div>
            
            <div className="px-6 py-3 text-[10px] uppercase tracking-[0.1em] text-[#444]">
                New Action
            </div>
            <div className="px-4 pb-4">
               <button 
                  onClick={createNewProject}
                  className="w-full flex justify-start items-center px-4 py-3 text-[13px] text-[var(--text-dim)] border-l-[2px] border-transparent hover:text-[var(--text-main)] transition-colors"
                >
                    + New Video Project
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-6 py-3 text-[10px] uppercase tracking-[0.1em] text-[#444]">Recent Generations</div>
                <div className="flex flex-col">
                    {projects.map((project) => (
                        <button
                            key={project.id}
                            onClick={() => setCurrentProject(project.id)}
                            className={cn(
                                "px-6 py-3 text-[13px] text-left w-full transition-colors truncate border-l-[2px]",
                                currentProjectId === project.id 
                                    ? "text-[var(--text-main)] bg-[rgba(255,255,255,0.03)] border-[var(--accent)]" 
                                    : "text-[var(--text-dim)] border-transparent hover:text-[var(--text-main)]"
                            )}
                        >
                            {project.story ? project.story.split('\n')[0] : 'Untitled Project'}
                        </button>
                    ))}
                    
                    {projects.length === 0 && (
                        <div className="text-center py-10 px-4 text-[var(--text-dim)] text-[13px]">
                            No previous generated content
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
