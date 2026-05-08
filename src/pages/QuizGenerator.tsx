/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  X, 
  Settings, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  Brain,
  Zap,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractTextFromPDF } from '../lib/pdf';
import { extractTextFromDocx } from '../lib/docx';
import { Difficulty, QuestionType, User } from '../types';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

export default function QuizGenerator({ user }: { user: User }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  
  // Settings
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [types, setTypes] = useState<QuestionType[]>([QuestionType.MULTIPLE_CHOICE]);

  const onDrop = async (acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    if (!droppedFile) return;

    setFile(droppedFile);
    setIsExtracting(true);

    try {
      if (droppedFile.type === 'application/pdf') {
        const text = await extractTextFromPDF(droppedFile);
        setContent(text);
      } else if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const text = await extractTextFromDocx(droppedFile);
        setContent(text);
      } else {
        const text = await droppedFile.text();
        setContent(text);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to extract text from file.');
    } finally {
      setIsExtracting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: (files) => onDrop(files),
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  } as any);

  const handleGenerate = async () => {
    if (!content) return;
    setIsGenerating(true);

    try {
      const partialQuiz = await api.ai.generateQuiz({
        content,
        numQuestions,
        difficulty,
        types
      });

      const quizData = {
        ...partialQuiz,
        contentSource: content, // Requirement 3 calls for contentSource
        difficulty,
        questionTypes: types,
      };

      const savedQuiz = await api.quizzes.create(quizData);
      setCreatedQuizId(savedQuiz.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Quiz generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleType = (type: QuestionType) => {
    setTypes([type]);
  };

  if (createdQuizId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 md:p-10">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-6 md:p-12 rounded-[24px] md:rounded-[40px] border border-slate-200 shadow-2xl text-center max-w-xl w-full space-y-8 md:space-y-10"
        >
          <div className="relative">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-500 rounded-[24px] md:rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-emerald-100 rotate-6">
              <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12 text-white -rotate-6" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 border border-dashed border-emerald-200 rounded-full"
            />
          </div>

          <div className="space-y-3 md:space-y-4">
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Intelligence Pattern Built</h2>
            <p className="text-slate-500 text-base md:text-lg">Your assessment material has been successfully synthesized and is ready for deployment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <button 
              onClick={() => navigate(`/quiz/${createdQuizId}?preview=true`)}
              className="geometric-btn-primary py-4 md:py-5 text-xs md:text-sm uppercase tracking-widest"
            >
              Preview Assessment
            </button>
            <button 
              onClick={() => navigate('/')}
              className="geometric-btn-secondary py-4 md:py-5 text-xs md:text-sm uppercase tracking-widest"
            >
              Control Center
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-6 md:mb-12">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Quiz Generation Engine
        </h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Transform course content into AI-powered assessments.</p>
      </header>

      <div className="grid grid-cols-12 gap-6 md:gap-10 flex-1">
        {/* Left Col: Upload & Content */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-4 md:p-8 flex flex-col shadow-sm">
          <section className="mb-6 md:mb-8">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full"></span>
                Material Source
              </h3>
              <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-500 px-2 md:px-3 py-1 rounded-full font-bold uppercase tracking-widest leading-none">AI Ready</span>
            </div>
            
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-[20px] md:rounded-[24px] p-6 md:p-12 text-center transition-all cursor-pointer group relative overflow-hidden",
                isDragActive ? "border-indigo-400 bg-indigo-50/30" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-white",
                file ? "border-indigo-500 bg-indigo-50/10" : ""
              )}
            >
              <input {...getInputProps()} />
              <AnimatePresence mode="wait">
                {isExtracting ? (
                  <motion.div 
                    key="extracting"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2 md:gap-3"
                  >
                    <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 animate-spin" />
                    <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Synthesizing...</span>
                  </motion.div>
                ) : file ? (
                  <motion.div 
                    key="file"
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                    </div>
                    <span className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight truncate max-w-full italic">{file.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setContent(''); }}
                      className="text-[9px] md:text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 tracking-[0.2em] transition-colors pt-1 md:pt-2"
                    >
                      Clear Selection
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 md:gap-4"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-bold text-base md:text-lg mb-1 tracking-tight">Drop study materials here</p>
                      <p className="text-slate-400 text-xs md:text-sm max-w-[200px] md:max-w-[240px] mx-auto">Upload PDF lecture notes or plain text study guides.</p>
                    </div>
                    <div className="mt-2 md:mt-4 bg-slate-800 text-white px-6 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm shadow-lg group-hover:bg-slate-900 transition-colors uppercase tracking-widest">Select Files</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-[150px] md:min-h-0">
             <h3 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 md:mb-4">Content Context</h3>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               key={content ? 'has-content' : 'no-content'}
               className="flex-1 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-6 overflow-y-auto text-xs md:text-sm text-slate-500 leading-relaxed font-sans scrollbar-thin whitespace-pre-wrap"
             >
               {content ? (
                 content
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-400 italic">
                   Analysis pending file selection...
                 </div>
               )}
             </motion.div>
          </section>

          <div className="mt-4 md:mt-8 flex items-center justify-between">
            <div className="flex gap-2 md:gap-3">
              {[
                { type: 'application/pdf', label: 'PDF', color: 'indigo' },
                { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX', color: 'blue' },
                { type: 'text/plain', label: 'TXT', color: 'emerald' }
              ].map((fmt) => (
                <div key={fmt.label} className={cn(
                  "w-10 h-10 md:w-12 md:h-12 border rounded-lg md:rounded-xl flex flex-col items-center justify-center text-[9px] md:text-[10px] font-extrabold shadow-sm transition-all",
                  file?.type === fmt.type
                    ? `border-${fmt.color}-500 bg-${fmt.color}-50 text-${fmt.color}-600 ring-2 ring-${fmt.color}-500/20`
                    : "border-slate-200 bg-white text-slate-400"
                )}>
                  <span>{fmt.label}</span>
                  {file?.type === fmt.type && <span className={`w-0.5 h-0.5 md:w-1 md:h-1 bg-${fmt.color}-500 rounded-full mt-0.5 md:mt-1`}></span>}
                </div>
              ))}
            </div>
            
            {!isGenerating && !file && (
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest text-right max-w-[120px] md:max-w-[200px]">
                * Max 10MB.
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Settings */}
        <div className="col-span-12 lg:col-span-5 space-y-6 md:space-y-8 flex flex-col mb-6 lg:mb-0">
           <section className="flex-1">
              <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-6 md:p-8 space-y-8 md:space-y-10 shadow-2xl h-full flex flex-col">
                <header className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2 md:gap-3">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                    AI Parameters
                  </h3>
                  <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Config.v3</span>
                </header>

                <div className="space-y-8 md:space-y-10 flex-1">
                  {/* Number of questions */}
                  <div>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <label className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Quantity
                      </label>
                      <span className="text-white font-mono text-xl md:text-2xl font-bold">{numQuestions}</span>
                    </div>
                    <input 
                      type="range" min="5" max="30" step="1" 
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="w-full h-1 md:h-1.5 bg-slate-800 rounded-full cursor-pointer appearance-none accent-indigo-500"
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 md:mb-4 flex items-center gap-2">
                      Complexity Scale
                    </label>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={cn(
                            "py-3 md:py-4 rounded-xl md:rounded-2xl border text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all",
                            difficulty === d 
                              ? "bg-white text-slate-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                              : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Types */}
                  <div>
                    <label className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 md:mb-4 flex items-center gap-2">
                      Assessment Logic
                    </label>
                    <div className="grid gap-2 md:gap-3">
                      {[QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE, QuestionType.SHORT_ANSWER].map((t) => (
                        <button
                          key={t}
                          onClick={() => toggleType(t)}
                          className={cn(
                            "flex items-center justify-between px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border text-xs md:text-sm font-bold transition-all text-left",
                            types.includes(t) 
                              ? "bg-white/10 border-white/20 text-white" 
                              : "border-white/5 text-slate-600 hover:border-white/10"
                          )}
                        >
                          {t === QuestionType.MULTIPLE_CHOICE ? 'Multiple Choice' : t === QuestionType.TRUE_FALSE ? 'Binary Truth' : 'Qualitative Short'}
                          {types.includes(t) && <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 md:pt-6">
                  <button 
                    disabled={!content || isGenerating}
                    onClick={handleGenerate}
                    className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-[20px] md:rounded-[24px] font-extrabold flex items-center justify-center gap-2 md:gap-3 hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_15px_30px_rgba(79,70,229,0.2)] active:scale-95 uppercase tracking-widest text-xs md:text-sm"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Build Intelligence
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
