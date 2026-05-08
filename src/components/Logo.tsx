import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className, iconOnly = false, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-5 h-5', text: 'text-lg', container: 'p-1' },
    md: { icon: 'w-7 h-7', text: 'text-2xl', container: 'p-1.5' },
    lg: { icon: 'w-10 h-10', text: 'text-4xl', container: 'p-2' },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden",
        sizes[size].container
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
        <div className="relative flex items-center justify-center">
          <MessageSquare className={cn("text-white fill-white", sizes[size].icon)} />
          <span className={cn(
            "absolute font-black text-blue-600 select-none",
            size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-[14px]' : 'text-[20px]'
          )} style={{ top: '42%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            ?
          </span>
        </div>
      </div>
      
      {!iconOnly && (
        <div className={cn("font-extrabold tracking-tighter flex items-baseline", sizes[size].text)}>
          <span className="text-slate-900">EduQuiz</span>
          <span className="text-blue-600 ml-1">Ai</span>
        </div>
      )}
    </div>
  );
}
