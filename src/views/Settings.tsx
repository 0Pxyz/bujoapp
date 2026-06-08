import React from 'react';
import { useBuJo } from '../store/BuJoContext';
import { motion } from 'framer-motion';
import { Settings2, Download, Upload, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { Theme, FontSize, FontFamily, StartOfWeek, AIAssistance, LayoutDensity } from '../types';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-5 border-b border-neutral-200 dark:border-neutral-800 pb-2">{title}</h2>
    {children}
  </section>
);

export const Settings = () => {
  const { settings, updateSettings, user } = useBuJo();

  const T = (v: Partial<typeof settings>) => updateSettings(v);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-6 mb-20 space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-white dark:text-neutral-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h1>
          <p className="text-sm text-neutral-500">Customize your journal experience.</p>
        </div>
      </div>

      <Section title="Account">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{user?.displayName || 'User'}</p>
            <p className="text-neutral-500">{user?.email}</p>
          </div>
          <button onClick={() => { import('../firebase').then(({ auth }) => auth.signOut()); }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Theme</p>
            <div className="flex bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit">
              {['light', 'dark', 'system'].map(t => (
                <button key={t} onClick={() => T({ theme: t as Theme })}
                  className={cn("px-4 py-1.5 rounded-md capitalize font-medium transition-all", settings.theme === t ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300")}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Accent</p>
            <div className="flex gap-2">
              {['blue', 'rose', 'emerald', 'amber', 'purple', 'zinc'].map(c => (
                <button key={c} onClick={() => T({ accentColor: c })}
                  className={cn("w-7 h-7 rounded-full border-2 transition-transform", settings.accentColor === c ? "border-neutral-900 dark:border-white scale-110" : "border-transparent",
                    c === 'blue' && "bg-blue-500", c === 'rose' && "bg-rose-500", c === 'emerald' && "bg-emerald-500",
                    c === 'amber' && "bg-amber-500", c === 'purple' && "bg-purple-500", c === 'zinc' && "bg-zinc-500")} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Font</p>
            <div className="flex gap-2">
              {(['sans', 'serif'] as FontFamily[]).map(f => (
                <button key={f} onClick={() => T({ fontFamily: f })}
                  className={cn("px-3 py-1.5 rounded-lg border font-medium transition-all", settings.fontFamily === f ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent" : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400",
                    f === 'serif' && "font-serif")}>{f === 'sans' ? 'Sans' : 'Serif'}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Font Size</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                <button key={s} onClick={() => T({ fontSize: s })}
                  className={cn("px-3 py-1.5 rounded-lg text-sm border font-medium transition-all capitalize", settings.fontSize === s ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent" : "border-neutral-200 dark:border-neutral-700 text-neutral-500")}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Density</p>
            <div className="flex gap-2">
              {(['comfortable', 'compact'] as LayoutDensity[]).map(d => (
                <button key={d} onClick={() => T({ layoutDensity: d })}
                  className={cn("px-3 py-1.5 rounded-lg text-sm border font-medium transition-all capitalize", settings.layoutDensity === d ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent" : "border-neutral-200 dark:border-neutral-700 text-neutral-500")}>{d}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Journaling">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium mb-3 text-neutral-900 dark:text-neutral-100">Rapid Logging Symbols</p>
            <div className="space-y-2">
              {(['task', 'note', 'event'] as const).map(k => (
                <div key={k} className="flex items-center gap-3">
                  <input type="text" maxLength={1} value={settings.symbols?.[k] || { task: '.', note: '-', event: 'o' }[k]}
                    onChange={e => T({ symbols: { ...settings.symbols, [k]: e.target.value } as any })}
                    className="w-9 h-9 text-center bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border-none font-mono text-sm" />
                  <span className="capitalize text-neutral-600 dark:text-neutral-400">{k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Smart Parsing</p>
              <div className="space-y-2">
                {(['dates', 'tags', 'links'] as const).map(k => (
                  <label key={k} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settings.smartParsing?.[k] ?? true}
                      onChange={e => T({ smartParsing: { ...settings.smartParsing, [k]: e.target.checked } as any })}
                      className="rounded accent-neutral-900" />
                    <span className="capitalize text-neutral-600 dark:text-neutral-400">Detect {k}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Week starts on</p>
              <select value={settings.startOfWeek || 'monday'} onChange={e => T({ startOfWeek: e.target.value as StartOfWeek })}
                className="bg-neutral-100 dark:bg-neutral-800/50 border-none rounded-lg py-1.5 px-3 text-sm">
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>
          </div>
        </div>
      </Section>

      <Section title="AI">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">AI Assistance</p>
            <div className="space-y-2">
              {[
                { id: 'off', label: 'Off' },
                { id: 'suggestions', label: 'Suggestions' },
                { id: 'active', label: 'Active' }
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="ai" value={opt.id} checked={(settings.ai?.assistance || 'off') === opt.id}
                    onChange={() => T({ ai: { ...settings.ai, assistance: opt.id as AIAssistance } as any })}
                    className="accent-neutral-900" />
                  <span className="text-neutral-600 dark:text-neutral-400">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Auto Reviews</p>
            <div className="space-y-2">
              {(['daily', 'weekly', 'monthly'] as const).map(k => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={(settings.ai?.[`${k}Review` as keyof typeof settings.ai] as boolean) ?? false}
                    onChange={e => T({ ai: { ...settings.ai, [`${k}Review`]: e.target.checked } as any })}
                    className="rounded accent-neutral-900" />
                  <span className="capitalize text-neutral-600 dark:text-neutral-400">{k}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="space-y-2 text-sm">
          {(['dailyReminder', 'habitReminder', 'weeklyDigest'] as const).map(k => (
            <label key={k} className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-neutral-700 dark:text-neutral-300 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <input type="checkbox" checked={settings.notifications?.[k] ?? false}
                onChange={e => T({ notifications: { ...settings.notifications, [k]: e.target.checked } as any })}
                className="rounded accent-neutral-900" />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Data">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Sync with Cloud</span>
            <button onClick={() => T({ syncEnabled: !(settings.syncEnabled ?? true) })}
              className={cn("w-10 h-5 rounded-full relative transition-colors", (settings.syncEnabled ?? true) ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600")}>
              <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform", (settings.syncEnabled ?? true) ? "translate-x-5" : "")} />
            </button>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg font-medium text-sm transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg font-medium text-sm transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
          </div>
        </div>
      </Section>

      <section className="text-center text-xs text-neutral-500 space-y-1 pb-8">
        <p>BuJo v1.0.0</p>
      </section>
    </motion.div>
  );
};
