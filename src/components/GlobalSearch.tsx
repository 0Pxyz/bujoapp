import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { Search as SearchIcon, X, Calendar, Library, Target, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
}

export const GlobalSearch = ({ isOpen, onClose, onNavigate }: GlobalSearchProps) => {
  const { entries, collections, habits } = useBuJo();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results = [];

    // Search Entries
    for (const entry of entries) {
      if (entry.text.toLowerCase().includes(q)) {
        let location = entry.logType === 'daily' ? `Daily Log (${entry.date})` :
                       entry.logType === 'monthly' ? `Monthly Log (${format(parseISO(entry.date + '-01'), 'MMMM yyyy')})` :
                       entry.logType === 'future' ? `Future Log (${format(parseISO(entry.date + '-01'), 'MMMM yyyy')})` : 'Collection';
                       
        if (entry.collectionId) {
          const col = collections.find(c => c.id === entry.collectionId);
          if (col) location = col.title;
        }

        results.push({
          id: entry.id,
          type: 'entry',
          text: entry.text,
          subtext: location,
          view: entry.logType === 'daily' ? 'daily' : 
                entry.logType === 'monthly' ? 'monthly' :
                entry.logType === 'future' ? 'future' : 'collections',
          icon: entry.logType === 'daily' ? <BookOpen className="w-4 h-4" /> : 
                entry.collectionId ? <Library className="w-4 h-4" /> : <Calendar className="w-4 h-4" />
        });
      }
    }

    // Search Collections
    for (const col of collections) {
      if (col.title.toLowerCase().includes(q)) {
        const entryCount = entries.filter(e => e.collectionId === col.id).length;
        results.push({
          id: col.id,
          type: 'collection',
          text: col.title,
          subtext: `${entryCount} items`,
          view: 'collections',
          icon: <Library className="w-4 h-4 text-purple-500" />
        });
      }
    }

    // Search Habits
    for (const habit of habits) {
      if (habit.name.toLowerCase().includes(q)) {
        results.push({
          id: habit.id,
          type: 'habit',
          text: habit.name,
          subtext: `Habit tracker`,
          view: 'habits',
          icon: <Target className="w-4 h-4 text-emerald-500" />
        });
      }
    }

    return results;
  }, [query, entries, collections, habits]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <SearchIcon className="w-5 h-5 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logs, collections, habits..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-3 py-1 text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
              />
              <button 
                onClick={onClose}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
               {query.trim().length === 0 ? (
                 <div className="py-12 px-6 flex flex-col items-center justify-center text-center text-neutral-500 dark:text-neutral-400">
                   <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-full flex items-center justify-center mb-4">
                     <SearchIcon className="w-6 h-6 text-neutral-400" />
                   </div>
                   <p className="font-medium text-neutral-700 dark:text-neutral-300">Global Search</p>
                   <p className="text-sm mt-1">Start typing to quickly find bullet entries, collections, or habits.</p>
                 </div>
               ) : searchResults.length === 0 ? (
                 <div className="py-12 px-6 text-center text-neutral-500">
                   <p>No results found for "{query}"</p>
                 </div>
               ) : (
                 <ul className="py-2">
                   {searchResults.map((result, i) => (
                     <li key={`${result.type}-${result.id}-${i}`}>
                       <button
                         className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left group"
                         onClick={() => {
                            if (result.view) onNavigate(result.view);
                            onClose();
                         }}
                       >
                         <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-white dark:group-hover:bg-neutral-700 transition-colors">
                           {result.icon}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                             {result.text}
                           </p>
                           <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                             {result.subtext}
                           </p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 text-xs font-mono text-neutral-400 pr-2 transition-opacity">
                           ↵
                         </div>
                       </button>
                     </li>
                   ))}
                 </ul>
               )}
            </div>
            
            <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs flex justify-between text-neutral-400 font-medium">
               <div className="flex gap-4">
                  <span>esc to dismiss</span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
