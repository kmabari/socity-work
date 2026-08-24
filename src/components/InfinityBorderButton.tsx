import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfinityBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  roundedClassName?: string;
  speed?: number;
  glowOpacity?: number;
}

export const InfinityBorderButton: React.FC<InfinityBorderButtonProps> = ({
  children,
  className,
  innerClassName,
  roundedClassName = "rounded-xl sm:rounded-2xl",
  speed = 7,
  glowOpacity = 0.85,
  onClick,
  disabled,
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative group p-[2px] inline-flex items-center justify-center overflow-hidden transition-all duration-300",
        roundedClassName,
        "shadow-[0_8px_24px_-4px_rgba(26,43,92,0.18),0_2px_8px_-1px_rgba(201,162,39,0.12)]",
        "hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
      {...props}
    >
      {/* Rotating multi-color beam */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -inset-[180%] pointer-events-none -z-10 bg-[conic-gradient(from_0deg,#ff007a_0deg,#7928ca_45deg,#0070f3_90deg,#00dfd8_135deg,#10b981_180deg,#c9a227_225deg,#f59e0b_270deg,#ff4b4b_315deg,#ff007a_360deg)] opacity-95 blur-[0.5px]"
      />

      {/* Ambient background glow */}
      <div 
        className={cn(
          "absolute -inset-1 -z-20 rounded-[inherit] bg-gradient-to-tr from-[#0070f3]/20 via-[#c9a227]/25 to-[#ff007a]/20 blur-md pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
        )} 
      />

      {/* Button Content */}
      <div 
        className={cn(
          "relative w-full h-full flex items-center justify-center gap-2 font-bold transition-all",
          "rounded-[10px] sm:rounded-[14px]",
          innerClassName
        )}
      >
        {children}
      </div>
    </button>
  );
};

export default InfinityBorderButton;
