import React, { useMemo, useState } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { CheckCircle2, TrendingUp, Lightbulb, Check, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const Insights = () => {
  const { entries, habitLogs, habits, settings } = useBuJo();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const monthFormat = format(currentMonth, 'MMMM yyyy');

  const stats = useMemo(() => {
    setAiReview(null);
    const monthPrefix = format(currentMonth, 'yyyy-MM');
    const monthEntries = entries.filter(e => e.date.startsWith(monthPrefix));
    
    const tasksCompleted = monthEntries.filter(e => e.type === 'task' && e.state === 'completed').length;
    const tasksCreated = monthEntries.filter(e => e.type === 'task').length;
    const completionRate = tasksCreated === 0 ? 0 : Math.round((tasksCompleted / tasksCreated) * 100);

    const inspirations = monthEntries.filter(e => e.signifiers?.idea).length;

    const monthLogs = habitLogs.filter(l => l.date.startsWith(monthPrefix) && l.completed);
    const totalHabitsTracked = monthLogs.length;

    return {
      tasksCompleted,
      tasksCreated,
      completionRate,
      inspirations,
      totalHabitsTracked
    };
  }, [entries, habitLogs, currentMonth]);

  const fetchAiReview = async () => {
    setLoadingReview(true);
    try {
      const ai = settings.ai;
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats,
          monthFormat,
          provider: ai?.provider,
          openrouterApiKey: ai?.openrouterApiKey,
          openrouterModel: ai?.openrouterModel,
        })
      });
      const data = await res.json();
      setAiReview(data.review);
    } catch (e) {
      console.error(e);
      setAiReview("Could not generate AI review right now.");
    } finally {
      setLoadingReview(false);
    }
  };

  const overviewMessage = () => {
    if (stats.tasksCreated === 0 && stats.totalHabitsTracked === 0) {
      return "You haven't logged much this month. It's a blank canvas waiting for you!";
    }
    if (stats.completionRate > 80) {
      return "Phenomenal focus this month! You've been consistently clearing your tasks and making measurable progress.";
    }
    if (stats.completionRate > 50) {
      return "A solid month of effort. You're maintaining a good balance of planning and execution.";
    }
    if (stats.totalHabitsTracked > 15) {
      return "Great work maintaining your routines. You might have left some tasks open, but your consistency is building up.";
    }
    return "A month of transitions. Focus on breaking down larger tasks into smaller, actionable bullets.";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8 px-4 md:py-12 md:px-6 mb-20 md:mb-0"
    >
      <div className="flex items-center justify-between mb-8 md:mb-12">
        <h1 className="text-2xl md:text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
          Performance
        </h1>
        <select 
          className="bg-transparent text-sm font-medium outline-none border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
          value={format(currentMonth, 'yyyy-MM')}
          onChange={(e) => setCurrentMonth(new Date(e.target.value + '-01T00:00:00'))}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const d = subMonths(new Date(), i);
            const val = format(d, 'yyyy-MM');
            return <option key={val} value={val}>{format(d, 'MMMM yyyy')}</option>;
          })}
        </select>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-4">
             <TrendingUp className="w-6 h-6 text-emerald-500" />
             <h2 className="text-xl font-medium text-neutral-800 dark:text-neutral-200">{monthFormat} Overview</h2>
           </div>
           {!aiReview && !loadingReview && stats.tasksCreated > 0 && (
             <button 
                onClick={fetchAiReview}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
              >
               <Sparkles className="w-4 h-4 text-amber-500" />
               Ask AI Review
             </button>
           )}
        </div>
        
        {loadingReview ? (
          <div className="flex items-center gap-3 pt-6 pb-2 text-neutral-500 border-t border-neutral-100 dark:border-neutral-800">
             <Loader2 className="w-5 h-5 animate-spin" />
             <p>Analyzing your month...</p>
          </div>
        ) : aiReview ? (
          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500 font-medium">
               <Sparkles className="w-4 h-4" />
               <p>AI Review</p>
            </div>
            <div className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed text-sm">
               {aiReview}
            </div>
          </div>
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {overviewMessage()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-neutral-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Tasks Completed</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-neutral-900 dark:text-neutral-100">{stats.tasksCompleted}</span>
            <span className="text-neutral-500 text-sm">/ {stats.tasksCreated} total</span>
          </div>
          <div className="mt-4 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
             <div 
               className="bg-neutral-900 dark:bg-neutral-100 h-full rounded-full transition-all duration-1000" 
               style={{ width: `${Math.max(0, Math.min(100, stats.completionRate))}%` }} 
             />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-neutral-500">
            <Check className="w-5 h-5" />
            <span className="font-medium">Habits Tracked</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-neutral-900 dark:text-neutral-100">{stats.totalHabitsTracked}</span>
            <span className="text-neutral-500 text-sm">logs marked done</span>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            Across {habits.length} total habits.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-amber-500">
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium">Inspirations</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-amber-500">{stats.inspirations}</span>
            <span className="text-neutral-500 text-sm">great ideas</span>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            Notes marked with an exclamation point (!).
          </p>
        </div>
      </div>
    </motion.div>
  );
};
