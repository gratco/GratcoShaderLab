import React, { useCallback } from 'react';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const Editor: React.FC<EditorProps> = ({ code, onChange, onUndo, onRedo }) => {
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Undo / Redo
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        onRedo?.();
      } else {
        onUndo?.();
      }
      return;
    }

    // Redo (Standard alternative Ctrl+Y)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      onRedo?.();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = code.substring(0, start) + "  " + code.substring(end);
      onChange(newValue);

      // Wait for React render cycle to update cursor
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  }, [code, onChange, onUndo, onRedo]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative h-full w-full bg-gray-950 font-mono text-sm">
      <textarea
        value={code}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full h-full bg-transparent text-gray-300 p-4 resize-none focus:outline-none font-mono leading-6 custom-scrollbar"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        placeholder="// Type your HLSL shader code here..."
      />
    </div>
  );
};

export default Editor;