import React, { useState, useRef, useEffect } from 'react';
import { useBuJo } from '../store/BuJoContext';
import { format } from 'date-fns';
import { Sparkles, Mic, Type, ArrowUp, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { BulletType, LogType } from '../types';

interface ActionParam {
  actionType: "create_collection" | "add_entry" | "insights";
  collectionTitle?: string;
  collectionIdRef?: string;
  text?: string;
  entryType?: BulletType;
  logType?: LogType;
  signifier?: string;
  date?: string;
  targetCollectionRef?: string;
}

interface ApiResponse {
  reply: string;
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
  const { collections, createCollection, addEntry } = useBuJo();
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
      const res = await fetch("/api/bujo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          currentDate: format(new Date(), 'yyyy-MM-dd')
        })
      });

      if (!res.ok) throw new Error("Failed to reach AI");

      const data: ApiResponse = await res.json();
      
      if (data.actions && data.actions.length > 0) {
        const idMap = new Map<string, string>(); // ref -> realId

        for (const action of data.actions) {
          if (action.actionType === "create_collection" && action.collectionTitle) {
            // Check if collection already exists
             const existing = collections.find(c => c.title.toLowerCase() === action.collectionTitle?.toLowerCase());
             let newId = existing?.id;
             if (!newId) {
               newId = createCollection(action.collectionTitle);
             }
             if (action.collectionIdRef && newId) {
               idMap.set(action.collectionIdRef, newId);
             }
          }
        }

        for (const action of data.actions) {
          if (action.actionType === "add_entry" && action.text) {
             let cid: string | undefined = undefined;
             if (action.targetCollectionRef) {
               cid = idMap.get(action.targetCollectionRef);
             }

             const date = action.date || format(new Date(), 'yyyy-MM-dd');
             const logType = action.logType || 'daily';
             const type = action.entryType || 'task';
             const signifiers = { priority: action.signifier === 'priority', idea: action.signifier === 'idea' || action.signifier === 'inspiration', explore: action.signifier === 'explore' };

             addEntry(action.text, type, logType, date, signifiers, cid);
          }
        }
      }

      setReplyText(data.reply);

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
        {(replyText || loading) && (
          <motion.div 
            initial={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            className={cn(
              "mb-4 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl px-5 py-3 shadow-xl w-full flex items-center gap-3 text-sm font-medium z-[100]",
              isMobile ? "fixed top-16 left-4 right-4 max-w-none" : "max-w-sm mx-4"
            )}
          >
            {loading ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
               <Sparkles className="w-5 h-5 shrink-0 text-amber-300 dark:text-amber-600" />
            )}
            <p className="flex-1 loading-relaxed">{loading ? "Thinking..." : replyText}</p>
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
