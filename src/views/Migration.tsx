import React, { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, subMonths } from 'date-fns';
import { useBuJo } from '../store/BuJoContext';
import { ArrowRight, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { BuJoEntry } from '../types';

export const Migration = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { entries, performMonthlyMigration } = useBuJo();
  
  const formattedCurrentMonth = format(currentMonth, 'yyyy-MM');
  const nextMonthDate = addMonths(startOfMonth(currentMonth), 1);
  const formattedNextMonth = format(nextMonthDate, 'yyyy-MM');

  const allPastOpenTasks = useMemo(() => {
     return entries.filter(e => 
      e.type === 'task' && 
      e.state === 'open' && 
      (e.logType === 'daily' || e.logType === 'monthly') &&
      e.date <= formattedCurrentMonth + '-31' 
    );
  }, [entries, formattedCurrentMonth]);

  const [toMigrate, setToMigrate] = useState<Set<string>>(new Set());
  const [toCancel, setToCancel] = useState<Set<string>>(new Set());

  const handleToggleMigrate = (id: string) => {
    setToMigrate(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setToCancel(c => { const nc = new Set(c); nc.delete(id); return nc; });
      }
      return next;
    });
  };

  const handleToggleCancel = (id: string) => {
    setToCancel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setToMigrate(m => { const nm = new Set(m); nm.delete(id); return nm; });
      }
      return next;
    });
  };

  const executeMigration = () => {
    performMonthlyMigration(Array.from(toMigrate), formattedNextMonth, Array.from(toCancel));
    setToMigrate(new Set());
    setToCancel(new Set());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <div className="text-center mb-12">
        <h1 className="text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight mb-4">
          Monthly Migration
        </h1>
        <p className="text-neutral-500 max-w-lg mx-auto">
          Review open tasks from <strong className="text-neutral-800 dark:text-neutral-200">{format(currentMonth, 'MMMM yyyy')}</strong>. 
          If a task is no longer worth your time, cancel it. Otherwise, migrate it to {format(nextMonthDate, 'MMMM yyyy')}.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 rounded-xl p-8 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
           <div className="flex items-center gap-2">
             <AlertCircle className="w-5 h-5 text-amber-500" />
             <h2 className="font-medium text-neutral-800 dark:text-neutral-200">Open Tasks Requiring Action</h2>
           </div>
           <span className="text-sm font-medium px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
             {allPastOpenTasks.length} tasks
           </span>
        </div>

        {allPastOpenTasks.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            No open tasks found for this period. You're all caught up!
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {allPastOpenTasks.map(entry => {
                const isMigrating = toMigrate.has(entry.id);
                const isCanceling = toCancel.has(entry.id);

                return (
                  <motion.li 
                    key={entry.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border transition-all",
                      isMigrating ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800/50" : 
                      isCanceling ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/50" : 
                      "border-neutral-200 dark:border-neutral-800 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-neutral-800 dark:text-neutral-200 truncate",
                        isCanceling && "line-through text-neutral-400"
                      )}>{entry.text}</p>
                      <p className="text-xs text-neutral-500 mt-1">From {entry.date} ({entry.logType})</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleToggleCancel(entry.id)}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                          isCanceling ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                        title="Cancel Task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => handleToggleMigrate(entry.id)}
                         className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                          isMigrating ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                        title="Migrate to next month"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {allPastOpenTasks.length > 0 && (
         <div className="flex justify-end pt-4">
            <button 
              onClick={executeMigration}
              disabled={toMigrate.size === 0 && toCancel.size === 0}
              className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-3 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute Migration ({toMigrate.size + toCancel.size} selected)
            </button>
         </div>
      )}
    </motion.div>
  );
};
