import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import UniformControls from './components/UniformControls';
import { DEFAULT_SHADER_CODE, UniformDefinition } from './types';
import { parseUniforms } from './utils/shaderUtils';
import { Sparkles, Code2, AlertCircle, Loader2, Undo2, Redo2, RefreshCcw } from 'lucide-react';
import { generateShaderCode } from './services/geminiService';

function App() {
  // History State
  const [history, setHistory] = useState<string[]>([DEFAULT_SHADER_CODE]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current Code State
  const [code, setCode] = useState(DEFAULT_SHADER_CODE);
  const [reloadKey, setReloadKey] = useState(0);
  
  const [uniforms, setUniforms] = useState<UniformDefinition[]>([]);
  const [splitPos, setSplitPos] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [prompt, setPrompt] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Parse uniforms when code changes
  useEffect(() => {
    const detected = parseUniforms(code);
    
    setUniforms(prev => {
      // Merge old values if names match, to preserve user tweaks
      return detected.map(newU => {
        const existing = prev.find(p => p.name === newU.name && p.type === newU.type);
        return existing ? { ...newU, value: existing.value } : newU;
      });
    });
  }, [code]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Clear existing timeout
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    // Debounce history update
    historyTimeoutRef.current = setTimeout(() => {
      setHistory(prev => {
        const currentHistory = prev.slice(0, historyIndex + 1);
        // Only add if actually different from the last committed state
        if (currentHistory[currentHistory.length - 1] !== newCode) {
          return [...currentHistory, newCode];
        }
        return prev;
      });
      
      setHistoryIndex(prev => {
        return prev + 1; 
      });
    }, 750);
  };

  // Override history set for "Hard" updates (Undo/Redo/AI)
  const pushHistoryImmediate = (newCode: string) => {
     if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
     
     setHistory(prev => {
       const sliced = prev.slice(0, historyIndex + 1);
       return [...sliced, newCode];
     });
     setHistoryIndex(prev => prev + 1);
     setCode(newCode);
  };

  const handleUndo = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);

    // If current code is dirty (not saved to history yet), revert to current history head
    const currentHead = history[historyIndex];
    if (code !== currentHead) {
      setCode(currentHead);
      return;
    }

    // Otherwise, step back
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  }, [history, historyIndex, code]);

  const handleRedo = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleUniformChange = (name: string, value: any) => {
    setUniforms(prev => prev.map(u => u.name === name ? { ...u, value } : u));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSplitPos(Math.min(Math.max(percentage, 20), 80));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      // If empty, focus the textarea to guide the user
      textAreaRef.current?.focus();
      return;
    }
    setIsGenerating(true);
    try {
      const newCode = await generateShaderCode(prompt, code);
      if (newCode) {
        pushHistoryImmediate(newCode);
        setShowGeminiModal(false);
        setPrompt('');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate code. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReload = () => {
    setReloadKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-white font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Code2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">Lumina Shader Lab</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">HLSL Previewer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Undo / Redo Controls */}
           <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800">
              <button 
                onClick={handleUndo} 
                disabled={historyIndex === 0 && code === history[0]}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <div className="w-px h-4 bg-gray-800 mx-1"></div>
              <button 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={16} />
              </button>
           </div>

           <button 
              onClick={handleReload}
              className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shadow-sm"
              title="Restart Preview"
            >
              <RefreshCcw size={16} />
           </button>

           {error && (
             <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-3 py-1.5 rounded border border-red-900/50 text-xs">
               <AlertCircle size={14} />
               <span>Error</span>
             </div>
           )}
          <button 
            onClick={() => setShowGeminiModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full text-sm font-medium transition-all shadow-lg shadow-purple-900/20 border border-white/10"
          >
            <Sparkles size={16} />
            <span>Generate w/ AI</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex relative bg-gray-900">
        
        {/* Editor Panel */}
        <div style={{ width: `${splitPos}%` }} className="h-full relative flex flex-col min-w-[200px]">
          <div className="flex-1 bg-gray-950 relative">
             <Editor 
                code={code} 
                onChange={handleCodeChange} 
                onUndo={handleUndo}
                onRedo={handleRedo}
             />
          </div>
          <div className="h-6 bg-gray-900 border-t border-gray-800 flex items-center px-4 text-[10px] text-gray-500 font-mono justify-between">
             <span>History: {historyIndex + 1} / {history.length}</span>
             <span>Ln 1, Col 1</span>
          </div>
        </div>

        {/* Drag Handle */}
        <div
          className={`w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors z-30 flex items-center justify-center group ${isDragging ? 'bg-blue-600' : ''}`}
          onMouseDown={handleMouseDown}
        >
           <div className="h-8 w-1 bg-gray-600 group-hover:bg-white rounded-full" />
        </div>

        {/* Preview Panel */}
        <div style={{ width: `${100 - splitPos}%` }} className="h-full relative min-w-[200px] bg-black">
           <Preview 
              key={reloadKey}
              code={code} 
              uniforms={uniforms} 
              onError={setError} 
              onSuccess={() => setError(null)}
            />
           <UniformControls uniforms={uniforms} onChange={handleUniformChange} />
        </div>
      </div>

      {/* Gemini Modal */}
      {showGeminiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-[500px] shadow-2xl p-6 transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="text-purple-400" />
              <span>AI Shader Generator</span>
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Describe the visual effect you want to create. The AI will generate the HLSL code for you.
            </p>
            <textarea 
              ref={textAreaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none h-32"
              placeholder="e.g., A futuristic neon grid that scrolls with time and pulses with color..."
            />
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowGeminiModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isGenerating ? 'Generating...' : 'Create Magic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;