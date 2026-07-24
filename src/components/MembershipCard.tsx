import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, MapPin, ShieldCheck, Camera, PartyPopper, Share2, LogOut, Calendar, Phone, Mail, Award, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { DISTRICTS, getAssemblyCode } from '@/src/constants';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { compressImage, html2canvasOklchOnClone } from '@/src/lib/imageUtils';
import { getOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import Logo from '../Logo';

interface MembershipCardProps {
  member: UserProfile;
  onUpdatePhoto?: (file: File) => void;
  showCelebration?: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
  isReadOnly?: boolean;
  onScreenshotModeChange?: (active: boolean) => void;
}

export default function MembershipCard({ member, onUpdatePhoto, showCelebration = true, isAdmin = false, onLogout, isReadOnly = false, onScreenshotModeChange }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const exitScreenshotMode = () => {
    setIsScreenshotMode(false);
    if (typeof window !== 'undefined' && window.history.state?.screenshotMode) {
      window.history.back();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isScreenshotMode) {
      window.history.pushState({ screenshotMode: true }, '');
      
      const handlePopState = (e: PopStateEvent) => {
        setIsScreenshotMode(false);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isScreenshotMode]);

  useEffect(() => {
    onScreenshotModeChange?.(isScreenshotMode);
  }, [isScreenshotMode, onScreenshotModeChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const targetWidth = 340;
        const availableWidth = width > 0 ? width - (isScreenshotMode ? 12 : 20) : (window.innerWidth - 24);
        const targetScale = availableWidth < targetWidth ? Math.max(0.35, availableWidth / targetWidth) : 1;
        
        requestAnimationFrame(() => {
          setScale(targetScale);
        });
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isScreenshotMode]);

  const handleGenerateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('മെമ്പർഷിപ്പ് കാർഡ് ഡൗൺലോഡിനായി തയാറാക്കുന്നു...');
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      // Focus on card element precisely
      const canvas = await html2canvas(cardRef.current, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: null,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 340,
        windowHeight: 590,
        onclone: html2canvasOklchOnClone
      });
      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);
      
      // Attempt immediate direct browser download
      try {
        const link = document.createElement('a');
        link.download = `HCRS_CARD_${member.name.trim().replace(/\s+/g, '_')}.png`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('കാർഡ് വിജയകരമായി ഫോണിലേക്ക് ഡൗൺലോഡ് ചെയ്‌തിട്ടുണ്ട്!', { id: loadingToast });
      } catch (innerErr) {
        console.warn("Direct file anchor download skipped/failed, showing fallback preview:", innerErr);
        toast.success('ഫോട്ടോ തയാറായിട്ടുണ്ട്! താഴെ തെളിഞ്ഞു വരുന്ന ചിത്രത്തിൽ അമർത്തിപ്പിടിച്ചു ഗാലറിയിലേക്ക് സേവ് ചെയ്യാം.', { id: loadingToast });
      }
    } catch (error: any) {
      console.error("Screenshot generation error:", error);
      toast.error('ചിത്രം തയ്യാറാക്കാൻ കഴിഞ്ഞില്ല. ദയവായി നേരിട്ട് സ്ക്രീൻഷോട്ട് എടുക്കുക.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const data = await getOrgSettings();
    setSettings(data);
  };

  useEffect(() => {
    if (!showCelebration) return;
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    const spread = 75;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: spread, origin: { x: 0, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      confetti({ particleCount: 3, angle: 120, spread: spread, origin: { x: 1, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [showCelebration]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
       toast.error("Please select an image file");
       return;
    }
    
    const initialUrl = URL.createObjectURL(file);
    setPreviewUrl(initialUrl);

    try {
      const compressed = await compressImage(file, 600, 600, 0.7);
      const compressedUrl = URL.createObjectURL(compressed);
      setPreviewUrl(compressedUrl);
      
      if (onUpdatePhoto) {
        const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });
        onUpdatePhoto(compressedFile);
      }
    } catch (err) {
      console.error("Compression failed:", err);
      if (onUpdatePhoto) onUpdatePhoto(file);
    }
  };

  const shareImage = async () => {
    if (!cardRef.current) return;
    toast.info('Preparing for WhatsApp sharing...');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', onclone: html2canvasOklchOnClone });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `HCRS_ID_${member.name}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'HCRS Digital ID', text: `${member.name} - ${member.membershipId}` });
        } else {
          const link = document.createElement('a');
          link.download = `HCRS_ID_${member.name}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          toast.info('Sharing intent fallback triggered: Downloader booted.');
        }
      });
    } catch (error) { toast.error('Failed to encode membership card'); }
  };

  const downloadPDF = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('Building premium print-ready document...');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3.5, useCORS: true, backgroundColor: '#FFFFFF', onclone: html2canvasOklchOnClone });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 54, 86, undefined, 'FAST');
      pdf.save(`${member.name}_HCRS_Card.pdf`);
      toast.success('Successfully downloaded Premium PDF!', { id: loadingToast });
    } catch (error) { toast.error('Download failed. Please try again.', { id: loadingToast }); }
  };

  const districtName = DISTRICTS.find(d => d.code === member.district)?.name || member.district;

  const formatDate = (date: any) => {
    if (!date) return 'Processing...';
    try {
      if (date?.toDate) return date.toDate().toLocaleDateString('en-IN');
      if (date?.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-IN');
      const d = new Date(date);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('en-IN');
    } catch (e) {
      return '---';
    }
  };

  const isLifeMember = String(member.membership_type || '').toUpperCase().includes('LIFE') ||
    String(member.membershipType || '').toUpperCase().includes('LIFE');
  const isBanned = (member.status || '').toLowerCase() === 'banned' || (member.status || '').toLowerCase() === 'disabled';
  const isExpired = member.role !== 'admin' && member.role !== 'operator' && !member.isAdmin && member.status !== 'pending' && member.renewalPending !== true && !isLifeMember && (
    (() => {
      const exp = member.expiryDate || (() => {
        const reg = member.registrationDate;
        if (!reg) return null;
        const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
        if (isNaN(regD.getTime())) return null;
        const expD = new Date(regD);
        expD.setFullYear(expD.getFullYear() + 1);
        return expD;
      })();
      if (!exp) return true;
      const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
      return isNaN(d.getTime()) ? true : d.getTime() < Date.now();
    })()
  );

  const isPending = member.status === 'pending' || member.renewalPending === true;

  const getRenewalDate = (date: any) => {
    // If we have an explicit expiry date, use that!
    const exp = member.expiryDate;
    if (exp) {
      try {
        const d = exp?.toDate ? exp.toDate() : (exp?.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
        if (!isNaN(d.getTime())) {
          const isPast = d.getTime() < Date.now();
          return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
        }
      } catch (e) {
        // Fallback
      }
    }
    
    // Fallback if no expiry date on user profile
    if (!date) return '---';
    try {
      const d = date?.toDate ? date.toDate() : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date));
      if (isNaN(d.getTime())) return '---';
      d.setFullYear(d.getFullYear() + 1);
      const isPast = d.getTime() < Date.now();
      return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
    } catch (e) {
      return '---';
    }
  };

  const VERCEL_URL = 'https://hcrs-kappa.vercel.app';
  const baseUrl = typeof window !== 'undefined' && 
    !window.location.origin.includes('ais-dev') && 
    !window.location.origin.includes('ais-pre') && 
    !window.location.origin.includes('localhost') && 
    !window.location.origin.includes('127.0.0.1') && 
    !window.location.origin.includes('google.com')
      ? window.location.origin 
      : VERCEL_URL;

  // Public QR Generator API pointing to verification profile URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${baseUrl}/verify/${member.uid || 'guest'}`)}`;

  const cardDetails = [
    { label: 'Phone', value: member.mobile || 'N/A', icon: Phone },
    ...(member.renewalDate ? [
      { label: 'Join Date', value: formatDate(member.registrationDate), icon: Award },
      { label: 'Renewed', value: formatDate(member.renewalDate), icon: Calendar },
      { label: 'Expiry Date', value: getRenewalDate(member.registrationDate), icon: Clock }
    ] : [
      { label: 'Email', value: member.email || 'N/A', icon: Mail },
      { label: 'Join Date', value: formatDate(member.registrationDate), icon: Award },
      { label: 'Expiry Date', value: getRenewalDate(member.registrationDate), icon: Clock }
    ])
  ];

  return (
    <div 
      onClick={isScreenshotMode ? exitScreenshotMode : undefined}
      className={isScreenshotMode 
        ? "fixed inset-0 z-50 bg-[#0d1b3e] flex flex-col items-center justify-center p-4 overflow-auto cursor-pointer animate-in fade-in duration-300"
        : "flex flex-col items-center gap-8 p-1 sm:p-4 selection:bg-brand-blue/10 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto"
      }
    >
      {/* Subtle, floating top Exit Button */}
      {isScreenshotMode && (
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exitScreenshotMode();
            }}
            className="bg-black/60 hover:bg-black/80 text-white font-black text-xs px-4 py-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10 flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            ✕ EXIT SCREENSHOT
          </button>
        </div>
      )}

      {showCelebration && !isScreenshotMode && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-2 mt-2">
          <div className="bg-brand-blue/20 text-blue-200 px-5 py-1.5 rounded-full text-[11px] font-black border border-blue-400/30 inline-flex items-center gap-1.5 uppercase tracking-widest">
             <PartyPopper className="w-3.5 h-3.5 text-amber-300" /> Registered Member
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#ffd700] uppercase tracking-tighter leading-none italic mt-1 drop-shadow-[0_2px_12px_rgba(255,215,0,0.6)]">
            Welcome to highrich family
          </h2>
        </motion.div>
      )}

      {/* Screenshot Friendly Outer Backdrop Container - Enhanced with hyper-realistic Wooden Surface Mockup */}
      <div 
        ref={containerRef}
        style={{ minHeight: isScreenshotMode ? 'auto' : '630px' }}
        className={isScreenshotMode 
          ? "w-full max-w-sm sm:max-w-md bg-transparent p-1 border-0 flex flex-col items-center justify-center relative shrink-0 shadow-none animate-none"
          : "w-full bg-[#3c2517] p-2.5 sm:p-5 md:p-6 rounded-[32px] border-4 border-[#25150c] flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-2xl transition-all duration-300"
        }
      >
        {/* Deep luxurious wood background, planks and lighting highlight */}
        {!isScreenshotMode && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#4a3121] to-[#25150c] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.22] bg-[repeating-linear-gradient(0deg,#1c0d06_0px,#1c0d06_1px,transparent_1px,transparent_20px)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_45px,#000_45px,#000_46px)] pointer-events-none" />
            {/* Soft radial overlay mimicking high-end restaurant/gallery lamp spot */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />
            {/* Glossy varnish light streak reflection */}
            <div className="absolute -top-[30%] -left-[20%] w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.12] rotate-[22deg] pointer-events-none" />
          </>
        )}

        {/* Core Premium 3D PVC ID Card with Double Metallic Bevel Frame (Gold theme for Life Member, Slate theme for Adhoc Member) */}
        {(() => {
          const cardBorderClass = isLifeMember 
            ? "border-[6px] border-[#D4AF37] shadow-[12px_16px_36px_rgba(0,0,0,0.7)] bg-gradient-to-br from-[#FFFEF6] via-[#FAF4DB] to-[#F1E5C0]"
            : "border-[6px] border-[#818cf8]/50 shadow-[12px_16px_36px_rgba(0,0,0,0.45)] bg-gradient-to-br from-[#FAFBFD] via-[#F0F4F8] to-[#E2E8F0]";

          const itemPlateClass = `border-t border-b rounded-lg p-1.5 px-3 flex items-center justify-between transition-all ${
            isLifeMember 
              ? 'bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-[#9A7D0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_3px_rgba(0,0,0,0.4)] text-[#1a0f02]'
              : 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-350 shadow-[inset_0_1px_1px_white,0_2px_3px_rgba(0,0,0,0.22)] text-[#0f172a]'
          }`;

          const textTitleClass = `text-[10px] font-black uppercase tracking-wider ${
            isLifeMember ? 'text-amber-950 font-sans' : 'text-slate-900 dark:text-slate-950 font-sans'
          }`;

          const textValueClass = `text-[12px] font-black font-mono transition-all ${
            isLifeMember ? 'text-amber-950' : 'text-slate-950'
          }`;

          const qrPlateBg = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600 shadow-[inset_0_1px_1px_white,0_2px_3px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-300 shadow-[inset_0_1px_1px_white,0_2.5px_4px_rgba(0,0,0,0.4)]";

          const signaturePlateBg = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600 shadow-[inset_0_1px_1px_white,0_2.5px_4px_rgba(0,0,0,0.4)] text-[#1a0f02]"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-300 text-[#0f172a]";

          const logoRingClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-[#9A7D0A]"
            : "bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#cbd5e1] border-slate-350";

          const photoRingClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600"
            : "bg-gradient-to-b from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] border-slate-350";

          const namePlateClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-700"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-400";

          const bottomSectionBg = isLifeMember
            ? "bg-amber-950/[0.04] border-t border-amber-800/15"
            : "bg-slate-900/[0.04] border-t border-slate-350/50";

          return (
            <div 
              style={{ 
                width: `${340 * scale}px`, 
                height: `${610 * scale}px`, 
                position: 'relative'
              }}
              className="transition-all duration-150 shrink-0 select-none mx-auto flex items-center justify-center p-1"
            >
              <div 
                style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '340px',
                  height: '610px'
                }}
              >
                <div 
                  ref={cardRef} 
                  className={`w-[340px] h-[610px] rounded-[24px] text-slate-800 relative overflow-hidden font-sans flex flex-col justify-between shrink-0 select-none ${cardBorderClass}`}
                >
              {/* Top Premium Card Margin strip - Gold or Magenta */}
              <div className={`h-1.5 w-full absolute top-0 left-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${isLifeMember ? 'bg-gradient-to-r from-amber-300 via-[#D4AF37] to-amber-800' : 'bg-gradient-to-r from-[#FF1493] via-[#ec008c] to-[#990055]'}`} />

              {/* Expired/Banned Ribbon */}
              {(isExpired || isBanned) && (
                <div className="absolute top-[26px] -right-[38px] w-[130px] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-[8px] py-1 uppercase tracking-wider text-center rotate-45 z-40 shadow-[0_2px_5px_rgba(0,0,0,0.4)] border-y border-white/10 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="font-sans font-black drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)] text-white">
                    {isBanned ? '🚫 BANNED' : '⚠️ EXPIRED'}
                  </span>
                  <span className="text-[5px] mt-0.5 tracking-normal leading-none font-bold opacity-90 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]">
                    {isBanned ? 'റദ്ദാക്കി' : 'കാലാവധി കഴിഞ്ഞു'}
                  </span>
                </div>
              )}

              {/* Pending Approval Ribbon */}
              {isPending && !isBanned && !isExpired && (
                <div className="absolute top-[26px] -right-[38px] w-[130px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-900 font-extrabold text-[8px] py-1 uppercase tracking-wider text-center rotate-45 z-40 shadow-[0_2px_5px_rgba(0,0,0,0.4)] border-y border-white/20 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="font-sans font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] text-slate-950">
                    🕒 PENDING
                  </span>
                  <span className="text-[5.5px] mt-0.5 tracking-normal leading-none font-bold opacity-90 drop-shadow-[0_1px_1.5px_rgba(255,255,255,0.3)] text-slate-900">
                    അപ്പ്രൂവൽ പെൻഡിങ്
                  </span>
                </div>
              )}

              {/* Central Rubber Stamp Watermark for Security */}
              {isExpired && !isBanned && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] z-40 pointer-events-none select-none">
                  <div className="border-[4px] border-double border-red-600 p-2 px-4 rounded-xl flex flex-col items-center justify-center bg-white/20 backdrop-blur-[1px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] max-w-[220px]">
                    <span className="text-[13px] font-black tracking-[0.1em] text-red-600 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.3)] font-sans uppercase text-center leading-none">
                      YOU HAVE EXPIRED
                    </span>
                    <div className="w-full h-[1.5px] bg-red-600 my-1" />
                    <span className="text-[12px] font-extrabold text-red-600 tracking-tight text-center font-sans leading-none">
                      കാലാവധി കഴിഞ്ഞു
                    </span>
                  </div>
                </div>
              )}

              {isPending && !isBanned && !isExpired && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] z-40 pointer-events-none select-none">
                  <div className="border-[4px] border-double border-rose-600/90 p-2 px-4 rounded-xl flex flex-col items-center justify-center bg-white/20 backdrop-blur-[1px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] max-w-[220px]">
                    <span className="text-[13px] font-black tracking-[0.1em] text-rose-600/90 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.3)] font-sans uppercase text-center leading-none">
                      PENDING
                    </span>
                    <div className="w-full h-[1.5px] bg-rose-600/90 my-1" />
                    <span className="text-[12px] font-extrabold text-rose-600/90 tracking-tight text-center font-sans leading-none">
                      പെൻഡിങ്
                    </span>
                  </div>
                </div>
              )}

              {/* Header section with HCRS Logo Left + Metallic Embossed Panel Right */}
              <div className="p-3.5 pt-4 shrink-0 flex items-center justify-between gap-2.5 relative">
                {/* Circular Frame for official logo */}
                <div className={`p-1 rounded-full shadow-[inset_0_1.5px_2px_rgba(255,255,255,1),0_3px_6px_rgba(0,0,0,0.5)] w-[58px] h-[58px] flex items-center justify-center border shrink-0 ${logoRingClass}`}>
                  <div className="bg-white rounded-full p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={settings.logoUrl || "https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png"} 
                      alt="HCRS Official Logo" 
                      className="w-[46px] h-[46px] object-contain" 
                      crossOrigin="anonymous" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Premium Embossed Header Panel (Gold metallic for Life Member, Silver metallic for Official Member) */}
                <div className={`flex-1 py-1.5 px-2.5 rounded-xl border-t border-b shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2.5px_4px_rgba(0,0,0,0.35)] text-center ${isLifeMember ? 'bg-gradient-to-b from-[#FFFDF5] via-[#F7DC6F] to-[#B7950B] border-amber-600' : 'bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#cbd5e1] border-slate-300'}`}>
                  <h1 className="text-slate-900 text-[11px] font-black leading-tight uppercase tracking-tight">
                    HIGHRICH COMMUNITY REVIVAL SOCIETY
                  </h1>
                  <div className={`w-full h-[1px] my-0.5 ${isLifeMember ? 'bg-amber-800/35' : 'bg-slate-350'}`} />
                  <p className={`text-[8.5px] font-black tracking-widest uppercase leading-none italic ${isLifeMember ? 'text-amber-950 font-sans' : 'text-[#1a2b5c]'}`}>
                    {isLifeMember ? "LIFE MEMBER" : "OFFICIAL MEMBER"}
                  </p>
                </div>
              </div>

              {/* Profile and Name section with Ring Highlights & Metallic Plates */}
              <div className="flex flex-col items-center shrink-0 relative text-center">
                {/* Circular picture formatted inside heavy-beveled gold/silver ring */}
                <label className={`${isReadOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'} group block`}>
                  {!isReadOnly && <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />}
                  <div className={`w-[90px] h-[90px] rounded-full p-1 border shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform duration-300 ${photoRingClass}`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative border-4 border-white shadow-inner">
                      {previewUrl || member.photoUrl ? (
                        <>
                          <img src={previewUrl || member.photoUrl} alt="Photo" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          {!isReadOnly && (
                            <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                              <Camera size={14} className="text-white" />
                              <span className="text-[6px] font-black uppercase tracking-wider">Update</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 relative">
                           <User size={30} className="text-slate-400 shrink-0" />
                          {!isReadOnly && (
                            <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                              <Camera size={14} className="text-white" />
                              <span className="text-[6px] font-black uppercase tracking-wider">Add Photo</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {/* Member Name Embossed Plate */}
                <div className={`mt-2 w-[85%] mx-auto py-1 px-3 rounded-lg border-t border-b shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] ${namePlateClass}`}>
                  <h3 className="text-[13px] font-black text-slate-900 uppercase leading-none tracking-tight truncate max-w-[240px] mx-auto">
                    {member.name}
                  </h3>
                </div>

                 {/* Membership Category Ribbon block */}
                <div className="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                  {isLifeMember ? (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-550 to-amber-600 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg border border-amber-300">
                      👑 LIFE MEMBER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#1a2b5c] border border-slate-800 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
                      💼 OFFICIAL MEMBER
                    </span>
                  )}
                </div>

                {isPending && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[7.5px] font-black px-3 py-0.5 rounded border border-amber-300/50 animate-pulse uppercase tracking-wider shadow-[0_1.5px_3px_rgba(0,0,0,0.3)]">
                      ⚠️ APPROVAL PENDING / അപ്പ്രൂവൽ പെൻഡിങ്
                    </span>
                  </div>
                )}

                {/* District & Mandalam (Assembly Constituency is Mandalam) */}
                <p className={`text-[9px] font-black uppercase tracking-wider mt-1 font-sans ${isLifeMember ? 'text-amber-800' : 'text-slate-950'}`}>
                  {districtName} DISTRICT - {member.constituencyCode || (member.assemblyConstituency ? getAssemblyCode(member.assemblyConstituency) : 'NA')}
                </p>
              </div>

              {/* Member Details Columns Section styled as Stacked Premium Plates */}
              <div className="px-4 space-y-1 py-1 shrink-0">
                {/* 1. MEMBER ID */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>MEMBER ID</span>
                  <span className={textValueClass}>{member.membershipId || 'KL/HCRS/PENDING'}</span>
                </div>

                {/* 2. PHONE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>PHONE</span>
                  <span className={textValueClass}>{member.mobile || 'N/A'}</span>
                </div>

                {/* 3. EMAIL */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>EMAIL</span>
                  <span className={`${textValueClass} truncate max-w-[170px] text-right`}>{member.email || 'N/A'}</span>
                </div>

                {/* 4. JOIN DATE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>JOIN DATE</span>
                  <span className={textValueClass}>{formatDate(member.registrationDate)}</span>
                </div>

                {/* 5. EXPIRY DATE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>{isLifeMember ? 'VALIDITY' : 'EXPIRY DATE'}</span>
                  <span className={`${textValueClass} ${!isLifeMember ? 'text-[#1a2b5c]' : 'text-amber-900 font-extrabold'}`}>
                    {isLifeMember ? '⭐ PERMANENT / LIFETIME' : getRenewalDate(member.registrationDate)}
                  </span>
                </div>
              </div>

              {/* Bottom section with QR layout & verified signatures on Plates */}
              <div className={`pt-2 px-4 pb-[11px] shrink-0 flex items-center justify-between gap-2 relative ${bottomSectionBg}`}>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-blue via-transparent to-[#FF1493] z-10" />

                {/* Interactive Live Verification QR Code framed in embossed gold/silver plate */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 w-[74px] h-[78px] ${qrPlateBg}`}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Verification QR" 
                    className="w-[42px] h-[42px] object-contain" 
                    crossOrigin="anonymous" 
                  />
                  <span className={`text-[6.5px] font-black uppercase mt-1 tracking-wider text-center leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>SCAN TO VERIFY</span>
                </div>

                {/* Secretary Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[78px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[14px] font-black select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      Bineesh Kumar
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/50' : 'border-slate-400'}`} />
                  <p className={`text-[6.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>
                    Bineesh Kumar
                  </p>
                  <p className={`text-[5.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>SECRETARY</p>
                </div>

                {/* President Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[78px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[15px] font-black select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      M. A. Bari
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/50' : 'border-slate-400'}`} />
                  <p className={`text-[6.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>
                    M. A. Bari
                  </p>
                  <p className={`text-[5.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>PRESIDENT</p>
                </div>
              </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Fallback Long-Press Image Section (Shown when card PNG is successfully compiled) */}
      {/* Sleek Action Controls */}
      {!isScreenshotMode && (
        <div className="flex flex-col gap-4 w-full px-2 pb-24 shrink-0 transition-all font-sans">
          {(member.status === 'active' || member.isApproved || isAdmin) && (
            <div className="flex flex-col gap-3">
              {/* Visual Instructional Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-[20px] p-4 space-y-2 text-center shadow-xs">
                <div className="flex items-center justify-center gap-2 text-amber-800 font-black text-[12px] uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-brand-magenta animate-pulse" />
                  <span>കാർഡ് സംരക്ഷിക്കുന്ന വിധം</span>
                </div>
                <p className="text-[12px] font-extrabold text-slate-900 leading-relaxed font-sans">
                  താഴെയുള്ള ബട്ടൺ അമർത്തുമ്പോൾ കാർഡ് മാത്രം പൂർണ്ണ സ്ക്രീനിൽ പ്രദർശിപ്പിക്കും. പശ്ചാത്തലം സ്വയമേവ മറയും. തുടർന്ന് Screenshot എടുത്ത് കാർഡ് സംരക്ഷിക്കാം.
                </p>
              </div>

              {/* SINGLE SCREENSHOT MODE BUTTON */}
              <div className="grid grid-cols-1">
                <Button 
                  onClick={() => setIsScreenshotMode(true)}
                  className="w-full h-auto min-h-12 py-3 px-4 font-black rounded-xl text-[10.5px] sm:text-xs uppercase tracking-wider shadow-md bg-[#0054A6] hover:bg-[#004ca0] text-white flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95 border border-blue-500/10"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <Camera className="w-4 h-4 text-white shrink-0" />
                    <span>SCREENSHOT MODE</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-normal block text-blue-100/90 font-sans">
                    (കാർഡ് മാത്രം കാണിക്കുക)
                  </span>
                </Button>
              </div>
            </div>
          )}
          {onLogout && (
            <div className="pt-2 flex justify-center w-full">
              <Button 
                 variant="ghost" 
                 onClick={onLogout} 
                 className="font-bold text-[9px] uppercase tracking-widest text-red-500 hover:text-red-650 hover:bg-red-50/50 px-6 h-9 rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Minimal Bottom Guide */}
      {isScreenshotMode && (
        <p className="absolute bottom-6 text-center text-slate-400 text-[10.5px] font-bold tracking-wider uppercase select-none pointer-events-none opacity-85 px-4 font-sans">
          തെയ്യാറാണ്! സ്ക്രീൻഷോട്ട് എടുക്കുക • മടങ്ങാൻ എവിടെയെങ്കിലും തൊടുക
        </p>
      )}
    </div>
  );
}
