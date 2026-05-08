/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Target, 
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Quiz, Attempt, User } from '../types';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function Analytics({ user }: { user: User }) {
  const [searchParams] = useSearchParams();
  const quizIdFilter = searchParams.get('quizId');
  
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Error fetching analytics data:', err);
        setError('Failed to load performance metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAttempts = quizIdFilter 
    ? attempts.filter(a => a.quizId === quizIdFilter)
    : attempts;
  
  const targetQuiz = quizIdFilter ? quizzes.find(q => q.id === quizIdFilter) : null;

  const avgScore = filteredAttempts.length > 0 
    ? Math.round(filteredAttempts.reduce((acc, curr) => acc + curr.score, 0) / filteredAttempts.length)
    : 0;
  
  // Chart data: Scores over time
  const timeData = filteredAttempts
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString(),
      score: a.score
    }));

  // Chart data: Performance by Quiz (only if not filtering by single quiz)
  const quizData = quizzes.map(q => {
    const qAttempts = attempts.filter(a => a.quizId === q.id);
    const qAvg = qAttempts.length > 0 
      ? Math.round(qAttempts.reduce((acc, curr) => acc + curr.score, 0) / qAttempts.length)
      : 0;
    return {
      name: q.title.length > 10 ? q.title.substring(0, 10) + '...' : q.title,
      avg: qAvg,
      count: qAttempts.length
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Processing Synthesis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm text-center max-w-md w-full">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <RefreshCcw className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Analysis Failed</h2>
          <p className="text-slate-500 mb-6 md:mb-8 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="geometric-btn-primary w-full py-4 text-[10px] md:text-xs"
          >
            Retry Diagnostics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 md:space-y-12">
      <header>
        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {targetQuiz ? `Results: ${targetQuiz.title}` : 'Performance Analytics'}
        </h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">
          {targetQuiz ? 'Deep-dive into specific assessment metrics.' : 'Holistic view of student performance and curriculum mastery.'}
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <InsightCard 
          label="Overall Avg." 
          value={`${avgScore}%`}
          trend="+5.2%"
          trendType="up"
          color="text-indigo-600"
        />
        <InsightCard 
          label="Active Minds" 
          value={new Set(filteredAttempts.map(a => a.studentEmail || a.studentName)).size.toString()}
          trend="+12"
          trendType="up"
          color="text-slate-800"
        />
        <InsightCard 
          label="Success Rate" 
          value="94%"
          trend="-2.1%"
          trendType="down"
          color="text-emerald-600"
        />
        <InsightCard 
          label="Concept Grip" 
          value="High"
          trend="Positive"
          trendType="up"
          color="text-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        {/* Progress over time */}
        <section className="bg-white border border-slate-200 p-4 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm">
           <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-10">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
              <h3 className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Class Proficiency Trend</h3>
           </div>
           <div className="h-60 md:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeData}>
                   <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} dy={10} />
                   <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} domain={[0, 100]} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                   <Area type="monotone" dataKey="score" stroke="#4f46e5" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </section>

        {/* Quiz engagement */}
        <section className="bg-white border border-slate-200 p-4 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm">
           <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-10">
              <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
              <h3 className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Comparative Accuracy</h3>
           </div>
           <div className="h-60 md:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} dy={10} />
                   <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} domain={[0, 100]} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                   <Bar dataKey="avg" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </section>
      </div>

      {/* Student List */}
      <section>
         <div className="flex items-center gap-3 mb-6 md:mb-8">
            <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
            <h3 className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Individual Synthesis Records</h3>
         </div>

         {/* Mobile view for student records */}
         <div className="md:hidden space-y-3">
            {filteredAttempts.map((a, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                    {a.studentName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{a.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate italic">
                      {quizzes.find(q => q.id === a.quizId)?.title || 'Assessment'}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[8px] uppercase font-extrabold tracking-widest px-2 py-1 rounded-md",
                    a.score > 70 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                  )}>
                    {a.score}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">{a.rollNumber || 'NO-ID'}</span>
                  <span className="text-slate-400 font-bold">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
         </div>

         {/* Desktop Table */}
         <div className="hidden md:block bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
            <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-10 py-6">Student</th>
                    <th className="px-10 py-6">Contact / Roll No.</th>
                    <th className="px-10 py-6">Engagement</th>
                    <th className="px-10 py-6">Proficiency</th>
                    <th className="px-10 py-6">Stance</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 italic">
                  {filteredAttempts.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                       <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 not-italic">
                                {a.studentName?.charAt(0) || '?'}
                             </div>
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">{a.studentName}</span>
                               {!quizIdFilter && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest not-italic">
                                  {quizzes.find(q => q.id === a.quizId)?.title || 'Unknown Quiz'}
                                </span>
                               )}
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-6 not-italic">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600 font-medium">{a.studentEmail || 'No Email'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{a.rollNumber || 'No ID'}</span>
                          </div>
                       </td>
                       <td className="px-10 py-6 text-xs text-slate-400 font-bold not-italic">{new Date(a.createdAt).toLocaleDateString()}</td>
                       <td className="px-10 py-6">
                          <div className="flex items-center gap-3 not-italic">
                             <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full" style={{ width: `${a.score}%` }} />
                             </div>
                             <span className="text-sm font-bold text-slate-900 font-mono">{a.score}%</span>
                          </div>
                       </td>
                       <td className="px-10 py-6 not-italic">
                          <span className={cn(
                            "text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-lg",
                            a.score > 70 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                          )}>
                            {a.score > 70 ? 'Proficient' : 'Improving'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
    </div>
  );
}

function InsightCard({ label, value, trend, trendType, color }: { label: string, value: string, trend: string, trendType: 'up' | 'down', color: string }) {
  return (
    <div className="bg-white border border-slate-200 p-4 md:p-8 rounded-[24px] md:rounded-[32px] space-y-2 md:space-y-4 shadow-sm">
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
        <div className={cn(
          "flex items-center gap-0.5 md:gap-1 text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full",
          trendType === 'up' ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50"
        )}>
          {trend}
          {trendType === 'up' ? <ArrowUpRight className="w-2 md:w-2.5 h-2 md:h-2.5" /> : <ArrowDownRight className="w-2 md:w-2.5 h-2 md:h-2.5" />}
        </div>
      </div>
      <div className={cn("text-xl md:text-4xl font-extrabold tracking-tighter truncate", color)}>
        {value}
      </div>
    </div>
  );
}
