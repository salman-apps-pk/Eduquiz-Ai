/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, BookOpen, Users, BarChart3, ChevronRight, Clock, Loader2, Eye, LineChart, Copy, Check, ListChecks } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Quiz, User, Attempt } from '../types';
import { api } from '../lib/api';

export default function InstructorDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [quizzesData, attemptsData] = await Promise.all([
          api.quizzes.getAll(),
          api.attempts.getAll()
        ]);
        setQuizzes(quizzesData);
        setAttempts(attemptsData);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to sync dashboard. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopyLink = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation();
    // Fallback to ID-based link if slugs are missing
    const path = (quiz.teacherSlug && quiz.quizSlug) 
      ? `/${quiz.teacherSlug}/${quiz.quizSlug}`
      : `/quiz/${quiz.id}`;
    const url = `${window.location.origin}${path}`;
    
    // Robust copy to clipboard
    const copyToClipboard = async (text: string) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          throw new Error('Clipboard API unavailable');
        }
      } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          textArea.remove();
        } catch (copyErr) {
          textArea.remove();
          throw copyErr;
        }
      }
    };

    copyToClipboard(url)
      .then(() => {
        setCopiedId(quiz.id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        // Final fallback: just show the link so they can manually copy if all else fails
        const manualPrompt = window.prompt("Copy this link:", url);
        if (manualPrompt !== null) {
          setCopiedId(quiz.id);
          setTimeout(() => setCopiedId(null), 2000);
        }
      });
  };

  const avgScore = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Harmonizing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-10">
        <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 rotate-45" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sync Interrupted</h2>
          <p className="text-slate-500 mb-8">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="geometric-btn-primary w-full py-4 text-xs"
          >
            Reconnect Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto flex flex-col min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Control Center
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Manage assessments and track student synthesis.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Link 
            to="/generate"
            className="geometric-btn-primary px-6 md:px-8 py-3 h-10 md:h-12 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm">Create Quiz</span>
          </Link>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 sm:flex-none min-w-[80px]">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Quizzes
              </span>
              <span className="text-lg md:text-xl font-bold text-indigo-600 font-mono leading-tight">
                {quizzes.length}
              </span>
            </div>
            <div className="bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 sm:flex-none min-w-[80px]">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Average</span>
              <span className="text-lg md:text-xl font-bold text-emerald-600 font-mono leading-tight">{avgScore}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 flex-1 w-full">
        <section className="col-span-1 md:col-span-12 lg:col-span-7 bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-4 md:p-8 flex flex-col shadow-sm min-h-[400px] lg:h-[calc(100vh-250px)]">
          <div className="flex items-center justify-between mb-4 md:mb-8 flex-shrink-0">
            <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full"></span>
              Assessments
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-3 md:space-y-4 custom-scrollbar">
            {quizzes.length === 0 ? (
              <div className="h-full min-h-[250px] border-2 border-dashed border-slate-200 rounded-[20px] md:rounded-[24px] bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 text-center group transition-all">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
                </div>
                <h4 className="text-slate-800 font-bold text-base md:text-lg mb-1">
                  No quizzes yet
                </h4>
                <p className="text-slate-400 text-xs md:text-sm max-w-[200px] md:max-w-[240px] mb-6">Create your first AI-generated assessment.</p>
                <Link 
                  to="/generate"
                  className="geometric-btn-secondary px-6 md:px-8 py-2.5 md:py-3 text-xs md:text-sm"
                >
                  AI Engine
                </Link>
              </div>
            ) : (
              quizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white border border-slate-100 p-3 md:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-indigo-100 hover:bg-slate-50 transition-all shadow-sm shadow-slate-200/50 gap-3 md:gap-4"
                >
                  <div className="flex items-center gap-3 md:gap-5 flex-1 w-full cursor-pointer min-w-0" onClick={() => navigate(`/quiz/${quiz.id}?preview=true`)}>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-lg md:rounded-xl flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-slate-800 font-bold group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xs md:text-sm truncate">{quiz.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 md:gap-x-4 gap-y-1 mt-1 text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md shrink-0 ${
                          quiz.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                          quiz.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {quiz.difficulty}
                        </span>
                        <span className="text-slate-300 hidden sm:inline shrink-0">•</span>
                        <span className="text-indigo-500 font-extrabold shrink-0">{attempts.filter(a => a.quizId === quiz.id).length} Subs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 relative z-30 shrink-0 w-full sm:w-auto justify-end">
                    <button 
                      type="button"
                      onClick={(e) => handleCopyLink(quiz, e)}
                      className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all flex items-center gap-1.5 md:gap-2 ${
                        copiedId === quiz.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Copy Link"
                    >
                      {copiedId === quiz.id ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                      {copiedId === quiz.id && <span className="text-[9px] md:text-[10px] font-bold uppercase">Copied</span>}
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/analytics?quizId=${quiz.id}`); }}
                      className="p-2 md:p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-all"
                      title="View Results"
                    >
                      <ListChecks className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        <section className="col-span-1 md:col-span-12 lg:col-span-5 flex flex-col gap-6 md:gap-8 mb-6 md:mb-0">
           <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden group shadow-2xl flex-shrink-0">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500" />
              
              <h3 className="text-base md:text-lg font-bold mb-6 md:mb-8 flex items-center justify-between relative z-10">
                Performance
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Feed</span>
              </h3>
              
              <div className="space-y-6 md:space-y-8 relative z-10">
                <MiniStat 
                  label="Avg Outcome" 
                  value={`${avgScore}%`}
                  icon={<BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />}
                />
                <MiniStat 
                  label="Submissions" 
                  value={attempts.length.toString()}
                  icon={<ListChecks className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />}
                />
              </div>

              <div className="mt-8 md:mt-10 pt-6 md:pt-10 border-t border-white/5 relative z-10">
                <Link to="/analytics" className="w-full p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group/btn">
                  <span className="text-xs md:text-sm font-bold text-slate-300 text-left">Detailed Diagnostics</span>
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
           </div>

           <div className="bg-indigo-100 rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-indigo-200 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-indigo-900 font-extrabold text-base md:text-lg tracking-tight">AI Active</p>
                <p className="text-indigo-600 text-[9px] md:text-[10px] font-bold uppercase tracking-widest leading-tight">Syncing across platform...</p>
              </div>
              <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                 <div className="w-5 h-5 md:w-6 md:h-6 border-2 md:border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          {icon}
        </div>
        <span className="text-slate-400 text-sm font-semibold">{label}</span>
      </div>
      <span className="text-lg font-bold text-white font-mono">{value}</span>
    </div>
  );
}
