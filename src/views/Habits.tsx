import React, { useState } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { format, subDays, startOfWeek, addDays, getDaysInMonth, startOfMonth, isSameDay } from 'date-fns';
import { Plus, X, Activity, Flame, Calendar as CalendarIcon, CheckSquare, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { HabitFrequencyType } from '../types';

export const Habits = () => {
  const { habits, habitLogs, addHabit, deleteHabit, toggleHabit } = useBuJo();
  const [newHabit, setNewHabit] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [showOptions, setShowOptions] = useState(false);
  const [freqType, setFreqType] = useState<HabitFrequencyType>('daily');
  const [specDays, setSpecDays] = useState<number[]>([1,2,3,4,5]); // Default Mon-Fri
  const [timesPerWeek, setTimesPerWeek] = useState(3);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabit.trim()) {
      addHabit(newHabit.trim(), freqType, specDays, timesPerWeek);
      setNewHabit('');
      setShowOptions(false);
      setFreqType('daily');
    }
  };

  const toggleSpecDay = (day: number) => {
    setSpecDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const startDay = startOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }).map((_, i) => addDays(startDay, i));

  const getStreak = (habitId: string, frequencyType: HabitFrequencyType = 'daily', specificDays: number[] = [], timesPerWeek: number = 3) => {
    let streak = 0;
    let currDate = new Date();
    
    if (frequencyType === 'daily' || frequencyType === 'specific_days') {
      while (true) {
        // If it's a specific day habit, only expect logs on those days
        const dayOfWeek = currDate.getDay();
        const expectsLog = frequencyType === 'daily' || specificDays.includes(dayOfWeek);
        
        if (expectsLog) {
          const dateStr = format(currDate, 'yyyy-MM-dd');
          const log = habitLogs.find(l => l.habitId === habitId && l.date === dateStr);
          
          if (log?.completed) {
            streak++;
          } else {
             if (format(currDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) {
                break;
             }
          }
        }
        currDate = subDays(currDate, 1);
      if (streak > 1000) break;
      }
    } else if (frequencyType === 'interval') {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const currentWeekLogs = habitLogs.filter(l => {
         const d = new Date(l.date);
         return l.habitId === habitId && d >= currentWeekStart && l.completed;
      }).length;
      streak = currentWeekLogs;
    }
    
    return streak;
  };

  const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8 px-4 md:py-12 md:px-6 mb-20 md:mb-0"
    >
      <div className="flex items-center justify-between mb-8 md:mb-12">
        <h1 className="text-2xl md:text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
          Habit Tracker
        </h1>
      </div>

      <div className="mb-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input 
            type="text" 
            value={newHabit} 
            onChange={e => setNewHabit(e.target.value)} 
            placeholder="New habit... (e.g. Drink water)"
            className="flex-1 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 md:py-2 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={cn(
              "p-2 rounded-lg border transition-colors flex items-center justify-center min-w-[3rem]",
              showOptions ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100" : "bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
            title="Scheduling Options"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <button 
            type="submit" 
            className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 md:px-4 py-3 md:py-2 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center min-w-[3rem]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-sm font-medium mb-3 text-neutral-700 dark:text-neutral-300">Goal Frequency</p>
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setFreqType('daily')} className={cn("px-3 py-1.5 text-sm rounded-full transition-colors flex items-center justify-center border", freqType === 'daily' ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent": "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
                    Daily
                  </button>
                  <button type="button" onClick={() => setFreqType('specific_days')} className={cn("px-3 py-1.5 text-sm rounded-full transition-colors flex items-center justify-center border", freqType === 'specific_days' ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent": "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
                    Specific Days
                  </button>
                  <button type="button" onClick={() => setFreqType('interval')} className={cn("px-3 py-1.5 text-sm rounded-full transition-colors flex items-center justify-center border", freqType === 'interval' ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent": "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
                    Times per Week
                  </button>
                </div>

                {freqType === 'specific_days' && (
                  <div className="flex gap-1 mb-2">
                    {WEEKDAYS.map((day, i) => (
                      <button key={i} type="button" onClick={() => toggleSpecDay(i)} className={cn("w-8 h-8 rounded-full text-xs font-medium transition-colors", specDays.includes(i) ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500")}>
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {freqType === 'interval' && (
                  <div className="flex items-center gap-3 mb-2">
                    <input type="range" min="1" max="7" value={timesPerWeek} onChange={(e) => setTimesPerWeek(parseInt(e.target.value))} className="w-32 accent-neutral-900 dark:accent-neutral-100" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{timesPerWeek} days / week</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        {habits.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            No habits created yet. Build a better routine by adding one above.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-max p-4">
               <div className="flex mb-4">
                  <div className="w-56 shrink-0"></div>
                  <div className="flex gap-1">
                    {days.map(day => (
                      <div key={day.toISOString()} className="w-8 flex flex-col items-center justify-end">
                        <span className="text-[10px] text-neutral-400">{format(day, 'E')[0]}</span>
                        <span className={cn(
                          "text-xs font-medium",
                          format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"
                        )}>{format(day, 'd')}</span>
                      </div>
                    ))}
                  </div>
               </div>

               <ul className="space-y-4">
                 <AnimatePresence>
                   {habits.map(habit => {
                     const streak = getStreak(habit.id, habit.frequencyType, habit.specificDays, habit.timesPerWeek);
                     const freq = habit.frequencyType || 'daily';
                     
                     return (
                       <motion.li 
                         key={habit.id}
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0, height: 0 }}
                         className="flex group items-center"
                       >
                          <div className="w-56 shrink-0 flex items-center justify-between pr-4">
                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                              {streak > 0 ? (
                                <div className="flex items-center gap-1 text-orange-500 w-8 shrink-0 justify-center">
                                  {freq === 'interval' ? (
                                    <span className="text-xs font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-600 px-1.5 py-0.5 rounded">{streak}/{habit.timesPerWeek}</span>
                                  ) : (
                                    <>
                                      <Flame className="w-3 h-3 fill-orange-500/20" />
                                      <span className="text-xs font-bold">{streak}</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                 <div className="w-8 shrink-0 flex justify-center">
                                    <Activity className="w-4 h-4 text-neutral-400" />
                                 </div>
                              )}
                              <div>
                                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 block truncate" title={habit.name}>
                                  {habit.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
                                  {freq === 'daily' ? 'Daily' : freq === 'interval' ? `${habit.timesPerWeek}x / Wk` : 'Specific Days'}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteHabit(habit.id)}
                              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                         </div>

                         <div className="flex gap-1">
                           {days.map(day => {
                             const dateStr = format(day, 'yyyy-MM-dd');
                             const log = habitLogs.find(l => l.habitId === habit.id && l.date === dateStr);
                             const isCompleted = log?.completed;
                             const isFuture = day > new Date();
                             
                             let expected = true;
                             if (freq === 'specific_days' && habit.specificDays) {
                               expected = habit.specificDays.includes(day.getDay());
                             }

                             return (
                               <div key={dateStr} className="w-8 h-8 flex items-center justify-center relative">
                                 {expected ? (
                                   <button
                                     disabled={isFuture}
                                     onClick={() => toggleHabit(habit.id, dateStr)}
                                     className={cn(
                                       "w-7 h-7 rounded-md flex items-center justify-center transition-all",
                                       isFuture ? "opacity-30 cursor-not-allowed bg-neutral-50 dark:bg-neutral-800/50" : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                       isCompleted ? "bg-amber-400 dark:bg-amber-600" : "bg-neutral-100 dark:bg-neutral-800/80"
                                     )}
                                   >
                                     <motion.div 
                                        animate={{ scale: isCompleted ? 1 : 0 }} 
                                        className="w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-900" 
                                     />
                                   </button>
                                 ) : (
                                   <div className="w-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800" title="Not scheduled" />
                                 )}
                               </div>
                             )
                           })}
                         </div>
                       </motion.li>
                     )
                   })}
                 </AnimatePresence>
               </ul>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
