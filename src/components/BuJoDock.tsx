import React, { useState, useRef, useEffect } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { format } from 'date-fns';
import { Sparkles, Mic, Type, ArrowUp, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { LogType } from '../types';

interface ActionParam {
  actionType: "create_collection" | "add_entry" | "insights" | "complete_entry" | "cancel_entry" | "delete_entry" | "update_entry";
  collectionTitle?: string;
  collectionIdRef?: string;
  text?: string;
  entryType?: string;
  logType?: LogType;
  signifier?: string;
  date?: string;
  targetCollectionRef?: string;
  targetCollectionTitle?: string;
  entryId?: string;
  newState?: string;
  entryRef?: string;
}

interface ApiResponse {
  reply?: string;
  response?: string;
  actions: ActionParam[];
}

interface BuJoDockProps {
  className?: string;
  isMobile?: boolean;
}

function useIsMobile() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => { const c = () => setM(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);
  return m;
}

export const BuJoDock: React.FC<BuJoDockProps> = ({ className, isMobile: propMobile }) => {
  const isMobile = propMobile ?? useIsMobile();
  const { collections, entries, habits, createCollection, addEntry, addHabit, updateEntryState, deleteEntry, settings, firestoreError } = useBuJo();
  const [expanded, setExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (replyText) {
      timeout = setTimeout(() => {
        setReplyText(null);
      }, 6000);
    }
    return () => clearTimeout(timeout);
  }, [replyText]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setReplyText(null);
    const textToSend = inputText;
    setInputText('');
    setExpanded(false);

    try {
      const ai = settings.ai;

      // Build compact workspace snapshot — only open entries with IDs
      const openEntries = entries
        .filter(e => e.state === 'open')
        .map(e => ({
          id: e.id,
          text: e.text,
          type: e.type,
          state: e.state,
          logType: e.logType,
          collectionId: e.collectionId,
          signifiers: e.signifiers,
        }));

      const res = await fetch("/api/bujo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
          provider: ai?.provider,
          openrouterModel: ai?.openrouterModel,
          geminiModel: ai?.geminiModel,
          workspace: {
            collections: collections.map(c => ({ id: c.id, title: c.title })),
            entries: openEntries,
            habits: habits.map(h => ({ id: h.id, name: h.name })),
          },
        })
      });

      if (!res.ok) throw new Error("Failed to reach AI");

      const data: ApiResponse = await res.json();
      
      console.log('[BuJoDock] AI response:', JSON.stringify(data));

      // Normalize actions: AI models return many different formats
      const snakeCase = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()).replace(/^_/, '');
      const actions: ActionParam[] = (data.actions || []).map(a => {
        const raw = a as any;
        const rawType = raw.actionType;
        const entry = raw.entry || {};

        const actionType = snakeCase(rawType);
        const text = entry.content || entry.text || raw.content || raw.text || raw.habitName || entry.habitName;
        const collectionName = raw.collectionName || entry.collectionName;
        const targetRef = raw.targetCollectionRef || entry.targetCollectionRef;

        let mappedType = actionType;
        if (actionType === 'log_entry' || actionType === 'log' || actionType === 'add_to_collection') mappedType = 'add_entry';
        if (actionType === 'add_habit') mappedType = 'add_entry';

        const entryType = entry.entryType || entry.type || raw.entryType || raw.type
          || (actionType === 'add_habit' ? 'habit' : undefined);

        const normalized: ActionParam = {
          actionType: mappedType as ActionParam['actionType'],
          text,
          entryType,
          date: entry.date || raw.date,
          signifier: entry.signifier || raw.signifier || 'none',
          logType: raw.logType || entry.logType || (rawType === 'addToCollection' ? 'collection' : 'daily'),
          targetCollectionRef: targetRef,
          targetCollectionTitle: raw.targetCollectionTitle || raw.collectionName || entry.targetCollectionTitle,
          collectionTitle: raw.collectionTitle || raw.collectionName || entry.collectionTitle || entry.collectionName,
          collectionIdRef: raw.collectionIdRef || entry.collectionIdRef,
          entryId: raw.entryId || raw.targetEntryId || entry.entryId,
          entryRef: raw.entryRef || raw.targetEntryRef || entry.entryRef,
          newState: raw.newState || raw.state,
        };

        return normalized;
      });
      
      if (actions.length > 0) {
        // Map from collection ref/name → actual Firestore ID
        const refToId = new Map<string, string>();

        for (const action of actions) {
          console.log('[BuJoDock] processing action:', JSON.stringify(action));
          if (action.actionType === "create_collection" && action.collectionTitle) {
             const existing = collections.find(c => c.title.toLowerCase() === action.collectionTitle?.toLowerCase());
             let newId = existing?.id;
             if (!newId) {
               newId = createCollection(action.collectionTitle);
               console.log('[BuJoDock] created collection:', action.collectionTitle, newId);
             }
             if (action.collectionIdRef && newId) {
               refToId.set(action.collectionIdRef, newId);
             }
             // Also store by title so actions can reference by name
             if (newId) {
               refToId.set(action.collectionTitle.toLowerCase(), newId);
             }
          }
        }

        // Flatten any nested entries inside create_collection actions into separate add_entry actions
        for (const action of actions) {
          const rawType = (action as any).actionType;
          if ((rawType === "create_collection" || rawType === "createCollection") && Array.isArray((action as any).entries)) {
            for (const entry of (action as any).entries) {
              actions.push({
                actionType: "add_entry",
                entryType: entry.entryType || "task",
                text: entry.content || entry.name || entry.text || "",
                date: (action as any).date || format(new Date(), 'yyyy-MM-dd'),
                logType: "collection",
                targetCollectionTitle: action.collectionTitle || (action as any).collectionName,
                signifier: (action as any).signifier || "none",
              });
            }
          }
        }

        for (const action of actions) {
          if (action.actionType === "add_entry" && action.text) {
             const date = action.date || format(new Date(), 'yyyy-MM-dd');
             let logType = action.logType || 'daily';
             const entryType = action.entryType || 'task';

             // Habit creation
             if (entryType === 'habit') {
               addHabit(action.text);
               console.log('[BuJoDock] created habit:', action.text);
               continue;
             }

             const type = entryType as 'task' | 'event' | 'note';

              let cid: string | undefined = undefined;
              if (action.targetCollectionRef) {
                cid = refToId.get(action.targetCollectionRef) || refToId.get(action.targetCollectionRef.toLowerCase());
              }
              // Check refToId first for newly created collections (not yet in Firestore state)
              if (!cid && action.targetCollectionTitle) {
                cid = refToId.get(action.targetCollectionTitle.toLowerCase());
              }
              if (!cid && action.targetCollectionTitle) {
                const match = collections.find(c => c.title.toLowerCase() === action.targetCollectionTitle?.toLowerCase());
                cid = match?.id;
              }
              // If targetCollectionRef looks like a collection name, search existing collections
              if (!cid && action.targetCollectionRef) {
                const match = collections.find(c => c.title.toLowerCase() === action.targetCollectionRef.toLowerCase());
                cid = match?.id;
              }

             // If entry targets a collection but we can't resolve the ID, fall back to daily so it's visible
             if (logType === 'collection' && !cid) {
               logType = 'daily';
             }

             const signifiers = { priority: action.signifier === 'priority', idea: action.signifier === 'idea' || action.signifier === 'inspiration', explore: action.signifier === 'explore' };

             console.log('[BuJoDock] adding entry:', { text: action.text, type, logType, date, cid });
             addEntry(action.text, type, logType, date, signifiers, cid);
          }

          // Handle complete_entry: mark an existing entry as completed
          if (action.actionType === "complete_entry") {
            const entryId = action.entryId || action.entryRef;
            if (entryId) {
              const target = entries.find(e => e.id === entryId);
              if (target) {
                updateEntryState(entryId, 'completed');
                console.log('[BuJoDock] completed entry:', entryId);
              } else {
                // Try matching by text fuzzy
                const match = entries.find(e => e.text.toLowerCase().includes((action.text || '').toLowerCase()) && e.state === 'open');
                if (match) {
                  updateEntryState(match.id, 'completed');
                  console.log('[BuJoDock] completed entry by text match:', match.id);
                }
              }
            }
          }

          // Handle cancel_entry: mark an existing entry as canceled
          if (action.actionType === "cancel_entry") {
            const entryId = action.entryId || action.entryRef;
            if (entryId) {
              const target = entries.find(e => e.id === entryId);
              if (target) {
                updateEntryState(entryId, 'canceled');
                console.log('[BuJoDock] canceled entry:', entryId);
              } else {
                const match = entries.find(e => e.text.toLowerCase().includes((action.text || '').toLowerCase()) && e.state === 'open');
                if (match) {
                  updateEntryState(match.id, 'canceled');
                  console.log('[BuJoDock] canceled entry by text match:', match.id);
                }
              }
            }
          }

          // Handle delete_entry: permanently remove an entry
          if (action.actionType === "delete_entry") {
            const entryId = action.entryId || action.entryRef;
            if (entryId) {
              const target = entries.find(e => e.id === entryId);
              if (target) {
                deleteEntry(entryId);
                console.log('[BuJoDock] deleted entry:', entryId);
              } else {
                const match = entries.find(e => e.text.toLowerCase().includes((action.text || '').toLowerCase()));
                if (match) {
                  deleteEntry(match.id);
                  console.log('[BuJoDock] deleted entry by text match:', match.id);
                }
              }
            }
          }
        }
      } else {
        console.log('[BuJoDock] no actions to process, reply:', data.reply || data.response);
      }

      setReplyText(data.reply || data.response || '');

    } catch (err) {
       setReplyText("Oops, couldn't reach the BuJo assistant. Try again.");
    } finally {
       setLoading(false);
    }
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
       alert("Speech recognition is not supported in this browser.");
       return;
    }

    setIsRecording(true);
    setInputText("");
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        setInputText(finalTranscript);
      } else {
         setInputText(interimTranscript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        setReplyText("Microphone access was denied. Please allow it in the browser settings.");
      }
    };
    
    recognition.onend = () => {
      setIsRecording(false);
      if (inputText.trim()) {
        // give it a small delay for user to read before submitting natively or they can submit manually
      }
    };

    recognition.start();
  };

  return (
    <div className={cn(
      isMobile
        ? "fixed bottom-20 right-4 z-50"
        : "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center hidden md:flex",
      className
    )}>
       
      <AnimatePresence>
        {(replyText || loading || firestoreError) && (
          <motion.div 
            initial={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            className={cn(
              "mb-4 rounded-2xl px-5 py-3 shadow-xl w-full flex items-center gap-3 text-sm font-medium z-[100]",
              firestoreError
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900",
              isMobile ? "fixed top-16 left-4 right-4 max-w-none" : "max-w-sm mx-4"
            )}
          >
            {loading ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
               <Sparkles className={cn("w-5 h-5 shrink-0", firestoreError ? "text-red-400" : "text-amber-300 dark:text-amber-600")} />
            )}
            <p className="flex-1 leading-relaxed">{loading ? "Thinking..." : firestoreError || replyText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        layout
        className={cn(
          "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center transition-all duration-300",
          expanded && !isMobile ? "w-[90vw] md:w-[480px] p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]" : expanded && isMobile ? "fixed bottom-32 left-4 right-4 z-[100] p-2 rounded-2xl shadow-2xl" : "w-auto px-1 py-1 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]",
          !expanded && isMobile ? "shadow-none border-none bg-transparent dark:bg-transparent" : ""
        )}
      >
        <AnimatePresence mode="wait">
          {!expanded ? (
            <motion.button
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setExpanded(true)}
              className={cn(
                "flex items-center group transition-all active:scale-90",
                isMobile
                  ? "w-12 h-12 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl shadow-lg justify-center"
                  : "gap-2.5 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
              )}
            >
              <Sparkles className={cn("transition-colors", isMobile ? "w-5 h-5" : "w-5 h-5 text-neutral-500 group-hover:text-amber-500")} />
              {!isMobile && <span className="font-serif font-medium text-neutral-700 dark:text-neutral-300 mr-1">Ask BuJo</span>}
              {!isMobile && <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">⌘⇧K</span>}
            </motion.button>
          ) : (
            <motion.div
              layout
              key="expanded"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center w-full"
            >
               <button 
                 onClick={handleVoice}
                 className={cn(
                   "p-3 rounded-full transition-colors shrink-0",
                   isRecording ? "bg-red-100 dark:bg-red-900/30 text-red-500" : "text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                 )}
               >
                 {isRecording ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
               </button>
               
               <form onSubmit={handleSubmit} className="flex-1 flex items-center pr-1">
                 <input
                   ref={inputRef}
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   placeholder={isRecording ? "Listening..." : "I have an idea for an app..."}
                   className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm px-2 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
                 />
                 <button 
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2 ml-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                 >
                    <ArrowUp className="w-4 h-4" />
                 </button>
               </form>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {expanded && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  );
};
