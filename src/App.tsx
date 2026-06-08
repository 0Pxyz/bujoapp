import React, { useState, useEffect } from 'react';
import { DailyLog } from './views/DailyLog';
import { MonthlyLog } from './views/MonthlyLog';
import { FutureLog } from './views/FutureLog';
import { Collections } from './views/Collections';
import { Migration } from './views/Migration';
import { Habits } from './views/Habits';
import { Insights } from './views/Insights';
import { Settings } from './views/Settings';
import { BuJoProvider, useBuJo } from './store/BuJoContext';
import { BuJoDock } from './components/BuJoDock';
import { GlobalSearch } from './components/GlobalSearch';
import { AuthScreen } from './components/AuthScreen';
import { BookOpen, CalendarDays, CalendarSearch, Library, ArrowRightLeft, Target, BarChart2, PanelLeftClose, PanelLeftOpen, Search, Settings as SettingsIcon, Menu, X, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from './firebase';

type ViewType = 'daily' | 'monthly' | 'future' | 'collections' | 'habits' | 'insights' | 'migration' | 'settings';

const AppContent = () => {
  const { settings, user, isLoadingAuth } = useBuJo();
  const [currentView, setCurrentView] = useState<ViewType>('daily');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const globalShortcutString = settings?.shortcuts?.globalSearch || 'meta+k';
      const [mod, key] = globalShortcutString.split('+');
      
      const modPressed = mod === 'meta' ? e.metaKey : mod === 'ctrl' ? e.ctrlKey : mod === 'alt' ? e.altKey : false;
      
      if (modPressed && e.key.toLowerCase() === key) {
         if (e.shiftKey) return;
         e.preventDefault();
         setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings]);

  const navItems = [
    { id: 'daily', label: 'Daily', icon: BookOpen },
    { id: 'monthly', label: 'Monthly', icon: CalendarDays },
    { id: 'future', label: 'Future', icon: CalendarSearch },
    { id: 'habits', label: 'Habits', icon: Target },
    { id: 'insights', label: 'Insights', icon: BarChart2 },
    { id: 'collections', label: 'Lists', icon: Library },
    { id: 'migration', label: 'Migration', icon: ArrowRightLeft },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  const renderView = () => {
    switch (currentView) {
      case 'daily': return <DailyLog />;
      case 'monthly': return <MonthlyLog />;
      case 'future': return <FutureLog />;
      case 'habits': return <Habits />;
      case 'insights': return <Insights />;
      case 'collections': return <Collections />;
      case 'migration': return <Migration />;
      case 'settings': return <Settings />;
    }
  };

  const NavLinks = () => (
    <div className="flex flex-col h-full">
      <div className={cn("mb-6 transition-all duration-300", isSidebarCollapsed ? "px-2 flex flex-col items-center" : "px-4")}>
        <h2 className={cn("font-serif font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 transition-all duration-300", isSidebarCollapsed ? "text-lg text-center" : "text-xl")}>
          {isSidebarCollapsed ? "B" : "BuJo"}
        </h2>
        {!isSidebarCollapsed && <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest whitespace-nowrap overflow-hidden">Digital Method</p>}
      </div>
      
      <div className={cn("mb-4", isSidebarCollapsed ? "px-2" : "px-4")}>
        <button
          onClick={() => setIsSearchOpen(true)}
          title={isSidebarCollapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "w-full flex items-center rounded-lg text-sm transition-all duration-200 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500",
            isSidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2 justify-between"
          )}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Search</span>}
          </div>
          {!isSidebarCollapsed && (
            <span className="text-[10px] bg-white dark:bg-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 font-medium">
              {settings?.shortcuts?.globalSearch?.split('+')[0] === 'meta' ? '⌘' : settings?.shortcuts?.globalSearch?.split('+')[0] === 'ctrl' ? 'Ctrl+' : 'Alt+'}
              {(settings?.shortcuts?.globalSearch?.split('+')[1] || 'k').toUpperCase()}
            </span>
          )}
        </button>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentView(item.id);
            }}
            title={isSidebarCollapsed ? item.label : undefined}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200",
              isSidebarCollapsed ? "justify-center px-0 py-3" : "space-x-3 px-4 py-2.5",
              currentView === item.id 
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm" 
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", currentView === item.id ? "text-white dark:text-neutral-900" : "text-neutral-400")} />
            {!isSidebarCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="pt-4 mt-auto border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200",
            isSidebarCollapsed ? "justify-center px-0 py-3" : "px-4 py-2.5"
          )}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
        </button>
      </div>
    </div>
  );

  if (isLoadingAuth) {
    return <div className="flex h-[100dvh] items-center justify-center text-neutral-500 font-medium">Loading BuJo...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-[100dvh] bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 overflow-hidden">
      
      <aside className={cn(
        "hidden md:flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 py-4 shrink-0 shadow-sm z-10 relative transition-all duration-300",
        isSidebarCollapsed ? "w-20 px-2" : "w-64 px-2"
      )}>
        <NavLinks />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between px-4 z-[60]">
        <h2 className="text-xl font-serif font-bold tracking-tight">BuJo</h2>
        <div className="flex items-center space-x-2">
          <BuJoDock isMobile className="md:hidden" />
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full pt-14 md:pt-0 pb-20 md:pb-0 px-4 sm:px-6 lg:px-8 custom-scrollbar">
        {renderView()}
      </main>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-30"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="md:hidden fixed bottom-16 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 rounded-t-3xl shadow-2xl z-30 flex flex-col pt-2 pb-6 px-4"
            >
              <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full mx-auto mb-6" />
              <div className="space-y-4">
                 <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 px-2">More Options</h3>
                 <div className="grid grid-cols-2 gap-2">
                    {navItems.slice(4).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl transition-colors text-left",
                          currentView === item.id 
                            ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" 
                            : "bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                         <item.icon className="w-5 h-5 shrink-0" />
                         <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-around px-1 z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navItems.slice(0, 4).map(item => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentView(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              currentView === item.id && !isMobileMenuOpen
                ? "text-neutral-900 dark:text-neutral-100" 
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
            )}
          >
            <div className={cn(
               "px-4 py-1 rounded-full transition-all duration-200 mb-0.5",
               currentView === item.id && !isMobileMenuOpen ? "bg-neutral-100 dark:bg-neutral-800" : ""
            )}>
              <item.icon className={cn("w-5 h-5", currentView === item.id && !isMobileMenuOpen ? "text-neutral-900 dark:text-neutral-100" : "")} strokeWidth={currentView === item.id && !isMobileMenuOpen ? 2.5 : 2} />
            </div>
            <span className={cn("text-[10px] tracking-wide", currentView === item.id && !isMobileMenuOpen ? "font-semibold" : "font-medium")}>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative z-50",
            isMobileMenuOpen 
              ? "text-neutral-900 dark:text-neutral-100" 
              : "text-neutral-500 dark:text-neutral-400"
          )}
        >
          <div className={cn(
               "px-4 py-1 rounded-full transition-all duration-200 mb-0.5",
               isMobileMenuOpen ? "bg-neutral-100 dark:bg-neutral-800" : ""
            )}>
            <Menu className={cn("w-5 h-5", isMobileMenuOpen ? "text-neutral-900 dark:text-neutral-100" : "")} strokeWidth={isMobileMenuOpen ? 2.5 : 2} />
          </div>
          <span className={cn("text-[10px] tracking-wide", isMobileMenuOpen ? "font-semibold" : "font-medium")}>Menu</span>
        </button>
      </nav>
      <BuJoDock />
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={(view) => setCurrentView(view)} />
    </div>
  );
};

export default function App() {
  return (
    <BuJoProvider>
      <AppContent />
    </BuJoProvider>
  );
}
