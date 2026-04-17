import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { RightInspector } from './components/VideoPlayer';
import { useStore } from './store/useStore';

export default function App() {
  const { projects, currentProjectId } = useStore();
  const project = projects.find(p => p.id === currentProjectId);

  return (
    <>
      <div className="absolute w-[800px] h-[800px] top-[-200px] right-[-200px] pointer-events-none z-0" 
           style={{ background: 'radial-gradient(circle, rgba(255, 92, 0, 0.07) 0%, transparent 70%)' }}></div>
      <div className="grid grid-cols-[240px_1fr_280px] h-screen bg-[var(--bg)] text-[var(--text-main)] w-full overflow-hidden font-sans">
        <Sidebar />
        <ChatInterface />
        {project ? <RightInspector project={project} /> : <div className="border-l border-[var(--glass-border)] bg-[rgba(10,10,10,0.6)] w-[280px]" />}
      </div>
    </>
  );
}

