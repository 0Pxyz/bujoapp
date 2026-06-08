import React, { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useBuJo } from '../store/BuJoContext';
import { RapidLog } from '../components/RapidLog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const FutureLog = () => {
  const [startMonth, setStartMonth] = useState(new Date());
  const { entries } = useBuJo();

  const months = Array.from({ length: 6 }).map((_, i) => addMonths(startMonth, i));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-12 px-6"
    >
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
          Future Log
        </h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setStartMonth(subMonths(startMonth, 6))}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <button 
            onClick={() => setStartMonth(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Current
          </button>
          <button 
            onClick={() => setStartMonth(addMonths(startMonth, 6))}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {months.map(month => {
          const formattedString = format(month, 'yyyy-MM');
          const displayMonth = format(month, 'MMMM yyyy');
          const monthEntries = entries.filter(e => e.logType === 'future' && e.date === formattedString).sort((a,b) => a.order - b.order);

          return (
            <div key={formattedString} className="flex flex-col h-[300px] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
              <h2 className="text-lg font-medium border-b border-neutral-100 dark:border-neutral-800 pb-2 mb-4 text-neutral-800 dark:text-neutral-200">
                {displayMonth}
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <RapidLog entries={monthEntries} logType="future" date={formattedString} className="text-sm" />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
