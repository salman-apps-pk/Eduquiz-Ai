import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  User as UserIcon, 
  BookOpen, 
  Mail, 
  Lock, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Logo from '../components/Logo';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Validate origin - we only care about messages from our own domain 
      // (where the callback happened)
      if (
        event.origin !== window.location.origin && 
        !event.origin.includes('localhost') && 
        !event.origin.endsWith('.run.app')
      ) {
        console.warn('Blocked message from untrusted origin:', event.origin);
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setSuccess('Logged in with Google successfully!');
        setTimeout(() => onLogin(user), 1000);
      } else if (event.data?.type === 'OAUTH_ERROR') {
        setError(event.data.message || 'Google authentication failed.');
        setGoogleLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { url } = await api.auth.getGoogleUrl();
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start Google login');
      setGoogleLoading(false);
    }
  };

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.auth.verifyOtp({ email: verifyingEmail, otp });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setSuccess('Email verified successfully!');
      setTimeout(() => onLogin(user), 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.auth.resendOtp(verifyingEmail);
      setSuccess('A new code has been sent to your email.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        try {
          const { token, user } = await api.auth.signin({ email, password });
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setLoading(false);
          onLogin(user);
        } catch (err: any) {
          if (err.message && err.message.includes('verify your email')) {
            setVerifyingEmail(email);
            setIsVerifying(true);
            setLoading(false);
            return;
          }
          throw err;
        }
      } else {
        // Sign Up
        const response = await api.auth.signup({ fullName: name, email, password, role: 'teacher' });
        setVerifyingEmail(email);
        setIsVerifying(true);
        setSuccess(response.message || 'Please check your email for verification code.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
      setLoading(false);
      
      // If the email is already registered, provide a clear message and option to switch
      if (err.message && err.message.includes('already registered')) {
        setError('This account exists and is already verified. Please sign in or use a different email.');
        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
      }
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-slate-200 p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-xl shadow-slate-100"
        >
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Mail className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">Verify Email</h1>
          <p className="text-slate-500 text-center mb-6 md:mb-8 text-xs md:text-sm">
            We've sent a code to <span className="font-bold text-slate-900 truncate block">{verifyingEmail}</span>
          </p>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs md:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs md:text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="font-medium">{success}</p>
            </motion.div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Verification Code</label>
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 text-center text-3xl md:text-4xl font-bold py-4 md:py-5 rounded-2xl focus:outline-none focus:border-indigo-600 transition-all tracking-[0.3em] md:tracking-[0.5em]"
              />
            </div>

            <button 
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-indigo-600 text-white font-bold py-4 md:py-5 rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4 shadow-xl text-xs md:text-base uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mx-auto" /> : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-slate-500 text-xs md:text-sm">Didn't receive the code?</p>
            <button 
              onClick={handleResendOtp}
              disabled={loading}
              className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 mx-auto disabled:opacity-50 text-xs md:text-sm"
            >
              Resend Code
            </button>
            <button 
              onClick={() => { setIsVerifying(false); setError(null); setSuccess(null); }}
              className="block w-full mt-4 text-slate-400 text-[10px] md:text-xs hover:text-slate-600 font-medium"
            >
              Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-xl shadow-slate-100"
      >
        <div className="flex justify-center mb-6 md:mb-8">
          <Logo size="md" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-slate-500 text-center mb-8 md:mb-10 text-xs md:text-sm">
          {isLogin 
            ? 'Sign in to access your teacher dashboard.' 
            : 'Join EduQuiz Ai and start building assessments for your students.'}
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs md:text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }} 
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs md:text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p className="font-medium">{success}</p>
          </motion.div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-3.5 md:py-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 text-xs md:text-base"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.67-2.28 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="relative my-6 md:my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 md:space-y-6 overflow-hidden"
              >
                <div>
                  <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-3 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Professor Smith"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-10 md:pl-12 pr-4 md:pr-5 py-3 md:py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 font-medium text-sm md:text-base"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-3 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-10 md:pl-12 pr-4 md:pr-5 py-3 md:py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 font-medium text-sm md:text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-3 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-10 md:pl-12 pr-4 md:pr-5 py-3 md:py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 font-medium text-sm md:text-base"
              />
            </div>
          </div>

          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-3 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-10 md:pl-12 pr-4 md:pr-5 py-3 md:py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 font-medium text-sm md:text-base"
                />
              </div>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 md:py-5 rounded-2xl hover:bg-indigo-700 hover:shadow-indigo-100 hover:shadow-2xl transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xl shadow-indigo-50 active:scale-[0.95] uppercase tracking-widest text-xs md:text-sm flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                <span className="animate-pulse">Processing...</span>
              </>
            ) : (
              <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                {isLogin ? 'Sign In' : 'Create Account'}
              </span>
            )}
          </button>
        </form>

        <div id="auth-footer" className="mt-8 pt-8 border-t border-slate-100/60 text-center bg-slate-50/30 -mx-6 md:-mx-10 -mb-6 md:-mb-10 p-6 md:p-10 rounded-b-[24px] md:rounded-b-[32px]">
          <p className="text-slate-500 text-xs md:text-sm font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
                setLoading(false);
              }}
              className="ml-2 text-indigo-600 font-bold hover:text-indigo-700 transition-all hover:underline decoration-2 underline-offset-4"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
