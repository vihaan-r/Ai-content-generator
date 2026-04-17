import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Video, Loader2, Download, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const RightInspector: React.FC<{ project: any }> = ({ project }) => {
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);

    const handleDownload = async () => {
        const validScenes = project.scenes;
        if (!validScenes.length) return;
        setIsRendering(true);
        setRenderProgress(0);

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `story-video-${project.id}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          setIsRendering(false);
        };

        mediaRecorder.start();

        const imageElements: HTMLImageElement[] = [];
        for (const scene of validScenes) {
          if (!scene.imageUrl) continue;
          const img = new Image();
          img.src = scene.imageUrl;
          await new Promise(r => { img.onload = r; });
          imageElements.push(img);
        }

        const durationPerImageMs = 5000;
        const totalDuration = validScenes.length * durationPerImageMs;
        const startTime = performance.now();

        const drawFrame = () => {
          const elapsed = performance.now() - startTime;
          setRenderProgress(Math.min(100, Math.floor((elapsed / totalDuration) * 100)));

          if (elapsed >= totalDuration) {
            mediaRecorder.stop();
            return;
          }

          const sceneIndex = Math.floor(elapsed / durationPerImageMs);
          const img = imageElements[Math.min(sceneIndex, imageElements.length - 1)];
          
          if (img) {
            const localElapsed = elapsed % durationPerImageMs;
            const progress = localElapsed / durationPerImageMs;
            const scale = 1 + (0.1 * progress);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const dw = canvas.width * scale;
            const dh = canvas.height * scale;
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;
            
            ctx.drawImage(img, dx, dy, dw, dh);
          }
          requestAnimationFrame(drawFrame);
        };
        requestAnimationFrame(drawFrame);
    };

    return (
        <aside className="bg-[rgba(10,10,10,0.6)] border-l border-[var(--glass-border)] p-6 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar shrink-0 z-10 w-[280px]">
            <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-dim)] mb-2">Voiceover Script</div>
                <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-4 border border-[var(--glass-border)]">
                    <div className="text-[12px] leading-[1.6] text-[#bbb] max-h-[150px] overflow-y-auto custom-scrollbar pr-2 mb-2">
                        {project.scenes?.map((s: any) => (
                           <span key={s.id} className="block mb-2">
                              <strong>[0:{(s.id * 5 - 5).toString().padStart(2, '0')} - 0:{(s.id * 5).toString().padStart(2, '0')}]</strong><br/>
                              {s.voiceOver}
                           </span>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-dim)] mb-2">Video Caption</div>
                <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-4 border border-[var(--glass-border)] text-[12px] leading-[1.5]">
                    {project.captions || "Generating..."}
                </div>
            </div>

            {project.hashtags && project.hashtags.length > 0 && (
                <div>
                    <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-dim)] mb-2">Engagement Tags</div>
                    <div className="flex flex-wrap gap-[6px]">
                        {project.hashtags.map((tag: any, i: number) => (
                            <span key={i} className="text-[10px] bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded-[4px] text-[var(--accent)]">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <button 
                onClick={handleDownload}
                disabled={project.status !== 'completed' || isRendering}
                className="mt-auto w-full bg-white text-black border-none p-4 rounded-[10px] font-bold text-[14px] uppercase tracking-[0.05em] shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer disabled:opacity-50 hover:bg-gray-200"
            >
                {isRendering ? `ENCODING... ${renderProgress}%` : 'DOWNLOAD MASTER'}
            </button>
            <div className="text-center text-[10px] text-[var(--text-dim)] pb-2">
                Optimized for 9:16 Vertical Export
            </div>
        </aside>
    );
};

export const VideoPlayer: React.FC<{ projectId: string, children?: React.ReactNode }> = ({ projectId, children }) => {
  const project = useStore(state => state.projects.find(p => p.id === projectId));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  if (!project || project.status === 'idle') return null;

  const validScenes = project.scenes || [];

  const playPreview = async () => {
    setIsPlaying(true);
    for (let i = 0; i < validScenes.length; i++) {
        setCurrentFrameIndex(i);
        await new Promise(r => setTimeout(r, 5000));
    }
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  }

  const displayScene = validScenes[currentFrameIndex] || validScenes[0];

  return (
    <>
         <div className="flex-1 bg-[#000] rounded-[12px] border border-[var(--glass-border)] relative overflow-hidden flex items-center justify-center group shrink-0 min-h-[50%]">
             {displayScene?.imageUrl ? (
                <>
                   <div className="absolute top-[20px] left-[20px] text-[rgba(255,255,255,0.1)] text-[60px] font-[800] pointer-events-none select-none z-0">SCENE 0{displayScene.id}</div>
                   <img src={displayScene.imageUrl} className="w-full h-full object-cover opacity-80 transition-transform duration-[5000ms] ease-linear" style={{ transform: isPlaying ? 'scale(1.1)' : 'scale(1)' }} />
                   <div className="absolute bottom-[40px] left-[40px] border-l-[4px] border-[var(--accent)] pl-5 z-10 drop-shadow-xl max-w-[80%]">
                       <div className="text-[24px] font-[300] leading-tight text-white">{displayScene.voiceOver}</div>
                       <div className="text-[12px] text-[var(--text-dim)] mt-1">Frame 0{displayScene.id}: Narrative Sequence</div>
                   </div>
                </>
             ) : (
                <div className="text-[var(--text-dim)] text-[12px] uppercase tracking-widest flex items-center gap-3">
                   {displayScene?.status === 'generating' && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />}
                   {displayScene?.status === 'generating' ? `Generating Scene 0${displayScene.id}...` : `Waiting for Scene 0${displayScene?.id}...`}
                </div>
             )}

             <div className="absolute bottom-[20px] right-[20px] bg-[rgba(0,0,0,0.6)] backdrop-blur-[10px] px-4 py-3 rounded-[8px] border border-[rgba(255,255,255,0.1)] text-[12px] z-10 flex items-center text-white">
                00:{(currentFrameIndex * 5).toString().padStart(2, '0')} / 00:40 
                <span className="text-[10px] px-[6px] py-[2px] bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded-[4px] ml-2">5.0s per frame</span>
             </div>

             {project.status === 'completed' && !isPlaying && (
                 <button onClick={playPreview} className="absolute inset-0 m-auto w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5V19L19 12L8 5Z" />
                    </svg>
                 </button>
             )}
         </div>

         <div className="grid grid-cols-8 gap-[8px] h-[80px] shrink-0">
             {validScenes.length > 0 ? validScenes.map((s: any, i: number) => (
                 <div key={i} className={cn(
                     "rounded-[6px] border cursor-pointer relative overflow-hidden transition-all",
                     currentFrameIndex === i ? "border-[var(--accent)] shadow-[0_0_10px_rgba(255,92,0,0.3)]" : "border-[var(--glass-border)]"
                 )} style={{ background: '#1a1a1a' }} onClick={() => setCurrentFrameIndex(i)}>
                     {s.imageUrl && <img src={s.imageUrl} className="w-full h-full object-cover opacity-50" />}
                     <span className="absolute top-[4px] left-[4px] text-[9px] opacity-70 bg-black/50 px-1 rounded text-white">0{s.id}</span>
                 </div>
             )) : (
                 Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="bg-[#1a1a1a] rounded-[6px] border border-[var(--glass-border)] relative overflow-hidden">
                         <span className="absolute top-[4px] left-[4px] text-[9px] opacity-50 text-white">0{i+1}</span>
                     </div>
                 ))
             )}
         </div>
         {children}
    </>
  );
};
