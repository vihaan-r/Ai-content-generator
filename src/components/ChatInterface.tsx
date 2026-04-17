import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Send, Image as ImageIcon, X, Sparkles, Wand2 } from 'lucide-react';
import { generateVideoScript, generateSceneImage } from '../services/geminiService';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export const ChatInterface: React.FC = () => {
    const { projects, currentProjectId, createNewProject, updateProject, updateScene } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const endOfChatRef = useRef<HTMLDivElement>(null);

    const activeProject = projects.find(p => p.id === currentProjectId);

    useEffect(() => {
       if (!activeProject && projects.length === 0) {
           createNewProject();
       }
    }, [activeProject, projects, createNewProject]);

    useEffect(() => {
        // Scroll to bottom on change
        endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeProject]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + images.length > 3) {
            alert('You can only upload up to 3 reference images.');
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const base64 = loadEvent.target?.result as string;
                if (base64) {
                    setImages(prev => [...prev, base64]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        // Reset
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!inputValue.trim() || !activeProject) return;

        // Save story and set loading state
        const story = inputValue;
        const refImages = [...images];
        setInputValue('');
        setImages([]);

        updateProject(activeProject.id, { 
            story, 
            referenceImages: refImages, 
            status: 'generating_script' 
        });

        try {
            // Step 1: Generate Script & Storyboard
            const script = await generateVideoScript(story);
            
            updateProject(activeProject.id, {
                captions: script.captions,
                hashtags: script.hashtags,
                scenes: script.scenes.map(s => ({ ...s, status: 'pending' })),
                status: 'generating_images'
            });

            // Step 2: Generate Images Sequentially
            let previousImageUrl: string | undefined = undefined;

            for (const scene of script.scenes) {
                updateScene(activeProject.id, scene.id, { status: 'generating' });
                
                try {
                    const generatedImageUrl = await generateSceneImage(
                        scene.imagePrompt,
                        refImages,
                        previousImageUrl
                    );
                    
                    updateScene(activeProject.id, scene.id, { 
                        imageUrl: generatedImageUrl, 
                        status: 'completed' 
                    });
                    
                    previousImageUrl = generatedImageUrl; // Pass forward for temporal consistency

                } catch (imgError) {
                    console.error("Failed generating image for scene " + scene.id, imgError);
                    updateScene(activeProject.id, scene.id, { status: 'error' });
                    // Optional: decide to halt loop or keep trying
                }
            }

            updateProject(activeProject.id, { status: 'completed' });

        } catch (error) {
            console.error("Generator Error", error);
            updateProject(activeProject.id, { 
                status: 'error',
                errorMessage: String(error)
            });
        }
    };

    if (!activeProject) return <div className="flex-1 flex items-center justify-center text-white/50 bg-[#050505]">Loading...</div>;

    const hasStarted = activeProject.status !== 'idle';

    return (
        <main className="flex-1 flex flex-col relative overflow-hidden z-10 w-full bg-transparent">
            <div className="flex-1 p-[40px] flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                {!hasStarted ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto opacity-0 animate-[slamIn_0.8s_ease-out_forwards]">
                        <h1 className="text-[var(--text-main)] text-[32px] font-black tracking-tight mb-4 uppercase">
                            Video <span className="text-[var(--accent)]">Engine</span>
                        </h1>
                        <p className="text-[var(--text-dim)] text-[14px] mb-12">
                            Describe your story, provide up to 3 reference images, and our AI will storyboard, narrate, and generate frame-by-frame cohesive visuals.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-5 duration-700 h-full">
                        {/* User Request Bubble */}
                        <div className="flex flex-col">
                            {activeProject.referenceImages.length > 0 && (
                                <div className="flex gap-2 mb-3">
                                    {activeProject.referenceImages.map((img, i) => (
                                        <img key={i} src={img} alt="ref" className="w-[40px] h-[40px] object-cover rounded-[4px] border border-[var(--glass-border)] opacity-60" />
                                    ))}
                                </div>
                            )}
                            <p className="text-[var(--text-main)] text-[16px] leading-relaxed font-[300]">
                                "{activeProject.story}"
                            </p>
                        </div>
                        
                        {/* Generation Loading State */}
                        {activeProject.status === 'generating_script' && (
                            <div className="flex gap-4 items-center text-[var(--accent)] opacity-80 mt-4">
                                <Wand2 className="w-5 h-5 animate-pulse" />
                                <p className="font-mono text-[12px] tracking-widest uppercase">Drafting script & storyboards...</p>
                            </div>
                        )}

                        {/* Show Video Player when scripting is done or loading images */}
                        {['generating_images', 'completed', 'error'].includes(activeProject.status) && (
                            <VideoPlayer projectId={activeProject.id} />
                        )}

                        {activeProject.status === 'error' && (
                            <div className="bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.2)] rounded-[8px] p-4 text-[#ff5c5c] text-[12px]">
                                Error generating content: {activeProject.errorMessage}
                            </div>
                        )}

                        <div ref={endOfChatRef} className="h-4 shrink-0" />
                    </div>
                )}
            </div>

            {/* Main Controls / Footer */}
            <div className="h-[100px] border-t border-[var(--glass-border)] flex items-center px-[40px] gap-5 shrink-0 bg-[rgba(5,5,5,0.8)] backdrop-blur-md relative z-20">
                 {/* Uploaded References Preview inside Main Controls */}
                 {images.length > 0 && (
                    <div className="absolute bottom-[110px] left-[40px] flex gap-3">
                        {images.map((img, i) => (
                            <div key={i} className="relative group">
                                <img src={img} alt="upload" className="w-[50px] h-[50px] object-cover rounded-[8px] border border-[var(--glass-border)] shadow-lg" />
                                <button 
                                    onClick={() => removeImage(i)}
                                    className="absolute -top-2 -right-2 w-[20px] h-[20px] bg-black/80 rounded-full flex items-center justify-center border border-[var(--glass-border)] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                 )}

                 <div className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-[30px] h-[50px] px-5 flex items-center gap-[15px] focus-within:border-[var(--accent)] transition-colors">
                     <button 
                         onClick={() => fileInputRef.current?.click()}
                         disabled={hasStarted && activeProject.status !== 'completed' && activeProject.status !== 'error'}
                         className="text-[var(--text-dim)] hover:text-white transition-colors disabled:opacity-50"
                     >
                         <Plus className="w-5 h-5" />
                     </button>
                     <input 
                         type="file" 
                         accept="image/*" 
                         multiple 
                         ref={fileInputRef}
                         onChange={handleImageUpload}
                         className="hidden" 
                     />
                     <input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                        placeholder={hasStarted ? "Start a new video project..." : "Describe the video you want to generate..."}
                        disabled={hasStarted && activeProject.status !== 'completed' && activeProject.status !== 'error'}
                        className="flex-1 bg-transparent border-none text-[var(--text-main)] outline-none text-[13px] disabled:opacity-50 placeholder-[var(--text-dim)]"
                     />
                     <button 
                         onClick={handleGenerate}
                         disabled={!inputValue.trim() || (hasStarted && activeProject.status !== 'completed' && activeProject.status !== 'error')}
                         className="bg-[var(--accent)] text-black border-none w-[34px] h-[34px] rounded-[17px] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                     >
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                     </button>
                 </div>
            </div>
        </main>
    );
};
