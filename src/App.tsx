/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, LayoutDashboard, PlusCircle, BarChart3, ClipboardList, Loader2 } from 'lucide-react';
import { User } from './types';
import Logo from './components/Logo';
import InstructorDashboard from './pages/InstructorDashboard';
import QuizGenerator from './pages/QuizGenerator';
import QuizAttempt from './pages/QuizAttempt';
import Analytics from './pages/Analytics';
import AuthPage from './pages/AuthPage';

function Navbar({ user, onLogout }: { user: User | null, onLogout: () => void }) {
  const location = useLocation();

  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white text-slate-500 border-r border-slate-200 flex-col z-50">
        <div className="p-8">
          <div className="mb-10">
            <Logo size="sm" />
          </div>

          <div className="space-y-1">
            <NavLink 
              to="/" 
              active={location.pathname === '/'} 
              icon={<LayoutDashboard className="w-5 h-5" />}
            >
              Dashboard
            </NavLink>
            
            <NavLink 
              to="/generate" 
              active={location.pathname === '/generate'} 
              icon={<PlusCircle className="w-5 h-5" />}
            >
              New Quiz
            </NavLink>
            <NavLink 
              to="/analytics" 
              active={location.pathname === '/analytics'} 
              icon={<BarChart3 className="w-5 h-5" />}
            >
              Performance
            </NavLink>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 overflow-hidden">
              <UserIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-800 truncate">{user.name}</span>
              <span className="text-[10px] text-slate-400 truncate lowercase">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-50">
        <MobileNavLink 
          to="/" 
          active={location.pathname === '/'} 
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Home"
        />
        <MobileNavLink 
          to="/generate" 
          active={location.pathname === '/generate'} 
          icon={<PlusCircle className="w-5 h-5" />}
          label="Create"
        />
        <MobileNavLink 
          to="/analytics" 
          active={location.pathname === '/analytics'} 
          icon={<BarChart3 className="w-5 h-5" />}
          label="Stats"
        />
        <button 
          onClick={onLogout}
          className="flex flex-col items-center gap-1 text-slate-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tight">Logout</span>
        </button>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">{user.name}</span>
          <div className="w-6 h-6 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden">
            <UserIcon className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>
    </>
  );
}

function NavLink({ to, children, icon, active }: { to: string, children: React.ReactNode, icon: React.ReactNode, active: boolean }) {
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
        active 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({ to, icon, active, label }: { to: string, icon: React.ReactNode, active: boolean, label: string }) {
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      {active && <span className="w-1 h-1 bg-indigo-600 rounded-full"></span>}
    </Link>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setInitializing(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing Session</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <main className={user ? "md:pl-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen" : "min-h-screen"}>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/quiz/:id" element={<QuizAttempt user={user} />} />
              <Route path="/:teacherSlug/:quizSlug" element={<QuizAttempt user={user} />} />
              
              {/* Conditional Routes */}
              <Route 
                path="/" 
                element={user ? <InstructorDashboard user={user} /> : <AuthPage onLogin={(u) => setUser(u)} />} 
              />
              
              <Route 
                path="/generate" 
                element={user ? <QuizGenerator user={user} /> : <Navigate to="/" />} 
              />
              
              <Route 
                path="/analytics" 
                element={user ? <Analytics user={user} /> : <Navigate to="/" />} 
              />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  );
}
