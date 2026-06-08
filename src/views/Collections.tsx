import React, { useState } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { RapidLog } from '../components/RapidLog';
import { Plus, X, Folder, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Collections = () => {
  const { collections, createCollection, deleteCollection, entries } = useBuJo();
  const [newTitle, setNewTitle] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      const id = createCollection(newTitle.trim());
      setNewTitle('');
      setActiveCollectionId(id);
    }
  };

  const activeCollection = collections.find(c => c.id === activeCollectionId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6"
    >
      <AnimatePresence mode="wait">
        {!activeCollectionId ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <div className="flex items-center justify-between mb-12">
              <h1 className="text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
                Collections
              </h1>
            </div>

            <form onSubmit={handleCreate} className="mb-8 flex gap-2">
              <input 
                type="text" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="New collection title..."
                className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 outline-none transition-all"
              />
              <button 
                type="submit" 
                className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map(collection => {
                const count = entries.filter(e => e.collectionId === collection.id).length;
                return (
                  <div 
                    key={collection.id} 
                    className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                    onClick={() => setActiveCollectionId(collection.id)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-500">
                        <Folder className="w-5 h-5" />
                      </div>
                      <h3 className="font-medium text-neutral-800 dark:text-neutral-200 truncate pr-6">{collection.title}</h3>
                    </div>
                    <p className="text-sm text-neutral-500">{count} items</p>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCollection(collection.id); }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              {collections.length === 0 && (
                <div className="col-span-full py-12 text-center text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                  No collections yet. Space for projects and lists.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <div className="flex items-center gap-4 mb-12">
                <button 
                  onClick={() => setActiveCollectionId(null)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-neutral-600" />
                </button>
                <h1 className="text-3xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {activeCollection?.title}
                </h1>
             </div>

             <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 rounded-xl p-8 max-w-3xl">
                {activeCollection && (
                  <RapidLog 
                    entries={entries.filter(e => e.collectionId === activeCollection.id).sort((a,b) => a.order - b.order)} 
                    logType="collection" 
                    date="" 
                    collectionId={activeCollection.id}
                  />
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
