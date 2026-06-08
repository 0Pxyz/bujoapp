import React, { useState } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { Plus, X, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { HabitFrequencyType } from '../types';

const Dot = ({ done, future, onClick }: { done: boolean; future: boolean; onClick: () => void }) => (
  <button disabled={future} onClick={onClick}
    className={cn("w-full aspect-square rounded-sm transition-colors active:scale-90",
      future ? "bg-neutral-100 dark:bg-neutral-800/30 cursor-default" : done ? "bg-amber-400 dark:bg-amber-500" : "bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600")}
  />
);

export const Habits = () => {
  const { habits, habitLogs, addHabit, deleteHabit, toggleHabit } = useBuJo();
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState('');
  const [freqType, setFreqType] = useState<HabitFrequencyType>('daily');
  const [specDays, setSpecDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getStreak = (id: string) => {
    let s = 0, d = new Date();
    while (true) {
      const log = habitLogs.find(l => l.habitId === id && l.date === format(d, 'yyyy-MM-dd'));
      if (log?.completed) { s++; d = subDays(d, 1); }
      else if (format(d, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) break;
      else d = subDays(d, 1);
      if (s > 365) break;
    }
    return s;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabit.trim()) {
      addHabit(newHabit.trim(), freqType, specDays, timesPerWeek);
      setNewHabit('');
      setShowForm(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-6 md:py-12 px-4 md:px-6 mb-20 md:mb-0 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100">Habits</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 flex items-center justify-center bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full active:scale-90 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleAdd} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3 shadow-sm">
              <input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Habit name..."
                className="w-full bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600" />
              <div className="flex gap-2">
                {(['daily', 'specific_days', 'interval'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setFreqType(f)}
                    className={cn("px-3 py-1.5 text-xs rounded-full border font-medium transition-colors",
                      freqType === f ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent" : "border-neutral-200 dark:border-neutral-700 text-neutral-500")}>
                    {f === 'daily' ? 'Daily' : f === 'specific_days' ? 'Days' : 'Weekly'}
                  </button>
                ))}
              </div>
              {freqType === 'specific_days' && (
                <div className="flex gap-1.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <button key={i} type="button" onClick={() => setSpecDays(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i].sort())}
                      className={cn("w-9 h-9 rounded-full text-xs font-medium transition-colors", specDays.includes(i) ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400")}>{d}</button>
                  ))}
                </div>
              )}
              {freqType === 'interval' && (
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={7} value={timesPerWeek} onChange={e => setTimesPerWeek(+e.target.value)} className="flex-1 accent-neutral-900" />
                  <span className="text-xs font-medium text-neutral-500 w-16 text-right">{timesPerWeek}x / wk</span>
                </div>
              )}
              <button type="submit" disabled={!newHabit.trim()}
                className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-transform">Add Habit</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {habits.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 text-sm">No habits yet. Tap + to add one.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200">
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
            </button>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200">
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1">
            {weekDays.map(d => (
              <div key={d.toISOString()} className="text-center">
                <span className="text-[10px] font-medium text-neutral-400">{format(d, 'EEE')[0]}</span>
                <span className={cn("block text-xs font-medium mt-0.5", format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500")}>{format(d, 'd')}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {habits.map(habit => {
              const streak = getStreak(habit.id);
              return (
                <div key={habit.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {streak > 0 && (
                        <div className="flex items-center gap-0.5 text-orange-500 shrink-0">
                          <Flame className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{streak}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{habit.name}</span>
                    </div>
                    <button onClick={() => deleteHabit(habit.id)} className="p-1 text-neutral-400 hover:text-red-500 active:scale-90 transition-transform">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(d => {
                      const ds = format(d, 'yyyy-MM-dd');
                      const log = habitLogs.find(l => l.habitId === habit.id && l.date === ds);
                      const f = d > today;
                      return <div key={ds}><Dot done={!!log?.completed} future={f} onClick={() => toggleHabit(habit.id, ds)} /></div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
