import React, { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { useBuJo } from '../store/BuJoContext';
import { RapidLog } from '../components/RapidLog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const DailyLog = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { entries } = useBuJo();

  const formattedDateString = format(currentDate, 'yyyy-MM-dd');
  const displayDate = format(currentDate, 'EEEE, MMMM do');

  const todaysEntries = entries.filter(e => e.logType === 'daily' && e.date === formattedDateString).sort((a,b) => a.order - b.order);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-6 md:py-12 px-4 md:px-6"
    >
      <div className="flex items-center justify-between mb-6 md:mb-12">
        <h1 className="text-xl md:text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
          {displayDate}
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:bg-neutral-200 dark:active:bg-neutral-700"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="h-9 px-3 text-sm font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors active:scale-95"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:bg-neutral-200 dark:active:bg-neutral-700"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 md:p-8">
        <RapidLog 
          entries={todaysEntries} 
          logType="daily" 
          date={formattedDateString} 
        />
      </div>
    </motion.div>
  );
};
