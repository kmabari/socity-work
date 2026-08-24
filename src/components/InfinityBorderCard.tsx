import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfinityBorderCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  roundedClassName?: string;
  glowClassName?: string;
  isButton?: boolean;
  onClick?: () => void;
  speed?: number; // duration in seconds
  borderWidth?: string;
  glowOpacity?: number;
}

export const InfinityBorderCard: React.FC<InfinityBorderCardProps> = ({
  children,
  className,
  innerClassName,
  roundedClassName = "rounded-2xl sm:rounded-3xl",
  glowClassName,
  isButton = false,
  onClick,
  speed = 8.5,
  borderWidth = "p-[2.5px]",
  glowOpacity = 0.8,
}) => {
  const Component = isButton ? 'button' : 'div';

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group",
        borderWidth,
        roundedClassName,
        "flex flex-col items-center justify-center overflow-hidden transition-all duration-300",
        "shadow-[0_16px_40px_-10px_rgba(26,43,92,0.12),0_4px_16px_-2px_rgba(201,162,39,0.09)]",
        isButton && "cursor-pointer hover:scale-[1.015] active:scale-[0.985]",
        className
      )}
    >
      {/* Slow Continuous Multi-Color Infinite Light Spectrum Tracing around the Perimeter */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -inset-[160%] pointer-events-none -z-10 bg-[conic-gradient(from_0deg,#ff007a_0deg,#7928ca_45deg,#0070f3_90deg,#00dfd8_135deg,#10b981_180deg,#c9a227_225deg,#f59e0b_270deg,#ff4b4b_315deg,#ff007a_360deg)] opacity-95 blur-[1px]"
      />

      {/* Ambient Soft Multi-Color Glow underneath */}
      <motion.div 
        animate={{
          opacity: [glowOpacity * 0.7, glowOpacity, glowOpacity * 0.7],
          scale: [1, 1.03, 1]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut"
        }}
        className={cn(
          "absolute -inset-2 -z-20 rounded-[34px] bg-gradient-to-tr from-[#0070f3]/15 via-[#c9a227]/20 to-[#ff007a]/15 blur-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100",
          glowClassName
        )} 
      />

      {/* Inner Frosted Glass Surface */}
      <div 
        className={cn(
          "relative w-full h-full bg-white/92 backdrop-blur-2xl backdrop-saturate-150 flex flex-col items-center justify-between border border-white/90 shadow-[inset_0_1px_3px_rgba(255,255,255,1)]",
          // Calculate inner rounded corners nicely
          "rounded-[14px] sm:rounded-[22px]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default InfinityBorderCard;
