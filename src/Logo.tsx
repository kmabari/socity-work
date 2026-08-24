import React, { useState, useEffect } from 'react';
import { LOGO_URL, FALLBACK_LOGO_URL, ANIMATED_LOGO_URL, LOCAL_ANIMATED_LOGO_URL } from '@/src/constants';
import { subscribeToOrgSettings, OrgSettings, normalizeImageUrl } from '@/src/lib/cms';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  src?: string;
  showGlow?: boolean;
  showAura?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  animated = true, 
  src,
  showGlow = false,
  showAura = false,
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 sm:w-16 sm:h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52',
    xl: 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64',
  };

  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_org_settings');
      if (cached) return JSON.parse(cached) as OrgSettings;
    } catch {
      // ignore
    }
    return null;
  });

  const getEffectiveSrc = (settings: OrgSettings | null, explicitSrc?: string): string => {
    if (explicitSrc) return normalizeImageUrl(explicitSrc);
    if (animated) {
      if (settings?.animatedLogoUrl) return normalizeImageUrl(settings.animatedLogoUrl);
      if (settings?.logoUrl) return normalizeImageUrl(settings.logoUrl);
      return LOCAL_ANIMATED_LOGO_URL || ANIMATED_LOGO_URL;
    } else {
      if (settings?.logoUrl) return normalizeImageUrl(settings.logoUrl);
      if (settings?.animatedLogoUrl) return normalizeImageUrl(settings.animatedLogoUrl);
      return LOGO_URL;
    }
  };

  const [currentSrc, setCurrentSrc] = useState<string>(() => getEffectiveSrc(orgSettings, src));
  const [loaded, setLoaded] = useState(false);
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
      setCurrentSrc(getEffectiveSrc(settings, src));
      setUseSvgFallback(false);
    });
    return () => unsub();
  }, [src, animated]);

  useEffect(() => {
    setCurrentSrc(getEffectiveSrc(orgSettings, src));
    setUseSvgFallback(false);
  }, [src, animated, orgSettings?.animatedLogoUrl, orgSettings?.logoUrl]);

  const handleError = () => {
    // Multi-tier fallback sequence
    if (currentSrc !== LOCAL_ANIMATED_LOGO_URL && LOCAL_ANIMATED_LOGO_URL) {
      setCurrentSrc(LOCAL_ANIMATED_LOGO_URL);
    } else if (currentSrc !== ANIMATED_LOGO_URL) {
      setCurrentSrc(ANIMATED_LOGO_URL);
    } else if (currentSrc !== 'https://i.ibb.co/whWxd4FX/782447521-1074313911653476-2779143939229298450-n.gif') {
      setCurrentSrc('https://i.ibb.co/whWxd4FX/782447521-1074313911653476-2779143939229298450-n.gif');
    } else if (currentSrc !== FALLBACK_LOGO_URL) {
      setCurrentSrc(FALLBACK_LOGO_URL);
    } else {
      setUseSvgFallback(true);
    }
  };

  const isLarge = size === 'lg' || size === 'xl';

  return (
    <div className={cn("relative flex items-center justify-center p-1 select-none", sizeClasses[size], className)}>
      {/* Dynamic Animated Ambient Glow Halo */}
      {animated && (
        <>
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: [0.3, 0.65, 0.3],
              rotate: [0, 180, 360],
            }}
            transition={{
              scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 28, repeat: Infinity, ease: "linear" },
            }}
            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-[#c9a227]/25 via-[#0070f3]/20 to-[#f59e0b]/25 blur-xl pointer-events-none"
          />

          {/* Golden Orbital Pulse Ring for Medium & Large Logos */}
          {(isLarge || showGlow) && (
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.25, 0.55, 0.25],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-2 -z-10 rounded-full border border-amber-400/35 blur-[2px] pointer-events-none"
            />
          )}
        </>
      )}

      {/* Main Logo Container with website-logo styles */}
      <div
        className={cn(
          "website-logo relative w-full h-full flex items-center justify-center p-0.5",
          animated && "website-logo-animated"
        )}
      >
        {useSvgFallback ? (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a2b5c] to-[#003366] text-[#c9a227] flex flex-col items-center justify-center p-2 shadow-inner border border-amber-400/40">
            <span className="font-black text-xs sm:text-sm tracking-wider">HCRS</span>
            <span className="text-[7px] text-white/80 font-bold uppercase tracking-widest">KERALA</span>
          </div>
        ) : (
          <img 
            src={currentSrc} 
            alt="HCRS Society" 
            onLoad={() => setLoaded(true)}
            onError={handleError}
            className={cn(
              "w-full h-full object-contain transition-all duration-300",
              loaded ? "opacity-100" : "opacity-80 scale-95"
            )}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        )}
      </div>
    </div>
  );
};

export default Logo;

