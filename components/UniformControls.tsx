import React from 'react';
import { UniformDefinition, UniformType } from '../types';
import { Sliders, Palette } from 'lucide-react';

interface UniformControlsProps {
  uniforms: UniformDefinition[];
  onChange: (name: string, value: any) => void;
}

const UniformControls: React.FC<UniformControlsProps> = ({ uniforms, onChange }) => {
  if (uniforms.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 w-64 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <Sliders size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Parameters</span>
      </div>
      <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {uniforms.map((u) => (
          <div key={u.name} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <label htmlFor={u.name} className="font-mono">{u.name}</label>
              <span className="opacity-50">{u.type}</span>
            </div>
            
            {/* Float Control */}
            {u.type === UniformType.FLOAT && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={u.min ?? 0}
                  max={u.max ?? 10}
                  step={0.01}
                  value={u.value}
                  onChange={(e) => onChange(u.name, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-xs w-8 text-right font-mono">{u.value.toFixed(2)}</span>
              </div>
            )}

            {/* Color Control */}
            {u.type === UniformType.COLOR && (
              <div className="flex gap-2">
                <div 
                    className="w-full h-8 rounded border border-gray-600 cursor-pointer flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: `rgb(${u.value[0]*255},${u.value[1]*255},${u.value[2]*255})` }}
                >
                     <input 
                        type="color" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        value={`#${Math.round(u.value[0]*255).toString(16).padStart(2,'0')}${Math.round(u.value[1]*255).toString(16).padStart(2,'0')}${Math.round(u.value[2]*255).toString(16).padStart(2,'0')}`}
                        onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16) / 255;
                            const g = parseInt(hex.slice(3, 5), 16) / 255;
                            const b = parseInt(hex.slice(5, 7), 16) / 255;
                            onChange(u.name, [r, g, b]);
                        }}
                     />
                     <Palette className="text-white drop-shadow-md" size={16} />
                </div>
              </div>
            )}

            {/* Vec2 Control */}
            {u.type === UniformType.VEC2 && (
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <span className="text-[10px] text-gray-500 uppercase">X</span>
                    <input
                        type="number"
                        step="0.1"
                        value={u.value[0]}
                        onChange={(e) => onChange(u.name, [parseFloat(e.target.value), u.value[1]])}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                    />
                 </div>
                 <div>
                    <span className="text-[10px] text-gray-500 uppercase">Y</span>
                    <input
                        type="number"
                        step="0.1"
                        value={u.value[1]}
                        onChange={(e) => onChange(u.name, [u.value[0], parseFloat(e.target.value)])}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                    />
                 </div>
              </div>
            )}
             {/* Vec3 Control (Non-Color) */}
             {u.type === UniformType.VEC3 && (
              <div className="grid grid-cols-3 gap-1">
                 {[0,1,2].map((i) => (
                     <div key={i}>
                        <span className="text-[10px] text-gray-500 uppercase">{['x','y','z'][i]}</span>
                        <input
                            type="number"
                            step="0.1"
                            value={u.value[i]}
                            onChange={(e) => {
                                const newVal = [...u.value];
                                newVal[i] = parseFloat(e.target.value);
                                onChange(u.name, newVal);
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-1 text-xs text-gray-200"
                        />
                     </div>
                 ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UniformControls;