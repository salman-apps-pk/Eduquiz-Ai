/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  GraduationCap,
  AlertCircle,
  Clock,
  Award,
  Zap,
  Eye,
  X
} from 'lucide-react';
import { Quiz, Attempt, QuestionType, User } from '../types';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface StudentInfo {
  name: string;
  email: string;
  rollNumber: string;
}

export default function QuizAttempt({ user }: { user: User | null }) {
  const { id, teacherSlug, quizSlug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isAttempted, setIsAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        let quizData: Quiz;
        if (id) {
          quizData = isPreview ? await api.quizzes.get(id) : await api.quizzes.getPublic(id);
        } else if (teacherSlug && quizSlug) {
          quizData = await api.quizzes.getPublicBySlug(teacherSlug, quizSlug);
        } else {
          setLoading(false);
          return;
        }

        if (!isPreview && localStorage.getItem(`attempted_${quizData.id}`)) {
          setIsAttempted(true);
          setLoading(false);
          return;
        }

        setQuiz(quizData);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        if (isPreview) navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id, teacherSlug, quizSlug, navigate, isPreview]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    if (isPreview) {
      // Mock result for preview
      setResult({
        id: 'preview',
        quizId: quiz.id,
        studentName: user?.name || 'Instructor Preview',
        answers,
        score: 0,
        maxScore: 100,
        feedback: {},
        createdAt: new Date()
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const evaluation = await api.ai.evaluateQuiz({ quiz, answers });
      const { score, feedback } = evaluation;
      
      const attemptData = {
        quizId: quiz.id || id,
        studentName: studentInfo?.name,
        studentEmail: studentInfo?.email,
        rollNumber: studentInfo?.rollNumber,
        answers,
        score,
        feedback,
      };

      const savedAttempt = await api.attempts.create(attemptData as any);
      
      // Prevent duplicate attempts
      localStorage.setItem(`attempted_${quiz.id}`, 'true');
      
      setResult(savedAttempt);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('already attempted')) {
        setIsAttempted(true);
      } else {
        alert(err.message || 'Submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Matrix...</p>
        </div>
      </div>
    );
  }

  if (isAttempted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 md:p-10">
        <div className="bg-white p-6 md:p-12 rounded-[24px] md:rounded-[40px] border border-slate-200 shadow-2xl text-center max-w-xl w-full space-y-6 md:space-y-8">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-50 text-amber-600 rounded-[20px] md:rounded-[24px] flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Access Locked</h2>
          <p className="text-slate-500 leading-relaxed text-sm md:text-lg">You have already attempted this quiz. Multiple attempts are strictly regulated.</p>
          <button onClick={() => navigate('/')} className="geometric-btn-secondary w-full py-4 md:py-5 text-xs md:text-sm uppercase tracking-widest">Return to Base</button>
        </div>
      </div>
    );
  }

  if (!quiz) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 md:p-10">
      <div className="text-center p-6 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Quiz Unavailable</h2>
        <p className="text-slate-500 mt-2 text-sm">The assessment link you followed is invalid or has been decommissioned.</p>
        <button onClick={() => navigate('/')} className="mt-6 text-indigo-600 text-sm font-bold uppercase tracking-widest">Back to Dashboard</button>
      </div>
    </div>
  );

  if (!isPreview && !studentInfo && quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <IdentificationForm onComplete={setStudentInfo} quizTitle={quiz.title} />
      </div>
    );
  }

  if (result) {
    return <ResultView quiz={quiz} result={result} isPreview={isPreview} />;
  }

  const currentQ = quiz.questions[currentIdx];
  const isLast = currentIdx === quiz.questions.length - 1;

  return (
    <div className="min-h-screen bg-[#1E222F] flex items-center justify-center p-3 md:p-10">
      {isPreview && (
        <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
          <div className="bg-amber-50 border border-amber-200 p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3 shadow-lg">
            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600" />
            <span className="text-amber-800 text-[10px] md:text-xs font-bold">Preview Mode: Data not recorded.</span>
          </div>
        </div>
      )}
      
      <div className="relative w-full max-w-4xl bg-white rounded-[20px] md:rounded-[24px] overflow-hidden shadow-2xl flex flex-col min-h-[500px] md:min-h-[600px]">
        {/* Close Button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-1.5 md:p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 z-10"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <div className="flex-1 p-5 md:p-12 flex flex-col">
          {/* Header Progress */}
          <div className="mb-6 md:mb-12 flex flex-col items-center gap-2 md:gap-4">
            <div className="text-[10px] md:text-sm font-bold text-slate-800">
              Question {currentIdx + 1}/{quiz.questions.length}
            </div>
            <div className="w-full max-w-xs md:max-w-md h-2 md:h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <motion.div 
                className="h-full bg-[#1A4BFF]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-8 md:mb-16 text-center px-2">
                 <h2 className="text-xl md:text-4xl font-extrabold text-slate-900 leading-tight md:leading-[1.2] tracking-tight">
                  {currentQ.question.replace(/^["']|["']$/g, '')}
                 </h2>
              </div>

              <div className="max-w-2xl mx-auto w-full space-y-3 md:space-y-4">
                {currentQ.type === QuestionType.SHORT_ANSWER ? (
                  <div className="space-y-2">
                    <textarea
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 md:p-6 rounded-xl h-40 md:h-48 focus:border-blue-400 transition-all focus:outline-none shadow-inner font-medium text-base md:text-lg"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {currentQ.options?.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(currentQ.id, option)}
                        className={cn(
                          "w-full group p-3.5 md:p-5 rounded-xl border-2 transition-all flex items-center gap-3 md:gap-6",
                          answers[currentQ.id] === option 
                            ? "bg-[#1A4BFF] text-white border-[#1A4BFF] shadow-lg shadow-blue-200/50" 
                            : "bg-white text-slate-700 border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          answers[currentQ.id] === option ? "bg-white text-[#1A4BFF] border-white" : "border-slate-200 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-400"
                        )}>
                          <span className="text-xs md:text-sm font-bold">{String.fromCharCode(65 + idx)}</span>
                        </div>
                        <span className={cn(
                          "font-bold text-sm md:text-lg text-left flex-1",
                          answers[currentQ.id] === option ? "text-white" : "text-slate-700"
                        )}>
                          {option.replace(/^["']|["']$/g, '')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 md:mt-12 flex justify-between gap-3 md:gap-6">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="px-5 md:px-8 py-3 md:py-4 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs md:text-base"
            >
              Back
            </button>

            {isLast ? (
              <button
                disabled={Object.keys(answers).length < quiz.questions.length || isSubmitting}
                onClick={handleSubmit}
                className="flex-1 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 text-xs md:text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Finish Quiz
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                disabled={!answers[currentQ.id]}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="flex-1 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 text-xs md:text-base"
              >
                Next
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ quiz, result, isPreview }: { quiz: Quiz, result: Attempt, isPreview: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto p-5 md:p-12 space-y-10 md:space-y-16 pb-32 md:pb-40">
      <header className="text-center space-y-4 md:space-y-6">
        <div className="flex justify-center">
            <motion.div 
               initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
               className="bg-indigo-600 w-20 h-20 md:w-28 md:h-28 rounded-[24px] md:rounded-[32px] flex items-center justify-center shadow-[0_15px_40px_rgba(79,70,229,0.3)] rotate-3"
            >
               <Award className="w-10 h-10 md:w-12 md:h-12 text-white -rotate-3" />
            </motion.div>
        </div>
        <div className="px-4">
          <p className="text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-[10px] font-extrabold mb-1 md:mb-2 italic truncate">Assessment Outcome</p>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tighter">
            {isPreview ? 'PREVIEW' : <>{result.score}<span className="text-indigo-600">/</span>100</>}
          </h1>
          {isPreview && <p className="text-amber-600 font-bold text-[10px] md:text-xs mt-3 md:mt-4">Simulation only – not recorded.</p>}
        </div>
      </header>

      <section className="space-y-6 md:space-y-8">
         <div className="flex items-center gap-3">
            <div className="h-0.5 w-6 md:w-8 bg-indigo-500 rounded-full" />
            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Diagnostic Feedback</h2>
         </div>
         <div className="grid gap-6 md:gap-8">
            {quiz.questions.map((q) => {
              const studentAns = result.answers[q.id];
              const feedback = result.feedback[q.id];
              
              return (
                <div key={q.id} className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-6 md:p-10 space-y-6 md:space-y-8 shadow-sm">
                   <div className="flex justify-between gap-4">
                     <h3 className="text-base md:text-xl font-bold text-slate-900 leading-tight italic">
                       {q.question.replace(/^["']|["']$/g, '')}
                     </h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl flex flex-col items-center md:items-start text-center md:text-left">
                         <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-2 md:mb-3">Student Response</p>
                         <p className="text-slate-800 font-bold text-sm md:text-base">{studentAns || 'No data'}</p>
                      </div>
                      <div className="p-4 md:p-6 bg-blue-50/30 border border-blue-100 rounded-xl md:rounded-2xl flex flex-col items-center md:items-start text-center md:text-left">
                         <p className="text-[8px] md:text-[10px] text-blue-400 uppercase font-extrabold tracking-widest mb-2 md:mb-3">Target Outcome</p>
                         <p className="text-blue-900 font-bold text-sm md:text-base">{q.correctAnswer}</p>
                      </div>
                   </div>

                   {!isPreview && feedback && (
                     <div className="p-4 md:p-6 bg-slate-900 rounded-xl md:rounded-2xl flex gap-3 md:gap-4 text-white shadow-xl">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                           <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">{feedback}</p>
                     </div>
                   )}
                </div>
              );
            })}
         </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 flex justify-center bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none">
        <button 
           onClick={() => navigate('/')}
           className="geometric-btn-primary px-10 md:px-16 py-4 md:py-5 text-xs md:text-sm uppercase tracking-widest shadow-2xl active:scale-95 pointer-events-auto"
        >
          Return to Hub
        </button>
      </div>
    </div>
  );
}

function IdentificationForm({ onComplete, quizTitle }: { onComplete: (info: StudentInfo) => void, quizTitle: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onComplete({ name, email, rollNumber });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg bg-white border border-slate-200 p-6 md:p-12 rounded-[32px] md:rounded-[40px] shadow-2xl space-y-8 md:space-y-10"
    >
      <header className="space-y-3 md:space-y-4">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <GraduationCap className="text-white w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Begin Evaluation</h2>
          <p className="text-indigo-600 text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.2em] mt-1 md:mt-2 italic truncate">{quizTitle}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
         <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Identity Name (Required)</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl focus:border-indigo-400 transition-all focus:outline-none font-medium text-base md:text-lg placeholder:text-slate-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl focus:border-indigo-400 transition-all focus:outline-none font-medium text-sm md:text-base placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Serial / Roll No.</label>
                <input 
                  type="text" 
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="ID-12345"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl focus:border-indigo-400 transition-all focus:outline-none font-medium text-sm md:text-base placeholder:text-slate-300"
                />
              </div>
            </div>
         </div>

         <button type="submit" className="geometric-btn-primary w-full py-4 md:py-6 text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-indigo-50">
            Activate Interface
         </button>
      </form>
    </motion.div>
  );
}
