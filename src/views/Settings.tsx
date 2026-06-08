import React from 'react';
import { useBuJo } from '../store/BuJoContext';
import { motion } from 'framer-motion';
import { Settings2, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { Theme, FontSize, StartOfWeek, AIAssistance } from '../types';

export const Settings = () => {
  const { settings, updateSettings, user } = useBuJo();

  const handleUpdate = (updates: Partial<typeof settings>) => {
    updateSettings(updates);
  };

  const handleSignOut = () => {
    import('../firebase').then(({ auth }) => auth.signOut());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-4 md:p-8 mb-20"
    >
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-white dark:text-neutral-900" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
            Settings
          </h1>
          <p className="text-neutral-500 mt-1">Minimal configuration for your journal.</p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-neutral-100 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">Account</h2>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">{user?.displayName || 'User'}</p>
              <p className="text-neutral-500">{user?.email}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg transition-colors font-medium border border-neutral-200 dark:border-neutral-700"
            >
              Sign out
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-neutral-100 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Theme</p>
              <div className="flex bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit">
                {['light', 'dark', 'system'].map(t => (
                  <button
                    key={t}
                    onClick={() => handleUpdate({ theme: t as Theme })}
                    className={cn("px-4 py-1.5 rounded-md capitalize transition-colors font-medium", settings.theme === t ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Accent Color</p>
              <div className="flex items-center gap-2">
                {['blue', 'rose', 'emerald', 'amber', 'purple', 'zinc'].map(color => (
                  <button
                    key={color}
                    onClick={() => handleUpdate({ accentColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      settings.accentColor === color ? "border-neutral-900 dark:border-white scale-110" : "border-transparent",
                      color === 'blue' && "bg-blue-500",
                      color === 'rose' && "bg-rose-500",
                      color === 'emerald' && "bg-emerald-500",
                      color === 'amber' && "bg-amber-500",
                      color === 'purple' && "bg-purple-500",
                      color === 'zinc' && "bg-zinc-500"
                    )}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Font Size</p>
              <div className="flex space-x-4">
                {['small', 'medium', 'large'].map(s => (
                  <button key={s} onClick={() => handleUpdate({ fontSize: s as FontSize })} className={cn("capitalize transition-colors font-medium", settings.fontSize === s ? "text-neutral-900 dark:text-neutral-100 underline decoration-2 underline-offset-4" : "text-neutral-500")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-neutral-100 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">Journaling</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Rapid Logging Symbols</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input type="text" maxLength={1} value={settings.symbols?.task || '.'} onChange={e => handleUpdate({ symbols: { ...settings.symbols, task: e.target.value } as any })} className="w-8 h-8 text-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md border-none font-mono" />
                  <span className="text-neutral-600 dark:text-neutral-400">Task</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" maxLength={1} value={settings.symbols?.note || '-'} onChange={e => handleUpdate({ symbols: { ...settings.symbols, note: e.target.value } as any })} className="w-8 h-8 text-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md border-none font-mono" />
                  <span className="text-neutral-600 dark:text-neutral-400">Note</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" maxLength={1} value={settings.symbols?.event || 'o'} onChange={e => handleUpdate({ symbols: { ...settings.symbols, event: e.target.value } as any })} className="w-8 h-8 text-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md border-none font-mono" />
                  <span className="text-neutral-600 dark:text-neutral-400">Event</span>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Smart Parsing</p>
                <div className="space-y-2">
                  {(['dates', 'tags', 'links'] as const).map(k => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={settings.smartParsing?.[k] ?? true} onChange={e => handleUpdate({ smartParsing: { ...settings.smartParsing, [k]: e.target.checked } as any })} className="rounded bg-neutral-100 border-neutral-300 text-neutral-900 focus:ring-0" />
                      <span className="text-neutral-600 dark:text-neutral-400 capitalize">Detect {k}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Start of Week</p>
                <select value={settings.startOfWeek || 'monday'} onChange={e => handleUpdate({ startOfWeek: e.target.value as StartOfWeek })} className="bg-neutral-100 dark:bg-neutral-800/50 border-none rounded-lg text-neutral-700 dark:text-neutral-300 py-1.5 px-3">
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-neutral-100 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">AI Assistance</p>
              <div className="flex flex-col space-y-2">
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'suggestions', label: 'Suggestions Only' },
                  { id: 'active', label: 'Active Assistance' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="ai_assistance" value={opt.id} checked={(settings.ai?.assistance || 'off') === opt.id} onChange={() => handleUpdate({ ai: { ...settings.ai, assistance: opt.id as AIAssistance } as any })} className="text-neutral-900 focus:ring-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
               <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Reviews</p>
               <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settings.ai?.dailyReview ?? false} onChange={e => handleUpdate({ ai: { ...settings.ai, dailyReview: e.target.checked } as any })} className="rounded bg-neutral-100 border-neutral-300 text-neutral-900 focus:ring-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">Daily Review</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settings.ai?.weeklyReview ?? false} onChange={e => handleUpdate({ ai: { ...settings.ai, weeklyReview: e.target.checked } as any })} className="rounded bg-neutral-100 border-neutral-300 text-neutral-900 focus:ring-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">Weekly Review</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settings.ai?.monthlyReview ?? false} onChange={e => handleUpdate({ ai: { ...settings.ai, monthlyReview: e.target.checked } as any })} className="rounded bg-neutral-100 border-neutral-300 text-neutral-900 focus:ring-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">Monthly Review</span>
                  </label>
               </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-neutral-100 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Sync with Cloud</span>
                <button onClick={() => handleUpdate({ syncEnabled: !(settings.syncEnabled ?? true) })} className={cn("w-10 h-5 rounded-full relative transition-colors", (settings.syncEnabled ?? true) ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600")}>
                  <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform", (settings.syncEnabled ?? true) ? "translate-x-5" : "")} />
                </button>
              </div>
            </div>
            <div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <button className="w-full py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors rounded-lg font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Export MD
                  </button>
                  <button className="w-full py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors rounded-lg font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                </div>
                <div className="flex-1">
                  <button className="w-full py-2 h-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors rounded-lg font-medium flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Import Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center text-sm text-neutral-500 mt-12 pb-12 space-y-2">
          <p>Version 1.0.0</p>
          <div className="flex justify-center gap-4">
            <button className="hover:text-neutral-900 dark:hover:text-neutral-300 underline decoration-neutral-300">Changelog</button>
            <button className="hover:text-neutral-900 dark:hover:text-neutral-300 underline decoration-neutral-300">Privacy Policy</button>
            <button className="hover:text-neutral-900 dark:hover:text-neutral-300 underline decoration-neutral-300">Contact Support</button>
          </div>
        </section>

      </div>
    </motion.div>
  );
};

