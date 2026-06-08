import React, { useState } from 'react';
import { BuJoEntry, TaskState, BulletType } from '../types';
import { useBuJo } from '../store/BuJoContext';
import { Circle, Minus, ArrowRight, ArrowLeft, X, Star, Lightbulb, CircleDot, GripVertical, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { parseBuJoEntry } from '../lib/bujoParser';

const BulletIcon = ({ type, state, className }: { type: BulletType, state: TaskState, className?: string }) => {
  if (type === 'event') return <Circle className={cn("w-4 h-4", className)} />;
  if (type === 'note') return <Minus className={cn("w-4 h-4", className)} />;
  
  // type === 'task'
  if (state === 'completed') return <X className={cn("w-4 h-4", className)} />;
  if (state === 'migrated') return <ArrowRight className={cn("w-4 h-4", className)} />;
  if (state === 'scheduled') return <ArrowLeft className={cn("w-4 h-4", className)} />;
  if (state === 'canceled') return <Minus className={cn("w-4 h-4", className)} />;
  
  return <CircleDot className={cn("w-4 h-4", className)} />;
};

interface RapidLogProps {
  entries: BuJoEntry[];
  logType: BuJoEntry['logType'];
  date: string;
  collectionId?: string;
  className?: string;
}

export const RapidLog: React.FC<RapidLogProps> = ({ entries, logType, date, collectionId, className }) => {
  const { addEntry, updateEntryState, updateEntryText, deleteEntry, reorderEntries, settings } = useBuJo();
  const [inputText, setInputText] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement === document.body || 
        document.activeElement?.tagName === 'BUTTON'
      ) {
        if (settings?.shortcuts?.focusNewEntry && e.key.toLowerCase() === settings.shortcuts.focusNewEntry.toLowerCase()) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [settings?.shortcuts?.focusNewEntry]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      const parsed = parseBuJoEntry(inputText);
      addEntry(parsed.text || inputText.trim(), parsed.type, logType, date, parsed.signifiers, collectionId);
      setInputText('');
    }
  };

  const parsedLive = parseBuJoEntry(inputText);

  const toggleTaskState = (entry: BuJoEntry) => {
    if (entry.type !== 'task') return;
    const nextState: Record<TaskState, TaskState> = {
      'open': 'completed',
      'completed': 'canceled',
      'canceled': 'open',
      'migrated': 'open',
      'scheduled': 'open',
    };
    updateEntryState(entry.id, nextState[entry.state]);
  };

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      <Reorder.Group axis="y" values={entries} onReorder={(newOrder) => {
        if (reorderEntries) reorderEntries(newOrder.map(e => e.id));
      }} className="space-y-2">
        <AnimatePresence>
          {entries.map(entry => (
            <Reorder.Item 
              key={entry.id}
              value={entry}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="group flex items-start space-x-2 p-1 -mx-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors bg-white dark:bg-neutral-900"
            >
              <div className="opacity-0 group-hover:opacity-100 cursor-grab text-neutral-300 dark:text-neutral-600 mt-1.5 shrink-0 flex items-center justify-center -ml-4 pr-1">
                 <GripVertical className="w-4 h-4" />
              </div>
              <div 
                className="w-8 flex items-center justify-end shrink-0 pt-1 cursor-pointer"
                onClick={() => toggleTaskState(entry)}
              >
                <BulletIcon 
                  type={entry.type} 
                  state={entry.state} 
                  className={cn(
                    "text-neutral-600 dark:text-neutral-400",
                    entry.state === 'completed' && "text-green-500",
                    entry.state === 'canceled' && "text-neutral-300 dark:text-neutral-700"
                  )} 
                />
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1.5 min-w-0">
                <input
                  type="text"
                  value={entry.text}
                  onChange={(e) => updateEntryText(entry.id, e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-neutral-800 dark:text-neutral-200 min-w-0 placeholder:text-neutral-300",
                    entry.state === 'completed' && "text-neutral-400 dark:text-neutral-500 line-through",
                    entry.state === 'canceled' && "text-neutral-300 dark:text-neutral-700 line-through"
                  )}
                />
                
                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-x-auto no-scrollbar shrink-0">
                  {entry.type === 'task' && <span className="px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] uppercase tracking-wider font-medium font-sans">Task</span>}
                  {entry.type === 'note' && <span className="px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] uppercase tracking-wider font-medium font-sans">Note</span>}
                  {entry.type === 'event' && <span className="px-1.5 py-0.5 rounded-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] uppercase tracking-wider font-medium font-sans">Event</span>}
                  
                  {entry.signifiers?.priority && <span className="px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1"><Star className="w-2.5 h-2.5 inline" /> Priority</span>}
                  {entry.signifiers?.idea && <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1"><Lightbulb className="w-2.5 h-2.5 inline" /> Idea</span>}
                  {entry.signifiers?.explore && <span className="px-1.5 py-0.5 rounded-sm bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1"><Search className="w-2.5 h-2.5 inline" /> Explore</span>}
                </div>
              </div>
              
              <button 
                onClick={() => deleteEntry(entry.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 px-2 flex-shrink-0"
                aria-label="Delete entry"
              >
                <X className="w-4 h-4" />
              </button>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <div className="flex items-center space-x-2 mt-4 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 pb-2 transition-colors">
        <div className="w-16 flex justify-end shrink-0 text-sm opacity-50 select-none items-center space-x-1">
           {inputText.trim() !== '' ? (
             <>
               {parsedLive.signifiers.priority && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
               {parsedLive.signifiers.idea && <Lightbulb className="w-3 h-3 text-emerald-500" />}
               {parsedLive.signifiers.explore && <Search className="w-3 h-3 text-blue-500" />}
               <BulletIcon type={parsedLive.type} state="open" className="w-4 h-4 ml-1" />
             </>
           ) : (
             <span>&gt;</span>
           )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New entry..."
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 placeholder:text-neutral-400 min-w-0 truncate"
        />
      </div>
    </div>
  );
};
