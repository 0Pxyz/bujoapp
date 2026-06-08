import React, { useState } from 'react';
import { BuJoEntry, TaskState, BulletType } from '../types';
import { useBuJo } from '../store/BuJoContext';
import { Circle, Minus, ArrowRight, ArrowLeft, X, Star, Lightbulb, CircleDot, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBuJoEntry } from '../lib/bujoParser';

const BulletIcon = ({ type, state, className }: { type: BulletType, state: TaskState, className?: string }) => {
  if (type === 'event') return <Circle className={cn("w-4 h-4", className)} />;
  if (type === 'note') return <Minus className={cn("w-4 h-4", className)} />;
  if (state === 'completed') return <X className={cn("w-4 h-4", className)} />;
  if (state === 'migrated') return <ArrowRight className={cn("w-4 h-4", className)} />;
  if (state === 'scheduled') return <ArrowLeft className={cn("w-4 h-4", className)} />;
  if (state === 'canceled') return <Minus className={cn("w-4 h-4", className)} />;
  return <CircleDot className={cn("w-4 h-4", className)} />;
};

interface Props {
  entries: BuJoEntry[];
  logType: BuJoEntry['logType'];
  date: string;
  collectionId?: string;
  className?: string;
}

export const RapidLog: React.FC<Props> = ({ entries, logType, date, collectionId, className }) => {
  const { addEntry, updateEntryState, deleteEntry, settings } = useBuJo();
  const [inputText, setInputText] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      const parsed = parseBuJoEntry(inputText);
      addEntry(parsed.text || inputText.trim(), parsed.type, logType, date, parsed.signifiers, collectionId);
      setInputText('');
    }
  };

  const parsedLive = parseBuJoEntry(inputText);

  const toggleState = (entry: BuJoEntry) => {
    if (entry.type !== 'task') return;
    const next: Record<TaskState, TaskState> = { 'open': 'completed', 'completed': 'canceled', 'canceled': 'open', 'migrated': 'open', 'scheduled': 'open' };
    updateEntryState(entry.id, next[entry.state]);
  };

  return (
    <div className={cn("", className)}>
      <AnimatePresence>
        {entries.map(entry => (
          <motion.div key={entry.id} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="flex items-start gap-2 py-1.5 group">
            <button onClick={() => toggleState(entry)} className="shrink-0 pt-1 active:scale-90 transition-transform">
              <BulletIcon type={entry.type} state={entry.state}
                className={cn("text-neutral-500 dark:text-neutral-400", entry.state === 'completed' && "text-emerald-500", entry.state === 'canceled' && "text-neutral-300 dark:text-neutral-600")} />
            </button>
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed", (entry.state === 'completed' || entry.state === 'canceled') && "line-through text-neutral-400 dark:text-neutral-500")}>
                {entry.text}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {entry.type === 'task' && <span className="text-[10px] font-medium text-blue-500">Task</span>}
                {entry.type === 'note' && <span className="text-[10px] font-medium text-neutral-400">Note</span>}
                {entry.type === 'event' && <span className="text-[10px] font-medium text-purple-500">Event</span>}
                {entry.signifiers?.priority && <Star className="w-3 h-3 text-amber-400" />}
                {entry.signifiers?.idea && <Lightbulb className="w-3 h-3 text-emerald-400" />}
                {entry.signifiers?.explore && <Search className="w-3 h-3 text-cyan-400" />}
              </div>
            </div>
            <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 active:scale-90 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div className="shrink-0 flex items-center gap-1 text-neutral-400">
          {inputText.trim() ? (
            <>
              {parsedLive.signifiers.priority && <Star className="w-3 h-3 text-amber-400" />}
              {parsedLive.signifiers.idea && <Lightbulb className="w-3 h-3 text-emerald-400" />}
              {parsedLive.signifiers.explore && <Search className="w-3 h-3 text-cyan-400" />}
              <BulletIcon type={parsedLive.type} state="open" className="w-3.5 h-3.5" />
            </>
          ) : (
            <span className="text-sm font-mono">&gt;</span>
          )}
        </div>
        <input ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Quick add..." autoComplete="off"
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm py-2 placeholder:text-neutral-400" />
      </div>
    </div>
  );
};
