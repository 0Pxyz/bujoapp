import React, { useState } from 'react';
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import { useBuJo } from '../store/BuJoContext';
import { RapidLog } from '../components/RapidLog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export const MonthlyLog = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { entries, addEntry } = useBuJo();

  const formattedMonthString = format(currentMonth, 'yyyy-MM');
  const displayMonth = format(currentMonth, 'MMMM yyyy');
  const daysInMonth = getDaysInMonth(currentMonth);

  const monthEntries = entries.filter(e => e.logType === 'monthly' && e.date === formattedMonthString).sort((a,b) => a.order - b.order);
  
  // Tasks for the month (not specific to a day)
  const taskEntries = monthEntries;

  const getCalendarSummaryForDay = (dayStr: string) => {
    const dayEntries = entries.filter(e => e.logType === 'daily' && e.date === dayStr);
    const events = dayEntries.filter(e => e.type === 'event');
    if (events.length > 0) return events.map(e => e.text).join(', ');
    return '';
  };

  const handleCalendarInput = (dayStr: string, text: string) => {
    if (!text.trim()) return;
    addEntry(text, 'event', 'daily', dayStr);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto py-12 px-6"
    >
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
          {displayMonth}
        </h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Current
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Calendar Page */}
        <div>
          <h2 className="text-xl font-medium mb-6 text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-800 pb-2">Calendar</h2>
          <div className="space-y-1">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dayStr = format(date, 'yyyy-MM-dd');
              const dayOfWeek = format(date, 'EEEEE'); // S, M, T, W, T, F, S
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const summary = getCalendarSummaryForDay(dayStr);

              return (
                <div key={day} className="flex items-center space-x-3 text-sm group">
                  <span className={cn(
                    "w-6 text-right font-mono text-neutral-400",
                    isWeekend && "text-neutral-300 dark:text-neutral-600"
                  )}>{day}</span>
                  <span className={cn(
                    "w-4 font-medium text-neutral-600 dark:text-neutral-400",
                    isWeekend && "text-neutral-400 dark:text-neutral-500"
                  )}>{dayOfWeek}</span>
                  <input
                    type="text"
                    placeholder=" "
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 py-1 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-300"
                    defaultValue={summary}
                    onBlur={(e) => {
                       if(e.target.value !== summary && e.target.value.trim() !== "") {
                          handleCalendarInput(dayStr, e.target.value);
                       }
                    }}
                    onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                          e.currentTarget.blur();
                       }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks Page */}
        <div>
           <h2 className="text-xl font-medium mb-6 text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-800 pb-2">Tasks</h2>
           <RapidLog entries={taskEntries} logType="monthly" date={formattedMonthString} />
        </div>
      </div>
    </motion.div>
  );
};
