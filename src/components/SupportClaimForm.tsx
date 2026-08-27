import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { html2canvasOklchOnClone, triggerFileDownload } from '../lib/imageUtils';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  Clock, 
  IndianRupee,
  LayoutDashboard,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Users,
  User,
  Heart,
  Camera,
  Download,
  Sparkles,
  PartyPopper,
  Printer,
  Share2,
  FileText,
  Plus,
  ShieldCheck,
  MessageCircle,
  Edit3,
  Lock,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, runTransaction, setDoc } from 'firebase/firestore';
import { subscribeToOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import { printCourtComboReport, printCourtClaimReport, shareCourtComboPdf, downloadCourtComboPdf, getCourtComboHtml, getSingleCourtClaimHtml } from '../lib/claimPrint';
import { sendWAClaimMessage } from '../lib/whatsapp';

interface CategoryDetail {
  paid: number;
  received: number;
  pending: number;
  serialNo?: string;
}

export type FormLanguage = 'english' | 'malayalam' | 'bilingual';

function ClaimSerialGuide({ formLang = 'bilingual' }: { formLang?: FormLanguage }) {
  const isEn = formLang === 'english';
  const isMl = formLang === 'malayalam';

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-md space-y-3 relative overflow-hidden my-4 max-w-sm mx-auto">
      <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF1493]/10 rounded-full blur-xl pointer-events-none" />
      <div className="flex items-center gap-2">
        <Info className="w-4.5 h-4.5 text-[#FF1493] animate-pulse shrink-0" />
        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-200">
          {isEn
            ? 'Where is the Serial Number?'
            : isMl
            ? 'സീരിയൽ നമ്പർ എവിടെ കാണാം?'
            : 'സീരിയൽ നമ്പർ എവിടെ കാണാം? (Where is the Serial Number?)'}
        </h5>
      </div>
      <p className="text-[11px] font-extrabold text-slate-200 leading-relaxed text-left">
        {isEn
          ? 'Please enter the serial number from the top-right of your official physical claim form.'
          : isMl
          ? 'നിങ്ങൾ സമർപ്പിക്കുന്ന ഔദ്യോഗിക ക്ലെയിം ഫോമിലെ മുകളിൽ വലതു വശത്തുള്ള സീരിയൽ നമ്പർ താഴെ നൽകുക.'
          : 'നിങ്ങൾ സമർപ്പിക്കുന്ന ഔദ്യോഗിക ക്ലെയിം ഫോമിലെ മുകളിൽ വലതു വശത്തുള്ള സീരിയൽ നമ്പർ താഴെ നൽകുക. (Please enter the serial number from the top-right of your official claim form).'}
      </p>
      
      {/* Visual Mockup representation of the physical paper form */}
      <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-4 shadow-inner relative max-w-sm mx-auto font-sans leading-none text-left">
        {/* Ribbon/Seal mock */}
        <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-2.5 mb-2.5">
          <div>
            <p className="text-[8px] font-black tracking-tight text-slate-800 uppercase">HIGHRICH CONSIGNMENT CLAIM</p>
            <p className="text-[6px] text-slate-400 mt-0.5">FORM NO. 1 / ക്ലെയിം ഫോം</p>
          </div>
          {/* Highlighted Serial No block with pulse */}
          <div className="border border-dashed border-rose-500 bg-rose-50 px-2 py-1.5 rounded-lg text-right animate-pulse relative shrink-0">
            <span className="text-[6px] font-black text-rose-500 uppercase tracking-wider block">SERIAL NO / സീരിയൽ</span>
            <span className="text-xs font-black text-rose-600 block leading-tight font-mono">12345</span>
            {/* Soft pointer arrow */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[7px] px-1 py-0.5 rounded flex items-center shadow-md">
              {isEn ? 'Here!' : 'ഇതാണ്!'} <span className="ml-1 text-[8px]">➜</span>
            </div>
          </div>
        </div>
        
        {/* Mock form lines */}
        <div className="space-y-1.5 opacity-55">
          <div className="h-1.5 bg-slate-200 rounded w-[80%]" />
          <div className="h-1.5 bg-slate-200 rounded w-[95%]" />
          <div className="h-1.5 bg-slate-200 rounded w-[60%]" />
        </div>
      </div>
    </div>
  );
}

interface SupportClaimFormProps {
  user: any;
  onClose?: () => void;
  onBack?: () => void;
  onSubmitSuccess?: () => void;
}

const CATEGORIES_DEF = [
  { 
    id: 'digital', 
    en: 'Digital Redeem Coupon',
    ml: 'ഡിജിറ്റൽ റെഡീം കൂപ്പൺ',
    enHeading: 'Digital Redeem Coupon',
    mlHeading: 'ഡിജിറ്റൽ (Digital)', 
    subEn: 'Redeem Coupon',
    subMl: 'റെഡീം കൂപ്പൺ',
    headerColor: 'text-rose-600 font-extrabold'
  },
  { 
    id: 'ott', 
    en: 'OTT Consignment Advance',
    ml: 'OTT കോൺസൈമെന്റ് അഡ്വാൻസ്',
    enHeading: 'OTT Consignment Advance',
    mlHeading: 'ഓ ടി ടി (OTT)', 
    subEn: 'Consignment Advance',
    subMl: 'കോൺസൈമെന്റ് അഡ്വാൻസ്',
    headerColor: 'text-violet-600 font-extrabold'
  },
  { 
    id: 'other', 
    en: 'Other Consignment Advance',
    ml: 'മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്',
    enHeading: 'Other Consignment Advance',
    mlHeading: 'മറ്റുള്ളവ (Other)', 
    subEn: 'Consignment Advance',
    subMl: 'മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്',
    headerColor: 'text-slate-600 font-extrabold'
  }
];

const PREFERENCES_DEF = [
  { 
    id: 'settlement', 
    en: 'I prefer settlement and closure after receiving the balance amount.',
    ml: 'ബാക്കി തുക ലഭിച്ച ശേഷം സെറ്റിൽമെന്റും അക്കൗണ്ട് ക്ലോസ് ചെയ്യാനും ഞാൻ താല്പര്യപ്പെടുന്നു.',
    bilingual: 'ബാക്കി തുക ലഭിച്ച ശേഷം സെറ്റിൽമെന്റും അക്കൗണ്ട് ക്ലോസ് ചെയ്യാനും ഞാൻ താല്പര്യപ്പെടുന്നു. (I prefer settlement and closure after receiving the balance amount.)' 
  },
  { 
    id: 'wait', 
    en: 'I can wait if the company continues and grows, provided I receive one-fourth of the pending balance.',
    ml: 'കമ്പനി തുടർന്നു പ്രവർത്തിക്കുകയാണെങ്കിൽ, തരാനുള്ള ബാലൻസ് തുകയുടെ നാലിൽ ഒരു ഭാഗം ലഭിച്ചാൽ എനിക്ക് കാത്തിരിക്കാൻ സാധിക്കും.',
    bilingual: 'കമ്പനി തുടർന്നു പ്രവർത്തിക്കുകയാണെങ്കിൽ, തരാനുള്ള ബാലൻസ് തുകയുടെ നാലിൽ ഒരു ഭാഗം ലഭിച്ചാൽ എനിക്ക് കാത്തിരിക്കാൻ സാധിക്കും. (I can wait if the company continues and grows, provided I receive one-fourth of the pending balance.)' 
  },
  { 
    id: 'continue', 
    en: 'I am ready to continue with the company based on its business plan, future projects, and commitments.',
    ml: 'കമ്പനിയുടെ ബിസിനസ് പ്ലാനിൽ പറഞ്ഞതുപോലെ ഭാവി പ്ലാനുകൾക്കും പുതിയ പ്രൊജക്ടുകൾക്കും ഒപ്പം ചേർന്നും കമ്പനിയുമായി തുടർന്നു പോകാൻ ഞാൻ തയ്യാറാണ്.',
    bilingual: 'കമ്പനിയുടെ ബിസിനസ് പ്ലാനിൽ പറഞ്ഞതുപോലെ ഭാവി പ്ലാനുകൾക്കും പുതിയ പ്രൊജക്ടുകൾക്കും ഒപ്പം ചേർന്നും കമ്പനിയുമായി തുടർന്നു പോകാൻ ഞാൻ തയ്യാറാണ്. (I am ready to continue with the company based on its business plan, future projects, and commitments.)' 
  }
];

const HARDSHIPS_DEF = [
  { 
    id: 'bank', 
    en: 'Under bank loan seizure / revenue recovery pressure',
    ml: 'ബാങ്ക് ജപ്തി ഭീഷണി നേരിടുന്നു',
    bilingual: 'ബാങ്ക് ജപ്തി ഭീഷണി നേരിടുന്നു (Under bank seizure pressure)' 
  },
  { 
    id: 'crisis', 
    en: 'Serious financial crisis and distress',
    ml: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി',
    bilingual: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി (Serious financial crisis)' 
  },
  { 
    id: 'medical', 
    en: 'Medical emergency / ongoing critical treatment expenses',
    ml: 'ചികിത്സാ ആവശ്യങ്ങൾ / അത്യാഹിതങ്ങൾ',
    bilingual: 'ചികിത്സാ ആവശ്യങ്ങൾ / അത്യാഹിതങ്ങൾ (Medical emergency)' 
  },
  { 
    id: 'none', 
    en: 'No urgent emergency situation',
    ml: 'അടിയന്തിര പ്രാധാന്യമില്ല',
    bilingual: 'അടിയന്തിര പ്രാധാന്യമില്ല (No emergency)' 
  }
];

const themeStyles: Record<string, string> = {
  blue: 'bg-[#003366] text-white shadow-blue-900/20',
  navy: 'bg-slate-900 text-white shadow-slate-900/20',
  indigo: 'bg-indigo-700 text-white shadow-indigo-900/20',
  emerald: 'bg-emerald-700 text-white shadow-emerald-900/20',
  teal: 'bg-teal-700 text-white shadow-teal-900/20',
  amber: 'bg-amber-600 text-white shadow-amber-900/20',
  magenta: 'bg-brand-magenta text-white shadow-pink-900/20',
  purple: 'bg-purple-700 text-white shadow-purple-900/20',
  slate: 'bg-slate-700 text-white shadow-slate-900/20',
  rose: 'bg-rose-700 text-white shadow-rose-900/20',
};

// Reusable Form Column Box with vibrant colored button/pill header and clearly demarcated column borders
const FormFieldBox = ({
  label,
  badge,
  badgeType,
  required,
  optional,
  icon,
  theme = 'blue',
  className = '',
  children,
  hint,
  formLang = 'bilingual',
  error,
  id,
}: {
  label: string;
  badge?: string;
  badgeType?: string;
  required?: boolean;
  optional?: boolean;
  icon?: React.ReactNode;
  theme?: 'blue' | 'navy' | 'indigo' | 'emerald' | 'teal' | 'amber' | 'magenta' | 'purple' | 'slate' | 'rose';
  className?: string;
  children: React.ReactNode;
  hint?: string;
  formLang?: string;
  error?: string;
  id?: string;
}) => {
  return (
    <div 
      id={id}
      className={`group space-y-2 bg-slate-50/90 hover:bg-white border-2 ${
        error 
          ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-400/50 shadow-rose-200' 
          : 'border-slate-300 hover:border-indigo-400 focus-within:border-brand-blue focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-blue/10'
      } transition-all rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Colored Button/Pill Label */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide shadow-2xs ${error ? 'bg-rose-700 text-white' : (themeStyles[theme] || themeStyles.blue)}`}>
            {icon && <span className="text-xs shrink-0">{icon}</span>}
            <span className="leading-tight">{label}</span>
          </div>
          {required && (
            <span className={`text-[9px] font-black ${error ? 'text-white bg-rose-600 animate-pulse' : 'text-rose-700 bg-rose-100 border border-rose-200'} px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider`}>
              {formLang === 'english' ? 'Required *' : 'നിർബന്ധം *'}
            </span>
          )}
          {optional && (
            <span className="text-[9px] font-black text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
              {formLang === 'english' ? 'Optional' : 'ഓപ്ഷണൽ'}
            </span>
          )}
          {badge && !required && !optional && (
            <span className="text-[9px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
              {badge}
            </span>
          )}
        </div>
        {hint && (
          <p className="text-[10px] text-slate-500 font-semibold px-0.5 leading-tight">{hint}</p>
        )}
      </div>
      <div className="pt-0.5">{children}</div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-100/90 border border-rose-300 px-2.5 py-1.5 rounded-xl animate-in fade-in duration-200 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 animate-pulse" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Prominent Missing Fields Interactive Banner
const MissingFieldsBanner = ({ 
  missing, 
  title = "ശ്രദ്ധിക്കുക: ഫോമിൽ താഴെ പറയുന്ന നിർബന്ധ കോളങ്ങൾ വിട്ടുപോയിരിക്കുന്നു (Missing Required Fields)",
  onFocusField
}: { 
  missing: Array<{ id: string; key: string; label: string }>; 
  title?: string;
  onFocusField?: (id: string) => void;
}) => {
  if (missing.length === 0) return null;
  return (
    <div className="bg-gradient-to-br from-rose-50 via-red-50 to-amber-50 border-2 border-rose-500 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-2.5 text-rose-700">
        <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm animate-bounce">
          <AlertTriangle className="w-5 h-5 text-amber-200" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-rose-950">
            {title}
          </h4>
          <p className="text-[11px] font-bold text-rose-900 mt-0.5">
            ക്ലെയിം ഫോം വിജയകരമായി സമർപ്പിക്കാൻ താഴെ പറയുന്ന {missing.length} വിവരങ്ങൾ പൂരിപ്പിക്കുക (പൂരിപ്പിക്കാൻ ഓരോന്നിലും ക്ലിക്ക് ചെയ്യുക):
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {missing.map((item, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => {
              if (onFocusField) {
                onFocusField(item.id);
              } else {
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  const inp = el.querySelector('input, select, textarea') as HTMLElement;
                  if (inp) inp.focus();
                }
              }
            }}
            className="text-left bg-white/95 hover:bg-rose-100 border-2 border-rose-300 hover:border-rose-600 rounded-2xl p-2.5 text-xs font-black text-rose-900 flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center font-bold shrink-0 shadow-xs">
                {idx + 1}
              </span>
              <span className="truncate">{item.label}</span>
            </span>
            <span className="text-[10px] text-brand-blue font-extrabold uppercase shrink-0 bg-blue-50 px-2 py-0.5 rounded-lg group-hover:bg-brand-blue group-hover:text-white transition-colors">
              പൂരിപ്പിക്കുക ➔
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export function SupportClaimForm({ user, onClose, onBack }: SupportClaimFormProps) {
  const handleExitToDashboard = () => {
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    }
  };

  const [formLang, setFormLang] = useState<FormLanguage>('bilingual');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedClaims, setSubmittedClaims] = useState<any[]>([]);
  const [formMode, setFormMode] = useState<'statement' | 'fill'>('fill');
  const [selectedStatementIdx, setSelectedStatementIdx] = useState<number>(-1);
  const [newlyAssignedTokens, setNewlyAssignedTokens] = useState<Record<string, string>>({});
  
  // Validation error state tracking
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [missingFieldsSummary, setMissingFieldsSummary] = useState<Array<{ id: string; key: string; label: string }>>([]);

  const clearFieldError = (key: string) => {
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setMissingFieldsSummary(prev => prev.filter(item => item.key !== key));
  };

  const scrollToField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const inp = el.querySelector('input, select, textarea') as HTMLElement;
      if (inp) inp.focus();
    }
  };

  // Edit mode toggles for individual claimants (when true, reveals the form for editing)
  const [editingSelf, setEditingSelf] = useState(false);
  const [editingSpouse, setEditingSpouse] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [editingChild, setEditingChild] = useState(false);

  // 1. Claimant State - Self
  const [selfSelected, setSelfSelected] = useState(true);
  const [selfName, setSelfName] = useState(user?.name || '');
  const [selfHighrichId, setSelfHighrichId] = useState('');
  const [selfSponsorName, setSelfSponsorName] = useState(user?.sponsorName || '');
  const [selfSponsorMobile, setSelfSponsorMobile] = useState(user?.sponsorMobile || '');
  const [selfCategories, setSelfCategories] = useState<string[]>([]);
  const [selfOtherCategory, setSelfOtherCategory] = useState('');
  const [selfCategoryDetails, setSelfCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [selfNoBreakup, setSelfNoBreakup] = useState(false);
  const [selfTotalPaid, setSelfTotalPaid] = useState(0);
  const [selfTotalReceived, setSelfTotalReceived] = useState(0);
  const [selfTotalPending, setSelfTotalPending] = useState(0);
  const [selfNotes, setSelfNotes] = useState('');
  const [selfSerialNo, setSelfSerialNo] = useState('');

  // 2. Claimant State - Parent (Mother or Father)
  const [parentSelected, setParentSelected] = useState(false);
  const [parentRelation, setParentRelation] = useState<'Mother' | 'Father' | ''>('');
  const [parentName, setParentName] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [parentHighrichId, setParentHighrichId] = useState('');
  const [parentSponsorName, setParentSponsorName] = useState('');
  const [parentSponsorMobile, setParentSponsorMobile] = useState('');
  const [parentCategories, setParentCategories] = useState<string[]>([]);
  const [parentOtherCategory, setParentOtherCategory] = useState('');
  const [parentCategoryDetails, setParentCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [parentNoBreakup, setParentNoBreakup] = useState(false);
  const [parentTotalPaid, setParentTotalPaid] = useState(0);
  const [parentTotalReceived, setParentTotalReceived] = useState(0);
  const [parentTotalPending, setParentTotalPending] = useState(0);
  const [parentNotes, setParentNotes] = useState('');
  const [parentSerialNo, setParentSerialNo] = useState('');
  // Parent Bank & PAN & Address details
  const [parentPan, setParentPan] = useState('');
  const [parentAddress, setParentAddress] = useState((user as any)?.houseName || (user as any)?.house || user?.address || (user as any)?.residentialAddress || (user as any)?.userAddress || '');
  const [parentDistrict, setParentDistrict] = useState(user?.district || (user as any)?.userDistrict || '');
  const [parentConstituency, setParentConstituency] = useState(user?.assemblyConstituency || user?.constituency || (user as any)?.assembly || (user as any)?.mandalam || '');
  const [parentPostOffice, setParentPostOffice] = useState(user?.postOffice || (user as any)?.po || '');
  const [parentPincode, setParentPincode] = useState(user?.pincode || (user as any)?.pin || (user as any)?.postalCode || '');
  const [parentSettlementAccountHolder, setParentSettlementAccountHolder] = useState('');
  const [parentSettlementBankName, setParentSettlementBankName] = useState('');
  const [parentSettlementBranch, setParentSettlementBranch] = useState('');
  const [parentSettlementAccountNumber, setParentSettlementAccountNumber] = useState('');
  const [parentSettlementIfsc, setParentSettlementIfsc] = useState('');
  const [parentPaidFromAccount, setParentPaidFromAccount] = useState('');
  const [parentPaidFromBank, setParentPaidFromBank] = useState('');
  const [parentPaidFromBranch, setParentPaidFromBranch] = useState('');
  const [parentPaidFromIfsc, setParentPaidFromIfsc] = useState('');
  const [parentPaymentDate, setParentPaymentDate] = useState('');
  const [parentTransactionRef, setParentTransactionRef] = useState('');

  // 3. Claimant State - Child (Son or Daughter)
  const [childSelected, setChildSelected] = useState(false);
  const [childRelation, setChildRelation] = useState<'Son' | 'Daughter' | ''>('');
  const [childName, setChildName] = useState('');
  const [childMobile, setChildMobile] = useState('');
  const [childHighrichId, setChildHighrichId] = useState('');
  const [childSponsorName, setChildSponsorName] = useState('');
  const [childSponsorMobile, setChildSponsorMobile] = useState('');
  const [childCategories, setChildCategories] = useState<string[]>([]);
  const [childOtherCategory, setChildOtherCategory] = useState('');
  const [childCategoryDetails, setChildCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [childNoBreakup, setChildNoBreakup] = useState(false);
  const [childTotalPaid, setChildTotalPaid] = useState(0);
  const [childTotalReceived, setChildTotalReceived] = useState(0);
  const [childTotalPending, setChildTotalPending] = useState(0);
  const [childNotes, setChildNotes] = useState('');
  const [childSerialNo, setChildSerialNo] = useState('');
  // Child Bank & PAN & Address details
  const [childPan, setChildPan] = useState('');
  const [childAddress, setChildAddress] = useState((user as any)?.houseName || (user as any)?.house || user?.address || (user as any)?.residentialAddress || (user as any)?.userAddress || '');
  const [childDistrict, setChildDistrict] = useState(user?.district || (user as any)?.userDistrict || '');
  const [childConstituency, setChildConstituency] = useState(user?.assemblyConstituency || user?.constituency || (user as any)?.assembly || (user as any)?.mandalam || '');
  const [childPostOffice, setChildPostOffice] = useState(user?.postOffice || (user as any)?.po || '');
  const [childPincode, setChildPincode] = useState(user?.pincode || (user as any)?.pin || (user as any)?.postalCode || '');
  const [childSettlementAccountHolder, setChildSettlementAccountHolder] = useState('');
  const [childSettlementBankName, setChildSettlementBankName] = useState('');
  const [childSettlementBranch, setChildSettlementBranch] = useState('');
  const [childSettlementAccountNumber, setChildSettlementAccountNumber] = useState('');
  const [childSettlementIfsc, setChildSettlementIfsc] = useState('');
  const [childPaidFromAccount, setChildPaidFromAccount] = useState('');
  const [childPaidFromBank, setChildPaidFromBank] = useState('');
  const [childPaidFromBranch, setChildPaidFromBranch] = useState('');
  const [childPaidFromIfsc, setChildPaidFromIfsc] = useState('');
  const [childPaymentDate, setChildPaymentDate] = useState('');
  const [childTransactionRef, setChildTransactionRef] = useState('');

  // 4. Claimant State - Spouse (Wife or Husband)
  const [spouseSelected, setSpouseSelected] = useState(false);
  const [spouseRelation, setSpouseRelation] = useState<'Wife' | 'Husband' | ''>('');
  const [spouseName, setSpouseName] = useState('');
  const [spouseMobile, setSpouseMobile] = useState('');
  const [spouseHighrichId, setSpouseHighrichId] = useState('');
  const [spouseSponsorName, setSpouseSponsorName] = useState('');
  const [spouseSponsorMobile, setSpouseSponsorMobile] = useState('');
  const [spouseCategories, setSpouseCategories] = useState<string[]>([]);
  const [spouseOtherCategory, setSpouseOtherCategory] = useState('');
  const [spouseCategoryDetails, setSpouseCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [spouseNoBreakup, setSpouseNoBreakup] = useState(false);
  const [spouseTotalPaid, setSpouseTotalPaid] = useState(0);
  const [spouseTotalReceived, setSpouseTotalReceived] = useState(0);
  const [spouseTotalPending, setSpouseTotalPending] = useState(0);
  const [spouseNotes, setSpouseNotes] = useState('');
  const [spouseSerialNo, setSpouseSerialNo] = useState('');
  // Spouse Bank & PAN & Address details
  const [spousePan, setSpousePan] = useState('');
  const [spouseAddress, setSpouseAddress] = useState((user as any)?.houseName || (user as any)?.house || user?.address || (user as any)?.residentialAddress || (user as any)?.userAddress || '');
  const [spouseDistrict, setSpouseDistrict] = useState(user?.district || (user as any)?.userDistrict || '');
  const [spouseConstituency, setSpouseConstituency] = useState(user?.assemblyConstituency || user?.constituency || (user as any)?.assembly || (user as any)?.mandalam || '');
  const [spousePostOffice, setSpousePostOffice] = useState(user?.postOffice || (user as any)?.po || '');
  const [spousePincode, setSpousePincode] = useState(user?.pincode || (user as any)?.pin || (user as any)?.postalCode || '');
  const [spouseSettlementAccountHolder, setSpouseSettlementAccountHolder] = useState('');
  const [spouseSettlementBankName, setSpouseSettlementBankName] = useState('');
  const [spouseSettlementBranch, setSpouseSettlementBranch] = useState('');
  const [spouseSettlementAccountNumber, setSpouseSettlementAccountNumber] = useState('');
  const [spouseSettlementIfsc, setSpouseSettlementIfsc] = useState('');
  const [spousePaidFromAccount, setSpousePaidFromAccount] = useState('');
  const [spousePaidFromBank, setSpousePaidFromBank] = useState('');
  const [spousePaidFromBranch, setSpousePaidFromBranch] = useState('');
  const [spousePaidFromIfsc, setSpousePaidFromIfsc] = useState('');
  const [spousePaymentDate, setSpousePaymentDate] = useState('');
  const [spouseTransactionRef, setSpouseTransactionRef] = useState('');

  // General Questions
  const [futurePreference, setFuturePreference] = useState('');
  const [hardshipStatus, setHardshipStatus] = useState<string[]>([]);
  const [consentLegal, setConsentLegal] = useState(false);

  // Customer / Declarant Profile Inputs for Customer Settlement Form
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerMobile, setCustomerMobile] = useState(user?.mobile || '');
  const [customerAddress, setCustomerAddress] = useState((user as any)?.houseName || (user as any)?.house || user?.address || (user as any)?.residentialAddress || (user as any)?.userAddress || '');
  const [customerDistrict, setCustomerDistrict] = useState(user?.district || (user as any)?.userDistrict || '');
  const [customerConstituency, setCustomerConstituency] = useState(user?.assemblyConstituency || user?.constituency || (user as any)?.assembly || (user as any)?.mandalam || '');
  const [customerPostOffice, setCustomerPostOffice] = useState(user?.postOffice || (user as any)?.po || '');
  const [customerPincode, setCustomerPincode] = useState(user?.pincode || (user as any)?.pin || (user as any)?.postalCode || '');
  const [customerPan, setCustomerPan] = useState(user?.panNumber || (user as any)?.pan || '');

  // Auto-sync Main Member's Address changes into Family Members (Spouse, Parent, Child)
  const handleCustomerAddressChange = (val: string) => {
    const prevVal = customerAddress;
    setCustomerAddress(val);
    setSpouseAddress(prev => (!prev || prev === prevVal ? val : prev));
    setParentAddress(prev => (!prev || prev === prevVal ? val : prev));
    setChildAddress(prev => (!prev || prev === prevVal ? val : prev));
  };

  const handleCustomerDistrictChange = (val: string) => {
    const prevVal = customerDistrict;
    setCustomerDistrict(val);
    setSpouseDistrict(prev => (!prev || prev === prevVal ? val : prev));
    setParentDistrict(prev => (!prev || prev === prevVal ? val : prev));
    setChildDistrict(prev => (!prev || prev === prevVal ? val : prev));
  };

  const handleCustomerConstituencyChange = (val: string) => {
    const prevVal = customerConstituency;
    setCustomerConstituency(val);
    setSpouseConstituency(prev => (!prev || prev === prevVal ? val : prev));
    setParentConstituency(prev => (!prev || prev === prevVal ? val : prev));
    setChildConstituency(prev => (!prev || prev === prevVal ? val : prev));
  };

  const handleCustomerPostOfficeChange = (val: string) => {
    const prevVal = customerPostOffice;
    setCustomerPostOffice(val);
    setSpousePostOffice(prev => (!prev || prev === prevVal ? val : prev));
    setParentPostOffice(prev => (!prev || prev === prevVal ? val : prev));
    setChildPostOffice(prev => (!prev || prev === prevVal ? val : prev));
  };

  const handleCustomerPincodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    const prevVal = customerPincode;
    setCustomerPincode(cleaned);
    setSpousePincode(prev => (!prev || prev === prevVal ? cleaned : prev));
    setParentPincode(prev => (!prev || prev === prevVal ? cleaned : prev));
    setChildPincode(prev => (!prev || prev === prevVal ? cleaned : prev));
  };

  // Payment Particulars (തുക നൽകിയ വിവരങ്ങൾ)
  const [paymentDate, setPaymentDate] = useState(user?.paymentDate || '');
  const [transactionRef, setTransactionRef] = useState(user?.transactionId || user?.transactionRef || '');
  const [paidFromBank, setPaidFromBank] = useState(user?.paidFromBank || user?.bankName || '');
  const [paidFromBranch, setPaidFromBranch] = useState(user?.paidFromBranch || user?.branch || '');
  const [paidFromAccount, setPaidFromAccount] = useState(user?.paidFromAccount || user?.accountNumber || '');
  const [paidFromIfsc, setPaidFromIfsc] = useState(user?.paidFromIfsc || user?.ifscCode || '');

  // Balance Disbursement Bank Details (തുക ലഭിക്കേണ്ട ബാങ്ക് വിവരങ്ങൾ)
  const [settlementAccountHolder, setSettlementAccountHolder] = useState(user?.settlementAccountHolder || user?.name || '');
  const [settlementBankName, setSettlementBankName] = useState(user?.settlementBankName || user?.bankName || '');
  const [settlementBranch, setSettlementBranch] = useState(user?.settlementBranch || user?.branch || '');
  const [settlementAccountNumber, setSettlementAccountNumber] = useState(user?.settlementAccountNumber || user?.accountNumber || '');
  const [settlementIfsc, setSettlementIfsc] = useState(user?.settlementIfsc || user?.ifscCode || '');

  // Dynamic Translation helpers based on user-selected form language ('english' | 'malayalam' | 'bilingual')
  const t = (en: string, ml: string): string => {
    if (formLang === 'english') return en;
    if (formLang === 'malayalam') return ml;
    return `${ml} (${en})`;
  };

  const tLabel = (en: string, ml: string): string => {
    if (formLang === 'english') return en;
    if (formLang === 'malayalam') return ml;
    return `${ml} (${en})`;
  };

  const tPlaceholder = (en: string, ml: string): string => {
    if (formLang === 'english') return en;
    if (formLang === 'malayalam') return ml;
    return `${ml} / ${en}`;
  };

  const CATEGORIES = useMemo(() => {
    return CATEGORIES_DEF.map(cat => ({
      id: cat.id,
      label: formLang === 'english' ? cat.en : formLang === 'malayalam' ? cat.ml : `${cat.ml} (${cat.en})`,
      heading: formLang === 'english' ? cat.enHeading : formLang === 'malayalam' ? cat.mlHeading : `${cat.mlHeading} (${cat.enHeading})`,
      sub: formLang === 'english' ? cat.subEn : formLang === 'malayalam' ? cat.subMl : `${cat.subMl} (${cat.subEn})`,
      headerColor: cat.headerColor
    }));
  }, [formLang]);

  const PREFERENCES = useMemo(() => {
    return PREFERENCES_DEF.map(pref => ({
      id: pref.id,
      label: formLang === 'english' ? pref.en : formLang === 'malayalam' ? pref.ml : pref.bilingual
    }));
  }, [formLang]);

  const HARDSHIPS = useMemo(() => {
    return HARDSHIPS_DEF.map(hard => ({
      id: hard.id,
      label: formLang === 'english' ? hard.en : formLang === 'malayalam' ? hard.ml : hard.bilingual
    }));
  }, [formLang]);

  // Sync with user prop if values change
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.mobile && !customerMobile) setCustomerMobile(user.mobile);
      
      const uAddr = (user as any).houseName || (user as any).house || user.address || (user as any).residentialAddress || (user as any).userAddress || '';
      if (uAddr) {
        if (!customerAddress) setCustomerAddress(uAddr);
        if (!spouseAddress) setSpouseAddress(uAddr);
        if (!parentAddress) setParentAddress(uAddr);
        if (!childAddress) setChildAddress(uAddr);
      }
      
      const uDist = user.district || (user as any).userDistrict || '';
      if (uDist) {
        if (!customerDistrict) setCustomerDistrict(uDist);
        if (!spouseDistrict) setSpouseDistrict(uDist);
        if (!parentDistrict) setParentDistrict(uDist);
        if (!childDistrict) setChildDistrict(uDist);
      }
      
      const cConsti = user.assemblyConstituency || user.constituency || (user as any).assembly || (user as any).mandalam || '';
      if (cConsti) {
        if (!customerConstituency) setCustomerConstituency(cConsti);
        if (!spouseConstituency) setSpouseConstituency(cConsti);
        if (!parentConstituency) setParentConstituency(cConsti);
        if (!childConstituency) setChildConstituency(cConsti);
      }
      
      const uPO = user.postOffice || (user as any).po || '';
      if (uPO) {
        if (!customerPostOffice) setCustomerPostOffice(uPO);
        if (!spousePostOffice) setSpousePostOffice(uPO);
        if (!parentPostOffice) setParentPostOffice(uPO);
        if (!childPostOffice) setChildPostOffice(uPO);
      }
      
      const uPin = user.pincode || (user as any).pin || (user as any).postalCode || '';
      if (uPin) {
        if (!customerPincode) setCustomerPincode(uPin);
        if (!spousePincode) setSpousePincode(uPin);
        if (!parentPincode) setParentPincode(uPin);
        if (!childPincode) setChildPincode(uPin);
      }
      
      if (((user as any).panNumber || (user as any).pan) && !customerPan) setCustomerPan((user as any).panNumber || (user as any).pan);
      if (user.sponsorName && !selfSponsorName) {
        setSelfSponsorName(user.sponsorName);
        if (!spouseSponsorName) setSpouseSponsorName(user.sponsorName);
        if (!parentSponsorName) setParentSponsorName(user.sponsorName);
        if (!childSponsorName) setChildSponsorName(user.sponsorName);
      }
      if (user.sponsorMobile && !selfSponsorMobile) {
        const cln = user.sponsorMobile.replace(/\D/g, '').slice(0, 10);
        setSelfSponsorMobile(cln);
        if (!spouseSponsorMobile) setSpouseSponsorMobile(cln);
        if (!parentSponsorMobile) setParentSponsorMobile(cln);
        if (!childSponsorMobile) setChildSponsorMobile(cln);
      }
      if (user.highrichId && !selfHighrichId) {
        setSelfHighrichId(user.highrichId);
      }
      if (user.paymentDate && !paymentDate) setPaymentDate(user.paymentDate);
      if (((user as any).transactionId || (user as any).transactionRef) && !transactionRef) {
        setTransactionRef((user as any).transactionId || (user as any).transactionRef);
      }
      if (((user as any).paidFromBank || (user as any).bankName) && !paidFromBank) {
        setPaidFromBank((user as any).paidFromBank || (user as any).bankName);
      }
      if (((user as any).paidFromBranch || (user as any).branch) && !paidFromBranch) {
        setPaidFromBranch((user as any).paidFromBranch || (user as any).branch);
      }
      if (((user as any).paidFromAccount || (user as any).accountNumber) && !paidFromAccount) {
        setPaidFromAccount((user as any).paidFromAccount || (user as any).accountNumber);
      }
      if (((user as any).paidFromIfsc || (user as any).ifscCode) && !paidFromIfsc) {
        setPaidFromIfsc((user as any).paidFromIfsc || (user as any).ifscCode);
      }
      if (((user as any).settlementAccountHolder || user.name) && !settlementAccountHolder) {
        setSettlementAccountHolder((user as any).settlementAccountHolder || user.name);
      }
      if (((user as any).settlementBankName || (user as any).bankName) && !settlementBankName) {
        setSettlementBankName((user as any).settlementBankName || (user as any).bankName);
      }
      if (((user as any).settlementBranch || (user as any).branch) && !settlementBranch) {
        setSettlementBranch((user as any).settlementBranch || (user as any).branch);
      }
      if (((user as any).settlementAccountNumber || (user as any).accountNumber) && !settlementAccountNumber) {
        setSettlementAccountNumber((user as any).settlementAccountNumber || (user as any).accountNumber);
      }
      if (((user as any).settlementIfsc || (user as any).ifscCode) && !settlementIfsc) {
        setSettlementIfsc((user as any).settlementIfsc || (user as any).ifscCode);
      }
    }
  }, [user]);

  // Computed booleans for already submitted slots
  const hasSelf = useMemo(() => submittedClaims.some(c => c.relation === 'Self'), [submittedClaims]);
  const hasParent = useMemo(() => submittedClaims.some(c => ['Mother', 'Father'].includes(c.relation)), [submittedClaims]);
  const hasChild = useMemo(() => submittedClaims.some(c => ['Son', 'Daughter'].includes(c.relation)), [submittedClaims]);
  const hasSpouse = useMemo(() => submittedClaims.some(c => ['Wife', 'Husband'].includes(c.relation)), [submittedClaims]);

  // Exact claim document lookups
  const selfClaim = useMemo(() => submittedClaims.find(c => c.relation === 'Self'), [submittedClaims]);
  const spouseClaim = useMemo(() => submittedClaims.find(c => ['Wife', 'Husband'].includes(c.relation)), [submittedClaims]);
  const parentClaim = useMemo(() => submittedClaims.find(c => ['Mother', 'Father'].includes(c.relation)), [submittedClaims]);
  const childClaim = useMemo(() => submittedClaims.find(c => ['Son', 'Daughter'].includes(c.relation)), [submittedClaims]);

  // Active continuous auto-sync from Main Applicant to secondary forms (Spouse, Parent, Child)
  useEffect(() => {
    const mainAddr = customerAddress || (user as any)?.houseName || (user as any)?.house || user?.address || (user as any)?.residentialAddress || (user as any)?.userAddress || selfClaim?.userAddress || selfClaim?.address || selfClaim?.houseName || '';
    const mainDist = customerDistrict || user?.district || (user as any)?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
    const mainConsti = customerConstituency || user?.assemblyConstituency || user?.constituency || (user as any)?.assembly || (user as any)?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
    const mainPO = customerPostOffice || user?.postOffice || (user as any)?.po || selfClaim?.postOffice || '';
    const mainPin = customerPincode || user?.pincode || (user as any)?.pin || selfClaim?.pincode || '';

    if (mainAddr) {
      if (!spouseAddress) setSpouseAddress(mainAddr);
      if (!parentAddress) setParentAddress(mainAddr);
      if (!childAddress) setChildAddress(mainAddr);
    }
    if (mainDist) {
      if (!spouseDistrict) setSpouseDistrict(mainDist);
      if (!parentDistrict) setParentDistrict(mainDist);
      if (!childDistrict) setChildDistrict(mainDist);
    }
    if (mainConsti) {
      if (!spouseConstituency) setSpouseConstituency(mainConsti);
      if (!parentConstituency) setParentConstituency(mainConsti);
      if (!childConstituency) setChildConstituency(mainConsti);
    }
    if (mainPO) {
      if (!spousePostOffice) setSpousePostOffice(mainPO);
      if (!parentPostOffice) setParentPostOffice(mainPO);
      if (!childPostOffice) setChildPostOffice(mainPO);
    }
    if (mainPin) {
      if (!spousePincode) setSpousePincode(mainPin);
      if (!parentPincode) setParentPincode(mainPin);
      if (!childPincode) setChildPincode(mainPin);
    }
  }, [
    customerAddress,
    customerDistrict,
    customerConstituency,
    customerPostOffice,
    customerPincode,
    user,
    selfClaim,
    spouseAddress,
    parentAddress,
    childAddress,
    spouseDistrict,
    parentDistrict,
    childDistrict,
    spouseConstituency,
    parentConstituency,
    childConstituency,
    spousePostOffice,
    parentPostOffice,
    childPostOffice,
    spousePincode,
    parentPincode,
    childPincode
  ]);

  // Combined User object for live preview and A4 print rendering
  const combinedUserForPrint = useMemo(() => ({
    ...user,
    name: customerName || user?.name || '',
    mobile: customerMobile || user?.mobile || '',
    address: customerAddress || user?.address || '',
    district: customerDistrict || user?.district || '',
    assemblyConstituency: customerConstituency || user?.assemblyConstituency || user?.constituency || '',
    constituency: customerConstituency || user?.constituency || '',
    postOffice: customerPostOffice || user?.postOffice || '',
    pincode: customerPincode || user?.pincode || '',
    panNumber: customerPan || user?.panNumber || user?.pan || '',
    pan: customerPan || user?.panNumber || user?.pan || '',
    paymentDate: paymentDate || user?.paymentDate || '',
    transactionId: transactionRef || user?.transactionId || '',
    transactionRef: transactionRef || user?.transactionRef || '',
    paidFromBank: paidFromBank || user?.paidFromBank || user?.bankName || '',
    paidFromBranch: paidFromBranch || user?.paidFromBranch || user?.branch || '',
    paidFromAccount: paidFromAccount || user?.paidFromAccount || user?.accountNumber || '',
    paidFromIfsc: paidFromIfsc || user?.paidFromIfsc || user?.ifscCode || '',
    bankName: settlementBankName || user?.bankName || '',
    branch: settlementBranch || user?.branch || '',
    accountNumber: settlementAccountNumber || user?.accountNumber || '',
    ifscCode: settlementIfsc || user?.ifscCode || '',
    settlementBankName: settlementBankName || user?.settlementBankName || user?.bankName || '',
    settlementBranch: settlementBranch || user?.settlementBranch || user?.branch || '',
    settlementAccountNumber: settlementAccountNumber || user?.settlementAccountNumber || user?.accountNumber || '',
    settlementIfsc: settlementIfsc || user?.settlementIfsc || user?.ifscCode || '',
    settlementAccountHolder: settlementAccountHolder || customerName || user?.name || ''
  }), [
    user, customerName, customerMobile, customerAddress, customerDistrict, customerConstituency,
    customerPostOffice, customerPincode, customerPan, paymentDate, transactionRef, paidFromBank,
    paidFromBranch, paidFromAccount, paidFromIfsc, settlementAccountHolder,
    settlementBankName, settlementBranch, settlementAccountNumber, settlementIfsc
  ]);

  // Helper functions to populate form fields from existing claim records when editing
  const populateSelfFromClaim = (claim: any) => {
    if (!claim) return;
    if (claim.userName) {
      setSelfName(claim.userName);
      setCustomerName(claim.userName);
    }
    if (claim.userMobile || claim.memberMobile || claim.primaryMobile) {
      setCustomerMobile(claim.userMobile || claim.memberMobile || claim.primaryMobile);
    }
    if (claim.userAddress || claim.address) setCustomerAddress(claim.userAddress || claim.address);
    if (claim.userDistrict || claim.district) setCustomerDistrict(claim.userDistrict || claim.district);
    if (claim.userConstituency || claim.constituency) setCustomerConstituency(claim.userConstituency || claim.constituency);
    if (claim.postOffice) setCustomerPostOffice(claim.postOffice);
    if (claim.pincode) setCustomerPincode(claim.pincode);
    if (claim.highrichId) setSelfHighrichId(claim.highrichId);
    if (claim.sponsorName) setSelfSponsorName(claim.sponsorName);
    if (claim.sponsorMobile) setSelfSponsorMobile(claim.sponsorMobile);
    if (Array.isArray(claim.categories)) setSelfCategories(claim.categories);
    if (claim.otherCategory) setSelfOtherCategory(claim.otherCategory);
    if (claim.categoryDetails) setSelfCategoryDetails(claim.categoryDetails);
    if (claim.noBreakup !== undefined) setSelfNoBreakup(claim.noBreakup);
    if (claim.totalPaid !== undefined) setSelfTotalPaid(claim.totalPaid);
    if (claim.totalReceived !== undefined) setSelfTotalReceived(claim.totalReceived);
    if (claim.totalPending !== undefined) setSelfTotalPending(claim.totalPending);
    if (claim.notes) setSelfNotes(claim.notes);
    if (claim.panNumber) setCustomerPan(claim.panNumber);
    if (claim.settlementAccountNumber) setSettlementAccountNumber(claim.settlementAccountNumber);
    if (claim.settlementBankName) setSettlementBankName(claim.settlementBankName);
    if (claim.settlementBranch) setSettlementBranch(claim.settlementBranch);
    if (claim.settlementIfsc) setSettlementIfsc(claim.settlementIfsc);
    if (claim.settlementAccountHolder) setSettlementAccountHolder(claim.settlementAccountHolder);
    if (claim.paidFromAccount) setPaidFromAccount(claim.paidFromAccount);
    if (claim.paidFromBank) setPaidFromBank(claim.paidFromBank);
    if (claim.paidFromBranch) setPaidFromBranch(claim.paidFromBranch);
    if (claim.paidFromIfsc) setPaidFromIfsc(claim.paidFromIfsc);
    if (claim.paymentDate) setPaymentDate(claim.paymentDate);
    if (claim.transactionRef || claim.transactionId) setTransactionRef(claim.transactionRef || claim.transactionId);
    if (claim.futurePreference) setFuturePreference(claim.futurePreference);
    if (Array.isArray(claim.hardshipStatus)) setHardshipStatus(claim.hardshipStatus);
  };

  const populateSpouseFromClaim = (claim: any) => {
    if (!claim) return;
    if (claim.relation === 'Wife' || claim.relation === 'Husband') setSpouseRelation(claim.relation);
    if (claim.userName) setSpouseName(claim.userName);
    const spouseOwn = claim.individualMobile || claim.spouseMobile || (claim.memberMobile && claim.memberMobile !== claim.userMobile ? claim.memberMobile : '');
    setSpouseMobile(spouseOwn || '');
    if (claim.highrichId) setSpouseHighrichId(claim.highrichId);
    if (claim.sponsorName) setSpouseSponsorName(claim.sponsorName);
    if (claim.sponsorMobile) setSpouseSponsorMobile(claim.sponsorMobile);
    if (claim.userAddress || claim.address) setSpouseAddress(claim.userAddress || claim.address);
    if (claim.userDistrict || claim.district) setSpouseDistrict(claim.userDistrict || claim.district);
    if (claim.userConstituency || claim.constituency) setSpouseConstituency(claim.userConstituency || claim.constituency);
    if (claim.postOffice) setSpousePostOffice(claim.postOffice);
    if (claim.pincode) setSpousePincode(claim.pincode);
    if (Array.isArray(claim.categories)) setSpouseCategories(claim.categories);
    if (claim.otherCategory) setSpouseOtherCategory(claim.otherCategory);
    if (claim.categoryDetails) setSpouseCategoryDetails(claim.categoryDetails);
    if (claim.noBreakup !== undefined) setSpouseNoBreakup(claim.noBreakup);
    if (claim.totalPaid !== undefined) setSpouseTotalPaid(claim.totalPaid);
    if (claim.totalReceived !== undefined) setSpouseTotalReceived(claim.totalReceived);
    if (claim.totalPending !== undefined) setSpouseTotalPending(claim.totalPending);
    if (claim.notes) setSpouseNotes(claim.notes);
    if (claim.panNumber) setSpousePan(claim.panNumber);
    if (claim.settlementAccountNumber) setSpouseSettlementAccountNumber(claim.settlementAccountNumber);
    if (claim.settlementBankName) setSpouseSettlementBankName(claim.settlementBankName);
    if (claim.settlementBranch) setSpouseSettlementBranch(claim.settlementBranch);
    if (claim.settlementIfsc) setSpouseSettlementIfsc(claim.settlementIfsc);
    if (claim.settlementAccountHolder) setSpouseSettlementAccountHolder(claim.settlementAccountHolder);
    if (claim.paidFromAccount) setSpousePaidFromAccount(claim.paidFromAccount);
    if (claim.paidFromBank) setSpousePaidFromBank(claim.paidFromBank);
    if (claim.paidFromBranch) setSpousePaidFromBranch(claim.paidFromBranch);
    if (claim.paidFromIfsc) setSpousePaidFromIfsc(claim.paidFromIfsc);
    if (claim.paymentDate) setSpousePaymentDate(claim.paymentDate);
    if (claim.transactionRef || claim.transactionId) setSpouseTransactionRef(claim.transactionRef || claim.transactionId);
  };

  const populateParentFromClaim = (claim: any) => {
    if (!claim) return;
    if (claim.relation === 'Mother' || claim.relation === 'Father') setParentRelation(claim.relation);
    if (claim.userName) setParentName(claim.userName);
    const parentOwn = claim.individualMobile || claim.parentMobile || (claim.memberMobile && claim.memberMobile !== claim.userMobile ? claim.memberMobile : '');
    setParentMobile(parentOwn || '');
    if (claim.highrichId) setParentHighrichId(claim.highrichId);
    if (claim.sponsorName) setParentSponsorName(claim.sponsorName);
    if (claim.sponsorMobile) setParentSponsorMobile(claim.sponsorMobile);
    if (claim.userAddress || claim.address) setParentAddress(claim.userAddress || claim.address);
    if (claim.userDistrict || claim.district) setParentDistrict(claim.userDistrict || claim.district);
    if (claim.userConstituency || claim.constituency) setParentConstituency(claim.userConstituency || claim.constituency);
    if (claim.postOffice) setParentPostOffice(claim.postOffice);
    if (claim.pincode) setParentPincode(claim.pincode);
    if (Array.isArray(claim.categories)) setParentCategories(claim.categories);
    if (claim.otherCategory) setParentOtherCategory(claim.otherCategory);
    if (claim.categoryDetails) setParentCategoryDetails(claim.categoryDetails);
    if (claim.noBreakup !== undefined) setParentNoBreakup(claim.noBreakup);
    if (claim.totalPaid !== undefined) setParentTotalPaid(claim.totalPaid);
    if (claim.totalReceived !== undefined) setParentTotalReceived(claim.totalReceived);
    if (claim.totalPending !== undefined) setParentTotalPending(claim.totalPending);
    if (claim.notes) setParentNotes(claim.notes);
    if (claim.panNumber) setParentPan(claim.panNumber);
    if (claim.settlementAccountNumber) setParentSettlementAccountNumber(claim.settlementAccountNumber);
    if (claim.settlementBankName) setParentSettlementBankName(claim.settlementBankName);
    if (claim.settlementBranch) setParentSettlementBranch(claim.settlementBranch);
    if (claim.settlementIfsc) setParentSettlementIfsc(claim.settlementIfsc);
    if (claim.settlementAccountHolder) setParentSettlementAccountHolder(claim.settlementAccountHolder);
    if (claim.paidFromAccount) setParentPaidFromAccount(claim.paidFromAccount);
    if (claim.paidFromBank) setParentPaidFromBank(claim.paidFromBank);
    if (claim.paidFromBranch) setParentPaidFromBranch(claim.paidFromBranch);
    if (claim.paidFromIfsc) setParentPaidFromIfsc(claim.paidFromIfsc);
    if (claim.paymentDate) setParentPaymentDate(claim.paymentDate);
    if (claim.transactionRef || claim.transactionId) setParentTransactionRef(claim.transactionRef || claim.transactionId);
  };

  const populateChildFromClaim = (claim: any) => {
    if (!claim) return;
    if (claim.relation === 'Son' || claim.relation === 'Daughter') setChildRelation(claim.relation);
    if (claim.userName) setChildName(claim.userName);
    const childOwn = claim.individualMobile || claim.childMobile || (claim.memberMobile && claim.memberMobile !== claim.userMobile ? claim.memberMobile : '');
    setChildMobile(childOwn || '');
    if (claim.highrichId) setChildHighrichId(claim.highrichId);
    if (claim.sponsorName) setChildSponsorName(claim.sponsorName);
    if (claim.sponsorMobile) setChildSponsorMobile(claim.sponsorMobile);
    if (claim.userAddress || claim.address) setChildAddress(claim.userAddress || claim.address);
    if (claim.userDistrict || claim.district) setChildDistrict(claim.userDistrict || claim.district);
    if (claim.userConstituency || claim.constituency) setChildConstituency(claim.userConstituency || claim.constituency);
    if (claim.postOffice) setChildPostOffice(claim.postOffice);
    if (claim.pincode) setChildPincode(claim.pincode);
    if (Array.isArray(claim.categories)) setChildCategories(claim.categories);
    if (claim.otherCategory) setChildOtherCategory(claim.otherCategory);
    if (claim.categoryDetails) setChildCategoryDetails(claim.categoryDetails);
    if (claim.noBreakup !== undefined) setChildNoBreakup(claim.noBreakup);
    if (claim.totalPaid !== undefined) setChildTotalPaid(claim.totalPaid);
    if (claim.totalReceived !== undefined) setChildTotalReceived(claim.totalReceived);
    if (claim.totalPending !== undefined) setChildTotalPending(claim.totalPending);
    if (claim.notes) setChildNotes(claim.notes);
    if (claim.panNumber) setChildPan(claim.panNumber);
    if (claim.settlementAccountNumber) setChildSettlementAccountNumber(claim.settlementAccountNumber);
    if (claim.settlementBankName) setChildSettlementBankName(claim.settlementBankName);
    if (claim.settlementBranch) setChildSettlementBranch(claim.settlementBranch);
    if (claim.settlementIfsc) setChildSettlementIfsc(claim.settlementIfsc);
    if (claim.settlementAccountHolder) setChildSettlementAccountHolder(claim.settlementAccountHolder);
    if (claim.paidFromAccount) setChildPaidFromAccount(claim.paidFromAccount);
    if (claim.paidFromBank) setChildPaidFromBank(claim.paidFromBank);
    if (claim.paidFromBranch) setChildPaidFromBranch(claim.paidFromBranch);
    if (claim.paidFromIfsc) setChildPaidFromIfsc(claim.paidFromIfsc);
    if (claim.paymentDate) setChildPaymentDate(claim.paymentDate);
    if (claim.transactionRef || claim.transactionId) setChildTransactionRef(claim.transactionRef || claim.transactionId);
  };

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsub();
  }, []);

  // Fetch existing claims for this user to check submission status
  const checkExistingClaims = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const rawMobile = String(user.mobile || '').replace(/\D/g, '');
      const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
      const offlineUid = cleanMobile ? `offline_${cleanMobile}` : '';
      const activeUid = user.uid || '';

      // Prepare our parallel query promises
      const queryPromises = [];
      const claimsMap = new Map<string, any>();

      // 1. Query by active UID
      if (activeUid) {
        queryPromises.push(
          getDocs(query(collection(db, 'claims'), where('uid', '==', activeUid)))
            .catch(err => {
              console.warn("checkExistingClaims activeUid query notice:", err);
              return null;
            })
        );
      }

      // 2. Query by offline UID
      if (offlineUid) {
        queryPromises.push(
          getDocs(query(collection(db, 'claims'), where('uid', '==', offlineUid)))
            .catch(err => {
              console.warn("checkExistingClaims offlineUid query notice:", err);
              return null;
            })
        );
      }

      // 3. Query by userMobile (string)
      if (cleanMobile) {
        queryPromises.push(
          getDocs(query(collection(db, 'claims'), where('userMobile', '==', cleanMobile)))
            .catch(err => {
              console.warn("checkExistingClaims cleanMobile query notice:", err);
              return null;
            })
        );
      }

      // 4. Query by userMobile (numeric)
      const numericMobile = Number(cleanMobile);
      if (cleanMobile && !isNaN(numericMobile)) {
        queryPromises.push(
          getDocs(query(collection(db, 'claims'), where('userMobile', '==', numericMobile)))
            .catch(err => {
              console.warn("checkExistingClaims numericMobile query notice:", err);
              return null;
            })
        );
      }

      // Execute all queries in parallel for high speed and robustness
      const snaps = await Promise.all(queryPromises);
      
      // Collate and deduplicate docs
      for (const snap of snaps) {
        if (snap && !snap.empty) {
          snap.docs.forEach(docSnap => {
            claimsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          });
        }
      }

      let docsList = Array.from(claimsMap.values());

      // --- DYNAMIC CLAIM UID AUTO-HEALING ---
      // If they logged in and are active, heal claims registered with 'offline_' prefix
      if (activeUid && !activeUid.startsWith('offline_') && docsList.length > 0) {
        for (const claim of docsList) {
          if (claim.uid !== activeUid) {
            console.log(`Auto-healing offline claim ID "${claim.id}" UID: ${claim.uid} -> ${activeUid}`);
            try {
              await updateDoc(doc(db, 'claims', claim.id), {
                uid: activeUid,
                userMobile: cleanMobile || claim.userMobile || ''
              });
              // Update local memory reference
              claim.uid = activeUid;
              if (cleanMobile) claim.userMobile = cleanMobile;
            } catch (err) {
              console.warn("Failed to background auto-heal claim UID:", err);
            }
          }
        }
      }

      if (docsList.length > 0) {
        setSubmittedClaims(docsList);
        
        const hasSelfDb = docsList.some(c => c.relation === 'Self');
        const hasParentDb = docsList.some(c => ['Mother', 'Father'].includes(c.relation));
        const hasChildDb = docsList.some(c => ['Son', 'Daughter'].includes(c.relation));
        const hasSpouseDb = docsList.some(c => ['Wife', 'Husband'].includes(c.relation));
        
        // Auto-extract address and key profile fields from existing Self claim
        const dbSelfClaim = docsList.find(c => c.relation === 'Self');
        if (dbSelfClaim) {
          const selfAddr = dbSelfClaim.userAddress || dbSelfClaim.address || '';
          const selfDist = dbSelfClaim.userDistrict || dbSelfClaim.district || '';
          const selfConsti = dbSelfClaim.userConstituency || dbSelfClaim.constituency || dbSelfClaim.assemblyConstituency || '';
          const selfPO = dbSelfClaim.postOffice || '';
          const selfPin = dbSelfClaim.pincode || '';
          const selfPanNo = dbSelfClaim.panNumber || '';
          const selfSponsName = dbSelfClaim.sponsorName || '';
          const selfSponsMob = dbSelfClaim.sponsorMobile || '';

          if (selfAddr) {
            setCustomerAddress(prev => prev || selfAddr);
            setSpouseAddress(prev => prev || selfAddr);
            setParentAddress(prev => prev || selfAddr);
            setChildAddress(prev => prev || selfAddr);
          }
          if (selfDist) {
            setCustomerDistrict(prev => prev || selfDist);
            setSpouseDistrict(prev => prev || selfDist);
            setParentDistrict(prev => prev || selfDist);
            setChildDistrict(prev => prev || selfDist);
          }
          if (selfConsti) {
            setCustomerConstituency(prev => prev || selfConsti);
            setSpouseConstituency(prev => prev || selfConsti);
            setParentConstituency(prev => prev || selfConsti);
            setChildConstituency(prev => prev || selfConsti);
          }
          if (selfPO) {
            setCustomerPostOffice(prev => prev || selfPO);
            setSpousePostOffice(prev => prev || selfPO);
            setParentPostOffice(prev => prev || selfPO);
            setChildPostOffice(prev => prev || selfPO);
          }
          if (selfPin) {
            setCustomerPincode(prev => prev || selfPin);
            setSpousePincode(prev => prev || selfPin);
            setParentPincode(prev => prev || selfPin);
            setChildPincode(prev => prev || selfPin);
          }
          if (selfPanNo) setCustomerPan(prev => prev || selfPanNo);
          if (selfSponsName) {
            setSelfSponsorName(prev => prev || selfSponsName);
            setSpouseSponsorName(prev => prev || selfSponsName);
            setParentSponsorName(prev => prev || selfSponsName);
            setChildSponsorName(prev => prev || selfSponsName);
          }
          if (selfSponsMob) {
            setSelfSponsorMobile(prev => prev || selfSponsMob);
            setSpouseSponsorMobile(prev => prev || selfSponsMob);
            setParentSponsorMobile(prev => prev || selfSponsMob);
            setChildSponsorMobile(prev => prev || selfSponsMob);
          }
          if (dbSelfClaim.userName) {
            setCustomerName(prev => prev || dbSelfClaim.userName);
            setSelfName(prev => prev || dbSelfClaim.userName);
          }
          if (dbSelfClaim.userMobile || dbSelfClaim.memberMobile) {
            setCustomerMobile(prev => prev || dbSelfClaim.userMobile || dbSelfClaim.memberMobile);
          }
        }

        const anyClaimWithPref = docsList.find(c => c.futurePreference);
        if (anyClaimWithPref?.futurePreference) {
          setFuturePreference(prev => prev || anyClaimWithPref.futurePreference);
        }
        const anyClaimWithHardship = docsList.find(c => Array.isArray(c.hardshipStatus) && c.hardshipStatus.length > 0);
        if (anyClaimWithHardship?.hardshipStatus) {
          setHardshipStatus(prev => prev.length === 0 ? anyClaimWithHardship.hardshipStatus : prev);
        }

        if (hasSelfDb && hasParentDb && hasChildDb && hasSpouseDb) {
          setAlreadySubmitted(true);
        } else {
          setAlreadySubmitted(false);
          
          // Uncheck submitted categories to prevent duplicate actions
          setSelfSelected(!hasSelfDb);
          setParentSelected(false);
          setChildSelected(false);
          setSpouseSelected(false);
        }
      } else {
        setSubmittedClaims([]);
        setAlreadySubmitted(false);
        setSelfSelected(true);
        setParentSelected(false);
        setChildSelected(false);
        setSpouseSelected(false);
      }
    } catch (err: any) {
      console.warn("Status check notice: Database query error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkExistingClaims();
  }, [user]);

  // Recalculate Totals - Self
  useEffect(() => {
    if (selfNoBreakup) return;
    let paid = 0;
    let rec = 0;
    selfCategories.forEach(cat => {
      const detail = selfCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setSelfTotalPaid(paid);
    setSelfTotalReceived(rec);
    setSelfTotalPending(paid - rec);
  }, [selfCategoryDetails, selfCategories, selfNoBreakup]);

  // Recalculate Totals - Parent
  useEffect(() => {
    if (parentNoBreakup) return;
    let paid = 0;
    let rec = 0;
    parentCategories.forEach(cat => {
      const detail = parentCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setParentTotalPaid(paid);
    setParentTotalReceived(rec);
    setParentTotalPending(paid - rec);
  }, [parentCategoryDetails, parentCategories, parentNoBreakup]);

  // Recalculate Totals - Child
  useEffect(() => {
    if (childNoBreakup) return;
    let paid = 0;
    let rec = 0;
    childCategories.forEach(cat => {
      const detail = childCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setChildTotalPaid(paid);
    setChildTotalReceived(rec);
    setChildTotalPending(paid - rec);
  }, [childCategoryDetails, childCategories, childNoBreakup]);

  // Recalculate Totals - Spouse
  useEffect(() => {
    if (spouseNoBreakup) return;
    let paid = 0;
    let rec = 0;
    spouseCategories.forEach(cat => {
      const detail = spouseCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setSpouseTotalPaid(paid);
    setSpouseTotalReceived(rec);
    setSpouseTotalPending(paid - rec);
  }, [spouseCategoryDetails, spouseCategories, spouseNoBreakup]);

  // Helper State Handlers
  const handleCategoryDetailChange = (
    claimant: 'self' | 'parent' | 'child' | 'spouse',
    catId: string,
    field: 'paid' | 'received' | 'serialNo',
    value: string
  ) => {
    const setter = claimant === 'self' ? setSelfCategoryDetails 
                 : claimant === 'parent' ? setParentCategoryDetails 
                 : claimant === 'child' ? setChildCategoryDetails
                 : setSpouseCategoryDetails;
    
    setter(prev => {
      const current = prev[catId] || { paid: 0, received: 0, pending: 0, serialNo: '' };
      let updated;
      if (field === 'serialNo') {
        updated = { ...current, [field]: value };
      } else {
        const numVal = parseFloat(value) || 0;
        updated = { ...current, [field]: numVal };
        updated.pending = updated.paid - updated.received;
      }
      return { ...prev, [catId]: updated };
    });
  };

  const handleTotalChange = (
    claimant: 'self' | 'parent' | 'child' | 'spouse',
    field: 'paid' | 'received',
    value: string
  ) => {
    const numVal = parseFloat(value) || 0;
    if (claimant === 'self') {
      if (field === 'paid') {
        setSelfTotalPaid(numVal);
        setSelfTotalPending(numVal - selfTotalReceived);
      } else {
        setSelfTotalReceived(numVal);
        setSelfTotalPending(selfTotalPaid - numVal);
      }
    } else if (claimant === 'parent') {
      if (field === 'paid') {
        setParentTotalPaid(numVal);
        setParentTotalPending(numVal - parentTotalReceived);
      } else {
        setParentTotalReceived(numVal);
        setParentTotalPending(parentTotalPaid - numVal);
      }
    } else if (claimant === 'child') {
      if (field === 'paid') {
        setChildTotalPaid(numVal);
        setChildTotalPending(numVal - childTotalReceived);
      } else {
        setChildTotalReceived(numVal);
        setChildTotalPending(childTotalPaid - numVal);
      }
    } else {
      if (field === 'paid') {
        setSpouseTotalPaid(numVal);
        setSpouseTotalPending(numVal - spouseTotalReceived);
      } else {
        setSpouseTotalReceived(numVal);
        setSpouseTotalPending(spouseTotalPaid - numVal);
      }
    }
  };

  // Effective claimant summaries (handles both database-submitted claims and active form inputs)
  const effectiveSelfTotals = useMemo(() => {
    if (hasSelf && !editingSelf && selfClaim) {
      const paid = Number(selfClaim.totalPaid) || 0;
      const rec = Number(selfClaim.totalReceived) || 0;
      const pending = Number(selfClaim.totalPending !== undefined ? selfClaim.totalPending : (paid - rec)) || 0;
      return { 
        active: true, 
        isSubmitted: true,
        paid, 
        rec, 
        pending, 
        name: selfClaim.userName || selfName || user?.name || 'Self', 
        relation: 'Self' 
      };
    }
    if (selfSelected || editingSelf) {
      return { 
        active: true, 
        isSubmitted: false,
        paid: selfTotalPaid, 
        rec: selfTotalReceived, 
        pending: selfTotalPending, 
        name: selfName || customerName || user?.name || 'Self', 
        relation: 'Self' 
      };
    }
    return { active: false, isSubmitted: false, paid: 0, rec: 0, pending: 0, name: '', relation: 'Self' };
  }, [hasSelf, editingSelf, selfClaim, selfSelected, selfTotalPaid, selfTotalReceived, selfTotalPending, selfName, customerName, user]);

  const effectiveSpouseTotals = useMemo(() => {
    if (hasSpouse && !editingSpouse && spouseClaim) {
      const paid = Number(spouseClaim.totalPaid) || 0;
      const rec = Number(spouseClaim.totalReceived) || 0;
      const pending = Number(spouseClaim.totalPending !== undefined ? spouseClaim.totalPending : (paid - rec)) || 0;
      return { 
        active: true, 
        isSubmitted: true,
        paid, 
        rec, 
        pending, 
        name: spouseClaim.userName || spouseName || 'Spouse', 
        relation: spouseClaim.relation || spouseRelation || 'Spouse' 
      };
    }
    if (spouseSelected || editingSpouse) {
      return { 
        active: true, 
        isSubmitted: false,
        paid: spouseTotalPaid, 
        rec: spouseTotalReceived, 
        pending: spouseTotalPending, 
        name: spouseName || 'Spouse', 
        relation: spouseRelation || 'Spouse' 
      };
    }
    return { active: false, isSubmitted: false, paid: 0, rec: 0, pending: 0, name: '', relation: 'Spouse' };
  }, [hasSpouse, editingSpouse, spouseClaim, spouseSelected, spouseTotalPaid, spouseTotalReceived, spouseTotalPending, spouseName, spouseRelation]);

  const effectiveParentTotals = useMemo(() => {
    if (hasParent && !editingParent && parentClaim) {
      const paid = Number(parentClaim.totalPaid) || 0;
      const rec = Number(parentClaim.totalReceived) || 0;
      const pending = Number(parentClaim.totalPending !== undefined ? parentClaim.totalPending : (paid - rec)) || 0;
      return { 
        active: true, 
        isSubmitted: true,
        paid, 
        rec, 
        pending, 
        name: parentClaim.userName || parentName || 'Parent', 
        relation: parentClaim.relation || parentRelation || 'Parent' 
      };
    }
    if (parentSelected || editingParent) {
      return { 
        active: true, 
        isSubmitted: false,
        paid: parentTotalPaid, 
        rec: parentTotalReceived, 
        pending: parentTotalPending, 
        name: parentName || 'Parent', 
        relation: parentRelation || 'Parent' 
      };
    }
    return { active: false, isSubmitted: false, paid: 0, rec: 0, pending: 0, name: '', relation: 'Parent' };
  }, [hasParent, editingParent, parentClaim, parentSelected, parentTotalPaid, parentTotalReceived, parentTotalPending, parentName, parentRelation]);

  const effectiveChildTotals = useMemo(() => {
    if (hasChild && !editingChild && childClaim) {
      const paid = Number(childClaim.totalPaid) || 0;
      const rec = Number(childClaim.totalReceived) || 0;
      const pending = Number(childClaim.totalPending !== undefined ? childClaim.totalPending : (paid - rec)) || 0;
      return { 
        active: true, 
        isSubmitted: true,
        paid, 
        rec, 
        pending, 
        name: childClaim.userName || childName || 'Child', 
        relation: childClaim.relation || childRelation || 'Child' 
      };
    }
    if (childSelected || editingChild) {
      return { 
        active: true, 
        isSubmitted: false,
        paid: childTotalPaid, 
        rec: childTotalReceived, 
        pending: childTotalPending, 
        name: childName || 'Child', 
        relation: childRelation || 'Child' 
      };
    }
    return { active: false, isSubmitted: false, paid: 0, rec: 0, pending: 0, name: '', relation: 'Child' };
  }, [hasChild, editingChild, childClaim, childSelected, childTotalPaid, childTotalReceived, childTotalPending, childName, childRelation]);

  // Combined Totals for visual feedback
  const combinedTotalPaid = useMemo(() => {
    return (effectiveSelfTotals.active ? effectiveSelfTotals.paid : 0) +
           (effectiveSpouseTotals.active ? effectiveSpouseTotals.paid : 0) +
           (effectiveParentTotals.active ? effectiveParentTotals.paid : 0) +
           (effectiveChildTotals.active ? effectiveChildTotals.paid : 0);
  }, [effectiveSelfTotals, effectiveSpouseTotals, effectiveParentTotals, effectiveChildTotals]);

  const combinedTotalReceived = useMemo(() => {
    return (effectiveSelfTotals.active ? effectiveSelfTotals.rec : 0) +
           (effectiveSpouseTotals.active ? effectiveSpouseTotals.rec : 0) +
           (effectiveParentTotals.active ? effectiveParentTotals.rec : 0) +
           (effectiveChildTotals.active ? effectiveChildTotals.rec : 0);
  }, [effectiveSelfTotals, effectiveSpouseTotals, effectiveParentTotals, effectiveChildTotals]);

  const combinedTotalPending = useMemo(() => {
    return (effectiveSelfTotals.active ? effectiveSelfTotals.pending : 0) +
           (effectiveSpouseTotals.active ? effectiveSpouseTotals.pending : 0) +
           (effectiveParentTotals.active ? effectiveParentTotals.pending : 0) +
           (effectiveChildTotals.active ? effectiveChildTotals.pending : 0);
  }, [effectiveSelfTotals, effectiveSpouseTotals, effectiveParentTotals, effectiveChildTotals]);

  const isEmergency = hardshipStatus.some(h => ['bank', 'crisis', 'medical'].includes(h));

  const priorityInfo = useMemo(() => {
    if (isEmergency) return { label: 'EMERGENCY RED', color: 'bg-red-600', text: 'ബാങ്ക് ജപ്തി ഭീഷണി / കടുത്ത പ്രയാസങ്ങൾ (Bank seizure / serious hardship)' };
    if (futurePreference === 'settlement') return { label: 'RED', color: 'bg-red-500', text: 'ഉടൻ സെറ്റിൽമെന്റ് ആവശ്യപ്പെടുന്നു (Demanding immediate settlement)' };
    if (futurePreference === 'wait') return { label: 'ORANGE', color: 'bg-orange-500', text: 'കുറച്ചു സമയം കാത്തിരിക്കാൻ തയ്യാറാണ് (Willing to wait some time)' };
    if (futurePreference === 'continue') return { label: 'GREEN', color: 'bg-green-500', text: 'കമ്പനിയുമായി തുടർന്നു പോകാൻ താല്പര്യപ്പെടുന്നു (Willing to continue with company)' };
    return { label: 'PENDING', color: 'bg-slate-400', text: 'മുൻഗണന തിരഞ്ഞെടുക്കുക (Selection required)' };
  }, [isEmergency, futurePreference]);

  // Form validations for active claimants
  const hasAtLeastOneClaimant = selfSelected || parentSelected || childSelected || spouseSelected;
  
  const selfValid = !selfSelected || (
    selfName.trim().length > 0 && 
    (selfNoBreakup || selfCategories.length > 0)
  );

  const parentValid = !parentSelected || (
    parentName.trim().length > 0 && 
    parentRelation !== '' && 
    parentMobile.trim().length >= 10 &&
    (parentNoBreakup || parentCategories.length > 0)
  );

  const childValid = !childSelected || (
    childName.trim().length > 0 && 
    childRelation !== '' && 
    childMobile.trim().length >= 10 &&
    (childNoBreakup || childCategories.length > 0)
  );

  const spouseValid = !spouseSelected || (
    spouseName.trim().length > 0 && 
    spouseRelation !== '' && 
    spouseMobile.trim().length >= 10 &&
    (spouseNoBreakup || spouseCategories.length > 0)
  );

  const formIsValid = 
    hasAtLeastOneClaimant && 
    selfValid && 
    parentValid && 
    childValid && 
    spouseValid && 
    futurePreference && 
    hardshipStatus.length > 0 && 
    consentLegal;

  const getPersonDetails = (relKey: string) => {
    let name = "";
    let relationLabel = "";
    
    if (relKey === 'Self') {
      name = selfClaim?.userName || selfName || customerName || user.name;
      relationLabel = "സ്വന്തം (Self)";
    } else if (relKey === 'Mother' || relKey === 'Father' || relKey === 'Parent' || relKey === parentRelation || parentClaim?.relation === relKey) {
      name = parentClaim?.userName || parentName;
      relationLabel = (parentClaim?.relation || parentRelation) === 'Mother' ? "അമ്മ (Mother)" : "അച്ഛൻ (Father)";
    } else if (relKey === 'Son' || relKey === 'Daughter' || relKey === 'Child' || relKey === childRelation || childClaim?.relation === relKey) {
      name = childClaim?.userName || childName;
      relationLabel = (childClaim?.relation || childRelation) === 'Son' ? "മകൻ (Son)" : "മകൾ (Daughter)";
    } else if (relKey === 'Wife' || relKey === 'Husband' || relKey === 'Spouse' || relKey === spouseRelation || spouseClaim?.relation === relKey) {
      name = spouseClaim?.userName || spouseName;
      relationLabel = (spouseClaim?.relation || spouseRelation) === 'Wife' ? "ഭാര്യ (Wife)" : "ഭർത്താവ് (Husband)";
    } else {
      const matchDoc = submittedClaims.find(c => c.relation === relKey);
      name = matchDoc?.userName || user.name;
      relationLabel = relKey;
    }
    
    return { name, relationLabel };
  };

  const downloadTokenCard = async (relId: string, tokenVal: string | number, personName: string) => {
    const cardElement = document.getElementById(`token-card-${relId}`);
    if (!cardElement) {
      toast.error('സീരിയൽ കാർഡ് കണ്ടെത്താൻ സാധിച്ചില്ല.');
      return;
    }
    const loadingToast = toast.loading('സീരിയൽ കാർഡ് ചിത്രം ഡൌൺലോഡിനായി തയ്യാറാക്കുന്നു...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(cardElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090D16',
        logging: false,
        onclone: (clonedDoc) => {
          html2canvasOklchOnClone(clonedDoc);
          const clonedCard = clonedDoc.getElementById(`token-card-${relId}`);
          if (clonedCard) {
            clonedCard.style.contentVisibility = 'visible';
            clonedCard.style.transform = 'none';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const filename = `Highrich_Serial_${tokenVal}_${personName.replace(/\s+/g, '_')}.png`;
      const downloaded = triggerFileDownload(imgData, filename);
      if (!downloaded) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 200);
      }
      
      toast.success('സീരിയൽ കാർഡ് വിജയകരമായി ഗാലറിയിലേക്ക് സേവ് ചെയ്തിട്ടുണ്ട്! 📸', { id: loadingToast });
    } catch (error) {
      console.error('Error generating serial card image:', error);
      toast.error('ചിത്രം തെയ്യാറാക്കാൻ പറ്റിയില്ല. ദയവായി നേരിട്ട് സ്ക്രീൻഷോട്ട് എടുക്കുക.', { id: loadingToast });
    }
  };

  const handleSubmit = async (targetSlot?: 'Self' | 'Spouse' | 'Parent' | 'Child' | 'All') => {
    // Auto-fulfill consent & preference defaults if user hits direct submit
    let curConsent = consentLegal;
    if (!curConsent) {
      setConsentLegal(true);
      curConsent = true;
    }
    let curPref = futurePreference;
    if (!curPref) {
      setFuturePreference('settlement');
      curPref = 'settlement';
    }
    let curHardships = hardshipStatus;
    if (curHardships.length === 0) {
      setHardshipStatus(['none']);
      curHardships = ['none'];
    }

    const isSpecificSlot = Boolean(targetSlot && targetSlot !== 'All');
    const shouldProcessSelf = isSpecificSlot
      ? targetSlot === 'Self'
      : (selfSelected && (!hasSelf || editingSelf));
    const shouldProcessSpouse = isSpecificSlot
      ? targetSlot === 'Spouse'
      : (spouseSelected && (!hasSpouse || editingSpouse));
    const shouldProcessParent = isSpecificSlot
      ? targetSlot === 'Parent'
      : (parentSelected && (!hasParent || editingParent));
    const shouldProcessChild = isSpecificSlot
      ? targetSlot === 'Child'
      : (childSelected && (!hasChild || editingChild));

    if (!shouldProcessSelf && !shouldProcessSpouse && !shouldProcessParent && !shouldProcessChild) {
      toast.error('ദയവായി കുറഞ്ഞത് ഒരു ക്ലെയിം ഫോം എങ്കിലും തിരഞ്ഞെടുക്കുക.');
      return;
    }

    // 1. Mandatory validation for Self Claim (Name, Mobile, PAN)
    const errs: Record<string, string> = {};
    const missing: Array<{ id: string; key: string; label: string }> = [];

    if (shouldProcessSelf) {
      const sName = (customerName || selfName || user?.name || '').trim();
      const sMobile = (customerMobile || user?.mobile || '').trim().replace(/\D/g, '');
      const sPan = (customerPan || user?.panNumber || user?.pan || '').trim().toUpperCase();

      if (!sName) {
        errs['customerName'] = 'അപേക്ഷകന്റെ പേര് നിർബന്ധമാണ് (Applicant Name is required)';
        missing.push({ id: 'field-customerName', key: 'customerName', label: '1. അപേക്ഷകന്റെ പേര് (Applicant Name)' });
      }
      if (sMobile.length < 10) {
        errs['customerMobile'] = '10 അക്ക രജിസ്റ്റേർഡ് മൊബൈൽ നമ്പർ നൽകുക (10-digit Mobile is required)';
        missing.push({ id: 'field-customerMobile', key: 'customerMobile', label: '1. രജിസ്റ്റേർഡ് മൊബൈൽ നമ്പർ (10-digit Mobile)' });
      }
      if (!sPan || sPan.length < 10) {
        errs['customerPan'] = '10 അക്ക പാൻ കാർഡ് നമ്പർ രേഖപ്പെടുത്തുക - ഉദാ: ABCDE1234F';
        missing.push({ id: 'field-customerPan', key: 'customerPan', label: '1. പാൻ കാർഡ് നമ്പർ (PAN Card Number)' });
      }
    }

    // 2. Mandatory validation for Spouse Claim (Name, Mobile, PAN)
    if (shouldProcessSpouse) {
      if (!spouseRelation) {
        errs['spouseRelation'] = 'ബന്ധം തിരഞ്ഞെടുക്കുക (ഭാര്യ അല്ലെങ്കിൽ ഭർത്താവ്)';
        missing.push({ id: 'field-spouseRelation', key: 'spouseRelation', label: '2. ഭാര്യ / ഭർത്താവ് ബന്ധം (Spouse Relation)' });
      }
      if (!spouseName.trim()) {
        errs['spouseName'] = 'ഭാര്യ / ഭർത്താവിന്റെ പേര് രേഖപ്പെടുത്തുക (Spouse Name is required)';
        missing.push({ id: 'field-spouseName', key: 'spouseName', label: '2. ഭാര്യ / ഭർത്താവിന്റെ പേര് (Spouse Name)' });
      }
      if (spouseMobile.trim().replace(/\D/g, '').length < 10) {
        errs['spouseMobile'] = 'ഭാര്യ / ഭർത്താവിന്റെ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക';
        missing.push({ id: 'field-spouseMobile', key: 'spouseMobile', label: '2. ഭാര്യ / ഭർത്താവിന്റെ മൊബൈൽ നമ്പർ (Spouse Mobile)' });
      }
      if (!spousePan.trim() || spousePan.trim().length < 10) {
        errs['spousePan'] = 'ഭാര്യ / ഭർത്താവിന്റെ 10 അക്ക പാൻ കാർഡ് നമ്പർ നൽകുക';
        missing.push({ id: 'field-spousePan', key: 'spousePan', label: '2. ഭാര്യ / ഭർത്താവിന്റെ പാൻ കാർഡ് നമ്പർ (Spouse PAN)' });
      }
    }

    // 3. Mandatory validation for Parent Claim (Name, Mobile, PAN)
    if (shouldProcessParent) {
      if (!parentRelation) {
        errs['parentRelation'] = 'ബന്ധം തിരഞ്ഞെടുക്കുക (മാതാവ് അല്ലെങ്കിൽ പിതാവ്)';
        missing.push({ id: 'field-parentRelation', key: 'parentRelation', label: '3. മാതാവ് / പിതാവ് ബന്ധം (Parent Relation)' });
      }
      if (!parentName.trim()) {
        errs['parentName'] = 'മാതാവ് / പിതാവിന്റെ പേര് രേഖപ്പെടുത്തുക (Parent Name is required)';
        missing.push({ id: 'field-parentName', key: 'parentName', label: '3. മാതാവ് / പിതാവിന്റെ പേര് (Parent Name)' });
      }
      if (parentMobile.trim().replace(/\D/g, '').length < 10) {
        errs['parentMobile'] = 'മാതാവ് / പിതാവിന്റെ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക';
        missing.push({ id: 'field-parentMobile', key: 'parentMobile', label: '3. മാതാവ് / പിതാവിന്റെ മൊബൈൽ നമ്പർ (Parent Mobile)' });
      }
      if (!parentPan.trim() || parentPan.trim().length < 10) {
        errs['parentPan'] = 'മാതാവ് / പിതാവിന്റെ 10 അക്ക പാൻ കാർഡ് നമ്പർ നൽകുക';
        missing.push({ id: 'field-parentPan', key: 'parentPan', label: '3. മാതാവ് / പിതാവിന്റെ പാൻ കാർഡ് നമ്പർ (Parent PAN)' });
      }
    }

    // 4. Mandatory validation for Child Claim (Name, Mobile, PAN)
    if (shouldProcessChild) {
      if (!childRelation) {
        errs['childRelation'] = 'ബന്ധം തിരഞ്ഞെടുക്കുക (മകൻ അല്ലെങ്കിൽ മകൾ)';
        missing.push({ id: 'field-childRelation', key: 'childRelation', label: '4. മകൻ / മകൾ ബന്ധം (Child Relation)' });
      }
      if (!childName.trim()) {
        errs['childName'] = 'മകൻ / മകളുടെ പേര് രേഖപ്പെടുത്തുക (Child Name is required)';
        missing.push({ id: 'field-childName', key: 'childName', label: '4. മകൻ / മകളുടെ പേര് (Child Name)' });
      }
      if (childMobile.trim().replace(/\D/g, '').length < 10) {
        errs['childMobile'] = 'മകൻ / മകളുടെ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക';
        missing.push({ id: 'field-childMobile', key: 'childMobile', label: '4. മകൻ / മകളുടെ മൊബൈൽ നമ്പർ (Child Mobile)' });
      }
      if (!childPan.trim() || childPan.trim().length < 10) {
        errs['childPan'] = 'മകൻ / മകളുടെ 10 അക്ക പാൻ കാർഡ് നമ്പർ നൽകുക';
        missing.push({ id: 'field-childPan', key: 'childPan', label: '4. മകൻ / മകളുടെ പാൻ കാർഡ് നമ്പർ (Child PAN)' });
      }
    }

    // Check if any mandatory fields are missing
    if (missing.length > 0) {
      setValidationErrors(errs);
      setMissingFieldsSummary(missing);
      scrollToField(missing[0].id);
      const firstMissingLabels = missing.slice(0, 3).map(m => m.label).join(', ');
      const extraCount = missing.length > 3 ? ` കൂടാതെ ${missing.length - 3} എണ്ണം കൂടി` : '';
      toast.error(`വിട്ടുപോയ ${missing.length} കോളങ്ങൾ പൂരിപ്പിക്കുക: ${firstMissingLabels}${extraCount}`, {
        duration: 7000
      });
      return;
    }

    // Clear validation errors if valid
    setValidationErrors({});
    setMissingFieldsSummary([]);

    try {
      setLoading(true);
      
      const deleteExistingForCategory = async (relations: string[]) => {
        try {
          if (user.uid) {
            const qUid = query(collection(db, 'claims'), where('uid', '==', user.uid));
            const snapUid = await getDocs(qUid);
            for (const docSnap of snapUid.docs) {
              const d = docSnap.data();
              if (relations.includes(d.relation)) {
                await deleteDoc(docSnap.ref);
              }
            }
          } else if (user.mobile) {
            const qMobile = query(collection(db, 'claims'), where('userMobile', '==', user.mobile));
            const snapMobile = await getDocs(qMobile);
            for (const docSnap of snapMobile.docs) {
              const d = docSnap.data();
              if (relations.includes(d.relation)) {
                await deleteDoc(docSnap.ref);
              }
            }
          }
        } catch (err) {
          console.error("Error deleting matching key:", err);
        }
      };

      const effectiveMainAddress = customerAddress || (user as any)?.houseName || (user as any)?.house || user.address || (user as any)?.residentialAddress || (user as any)?.userAddress || '';
      const effectiveMainDistrict = customerDistrict || user.district || (user as any)?.userDistrict || '';
      const effectiveMainConstituency = customerConstituency || user.assemblyConstituency || user.constituency || (user as any)?.assembly || (user as any)?.mandalam || '';
      const effectiveMainPostOffice = customerPostOffice || user.postOffice || (user as any)?.po || '';
      const effectiveMainPincode = customerPincode || user.pincode || (user as any)?.pin || (user as any)?.postalCode || '';
      const effectiveMainPan = customerPan || (user as any)?.panNumber || (user as any)?.pan || '';

      const commonData = {
        uid: user.uid,
        membershipId: user.membershipId || 'PENDING',
        userName: customerName || user.name || '',
        userMobile: customerMobile || user.mobile || '',
        userDistrict: effectiveMainDistrict,
        district: effectiveMainDistrict,
        userAddress: effectiveMainAddress,
        address: effectiveMainAddress,
        houseName: effectiveMainAddress,
        residentialAddress: effectiveMainAddress,
        userConstituency: effectiveMainConstituency,
        constituency: effectiveMainConstituency,
        assemblyConstituency: effectiveMainConstituency,
        postOffice: effectiveMainPostOffice,
        po: effectiveMainPostOffice,
        pincode: effectiveMainPincode,
        pin: effectiveMainPincode,
        postalCode: effectiveMainPincode,
        panNumber: effectiveMainPan,
        pan: effectiveMainPan,
        userEmail: user.email || '',
        userBloodGroup: user.bloodGroup || '',
        paidFromBank: paidFromBank || user.paidFromBank || user.bankName || '',
        paidFromBranch: paidFromBranch || user.paidFromBranch || user.branch || '',
        paidFromAccount: paidFromAccount || user.paidFromAccount || user.accountNumber || '',
        paidFromIfsc: paidFromIfsc || user.paidFromIfsc || user.ifscCode || '',
        paymentDate: paymentDate || user.paymentDate || '',
        transactionRef: transactionRef || user.transactionId || user.transactionRef || '',
        transactionId: transactionRef || user.transactionId || user.transactionRef || '',
        settlementBankName: settlementBankName || user.settlementBankName || user.bankName || '',
        settlementBranch: settlementBranch || user.settlementBranch || user.branch || '',
        settlementAccountNumber: settlementAccountNumber || user.settlementAccountNumber || user.accountNumber || '',
        settlementIfsc: settlementIfsc || user.settlementIfsc || user.ifscCode || '',
        settlementAccountHolder: settlementAccountHolder || customerName || user.name || '',
        futurePreference,
        hardshipStatus,
        isEmergency,
        priorityStatus: priorityInfo.label,
        consentLegal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Background update user document with latest customer settlement details
      try {
        if (user.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            name: customerName || user.name || '',
            mobile: customerMobile || user.mobile || '',
            address: effectiveMainAddress,
            residentialAddress: effectiveMainAddress,
            userAddress: effectiveMainAddress,
            houseName: effectiveMainAddress,
            district: effectiveMainDistrict,
            userDistrict: effectiveMainDistrict,
            assemblyConstituency: effectiveMainConstituency,
            constituency: effectiveMainConstituency,
            userConstituency: effectiveMainConstituency,
            postOffice: effectiveMainPostOffice,
            po: effectiveMainPostOffice,
            pincode: effectiveMainPincode,
            pin: effectiveMainPincode,
            panNumber: effectiveMainPan,
            pan: effectiveMainPan,
            paymentDate: paymentDate || user.paymentDate || '',
            transactionId: transactionRef || user.transactionId || '',
            transactionRef: transactionRef || user.transactionRef || '',
            paidFromBank: paidFromBank || '',
            paidFromBranch: paidFromBranch || '',
            paidFromAccount: paidFromAccount || '',
            paidFromIfsc: paidFromIfsc || '',
            settlementBankName: settlementBankName || '',
            settlementBranch: settlementBranch || '',
            settlementAccountNumber: settlementAccountNumber || '',
            settlementIfsc: settlementIfsc || '',
            settlementAccountHolder: settlementAccountHolder || ''
          });
        }
      } catch (userUpErr) {
        console.warn("Background user doc update notice:", userUpErr);
      }

      // Calculate how many NEW claims are being submitted in this batch
      let claimsToSubmitCount = 0;
      if (shouldProcessSelf && !hasSelf) claimsToSubmitCount++;
      if (shouldProcessParent && !hasParent) claimsToSubmitCount++;
      if (shouldProcessChild && !hasChild) claimsToSubmitCount++;
      if (shouldProcessSpouse && !hasSpouse) claimsToSubmitCount++;

      let baseTokenNo = 0;
      const assignedTokens: Record<string, string> = {};

      const isRed = priorityInfo.label === 'EMERGENCY RED' || priorityInfo.label === 'RED';
      const isOrange = priorityInfo.label === 'ORANGE';
      const prefix = isRed ? 'R' : isOrange ? 'O' : 'G';

      if (claimsToSubmitCount > 0) {
        const systemTotalsRef = doc(db, 'system', 'totals');
        await runTransaction(db, async (transaction) => {
          const sysDoc = await transaction.get(systemTotalsRef);
          let currentCounter = 0;
          if (sysDoc.exists()) {
            const data = sysDoc.data();
            if (prefix === 'R') {
              currentCounter = data.redClaimsCounter || 0;
            } else if (prefix === 'O') {
              currentCounter = data.orangeClaimsCounter || 0;
            } else if (prefix === 'G') {
              currentCounter = data.greenClaimsCounter || 0;
            } else {
              currentCounter = data.claimsCounter || 0;
            }
          }
          baseTokenNo = currentCounter;
          
          const updates: any = {};
          if (prefix === 'R') {
            updates.redClaimsCounter = currentCounter + claimsToSubmitCount;
          } else if (prefix === 'O') {
            updates.orangeClaimsCounter = currentCounter + claimsToSubmitCount;
          } else if (prefix === 'G') {
            updates.greenClaimsCounter = currentCounter + claimsToSubmitCount;
          } else {
            updates.claimsCounter = currentCounter + claimsToSubmitCount;
          }
          
          transaction.set(systemTotalsRef, updates, { merge: true });
        });
      }

      let currentTokenOffset = 0;

      const saveClaimRecord = async (claimData: any, existingId?: string) => {
        try {
          if (existingId) {
            await setDoc(doc(db, 'claims', existingId), claimData, { merge: true });
            return existingId;
          } else {
            const ref = await addDoc(collection(db, 'claims'), claimData);
            return ref.id;
          }
        } catch (clientErr) {
          console.warn("Client Firestore write failed, attempting server fallback API:", clientErr);
          try {
            const res = await fetch('/api/submit-claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                claim: claimData,
                claimId: existingId,
                userMobile: customerMobile || user.mobile,
                uid: user.uid
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Server submission failed');
            return data.id || existingId || 'ok';
          } catch (serverErr) {
            console.error("Server API fallback also failed:", serverErr);
            throw clientErr;
          }
        }
      };

      // 1. Submit or Update Self Claim
      if (shouldProcessSelf) {
        let tokenVal = selfClaim?.tokenNo || selfClaim?.serialNo;
        if (!tokenVal) {
          currentTokenOffset++;
          tokenVal = `${prefix}-${baseTokenNo + currentTokenOffset}`;
        }
        assignedTokens['Self'] = tokenVal;
        const newSelfClaim = {
          ...commonData,
          relation: 'Self',
          relationLabel: 'Self (സ്വന്തം)',
          userName: selfName || customerName || user.name,
          userMobile: customerMobile || user.mobile || '',
          primaryMobile: customerMobile || user.mobile || '',
          mainMemberMobile: customerMobile || user.mobile || '',
          applicantMobile: customerMobile || user.mobile || '',
          memberMobile: customerMobile || user.mobile || '',
          individualMobile: customerMobile || user.mobile || '',
          panNumber: customerPan || user.panNumber || user.pan || '',
          settlementAccountNumber: settlementAccountNumber || user.settlementAccountNumber || user.accountNumber || '',
          settlementBankName: settlementBankName || user.settlementBankName || user.bankName || '',
          settlementBranch: settlementBranch || user.settlementBranch || user.branch || '',
          settlementIfsc: settlementIfsc || user.settlementIfsc || user.ifscCode || '',
          settlementAccountHolder: settlementAccountHolder || selfName || customerName || user.name || '',
          paidFromAccount: paidFromAccount || user.paidFromAccount || '',
          paidFromBank: paidFromBank || user.paidFromBank || user.bankName || '',
          paidFromBranch: paidFromBranch || user.paidFromBranch || user.branch || '',
          paidFromIfsc: paidFromIfsc || user.paidFromIfsc || '',
          paymentDate: paymentDate || user.paymentDate || '',
          highrichId: selfHighrichId,
          sponsorName: selfSponsorName.trim(),
          sponsorMobile: selfSponsorMobile.trim(),
          categories: selfCategories,
          otherCategory: selfOtherCategory,
          categoryDetails: selfCategoryDetails,
          noBreakup: selfNoBreakup,
          totalPaid: selfTotalPaid,
          totalReceived: selfTotalReceived,
          totalPending: selfTotalPending,
          notes: selfNotes,
          tokenNo: tokenVal,
          serialNo: tokenVal,
        };
        await saveClaimRecord(newSelfClaim, selfClaim?.id);
      }

      // 2. Submit or Update Spouse Claim (ഭാര്യ / ഭർത്താവ്)
      if (shouldProcessSpouse) {
        let tokenVal = spouseClaim?.tokenNo || spouseClaim?.serialNo;
        if (!tokenVal) {
          currentTokenOffset++;
          tokenVal = `${prefix}-${baseTokenNo + currentTokenOffset}`;
        }
        const relType = spouseRelation || 'Spouse';
        assignedTokens[relType] = tokenVal;
        const ownSpouseMob = spouseMobile.trim();
        const effectiveSpouseAddr = spouseAddress || effectiveMainAddress;
        const effectiveSpouseDist = spouseDistrict || effectiveMainDistrict;
        const effectiveSpouseConsti = spouseConstituency || effectiveMainConstituency;
        const effectiveSpousePO = spousePostOffice || effectiveMainPostOffice;
        const effectiveSpousePin = spousePincode || effectiveMainPincode;
        const effectiveSpousePan = spousePan || effectiveMainPan;

        const newSpouseClaim = {
          ...commonData,
          userMobile: customerMobile || user.mobile || '',
          primaryMobile: customerMobile || user.mobile || '',
          mainMemberMobile: customerMobile || user.mobile || '',
          applicantMobile: customerMobile || user.mobile || '',
          memberMobile: ownSpouseMob || customerMobile || user.mobile || '',
          individualMobile: ownSpouseMob || '',
          spouseMobile: ownSpouseMob || '',
          relation: spouseRelation,
          relationLabel: spouseRelation === 'Wife' ? 'ഭാര്യ (Wife)' : 'ഭർത്താവ് (Husband)',
          userName: spouseName,
          userAddress: effectiveSpouseAddr,
          address: effectiveSpouseAddr,
          houseName: effectiveSpouseAddr,
          residentialAddress: effectiveSpouseAddr,
          userDistrict: effectiveSpouseDist,
          district: effectiveSpouseDist,
          userConstituency: effectiveSpouseConsti,
          constituency: effectiveSpouseConsti,
          assemblyConstituency: effectiveSpouseConsti,
          postOffice: effectiveSpousePO,
          po: effectiveSpousePO,
          pincode: effectiveSpousePin,
          pin: effectiveSpousePin,
          postalCode: effectiveSpousePin,
          panNumber: effectiveSpousePan,
          pan: effectiveSpousePan,
          settlementAccountNumber: spouseSettlementAccountNumber || settlementAccountNumber || user.settlementAccountNumber || user.accountNumber || '',
          settlementBankName: spouseSettlementBankName || settlementBankName || user.settlementBankName || user.bankName || '',
          settlementBranch: spouseSettlementBranch || settlementBranch || user.settlementBranch || user.branch || '',
          settlementIfsc: spouseSettlementIfsc || settlementIfsc || user.settlementIfsc || user.ifscCode || '',
          settlementAccountHolder: spouseSettlementAccountHolder || spouseName || '',
          paidFromAccount: spousePaidFromAccount || paidFromAccount || '',
          paidFromBank: spousePaidFromBank || paidFromBank || '',
          paidFromBranch: spousePaidFromBranch || paidFromBranch || '',
          paidFromIfsc: spousePaidFromIfsc || paidFromIfsc || '',
          paymentDate: spousePaymentDate || paymentDate || user.paymentDate || '',
          transactionRef: spouseTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          transactionId: spouseTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          highrichId: spouseHighrichId,
          sponsorName: (spouseSponsorName || selfSponsorName).trim(),
          sponsorMobile: (spouseSponsorMobile || selfSponsorMobile).trim(),
          categories: spouseCategories,
          otherCategory: spouseOtherCategory,
          categoryDetails: spouseCategoryDetails,
          noBreakup: spouseNoBreakup,
          totalPaid: spouseTotalPaid,
          totalReceived: spouseTotalReceived,
          totalPending: spouseTotalPending,
          notes: spouseNotes,
          tokenNo: tokenVal,
          serialNo: tokenVal,
        };
        await saveClaimRecord(newSpouseClaim, spouseClaim?.id);
      }

      // 3. Submit or Update Parent Claim (അമ്മ / അച്ഛൻ)
      if (shouldProcessParent) {
        let tokenVal = parentClaim?.tokenNo || parentClaim?.serialNo;
        if (!tokenVal) {
          currentTokenOffset++;
          tokenVal = `${prefix}-${baseTokenNo + currentTokenOffset}`;
        }
        const relType = parentRelation || 'Parent';
        assignedTokens[relType] = tokenVal;
        const ownParentMob = parentMobile.trim();
        const effectiveParentAddr = parentAddress || effectiveMainAddress;
        const effectiveParentDist = parentDistrict || effectiveMainDistrict;
        const effectiveParentConsti = parentConstituency || effectiveMainConstituency;
        const effectiveParentPO = parentPostOffice || effectiveMainPostOffice;
        const effectiveParentPin = parentPincode || effectiveMainPincode;
        const effectiveParentPan = parentPan || effectiveMainPan;

        const newParentClaim = {
          ...commonData,
          userMobile: customerMobile || user.mobile || '',
          primaryMobile: customerMobile || user.mobile || '',
          mainMemberMobile: customerMobile || user.mobile || '',
          applicantMobile: customerMobile || user.mobile || '',
          memberMobile: ownParentMob || customerMobile || user.mobile || '',
          individualMobile: ownParentMob || '',
          parentMobile: ownParentMob || '',
          relation: parentRelation,
          relationLabel: parentRelation === 'Mother' ? 'അമ്മ (Mother)' : 'അച്ഛൻ (Father)',
          userName: parentName,
          userAddress: effectiveParentAddr,
          address: effectiveParentAddr,
          houseName: effectiveParentAddr,
          residentialAddress: effectiveParentAddr,
          userDistrict: effectiveParentDist,
          district: effectiveParentDist,
          userConstituency: effectiveParentConsti,
          constituency: effectiveParentConsti,
          assemblyConstituency: effectiveParentConsti,
          postOffice: effectiveParentPO,
          po: effectiveParentPO,
          pincode: effectiveParentPin,
          pin: effectiveParentPin,
          postalCode: effectiveParentPin,
          panNumber: effectiveParentPan,
          pan: effectiveParentPan,
          settlementAccountNumber: parentSettlementAccountNumber || settlementAccountNumber || user.settlementAccountNumber || user.accountNumber || '',
          settlementBankName: parentSettlementBankName || settlementBankName || user.settlementBankName || user.bankName || '',
          settlementBranch: parentSettlementBranch || settlementBranch || user.settlementBranch || user.branch || '',
          settlementIfsc: parentSettlementIfsc || settlementIfsc || user.settlementIfsc || user.ifscCode || '',
          settlementAccountHolder: parentSettlementAccountHolder || parentName || '',
          paidFromAccount: parentPaidFromAccount || paidFromAccount || '',
          paidFromBank: parentPaidFromBank || paidFromBank || '',
          paidFromBranch: parentPaidFromBranch || paidFromBranch || '',
          paidFromIfsc: parentPaidFromIfsc || paidFromIfsc || '',
          paymentDate: parentPaymentDate || paymentDate || user.paymentDate || '',
          transactionRef: parentTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          transactionId: parentTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          highrichId: parentHighrichId,
          sponsorName: (parentSponsorName || selfSponsorName).trim(),
          sponsorMobile: (parentSponsorMobile || selfSponsorMobile).trim(),
          categories: parentCategories,
          otherCategory: parentOtherCategory,
          categoryDetails: parentCategoryDetails,
          noBreakup: parentNoBreakup,
          totalPaid: parentTotalPaid,
          totalReceived: parentTotalReceived,
          totalPending: parentTotalPending,
          notes: parentNotes,
          tokenNo: tokenVal,
          serialNo: tokenVal,
        };
        await saveClaimRecord(newParentClaim, parentClaim?.id);
      }

      // 4. Submit or Update Child Claim (മകൻ / മകൾ)
      if (shouldProcessChild) {
        let tokenVal = childClaim?.tokenNo || childClaim?.serialNo;
        if (!tokenVal) {
          currentTokenOffset++;
          tokenVal = `${prefix}-${baseTokenNo + currentTokenOffset}`;
        }
        const relType = childRelation || 'Child';
        assignedTokens[relType] = tokenVal;
        const ownChildMob = childMobile.trim();
        const effectiveChildAddr = childAddress || effectiveMainAddress;
        const effectiveChildDist = childDistrict || effectiveMainDistrict;
        const effectiveChildConsti = childConstituency || effectiveMainConstituency;
        const effectiveChildPO = childPostOffice || effectiveMainPostOffice;
        const effectiveChildPin = childPincode || effectiveMainPincode;
        const effectiveChildPan = childPan || effectiveMainPan;

        const newChildClaim = {
          ...commonData,
          userMobile: customerMobile || user.mobile || '',
          primaryMobile: customerMobile || user.mobile || '',
          mainMemberMobile: customerMobile || user.mobile || '',
          applicantMobile: customerMobile || user.mobile || '',
          memberMobile: ownChildMob || customerMobile || user.mobile || '',
          individualMobile: ownChildMob || '',
          childMobile: ownChildMob || '',
          relation: childRelation,
          relationLabel: childRelation === 'Son' ? 'മകൻ (Son)' : 'മകൾ (Daughter)',
          userName: childName,
          userAddress: effectiveChildAddr,
          address: effectiveChildAddr,
          houseName: effectiveChildAddr,
          residentialAddress: effectiveChildAddr,
          userDistrict: effectiveChildDist,
          district: effectiveChildDist,
          userConstituency: effectiveChildConsti,
          constituency: effectiveChildConsti,
          assemblyConstituency: effectiveChildConsti,
          postOffice: effectiveChildPO,
          po: effectiveChildPO,
          pincode: effectiveChildPin,
          pin: effectiveChildPin,
          postalCode: effectiveChildPin,
          panNumber: effectiveChildPan,
          pan: effectiveChildPan,
          settlementAccountNumber: childSettlementAccountNumber || settlementAccountNumber || user.settlementAccountNumber || user.accountNumber || '',
          settlementBankName: childSettlementBankName || settlementBankName || user.settlementBankName || user.bankName || '',
          settlementBranch: childSettlementBranch || settlementBranch || user.settlementBranch || user.branch || '',
          settlementIfsc: childSettlementIfsc || settlementIfsc || user.settlementIfsc || user.ifscCode || '',
          settlementAccountHolder: childSettlementAccountHolder || childName || '',
          paidFromAccount: childPaidFromAccount || paidFromAccount || '',
          paidFromBank: childPaidFromBank || paidFromBank || '',
          paidFromBranch: childPaidFromBranch || paidFromBranch || '',
          paidFromIfsc: childPaidFromIfsc || paidFromIfsc || '',
          paymentDate: childPaymentDate || paymentDate || user.paymentDate || '',
          transactionRef: childTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          transactionId: childTransactionRef || transactionRef || user.transactionId || user.transactionRef || '',
          highrichId: childHighrichId,
          sponsorName: (childSponsorName || selfSponsorName).trim(),
          sponsorMobile: (childSponsorMobile || selfSponsorMobile).trim(),
          categories: childCategories,
          otherCategory: childOtherCategory,
          categoryDetails: childCategoryDetails,
          noBreakup: childNoBreakup,
          totalPaid: childTotalPaid,
          totalReceived: childTotalReceived,
          totalPending: childTotalPending,
          notes: childNotes,
          tokenNo: tokenVal,
          serialNo: tokenVal,
        };
        await saveClaimRecord(newChildClaim, childClaim?.id);
      }

      if (shouldProcessSelf) setEditingSelf(false);
      if (shouldProcessSpouse) setEditingSpouse(false);
      if (shouldProcessParent) setEditingParent(false);
      if (shouldProcessChild) setEditingChild(false);
      await checkExistingClaims();

      // Gather ALL tokens for all submitted members so Main applicant & family cards are always visible
      const allTokensMap: Record<string, string> = { ...assignedTokens };
      if (selfClaim?.tokenNo || selfClaim?.serialNo) {
        if (!allTokensMap['Self']) {
          allTokensMap['Self'] = String(selfClaim.tokenNo || selfClaim.serialNo);
        }
      }
      if (spouseClaim?.tokenNo || spouseClaim?.serialNo) {
        const key = spouseClaim.relation || 'Spouse';
        if (!allTokensMap[key]) {
          allTokensMap[key] = String(spouseClaim.tokenNo || spouseClaim.serialNo);
        }
      }
      if (parentClaim?.tokenNo || parentClaim?.serialNo) {
        const key = parentClaim.relation || 'Parent';
        if (!allTokensMap[key]) {
          allTokensMap[key] = String(parentClaim.tokenNo || parentClaim.serialNo);
        }
      }
      if (childClaim?.tokenNo || childClaim?.serialNo) {
        const key = childClaim.relation || 'Child';
        if (!allTokensMap[key]) {
          allTokensMap[key] = String(childClaim.tokenNo || childClaim.serialNo);
        }
      }

      setNewlyAssignedTokens(allTokensMap);

      // Trigger automated WhatsApp notification to the member if enabled in settings
      try {
        if (orgSettings?.whatsappEnabled !== false && orgSettings?.whatsappClaimEnabled !== false && orgSettings?.registrationMode !== 'bulk') {
          const tokensList = Object.values(assignedTokens);
          const primaryToken = tokensList[0] || '';
          const allCats = new Set<string>();
          if (selfSelected) selfCategories.forEach(c => allCats.add(c));
          if (parentSelected) parentCategories.forEach(c => allCats.add(c));
          if (childSelected) childCategories.forEach(c => allCats.add(c));
          if (spouseSelected) spouseCategories.forEach(c => allCats.add(c));

          setTimeout(() => {
            sendWAClaimMessage({
              userName: user.name,
              userMobile: user.mobile,
              tokenNo: primaryToken,
              tokensList,
              totalPaid: combinedTotalPaid,
              totalReceived: combinedTotalReceived,
              totalPending: combinedTotalPending,
              categories: Array.from(allCats),
              district: user.district
            });
          }, 600);
        }
      } catch (waErr) {
        console.warn("Automated WhatsApp claim notification error:", waErr);
      }

      setCompleted(true);
      toast.success('നിങ്ങളുടെ വിവരങ്ങൾ വിജയകരമായി സമർപ്പിച്ചിട്ടുണ്ട്.');
    } catch (error) {
      console.error("Submission error:", error);
      toast.error('രേഖപ്പെടുത്തുന്നതിൽ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.');
    } finally {
      setLoading(false);
    }
  };

  const renderFutureAndConditionsBlock = (formIdSuffix: string = 'self') => (
    <div className="space-y-4 pt-4 border-t-2 border-amber-300/80">
      {/* 1. FUTURE PREFERENCE (ഭാവിയിലെ താല്പര്യം) */}
      <Card className={`border-2 rounded-2xl shadow-xs overflow-hidden bg-white transition-all duration-300 ${
        !futurePreference 
          ? 'border-rose-400 bg-rose-50/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'border-emerald-200 bg-white'
      }`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-magenta text-white text-xs font-black uppercase tracking-wider shadow-2xs">
              <Heart className="w-3.5 h-3.5 animate-pulse" />
              <span>{t('Future Preference', 'ഭാവിയിലെ താല്പര്യം')}</span>
            </div>
            {!futurePreference ? (
              <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded animate-bounce">
                ⚠️ {t('Selection Required', 'തിരഞ്ഞെടുക്കൽ നിർബന്ധം')}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {t('Selected', 'പൂർത്തിയായി')}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              {t(
                'If the company resumes operations, what is your family preference? (Select family preference) *',
                'കമ്പനി പ്രവർത്തനം പുനരാരംഭിക്കുകയാണെങ്കിൽ താങ്കളുടെ കുടുംബത്തിന്റെ താൽപര്യം? (Select family preference) *'
              )}
            </p>
            <RadioGroup value={futurePreference} onValueChange={setFuturePreference} className="space-y-2">
              {PREFERENCES.map(pref => {
                const isSelected = futurePreference === pref.id;
                return (
                  <div 
                    key={pref.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-brand-magenta bg-brand-magenta/5 shadow-xs scale-[1.005]' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                    onClick={() => setFuturePreference(pref.id)}
                  >
                    <RadioGroupItem value={pref.id} id={`${pref.id}-${formIdSuffix}`} className="text-brand-magenta w-4 h-4" />
                    <Label htmlFor={`${pref.id}-${formIdSuffix}`} className={`text-xs font-extrabold cursor-pointer flex-1 leading-normal ${
                      isSelected ? 'text-brand-magenta' : 'text-slate-800'
                    }`}>
                      {pref.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 2. HARDSHIP STATUS (നിലവിലെ ബുദ്ധിമുട്ടുകൾ) */}
      <Card className={`border-2 rounded-2xl shadow-xs overflow-hidden bg-white transition-all duration-300 ${
        hardshipStatus.length === 0 
          ? 'border-rose-400 bg-rose-50/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'border-emerald-200 bg-white'
      }`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>{t('Current Hardship Status (Emergency Status)', 'നിലവിലെ ബുദ്ധിമുട്ടുകൾ')}</span>
            </div>
            {hardshipStatus.length === 0 ? (
              <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded animate-bounce">
                ⚠️ {t('Selection Required', 'തിരഞ്ഞെടുക്കൽ നിർബന്ധം')}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {t('Selected', 'പൂർത്തിയായി')}
              </Badge>
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              {t(
                'Select hardship/crisis faced currently by you or family (Select economic hardship) *',
                'നിലവിൽ താങ്കളോ കുടുംബമോ നേരിടുന്ന ബുദ്ധിമുട്ടുകൾ തിരഞ്ഞെടുക്കുക (Select economic hardship) *'
              )}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {HARDSHIPS.map(hard => {
                const isSelected = hardshipStatus.includes(hard.id);
                return (
                  <div 
                    key={hard.id}
                    onClick={() => {
                      if (isSelected) {
                        setHardshipStatus(prev => prev.filter(i => i !== hard.id));
                      } else {
                        if (hard.id === 'none') {
                          setHardshipStatus(['none']);
                        } else {
                          setHardshipStatus(prev => [...prev.filter(i => i !== 'none'), hard.id]);
                        }
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-red-500 bg-red-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      className={`pointer-events-none w-4 h-4 ${
                        isSelected ? "border-red-600 bg-red-600 text-white" : "border-slate-300"
                      }`} 
                    />
                    <Label className={`text-xs font-extrabold cursor-pointer flex-1 leading-relaxed ${
                      isSelected ? 'text-red-700 font-bold' : 'text-slate-800'
                    }`}>{hard.label}</Label>
                    {['bank', 'crisis', 'medical'].includes(hard.id) && (
                      <ShieldAlert className={`w-3.5 h-3.5 ${isSelected ? 'text-red-600 animate-bounce' : 'text-slate-400'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. SHARING CONSENT & CONDITIONS / SAKSHYAPATHRAM (സാക്ഷ്യപത്രവും നിബന്ധനകളും) */}
      <div 
        onClick={() => setConsentLegal(!consentLegal)}
        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
          consentLegal 
            ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' 
            : 'border-rose-400 bg-rose-50/10 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:border-rose-300'
        }`}
      >
        <Checkbox 
          checked={consentLegal} 
          onCheckedChange={(val) => setConsentLegal(!!val)} 
          className={`w-4.5 h-4.5 mt-0.5 pointer-events-none ${
            consentLegal 
              ? 'border-emerald-600 bg-emerald-600 text-white' 
              : 'border-rose-400 bg-white'
          }`} 
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
              📜 <span>{t('Declaration & Conditions *', 'സാക്ഷ്യപത്രവും നിബന്ധനകളും *')}</span>
            </div>
            {!consentLegal ? (
              <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded animate-bounce">
                ⚠️ {t('Tick required', 'സാക്ഷ്യപ്പെടുത്തൽ ആവശ്യമാണ്')}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {t('Declared', 'സാക്ഷ്യപ്പെടുത്തി')}
              </Badge>
            )}
          </div>
          <p className={`text-xs font-bold leading-relaxed ${consentLegal ? 'text-slate-700' : 'text-rose-950 font-extrabold'}`}>
            {formLang === 'english' ? (
              '“I hereby declare that the amounts entered in this claim application are approximate and true to the best of my knowledge. The Consignment Advance amount, amount received so far, and remaining final balance are to be verified by HIGHRICH ONLINE SHOPPE Pvt. Ltd. from relevant records and submitted in writing to the Hon’ble Court. In the event the court case continues indefinitely, this application is submitted for receiving the due balance amount verified by the company and sanctioned by the Hon’ble Court from the surplus interest amount reported by the company to the court. I also affirm that this form is submitted out of my own interest and with my full consent.”'
            ) : (
              '“ഈ അപേക്ഷയിൽ ഞാൻ രേഖപ്പെടുത്തിയിട്ടുള്ള തുക എന്റെ അറിവിന്റെ അടിസ്ഥാനത്തിൽ ഏകദേശം ശരിയാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. Consignment Advance തുക, ഇതിനകം ലഭിച്ച തുക, ശേഷിക്കുന്നതായി കണക്കാക്കുന്ന അന്തിമ ബാലൻസ് എന്നിവ HIGHRICH ONLINE SHOPPE Pvt. Ltd. ബന്ധപ്പെട്ട രേഖകൾ പരിശോധിച്ച് സ്ഥിരീകരിച്ച് കോടതിയിൽ രേഖാമൂലം സമർപ്പിക്കേണ്ടതാണ്. കമ്പനിയുടെ കേസ് അനന്തമായി നീണ്ടുപോകുന്ന സാഹചര്യത്തിൽ, കമ്പനി കോടതിയെ രേഖാമൂലം അറിയിച്ചിട്ടുള്ള അധികമായി ലഭിച്ച പലിശത്തുകയിൽ നിന്ന്, കമ്പനി സ്ഥിരീകരിച്ച് കോടതി അനുവദിക്കുന്ന പക്ഷം എനിക്ക് ലഭിക്കേണ്ട തുക ലഭ്യമാക്കുന്നതിനായാണ് ഈ അപേക്ഷ സമർപ്പിക്കുന്നത്. ഈ ഫോം സമർപ്പിക്കുന്നത് എന്റെ സ്വന്തം താല്പര്യ പ്രകാരം എന്റെ പൂർണ സമ്മതത്തോടെയും ആണ് എന്ന് ബോധിപ്പിക്കുന്നു.”'
            )}
          </p>
        </div>
      </div>
    </div>
  );

  // Render Official Court Statement View
  if (formMode === 'statement' && submittedClaims.length > 0 && !completed) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-slate-100 overflow-x-hidden">
        {/* Responsive Sticky Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-[#003366] to-[#002244] text-white sticky top-0 z-30 shadow-md w-full">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0 border border-white/15">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5 flex-wrap truncate">
                    <span className="truncate">Financial Information</span>
                    <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider shrink-0">
                      {submittedClaims.length} Page{submittedClaims.length > 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">
                    HIGHRICH • {user.name}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExitToDashboard}
                className="sm:hidden h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 text-sm font-black rounded-lg shrink-0 cursor-pointer"
                title="Close"
              >
                ✕
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                size="sm"
                onClick={() => setFormMode('fill')}
                variant="outline"
                className="h-8 sm:h-9 px-2.5 sm:px-3 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ഫോം എഡിറ്റ്</span>
              </Button>
              {submittedClaims.length < 4 && (
                <Button
                  size="sm"
                  onClick={() => setFormMode('fill')}
                  className="h-8 sm:h-9 px-2.5 sm:px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ അംഗം ({4 - submittedClaims.length})</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => printCourtComboReport(combinedUserForPrint, submittedClaims)}
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer border border-blue-300/40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>പ്രിന്റ്</span>
              </Button>
              <Button
                size="sm"
                onClick={() => downloadCourtComboPdf(combinedUserForPrint, submittedClaims)}
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer border border-emerald-400/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </Button>
              <Button
                size="sm"
                onClick={handleExitToDashboard}
                className="hidden sm:flex h-9 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl items-center gap-1.5 shadow-sm cursor-pointer border border-white/20"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span>ഡാഷ്‌ബോർഡ്</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExitToDashboard}
                className="hidden sm:flex h-9 px-2.5 text-slate-300 hover:text-white hover:bg-white/10 text-sm font-black rounded-xl cursor-pointer"
                title="Close"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        {/* Page Switcher Subbar */}
        <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-200 shadow-xs w-full">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedStatementIdx(-1)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  selectedStatementIdx === -1
                    ? 'bg-[#003366] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                എല്ലാം ഒരുമിച്ച് ({submittedClaims.length} പേജ്)
              </button>
              {submittedClaims.map((claim, idx) => {
                const relMalayalam = 
                  claim.relation === 'Self' ? 'സ്വന്തം' :
                  claim.relation === 'Mother' ? 'അമ്മ' :
                  claim.relation === 'Father' ? 'അച്ഛൻ' :
                  claim.relation === 'Son' ? 'മകൻ' :
                  claim.relation === 'Daughter' ? 'മകൾ' :
                  claim.relation === 'Wife' ? 'ഭാര്യ' :
                  claim.relation === 'Husband' ? 'ഭർത്താവ്' : (claim.relation || `പേജ് ${idx + 1}`);
                return (
                  <button
                    key={claim.id || idx}
                    type="button"
                    onClick={() => setSelectedStatementIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      selectedStatementIdx === idx
                        ? 'bg-[#003366] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{idx + 1}. {relMalayalam}</span>
                    <span className="opacity-70 font-mono text-[9px]">({claim.userName || user.name})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-600 shrink-0">
              <span>ആകെ റീഫണ്ട് വിഹിതം:</span>
              <span className="font-mono font-black text-[#003366]">
                ₹{submittedClaims.reduce((s, c) => s + (Number(c.totalPending) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Live Document Frame */}
        <div className="flex-1 py-4 sm:py-6 px-3 sm:px-4 max-w-5xl mx-auto w-full flex flex-col min-w-0">
          <div className="flex-1 w-full min-h-[520px] sm:min-h-[750px] md:min-h-[850px] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-300 bg-white shadow-xl relative">
            <iframe
              srcDoc={
                selectedStatementIdx === -1
                  ? getCourtComboHtml(combinedUserForPrint, submittedClaims)
                  : getSingleCourtClaimHtml(combinedUserForPrint, submittedClaims[selectedStatementIdx], selectedStatementIdx + 1, submittedClaims.length)
              }
              title="Consignment Advance Court Statement"
              className="w-full h-full min-h-[520px] sm:min-h-[750px] md:min-h-[850px] border-0 bg-white block"
            />
          </div>

          {/* Bottom Footer with Back to Dashboard */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-8 w-full">
            <p className="text-xs text-slate-600 font-bold text-center sm:text-left">
              ✓ ഈ രേഖയാണ് കമ്പനിയിലേക്ക് / കോടതിയിലേക്ക് സമർപ്പിക്കപ്പെടേണ്ട ഉപഭോക്താവിന്റെ ഔദ്യോഗിക ക്ലെയിം സെറ്റിൽമെന്റ് ഫോം.
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setFormMode('fill')}
                variant="outline"
                className="h-11 px-3 sm:px-4 rounded-xl border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
                <span>ഫോമിലേക്ക്</span>
              </Button>
              <Button
                onClick={() => printCourtComboReport(combinedUserForPrint, submittedClaims)}
                className="h-11 px-3 sm:px-5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>പ്രിന്റ് (A4)</span>
              </Button>
              <Button
                onClick={() => downloadCourtComboPdf(combinedUserForPrint, submittedClaims)}
                className="h-11 px-3 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-emerald-500"
              >
                <Download className="w-4 h-4 text-white" />
                <span className="text-white font-black">ഡൗൺലോഡ് PDF</span>
              </Button>
              <Button
                onClick={handleExitToDashboard}
                className="h-11 px-3 sm:px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>ഡാഷ്‌ബോർഡ്</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Submitted successfully output
  if (completed) {
    const totalFilledNow = (() => {
      let count = submittedClaims.length;
      if (selfSelected && !hasSelf) count++;
      if (parentSelected && !hasParent) count++;
      if (childSelected && !hasChild) count++;
      if (spouseSelected && !hasSpouse) count++;
      return count;
    })();

    const remainingSlots = 4 - totalFilledNow;

    return (
      <div className="p-4 sm:p-6 text-center space-y-6 max-w-md w-full mx-auto flex flex-col justify-start min-h-screen my-auto pb-24 overflow-y-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-300 shadow-md">
          <CheckCircle2 className="w-8 h-8 text-green-600 animate-bounce" />
        </div>
        <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight leading-tight">
          സമർപ്പണം വിജയകരം<br/>
          <span className="text-xs font-bold text-slate-500 block mt-1 tracking-wide uppercase">(Claim Submitted Successfully)</span>
        </h2>

        {/* Beautiful Premium Token Cards Section */}
        {Object.keys(newlyAssignedTokens).length > 0 && (
          <div className="space-y-8 mt-4">
            {/* Elegant warning instructions banner styled like a high-end metal card */}
            <div className="bg-gradient-to-r from-amber-50 to-[#FFF8DC] border border-amber-300/60 rounded-2xl p-4 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-amber-700 font-extrabold text-[11px] mb-1.5 uppercase tracking-wider">
                <Camera className="w-4 h-4 text-brand-magenta animate-pulse" />
                <span>സീരിയൽ കാർഡ് ലഭിക്കാൻ നിർദ്ദേശം (Warning & Help)</span>
              </div>
              <p className="text-[11.5px] font-bold text-slate-700 leading-relaxed">
                ഭാവി ആവശ്യങ്ങൾക്കായി താഴെ നൽകിയിട്ടുള്ള നിങ്ങളുടെ <strong className="text-brand-magenta font-black">ഓരോ സീരിയൽ നമ്പർ കാർഡും ഡൗൺലോഡ് ചെയ്യുകയോ സ്ക്രീൻഷോട്ട് (Screenshot)</strong> എടുത്തു ഫോൺ ഗാലറിയിൽ സൂക്ഷിക്കുകയോ ചെയ്യുക സുഹൃത്തേ!
              </p>
            </div>

            {Object.entries(newlyAssignedTokens).map(([rel, token]) => {
              const { name: pName, relationLabel } = getPersonDetails(rel);
              
              return (
                <div key={rel} className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500 w-full">
                  {/* Beautiful 3D PVC Style Premium Token Card */}
                  <div 
                    id={`token-card-${rel}`}
                    className="w-full max-w-[340px] h-[525px] rounded-[24px] text-white relative overflow-hidden font-sans border-[6px] border-slate-700 flex flex-col justify-between shrink-0 select-none shadow-[15px_20px_35px_rgba(0,0,0,0.85)] bg-gradient-to-br from-[#121b2b] via-[#090f19] to-[#02050b] p-5 pt-6 mx-auto"
                  >
                    {/* Top gradient strip */}
                    <div className="bg-gradient-to-r from-[#FF1493] via-[#ec008c] to-[#990055] h-1.5 w-full absolute top-0 left-0 z-30" />
                    
                    {/* Security Lines Texture overlay */}
                    <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_18px)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,20,147,0.14),transparent_70%)] pointer-events-none" />

                    {/* Header: Logo & Branding */}
                    <div className="flex items-center justify-between gap-2.5 shrink-0 border-b border-slate-800/60 pb-3">
                      <div className="bg-white rounded-full p-1 w-10 h-10 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)] shrink-0">
                        <img 
                          src="https://i.ibb.co/DHKT5DRn/1000072034-removebg-preview-1.png" 
                          alt="HCRS Seal" 
                          className="w-8 h-8 object-contain" 
                          crossOrigin="anonymous" 
                        />
                      </div>
                      <div className="text-left flex-1">
                        <h1 className="text-[8.5px] font-black tracking-tight leading-tight uppercase text-slate-150">
                          HIGHRICH ONLINE SHOPPE PVT. LTD.
                        </h1>
                        <p className="text-[6.5px] text-[#FF1493] font-black tracking-widest uppercase leading-none italic mt-0.5">
                          FINANCIAL REGISTRY PREMIUM SERIAL CARD
                        </p>
                      </div>
                    </div>

                    {/* Ribbon Subtitle */}
                    <div className="text-center my-0.5 shrink-0">
                      <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-extrabold text-[8px] uppercase tracking-[0.14em] px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 animate-pulse" /> Verified Claim Submission
                      </span>
                    </div>

                    {/* Giant Golden Metal Token Display Block */}
                    <div className="my-2.5 p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-black border border-slate-800/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_4px_15px_rgba(255,20,147,0.15)] text-center flex flex-col justify-center items-center relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent pointer-events-none" />
                      
                      <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-sans">
                        ക്ലെയിം സീരിയൽ നമ്പർ
                      </p>
                      <h2 className="text-[#FF1493] text-5xl font-black tracking-tighter drop-shadow-[0_4px_10px_rgba(255,20,147,0.55)] font-mono my-2.5">
                        #{token}
                      </h2>
                      <div className="w-[50%] h-[1.5px] bg-gradient-to-r from-transparent via-[#FF1493]/30 to-transparent my-1" />
                      <p className="text-[8.5px] text-[#FF1493] font-mono tracking-widest font-black uppercase mt-1">
                        PREMIUM SECURITY SERIAL #0{token}
                      </p>
                    </div>

                    {/* Custom Member Details styled as elegant glass plate */}
                    <div className="space-y-1.5 shrink-0 bg-white/5 p-3.5 rounded-xl border border-white/5 text-[11px] font-bold">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400 font-extrabold text-[8px] uppercase tracking-wider">പേര് (Name)</span>
                        <span className="text-white truncate max-w-[170px] uppercase font-black">{pName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400 font-extrabold text-[8px] uppercase tracking-wider">ബന്ധം (Relation)</span>
                        <span className="text-brand-magenta font-black">{relationLabel}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-extrabold text-[8px] uppercase tracking-wider">സെക്യൂർ ചെയ്ത ദിവസം (Date)</span>
                        <span className="text-[#00BFFF] font-black font-mono">{new Date().toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Security Signatures bottom row */}
                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-2.5 shrink-0 text-center">
                      <div className="text-left">
                        <p className="text-[5px] font-bold text-slate-505 font-mono tracking-widest leading-none">SECURITY CODE</p>
                        <p className="text-[7.5px] font-black text-brand-magenta font-mono tracking-tight mt-0.5">SHA-{token}F{token}X92</p>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-800 px-2 py-1 rounded">
                        <span className="text-[#00BFFF] text-[5.5px] font-black uppercase tracking-widest">STATUS: SAVED</span>
                      </div>
                      <div>
                        <p className="text-[5.5px] font-black text-slate-500 uppercase tracking-widest leading-none">AUTHORIZED BY</p>
                        <p className="text-[7px] font-extrabold text-slate-300 mt-0.5 italic">Company Legal & Audit Cell</p>
                      </div>
                    </div>
                  </div>

                  {/* High Quality Download trigger button */}
                  <Button 
                    onClick={() => downloadTokenCard(rel, token as string, pName)}
                    className="w-full max-w-[340px] h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-400/20 mx-auto"
                  >
                    <Download className="w-4 h-4 text-white animate-bounce" />
                    <span>സീരിയൽ നമ്പർ കാർഡ് സേവ് ചെയ്യുക</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="bg-emerald-50/80 border border-emerald-300 p-5 rounded-2xl text-slate-800 font-bold text-xs leading-relaxed text-left space-y-3 shadow-sm">
          <p className="text-emerald-950 font-black text-sm">
            പ്രിയ അംഗമേ,
          </p>
          <p className="text-slate-900 font-extrabold leading-relaxed">
            താങ്കൾ സമർപ്പിച്ച വിവരങ്ങൾ വിജയകരമായി സിസ്റ്റത്തിൽ രേഖപ്പെടുത്തി. {totalFilledNow > 0 && `ഇതുവരെ ആകെ ${totalFilledNow} വ്യക്തികളുടെ വിവരങ്ങൾ നൽകിയിട്ടുണ്ട്.`}
          </p>
          
          {remainingSlots > 0 ? (
            <p className="text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-300 mt-2 font-extrabold leading-relaxed">
              താങ്കളുടെ കുടുംബാംഗങ്ങൾക്കായി ബാക്കിയുള്ള <strong>{remainingSlots} പേരുടെ ക്ലെയിം ഫോമുകൾ</strong> എപ്പോൾ വേണമെങ്കിലും പൂരിപ്പിച്ചു സമർപ്പിക്കാവുന്നതാണ്!
            </p>
          ) : (
            <p className="text-emerald-900 bg-emerald-100 p-4 rounded-xl border border-emerald-300 mt-2 font-extrabold">
              താങ്കളുടെ ലോഗിൻ വഴിയുള്ള പരമാവധി 4 ക്ലെയിം കാർഡുകളും പൂർണ്ണമായി സമർപ്പിച്ചു കഴിഞ്ഞു.
            </p>
          )}
          <p className="text-[10px] text-slate-700 font-bold leading-normal mt-2 pt-1 border-t border-slate-200">
            സമ്മതപ്രകാരം വിവരങ്ങൾ അഡ്മിൻ ഒഡിറ്റിംഗ് പാനലിലും ലീഗൽ അഡ്വൈസർ കോപ്പിയിലുമായി ഉൾപ്പെടുത്തി തുടർനടപടികൾ സ്വീകരിക്കുന്നതാണ്.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button 
              onClick={async () => {
                try {
                  const rawMob = String(user.mobile || '').replace(/\D/g, '');
                  const cleanMob = rawMob.length >= 10 ? rawMob.slice(-10) : rawMob;
                  const claimsSnap = await getDocs(query(collection(db, 'claims'), where('userMobile', 'in', [cleanMob, Number(cleanMob), user.mobile].filter(Boolean))));
                  const docsList: any[] = [];
                  claimsSnap.forEach(d => docsList.push({ id: d.id, ...d.data() }));
                  if (docsList.length > 0) {
                    downloadCourtComboPdf(user, docsList);
                  } else if (submittedClaims && submittedClaims.length > 0) {
                    downloadCourtComboPdf(user, submittedClaims);
                  } else {
                    toast.info('ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
                  }
                } catch (e) {
                  if (submittedClaims && submittedClaims.length > 0) {
                    downloadCourtComboPdf(user, submittedClaims);
                  }
                }
              }}
              className="w-full h-12 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-black shadow-md active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-blue-400 cursor-pointer"
            >
              <Download className="w-4 h-4 text-white shrink-0" />
              ഡൗൺലോഡ് (PDF Download)
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const rawMob = String(user.mobile || '').replace(/\D/g, '');
                  const cleanMob = rawMob.length >= 10 ? rawMob.slice(-10) : rawMob;
                  const claimsSnap = await getDocs(query(collection(db, 'claims'), where('userMobile', 'in', [cleanMob, Number(cleanMob), user.mobile].filter(Boolean))));
                  const docsList: any[] = [];
                  claimsSnap.forEach(d => docsList.push({ id: d.id, ...d.data() }));
                  if (docsList.length > 0) {
                    printCourtComboReport(user, docsList);
                  } else if (submittedClaims && submittedClaims.length > 0) {
                    printCourtComboReport(user, submittedClaims);
                  } else {
                    toast.success('സ്റ്റേറ്റ്‌മെന്റ് തയ്യാറാക്കുന്നു...');
                  }
                } catch (e) {
                  console.error("Print fetch error:", e);
                  if (submittedClaims && submittedClaims.length > 0) {
                    printCourtComboReport(user, submittedClaims);
                  }
                }
              }}
              variant="outline"
              className="w-full h-12 rounded-xl border-2 border-slate-300 text-slate-800 font-black shadow-sm active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-700 shrink-0" />
              പ്രിന്റ് (Print A4)
            </Button>
          </div>

          <Button 
            onClick={() => {
              const tokensList: string[] = Object.values(newlyAssignedTokens).map(t => String(t));
              const primaryToken: string = tokensList[0] || '';
              const allCats = new Set<string>();
              if (selfSelected) selfCategories.forEach(c => allCats.add(c));
              if (parentSelected) parentCategories.forEach(c => allCats.add(c));
              if (childSelected) childCategories.forEach(c => allCats.add(c));
              if (spouseSelected) spouseCategories.forEach(c => allCats.add(c));

              sendWAClaimMessage({
                userName: user.name,
                userMobile: user.mobile,
                tokenNo: primaryToken,
                tokensList,
                totalPaid: combinedTotalPaid,
                totalReceived: combinedTotalReceived,
                totalPending: combinedTotalPending,
                categories: Array.from(allCats),
                district: user.district
              });
            }}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-white shrink-0" />
            <span>വാട്സാപ്പ് കൺഫർമേഷൻ അയക്കുക (Send WhatsApp Message)</span>
          </Button>

          <Button 
            onClick={handleExitToDashboard} 
            className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 text-amber-400" />
            <span>തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് (Back to Dashboard)</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 relative pb-28 overflow-x-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-25 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitToDashboard}
            className="h-9 px-2.5 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer font-bold shrink-0 border border-slate-200"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline text-xs font-black">ഡാഷ്‌ബോർഡ്</span>
          </Button>
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
            <Users className="w-4.5 h-4.5 text-brand-blue" />
          </div>
          <div>
            <h3 className="text-xs font-black text-brand-blue uppercase tracking-tight">Member Financial Information Registry</h3>
            <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-widest">Register up to 3 direct family members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {submittedClaims.length > 0 && (
            <Button
              size="sm"
              onClick={() => setFormMode('statement')}
              className="h-8 px-3 rounded-lg bg-[#003366] hover:bg-[#002244] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>യഥാർത്ഥ ഫോം കാണുക ({submittedClaims.length})</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleExitToDashboard} 
            className="rounded-xl w-8 h-8 p-0 font-black text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            title="Close / Back to Dashboard"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 max-w-2xl mx-auto w-full">
        
        {/* Form Language Selector Bar */}
        <div className="bg-white rounded-2xl p-3 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-sm">
              🌐
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                {formLang === 'english' ? 'Form Display Language' : formLang === 'malayalam' ? 'ഫോം ഭാഷ' : 'ഫോം ഭാഷ (Form Language)'}
              </h4>
              <p className="text-[10px] font-bold text-slate-500">
                {formLang === 'english'
                  ? 'Print section always outputs pure English only'
                  : formLang === 'malayalam'
                  ? 'പ്രിന്റ് സെക്ഷനിൽ ഇംഗ്ലീഷ് മാത്രമായിരിക്കും വരുന്നത്'
                  : 'പ്രിന്റ് സെക്ഷനിൽ ഇംഗ്ലീഷ് മാത്രമായിരിക്കും വരുന്നത് (Print is always in English)'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setFormLang('english')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                formLang === 'english'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setFormLang('malayalam')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                formLang === 'malayalam'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              മലയാളം
            </button>
            <button
              type="button"
              onClick={() => setFormLang('bilingual')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                formLang === 'bilingual'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Eng + മല
            </button>
          </div>
        </div>

        {/* MISSING FIELDS ERROR BANNER */}
        <MissingFieldsBanner missing={missingFieldsSummary} onFocusField={scrollToField} />

        {/* SUBMITTED CARD OR FULL FORM: 1. APPLICANT CLAIM FORM (SELF / PRIMARY) */}
        {hasSelf && !editingSelf && (
          <div className="border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 rounded-3xl shadow-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-emerald-300">
                  ✓ 1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                      {selfClaim?.userName || customerName || user.name}
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      {t('1. Self (സമർപ്പിച്ചു)', '1. സ്വന്തം (സമർപ്പിച്ചു)')}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                    <span>{t('Token / Serial No:', 'ഔദ്യോഗിക ടോക്കൺ നമ്പർ:')}</span>
                    <span className="font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs">
                      {selfClaim?.tokenNo || selfClaim?.serialNo || 'SUBMITTED'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const allTokensMap: Record<string, string> = {};
                    if (selfClaim?.tokenNo || selfClaim?.serialNo) allTokensMap['Self'] = String(selfClaim.tokenNo || selfClaim.serialNo);
                    if (spouseClaim?.tokenNo || spouseClaim?.serialNo) allTokensMap[spouseClaim.relation || 'Spouse'] = String(spouseClaim.tokenNo || spouseClaim.serialNo);
                    if (parentClaim?.tokenNo || parentClaim?.serialNo) allTokensMap[parentClaim.relation || 'Parent'] = String(parentClaim.tokenNo || parentClaim.serialNo);
                    if (childClaim?.tokenNo || childClaim?.serialNo) allTokensMap[childClaim.relation || 'Child'] = String(childClaim.tokenNo || childClaim.serialNo);
                    setNewlyAssignedTokens(allTokensMap);
                    setCompleted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>{t('Serial Card', 'സീരിയൽ കാർഡ്')}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (selfClaim) populateSelfFromClaim(selfClaim);
                    setEditingSelf(true);
                    setSelfSelected(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-slate-950" />
                  <span>{t('Edit Form 1', 'ഫോം എഡിറ്റ് ചെയ്യുക')}</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Highrich ID', 'ഹൈറിച്ച് ഐഡി')}</span>
                <span className="font-mono font-bold text-slate-800">{selfClaim?.highrichId || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Mobile Number', 'മൊബൈൽ നമ്പർ')}</span>
                <span className="font-mono font-bold text-slate-800">{selfClaim?.userMobile || customerMobile || user.mobile || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Total Pending', 'ആകെ മിച്ച തുക')}</span>
                <span className="font-black text-emerald-700">₹{(selfClaim?.totalPending || selfTotalPending || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* GOLD WRAPPER: 1. APPLICANT CLAIM FORM (SELF / PRIMARY) */}
        {(!hasSelf || editingSelf) && (
        <div className="border-2 border-amber-400 dark:border-amber-500 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl ring-2 ring-amber-400/20 overflow-hidden p-4 sm:p-6 space-y-6">
          {editingSelf && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {t('Editing Form 1 (Self) Information', 'ഫോം 1 (സ്വന്തം വിവരങ്ങൾ) എഡിറ്റ് ചെയ്യുന്നു')}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingSelf(false)}
                className="h-8 px-3 text-[11px] font-bold border-amber-400 text-amber-900 bg-white hover:bg-amber-50"
              >
                {t('Cancel Edit', 'റദ്ദാക്കുക')}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-4 sm:p-5 rounded-2xl gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-300">
                👑 1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  {t('1. APPLICANT CLAIM FORM (PRIMARY / SELF)', '1. അപേക്ഷകന്റെ സ്വന്തം ക്ലെയിം ഫോം')}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t('Primary Claimant Profile & Settlement Form', 'പ്രധാന അപേക്ഷകന്റെ വ്യക്തിഗത & സെറ്റിൽമെന്റ് ഫോം')}
                </p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-xl px-3 py-1 shadow-xs">
              {t('Form 1 (Self)', 'ഫോം 1 (സ്വന്തം)')}
            </Badge>
          </div>

        {/* 1. Customer & Declarant Information Input Card */}
        <Card className="border-2 border-slate-300 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden bg-white/95 backdrop-blur-xl">
          <CardContent className="p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003366] to-slate-800 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-slate-100">
                  👤
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t('1. Applicant Personal Profile (Customer & Declarant Profile)', '1. അപേക്ഷകന്റെ വ്യക്തിഗത വിവരങ്ങൾ')}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    {t('Customer Settlement Form Information', 'കസ്റ്റമർ സെറ്റിൽമെന്റ് ഫോം വിവരങ്ങൾ')}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-lg px-2 py-0.5">
                {t('Auto-fills A4 Print Form', 'A4 പ്രിന്റ് ഫോമിലേക്ക് ചേർക്കുന്നു')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Applicant Name Column */}
              <FormFieldBox 
                id="field-customerName"
                label={tLabel('Applicant Name (Customer Name) *', 'അപേക്ഷകന്റെ പേര് *')}
                icon="👤"
                theme="blue"
                required
                error={validationErrors['customerName']}
              >
                <Input 
                  value={customerName} 
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    clearFieldError('customerName');
                  }} 
                  placeholder={tPlaceholder('Full Name as per records', 'രേഖകളിലുള്ള മുഴുവൻ പേര്')}
                  className={`h-10 border ${validationErrors['customerName'] ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300'} rounded-xl font-bold bg-white focus:bg-white focus:border-brand-blue text-xs sm:text-sm text-slate-900 shadow-2xs`}
                />
              </FormFieldBox>

              {/* Registered Mobile Number Column */}
              <FormFieldBox 
                id="field-customerMobile"
                label={tLabel('Registered Mobile Number *', 'രജിസ്റ്റേർഡ് മൊബൈൽ നമ്പർ *')}
                icon="📱"
                theme="blue"
                required
                error={validationErrors['customerMobile']}
              >
                <Input 
                  value={customerMobile} 
                  onChange={(e) => {
                    setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                    clearFieldError('customerMobile');
                  }} 
                  placeholder={tPlaceholder('10-digit Mobile Number', '10 അക്ക മൊബൈൽ നമ്പർ')}
                  type="tel"
                  maxLength={10}
                  className={`h-10 border ${validationErrors['customerMobile'] ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300'} rounded-xl font-bold bg-white focus:bg-white focus:border-brand-blue text-xs sm:text-sm text-slate-900 font-mono shadow-2xs`}
                />
              </FormFieldBox>

              {/* Full Address Column */}
              <FormFieldBox 
                label={tLabel('Full Residential Address', 'മേൽവിലാസം')}
                icon="🏠"
                theme="indigo"
                className="md:col-span-2"
              >
                <Input 
                  value={customerAddress} 
                  onChange={(e) => handleCustomerAddressChange(e.target.value)} 
                  placeholder={tPlaceholder('House Name, Street, Locality', 'വീട്ടുപേര്, സ്ഥലം, ലൊക്കാലിറ്റി')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* District Column */}
              <FormFieldBox 
                label={tLabel('District', 'ജില്ല')}
                icon="📍"
                theme="indigo"
              >
                <Input 
                  value={customerDistrict} 
                  onChange={(e) => handleCustomerDistrictChange(e.target.value)} 
                  placeholder={tPlaceholder('District', 'ജില്ല')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Assembly Constituency Column */}
              <FormFieldBox 
                label={tLabel('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                icon="🏛️"
                theme="indigo"
              >
                <Input 
                  value={customerConstituency} 
                  onChange={(e) => handleCustomerConstituencyChange(e.target.value)} 
                  placeholder={tPlaceholder('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Post Office Column */}
              <FormFieldBox 
                label={tLabel('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                icon="📬"
                theme="slate"
              >
                <Input 
                  value={customerPostOffice} 
                  onChange={(e) => handleCustomerPostOfficeChange(e.target.value)} 
                  placeholder={tPlaceholder('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* PIN Code Column */}
              <FormFieldBox 
                label={tLabel('PIN Code', 'പിൻകോഡ്')}
                icon="📮"
                theme="slate"
              >
                <Input 
                  value={customerPincode} 
                  onChange={(e) => handleCustomerPincodeChange(e.target.value)} 
                  placeholder={tPlaceholder('6-digit PIN', '6 അക്ക പിൻകോഡ്')}
                  maxLength={6}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                />
              </FormFieldBox>

              {/* PAN Card Column */}
              <FormFieldBox 
                id="field-customerPan"
                label={tLabel('PAN Card Number *', 'പാൻ കാർഡ് നമ്പർ *')}
                icon="💳"
                theme="purple"
                required
                error={validationErrors['customerPan']}
                className="md:col-span-2"
              >
                <Input 
                  value={customerPan} 
                  onChange={(e) => {
                    setCustomerPan(e.target.value.toUpperCase());
                    clearFieldError('customerPan');
                  }} 
                  placeholder={tPlaceholder('e.g. ABCDE1234F', 'പാൻ നമ്പർ നൽകുക (ഉദാ: ABCDE1234F)')}
                  maxLength={10}
                  className={`h-10 border ${validationErrors['customerPan'] ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300'} rounded-xl font-bold bg-white focus:bg-white focus:border-purple-600 text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-2xs`}
                />
              </FormFieldBox>
            </div>
          </CardContent>
        </Card>

        {/* SLOT 1: SELF CLAIM (ആ വ്യക്തി) */}
        {(!hasSelf || editingSelf) && (
        <Card className="border border-slate-200/90 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden bg-white/95 backdrop-blur-xl">
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3.5 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-blue to-indigo-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-blue-50">1</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    {t('1. Self Claim (Self Claimant)', '1. സ്വന്തം ക്ലെയിം')}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    {t('Primary member details', 'പ്രധാന വ്യക്തിയുടെ വിവരങ്ങൾ')}
                  </p>
                </div>
              </div>
              <Checkbox 
                checked={selfSelected} 
                onCheckedChange={(val) => setSelfSelected(!!val)} 
                className="w-5 h-5 border-slate-300 rounded-md data-[state=checked]:bg-brand-blue cursor-pointer" 
              />
            </div>

            {selfSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Claimant Name Column */}
                  <FormFieldBox 
                    label={tLabel('Claimant Name *', 'പേര് *')}
                    icon="👤"
                    theme="blue"
                    required
                  >
                    <Input 
                      value={selfName} 
                      onChange={(e) => setSelfName(e.target.value)} 
                      placeholder={tPlaceholder('Enter Full Name', 'മുഴുവൻ പേര് നൽകുക')}
                      className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-brand-blue text-xs sm:text-sm text-slate-900 shadow-2xs"
                    />
                  </FormFieldBox>

                  {/* Customer ID Column */}
                  <FormFieldBox 
                    label={tLabel('Customer ID (Optional)', 'കസ്റ്റമർ ഐഡി (ഓപ്ഷണൽ)')}
                    icon="🆔"
                    theme="purple"
                    optional
                  >
                    <Input 
                      value={selfHighrichId} 
                      onChange={(e) => setSelfHighrichId(e.target.value)} 
                      placeholder={tPlaceholder('Enter Customer ID if known', 'കസ്റ്റമർ ഐഡി അറിയാമെങ്കിൽ നൽകുക')}
                      className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-purple-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                    />
                  </FormFieldBox>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-slate-50/90 p-3.5 rounded-2xl border-2 border-slate-300/80 flex items-center gap-3 shadow-xs">
                   <Checkbox 
                     id="self-no-breakup"
                     checked={selfNoBreakup}
                     onCheckedChange={(val) => setSelfNoBreakup(!!val)}
                     className="w-4 h-4 rounded-md cursor-pointer"
                   />
                   <Label htmlFor="self-no-breakup" className="text-[11px] font-bold text-slate-700 leading-tight cursor-pointer">
                     {t('Provide single manual total without category breakup', 'കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)')}
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {selfNoBreakup ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 border-2 border-slate-300 rounded-3xl shadow-xs">
                      <FormFieldBox 
                        label={tLabel('Paid Amount', 'തുക നൽകിയത്')}
                        icon="💰"
                        theme="amber"
                      >
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input 
                            type="number"
                            placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')}
                            value={selfTotalPaid || ''}
                            onChange={(e) => handleTotalChange('self', 'paid', e.target.value)}
                            className="pl-8 h-10 bg-white border border-slate-300 focus:border-amber-600 rounded-xl font-black text-sm text-slate-900 shadow-2xs"
                          />
                        </div>
                      </FormFieldBox>
                      <FormFieldBox 
                        label={tLabel('Received Amount', 'ലഭിച്ച തുക')}
                        icon="💵"
                        theme="emerald"
                      >
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input 
                            type="number"
                            placeholder={tPlaceholder('Received', 'ലഭിച്ച തുക')}
                            value={selfTotalReceived || ''}
                            onChange={(e) => handleTotalChange('self', 'received', e.target.value)}
                            className="pl-8 h-10 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl font-black text-sm text-slate-900 shadow-2xs"
                          />
                        </div>
                      </FormFieldBox>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-800 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
                      📂 <span>{tLabel('Select Applicable Categories', 'ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = selfCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setSelfCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3.5 py-2 border-2 rounded-xl cursor-pointer text-xs font-black flex items-center gap-2 transition-all shadow-2xs ${isSel ? 'border-brand-magenta bg-brand-magenta/[0.08] text-brand-magenta scale-[1.01]' : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none rounded" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {selfCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border-2 border-slate-300 rounded-2xl bg-white gap-3 shadow-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#003366] text-white text-xs font-black tracking-wide shadow-2xs shrink-0">
                              📂 <span>{cat?.heading || catId}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:w-80">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black uppercase">
                                  💰 <span>{t('Paid', 'നൽകിയത്')}</span>
                                </div>
                                <Input 
                                  type="number" 
                                  placeholder={tPlaceholder('Paid', 'നൽകിയത്')} 
                                  value={selfCategoryDetails[catId]?.paid || ''}
                                  onChange={(e) => handleCategoryDetailChange('self', catId, 'paid', e.target.value)}
                                  className="h-10 border border-slate-300 text-xs font-bold text-slate-800 bg-white placeholder:text-[10px] rounded-xl shadow-2xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-black uppercase">
                                  💵 <span>{t('Received', 'ലഭിച്ചത്')}</span>
                                </div>
                                <Input 
                                  type="number" 
                                  placeholder={tPlaceholder('Received', 'ലഭിച്ചത്')} 
                                  value={selfCategoryDetails[catId]?.received || ''}
                                  onChange={(e) => handleCategoryDetailChange('self', catId, 'received', e.target.value)}
                                  className="h-10 border border-slate-300 text-xs font-bold text-slate-800 bg-white placeholder:text-[10px] rounded-xl shadow-2xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <FormFieldBox 
                  label={tLabel('Notes / Remarks', 'നോട്ട് / കൂടുതൽ വിവരങ്ങൾ (ഓപ്ഷണൽ)')}
                  icon="📝"
                  theme="slate"
                >
                  <textarea 
                    value={selfNotes} 
                    onChange={(e) => setSelfNotes(e.target.value)} 
                    placeholder={tPlaceholder(
                      'Enter any additional remarks if needed...',
                      'കൂടുതൽ വിവരങ്ങൾ എന്തെങ്കിലും ഉണ്ടെങ്കിൽ ഇവിടെ രേഖപ്പെടുത്താം...'
                    )}
                    className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl focus:border-brand-blue focus:bg-white focus:ring-0 focus:outline-none min-h-20 bg-white text-slate-900 shadow-2xs"
                  />
                </FormFieldBox>

                {/* Amount mini-badge */}
                <div className="bg-slate-900 text-white rounded-2xl p-3.5 flex justify-between items-center text-xs font-bold shadow-sm">
                  <span className="text-slate-300">{t('Total Pending Amount:', 'ആകെ മിച്ച തുക:')}</span>
                  <span className="text-base font-black text-emerald-400">₹{selfTotalPending.toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        )}

        {/* 1. PAYMENT MADE DETAILS (1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ) */}
        <Card className="border-2 border-indigo-200 rounded-3xl shadow-[0_8px_30px_rgba(99,102,241,0.06)] overflow-hidden bg-white/95 backdrop-blur-xl">
          <CardContent className="p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5 border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-indigo-50">
                  💳
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t('1. DETAILS OF ACCOUNT TO WHICH YOU PAID', '1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ (അറിയാമെങ്കിൽ)')}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">
                    {t('Account & payment details (Fill only if known / remember)', 'കമ്പനിയിലേക്ക് പണം നൽകിയ വിവരങ്ങൾ (ഓർമ്മയുണ്ടെങ്കിൽ മാത്രം)')}
                  </p>
                </div>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold rounded-lg px-2 py-0.5">
                {t('Optional', 'ഓപ്ഷണൽ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Number to which you paid */}
              <FormFieldBox 
                label={tLabel('Account Number you paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ')}
                icon="💳"
                theme="indigo"
                optional
                className="md:col-span-2"
              >
                <Input 
                  value={paidFromAccount} 
                  onChange={(e) => setPaidFromAccount(e.target.value)} 
                  placeholder={tPlaceholder('Enter Account Number paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ നൽകുക')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                />
              </FormFieldBox>

              {/* Paid Bank Name */}
              <FormFieldBox 
                label={tLabel('Bank', 'ബാങ്ക്')}
                icon="🏦"
                theme="indigo"
                optional
              >
                <Input 
                  value={paidFromBank} 
                  onChange={(e) => setPaidFromBank(e.target.value)} 
                  placeholder={tPlaceholder('e.g. State Bank of India / HDFC Bank', 'ഉദാ: State Bank of India / Federal Bank')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Branch */}
              <FormFieldBox 
                label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                icon="📍"
                theme="indigo"
                optional
              >
                <Input 
                  value={paidFromBranch} 
                  onChange={(e) => setPaidFromBranch(e.target.value)} 
                  placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Payment Date */}
              <FormFieldBox 
                label={tLabel('Payment Date (If Known)', 'പണം കൊടുത്ത തീയതി (അറിയാമെങ്കിൽ)')}
                icon="📅"
                theme="indigo"
                optional
              >
                <Input 
                  type="date"
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Transaction ID / UTR */}
              <FormFieldBox 
                label={tLabel('Transaction ID / UTR (If Known)', 'ട്രാൻസാക്ഷൻ ഐഡി / UTR (അറിയാമെങ്കിൽ)')}
                icon="🔢"
                theme="indigo"
                optional
              >
                <Input 
                  value={transactionRef} 
                  onChange={(e) => setTransactionRef(e.target.value)} 
                  placeholder={tPlaceholder('Transaction ID / UTR Reference', 'ട്രാൻസാക്ഷൻ ഐഡി അല്ലെങ്കിൽ UTR നമ്പർ')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                />
              </FormFieldBox>
            </div>
          </CardContent>
        </Card>

        {/* 2. YOUR ACCOUNT DETAILS PROVIDED TO COMPANY (2. കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ) */}
        <Card className="border-2 border-emerald-300 rounded-3xl shadow-[0_8px_30px_rgba(16,185,129,0.08)] overflow-hidden bg-white/95 backdrop-blur-xl">
          <CardContent className="p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-emerald-100 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-emerald-50">
                  🏦
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t('2. YOUR BANK ACCOUNT DETAILS GIVEN TO COMPANY', '2. കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ')}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">
                    {t('Your registered account for settlements', 'നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത ബാങ്ക് അക്കൗണ്ട് വിവരങ്ങൾ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your Account Number in Company */}
              <FormFieldBox 
                label={tLabel('Your Bank Account Number in Company *', 'കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് നമ്പർ *')}
                icon="🏦"
                theme="emerald"
                required
                className="md:col-span-2"
              >
                <Input 
                  value={settlementAccountNumber} 
                  onChange={(e) => setSettlementAccountNumber(e.target.value)} 
                  placeholder={tPlaceholder('Enter Your Bank Account Number', 'നിങ്ങളുടെ ബാങ്ക് അക്കൗണ്ട് നമ്പർ നൽകുക')}
                  className="h-10 border border-emerald-300 rounded-xl font-bold bg-white focus:bg-white focus:border-emerald-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                />
              </FormFieldBox>

              {/* Bank Name */}
              <FormFieldBox 
                label={tLabel('Bank', 'ബാങ്ക്')}
                icon="🏦"
                theme="teal"
              >
                <Input 
                  value={settlementBankName} 
                  onChange={(e) => setSettlementBankName(e.target.value)} 
                  placeholder={tPlaceholder('e.g. State Bank of India / Federal Bank', 'ഉദാ: State Bank of India / Federal Bank')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-teal-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* Branch */}
              <FormFieldBox 
                label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                icon="📍"
                theme="teal"
              >
                <Input 
                  value={settlementBranch} 
                  onChange={(e) => setSettlementBranch(e.target.value)} 
                  placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-teal-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                />
              </FormFieldBox>

              {/* IFSC Code */}
              <FormFieldBox 
                label={tLabel('IFSC Code (If Known)', 'IFSC കോഡ് (അറിയാമെങ്കിൽ)')}
                icon="🏛️"
                theme="teal"
                optional
              >
                <Input 
                  value={settlementIfsc} 
                  onChange={(e) => setSettlementIfsc(e.target.value.toUpperCase())} 
                  placeholder="e.g. SBIN0001234"
                  className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-teal-600 text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-2xs"
                />
              </FormFieldBox>
            </div>
          </CardContent>
        </Card>

          {/* FUTURE PREFERENCE, HARDSHIPS & CONDITIONS/DECLARATION (INSIDE GOLD BOX) */}
          {renderFutureAndConditionsBlock('self')}

          {/* INLINE SUBMIT BUTTON FOR FORM 1 */}
          <div className="space-y-4">
            <MissingFieldsBanner missing={missingFieldsSummary} onFocusField={scrollToField} />
            <div className="pt-4 border-t-2 border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-300/60">
              <div className="text-xs font-bold text-slate-800 space-y-0.5">
                <div className="font-black text-amber-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t('Applicant Form Completed', 'അപേക്ഷകന്റെ ഫോം പൂർത്തിയായി')}
                </div>
                <p className="text-[11px] text-slate-600">
                  {t('Click below to submit this claim form immediately and get official token.', 'ഈ ക്ലെയിം ഫോം സമർപ്പിക്കാനും ഔദ്യോഗിക ടോക്കൺ നമ്പർ നേടാനും താഴെയുള്ള ബട്ടൺ അമർത്തുക.')}
                </p>
              </div>
              <Button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit('Self')}
                className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all cursor-pointer shrink-0"
              >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" /> {t('Saving Details...', 'വിവരങ്ങൾ സേവ് ചെയ്യുന്നു...')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-amber-200" />
                        {editingSelf ? t('Update Form 1 Details', 'ഫോം 1 അപ്ഡേറ്റ് ചെയ്യുക') : t('Submit Claim Form', 'ഫോം സബ്മിറ്റ് ചെയ്യുക')}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

        {/* SECTION DIVIDER: FAMILY MEMBERS CLAIMS (OPTIONAL - MAX 4 PERSONS IN TOTAL) */}
        <div className="bg-gradient-to-r from-pink-50 via-slate-50 to-indigo-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-2.5">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-brand-magenta shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                {t('Family Members Claim (Optional - Fill only if applicable)', 'കുടുംബാംഗങ്ങളുടെ ക്ലെയിം (ആവശ്യമെങ്കിൽ മാത്രം പൂരിപ്പിക്കുക - ഓപ്ഷണൽ)')}
              </h4>
              <p className="text-slate-700 font-bold text-xs leading-relaxed">
                {t(
                  'If you also wish to include claim details for your family members, please select and fill the respective sections below in order: 2. Spouse (Wife/Husband), 3. Parent (Mother/Father), 4. Child (Son/Daughter). Each member will receive an individual official court serial register token.',
                  'താങ്കളുടെ കുടുംബാംഗങ്ങളുടെ തുകകൾ കൂടി രേഖപ്പെടുത്താൻ ആഗ്രഹിക്കുന്നുവെങ്കിൽ താഴെ നൽകിയിട്ടുള്ള ക്രമത്തിൽ (2. ഭാര്യ / ഭർത്താവ്, 3. അമ്മ / അച്ഛൻ, 4. മകൻ / മകൾ) ആവശ്യമുള്ള ബോക്സ് ടിക്ക് ചെയ്ത് വിവരങ്ങൾ പൂരിപ്പിക്കുക. ഓരോ വ്യക്തിക്കും വ്യക്തിഗതമായ ഔദ്യോഗിക കോർട്ട് സീരിയൽ നമ്പർ ലഭിക്കുന്നതാണ്.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* SUBMITTED CARD OR FULL FORM: 2. SPOUSE CLAIM FORM */}
        {hasSpouse && !editingSpouse && (
          <div className="border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 rounded-3xl shadow-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-emerald-300">
                  ✓ 2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                      {spouseClaim?.userName || spouseName}
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      {spouseClaim?.relation === 'Wife' ? t('2. Wife (ഭാര്യ - സമർപ്പിച്ചു)', '2. ഭാര്യ (സമർപ്പിച്ചു)') : t('2. Husband (ഭർത്താവ് - സമർപ്പിച്ചു)', '2. ഭർത്താവ് (സമർപ്പിച്ചു)')}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                    <span>{t('Token / Serial No:', 'ഔദ്യോഗിക ടോക്കൺ നമ്പർ:')}</span>
                    <span className="font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs">
                      {spouseClaim?.tokenNo || spouseClaim?.serialNo || 'SUBMITTED'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const allTokensMap: Record<string, string> = {};
                    if (selfClaim?.tokenNo || selfClaim?.serialNo) allTokensMap['Self'] = String(selfClaim.tokenNo || selfClaim.serialNo);
                    if (spouseClaim?.tokenNo || spouseClaim?.serialNo) allTokensMap[spouseClaim.relation || 'Spouse'] = String(spouseClaim.tokenNo || spouseClaim.serialNo);
                    if (parentClaim?.tokenNo || parentClaim?.serialNo) allTokensMap[parentClaim.relation || 'Parent'] = String(parentClaim.tokenNo || parentClaim.serialNo);
                    if (childClaim?.tokenNo || childClaim?.serialNo) allTokensMap[childClaim.relation || 'Child'] = String(childClaim.tokenNo || childClaim.serialNo);
                    setNewlyAssignedTokens(allTokensMap);
                    setCompleted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>{t('Serial Card', 'സീരിയൽ കാർഡ്')}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (spouseClaim) populateSpouseFromClaim(spouseClaim);
                    setEditingSpouse(true);
                    setSpouseSelected(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-slate-950" />
                  <span>{t('Edit Form 2', 'ഫോം എഡിറ്റ് ചെയ്യുക')}</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Highrich ID', 'ഹൈറിച്ച് ഐഡി')}</span>
                <span className="font-mono font-bold text-slate-800">{spouseClaim?.highrichId || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Mobile Number', 'മൊബൈൽ നമ്പർ')}</span>
                <span className="font-mono font-bold text-slate-800">{spouseClaim?.individualMobile || (spouseClaim?.memberMobile && spouseClaim?.memberMobile !== spouseClaim?.userMobile ? spouseClaim?.memberMobile : '') || spouseClaim?.userMobile || spouseMobile || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Total Pending', 'ആകെ മിച്ച തുക')}</span>
                <span className="font-black text-emerald-700">₹{(spouseClaim?.totalPending || spouseTotalPending || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* GOLD WRAPPER: 2. SPOUSE CLAIM FORM */}
        {(!hasSpouse || editingSpouse) && (
        <div className="border-2 border-amber-400 dark:border-amber-500 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl ring-2 ring-amber-400/20 overflow-hidden p-4 sm:p-6 space-y-6">
          {editingSpouse && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {t('Editing Form 2 (Spouse) Information', 'ഫോം 2 (ഭാര്യ / ഭർത്താവ് വിവരങ്ങൾ) എഡിറ്റ് ചെയ്യുന്നു')}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingSpouse(false)}
                className="h-8 px-3 text-[11px] font-bold border-amber-400 text-amber-900 bg-white hover:bg-amber-50"
              >
                {t('Cancel Edit', 'റദ്ദാക്കുക')}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-4 sm:p-5 rounded-2xl gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-300">
                👑 2
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  {t('2. SPOUSE CLAIM FORM (WIFE / HUSBAND)', '2. ഭാര്യ / ഭർത്താവ് ക്ലെയിം ഫോം')}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t('Spouse Settlement Claim Form', 'ഭാര്യ അല്ലെങ്കിൽ ഭർത്താവിന്റെ സെറ്റിൽമെന്റ് ഫോം')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-xl px-3 py-1 shadow-xs">
                {t('Form 2 (Spouse)', 'ഫോം 2 (സ്പൗസ്)')}
              </Badge>
              <Checkbox 
                checked={spouseSelected} 
                onCheckedChange={(val) => {
                  setSpouseSelected(!!val);
                  if (!!val) {
                    if (!spouseRelation) setSpouseRelation('Wife');
                    const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                    const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                    const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                    const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                    const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                    if (!spouseAddress && addr) setSpouseAddress(addr);
                    if (!spouseDistrict && dist) setSpouseDistrict(dist);
                    if (!spouseConstituency && consti) setSpouseConstituency(consti);
                    if (!spousePostOffice && po) setSpousePostOffice(po);
                    if (!spousePincode && pin) setSpousePincode(pin);
                  }
                }} 
                className="w-5 h-5 border-amber-400 rounded-md data-[state=checked]:bg-amber-600 cursor-pointer" 
              />
            </div>
          </div>

          {!spouseSelected && (
            <div 
              onClick={() => {
                setSpouseSelected(true);
                if (!spouseRelation) setSpouseRelation('Wife');
                const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                if (!spouseAddress && addr) setSpouseAddress(addr);
                if (!spouseDistrict && dist) setSpouseDistrict(dist);
                if (!spouseConstituency && consti) setSpouseConstituency(consti);
                if (!spousePostOffice && po) setSpousePostOffice(po);
                if (!spousePincode && pin) setSpousePincode(pin);
              }}
              className="p-4 bg-amber-50/50 hover:bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💍</span>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {t('Click here to fill Spouse (Wife / Husband) Form', 'ഭാര്യ അല്ലെങ്കിൽ ഭർത്താവിന്റെ വിവരങ്ങൾ പൂരിപ്പിക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {t('Adds an individual court serial registry number for spouse (Address auto-filled from Main Applicant)', 'ഭാര്യ/ഭർത്താവിന് പ്രത്യേക ഔദ്യോഗിക കോർട്ട് നമ്പർ ലഭിക്കുന്നു (മേൽവിലാസം ഓട്ടോമാറ്റിക്കായി ചേർക്കും)')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs font-bold border-amber-400 text-amber-800 bg-white">
                {t('+ Open Form', '+ ഫോം തുറക്കുക')}
              </Button>
            </div>
          )}

          {spouseSelected && (
            <CardContent className="p-0 space-y-6">

            {spouseSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Relationship selector - Wife or Husband */}
                <FormFieldBox
                  label={tLabel('Relationship with Applicant (Wife / Husband)', 'അപേക്ഷകനുമായുള്ള ബന്ധം (ഭാര്യ / ഭർത്താവ്)')}
                  icon="💍"
                  badge={t('Required', 'നിർബന്ധം')}
                  badgeType="required"
                  theme="rose"
                >
                  <RadioGroup 
                    value={spouseRelation} 
                    onValueChange={(val) => setSpouseRelation(val as 'Wife' | 'Husband')} 
                    className="flex flex-wrap gap-4 pt-1"
                  >
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-rose-200 shadow-2xs">
                      <RadioGroupItem value="Wife" id="spouse-wife" className="text-brand-magenta" />
                      <Label htmlFor="spouse-wife" className="text-xs font-black text-slate-800 cursor-pointer">
                        👰 {t('Wife', 'ഭാര്യ')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-rose-200 shadow-2xs">
                      <RadioGroupItem value="Husband" id="spouse-husband" className="text-brand-magenta" />
                      <Label htmlFor="spouse-husband" className="text-xs font-black text-slate-800 cursor-pointer">
                        🤵 {t('Husband', 'ഭർത്താവ്')}
                      </Label>
                    </div>
                  </RadioGroup>
                </FormFieldBox>

                {/* Spouse Personal Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFieldBox
                    id="field-spouseName"
                    label={tLabel('Spouse Full Name *', 'ഭാര്യ / ഭർത്താവിന്റെ മുഴുവൻ പേര് *')}
                    icon="👤"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="rose"
                    error={validationErrors['spouseName']}
                  >
                    <Input 
                      value={spouseName} 
                      onChange={(e) => {
                        setSpouseName(e.target.value);
                        clearFieldError('spouseName');
                      }} 
                      placeholder={tPlaceholder('Enter Full Name', 'മുഴുവൻ പേര് നൽകുക')}
                      className={`h-11 border-2 ${validationErrors['spouseName'] ? 'border-rose-500 bg-rose-50/50' : 'border-rose-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-rose-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    id="field-spouseMobile"
                    label={tLabel('Spouse Mobile Number *', 'ഭാര്യ / ഭർത്താവിന്റെ മൊബൈൽ നമ്പർ *')}
                    icon="📱"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="rose"
                    error={validationErrors['spouseMobile']}
                  >
                    <Input 
                      value={spouseMobile} 
                      onChange={(e) => {
                        setSpouseMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                        clearFieldError('spouseMobile');
                      }} 
                      placeholder={tPlaceholder('10-digit Mobile Number', '10 അക്ക മൊബൈൽ നമ്പർ നൽകുക')}
                      type="tel"
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['spouseMobile'] ? 'border-rose-500 bg-rose-50/50' : 'border-rose-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-xs focus:border-rose-500`}
                    />
                  </FormFieldBox>

                  {/* Spouse PAN Card Number (Mandatory) */}
                  <FormFieldBox
                    id="field-spousePan"
                    label={tLabel('Spouse PAN Card Number *', 'ഭാര്യ / ഭർത്താവിന്റെ പാൻ കാർഡ് നമ്പർ *')}
                    icon="💳"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="purple"
                    error={validationErrors['spousePan']}
                  >
                    <Input 
                      value={spousePan} 
                      onChange={(e) => {
                        setSpousePan(e.target.value.toUpperCase());
                        clearFieldError('spousePan');
                      }} 
                      placeholder={tPlaceholder('e.g. ABCDE1234F', 'പാൻ കാർഡ് നമ്പർ (ഉദാ: ABCDE1234F)')}
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['spousePan'] ? 'border-rose-500 bg-rose-50/50' : 'border-purple-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-xs focus:border-purple-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    label={tLabel('Spouse Customer ID', 'ഭാര്യ / ഭർത്താവിന്റെ കസ്റ്റമർ ഐഡി')}
                    icon="🆔"
                    badge={t('Optional', 'ഓപ്ഷണൽ')}
                    badgeType="optional"
                    theme="slate"
                  >
                    <Input 
                      value={spouseHighrichId} 
                      onChange={(e) => setSpouseHighrichId(e.target.value)} 
                      placeholder={tPlaceholder('Enter Customer ID if known', 'കസ്റ്റമർ ഐഡി അറിയാമെങ്കിൽ നൽകുക')}
                      className="h-11 border-2 border-slate-200 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-slate-400"
                    />
                  </FormFieldBox>
                </div>

                {/* Spouse Residential Address Section */}
                <div className="border-2 border-rose-200 bg-rose-50/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-rose-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-pink-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-rose-50">
                        🏠
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex flex-wrap items-center gap-2">
                          <span>{t('Spouse Residential Address', 'ഭാര്യ / ഭർത്താവിന്റെ മേൽവിലാസം')}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-normal">
                            ✓ {t('Same as Main Applicant', 'മെയിൻ മെമ്പറുടെ അതേ മേൽവിലാസം')}
                          </span>
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Pre-filled automatically. Edit below only if different.', 'ഓട്ടോമാറ്റിക്കായി ചേർത്തതാണ്. മാറ്റമുണ്ടെങ്കിൽ മാത്രം താഴെ തിരുത്തുക.')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                        const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                        const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                        const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                        const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                        setSpouseAddress(addr);
                        setSpouseDistrict(dist);
                        setSpouseConstituency(consti);
                        setSpousePostOffice(po);
                        setSpousePincode(pin);
                        toast.success(t('Applicant address re-synced to Spouse!', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്തു!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-rose-300 text-rose-900 hover:bg-rose-100 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      🔄 {t('Re-sync from Applicant', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്യുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Address */}
                    <FormFieldBox 
                      label={tLabel('Full Residential Address', 'മേൽവിലാസം')}
                      icon="🏠"
                      theme="rose"
                      className="md:col-span-2"
                    >
                      <Input 
                        value={spouseAddress} 
                        onChange={(e) => setSpouseAddress(e.target.value)} 
                        placeholder={tPlaceholder('House Name, Street, Locality', 'വീട്ടുപേര്, സ്ഥലം, ലൊക്കാലിറ്റി')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-rose-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* District */}
                    <FormFieldBox 
                      label={tLabel('District', 'ജില്ല')}
                      icon="📍"
                      theme="rose"
                    >
                      <Input 
                        value={spouseDistrict} 
                        onChange={(e) => setSpouseDistrict(e.target.value)} 
                        placeholder={tPlaceholder('District', 'ജില്ല')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-rose-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Assembly Constituency */}
                    <FormFieldBox 
                      label={tLabel('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                      icon="🏛️"
                      theme="rose"
                    >
                      <Input 
                        value={spouseConstituency} 
                        onChange={(e) => setSpouseConstituency(e.target.value)} 
                        placeholder={tPlaceholder('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-rose-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Post Office */}
                    <FormFieldBox 
                      label={tLabel('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                      icon="📬"
                      theme="slate"
                    >
                      <Input 
                        value={spousePostOffice} 
                        onChange={(e) => setSpousePostOffice(e.target.value)} 
                        placeholder={tPlaceholder('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* PIN Code */}
                    <FormFieldBox 
                      label={tLabel('PIN Code', 'പിൻകോഡ്')}
                      icon="📮"
                      theme="slate"
                    >
                      <Input 
                        value={spousePincode} 
                        onChange={(e) => setSpousePincode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        placeholder={tPlaceholder('6-digit PIN', '6 അക്ക പിൻകോഡ്')}
                        maxLength={6}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border-2 border-amber-200 flex items-center gap-3 shadow-xs">
                   <Checkbox 
                     id="spouse-no-breakup"
                     checked={spouseNoBreakup}
                     onCheckedChange={(val) => setSpouseNoBreakup(!!val)}
                     className="w-5 h-5 rounded border-amber-400 data-[state=checked]:bg-amber-600 cursor-pointer"
                   />
                   <Label htmlFor="spouse-no-breakup" className="text-xs font-black text-amber-950 leading-tight cursor-pointer">
                     {t('Provide single manual total without category breakup', 'കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)')}
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {spouseNoBreakup ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormFieldBox
                      label={tLabel('Total Paid Amount', 'ആകെ നൽകിയ തുക')}
                      icon="💵"
                      badge={t('Required', 'നിർബന്ധം')}
                      badgeType="required"
                      theme="rose"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')}
                          value={spouseTotalPaid || ''}
                          onChange={(e) => handleTotalChange('spouse', 'paid', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-rose-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-rose-500"
                        />
                      </div>
                    </FormFieldBox>

                    <FormFieldBox
                      label={tLabel('Total Received Amount', 'ആകെ ലഭിച്ച തുക')}
                      icon="💰"
                      badge={t('Received', 'ലഭിച്ചത്')}
                      badgeType="info"
                      theme="emerald"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Received', 'ലഭിച്ച തുക')}
                          value={spouseTotalReceived || ''}
                          onChange={(e) => handleTotalChange('spouse', 'received', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-emerald-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-emerald-500"
                        />
                      </div>
                    </FormFieldBox>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 text-[11px] font-black">1</span>
                        <span>{tLabel('Select Applicable Categories', 'ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക')}</span>
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = spouseCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setSpouseCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3.5 py-2.5 border-2 rounded-2xl cursor-pointer text-xs font-black flex items-center gap-2.5 transition-all ${isSel ? 'border-pink-500 bg-pink-50 text-pink-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none rounded" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                     {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {spouseCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-rose-100 rounded-2xl bg-rose-50/20 gap-3 shadow-xs">
                            <span className="text-xs font-black text-slate-800 shrink-0 w-36 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2.5 flex-1">
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')} 
                                value={spouseCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('spouse', catId, 'paid', e.target.value)}
                                className="h-10 border-2 border-rose-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Received Amount', 'ലഭിച്ച തുക')} 
                                value={spouseCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('spouse', catId, 'received', e.target.value)}
                                className="h-10 border-2 border-emerald-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <FormFieldBox
                  label={tLabel('Notes / Remarks Regarding Payment', 'നോട്ട് / പേയ്മെന്റ് കൂടുതൽ വിവരങ്ങൾ')}
                  icon="📝"
                  badge={t('Optional', 'ഓപ്ഷണൽ')}
                  badgeType="optional"
                  theme="slate"
                >
                  <textarea 
                    value={spouseNotes} 
                    onChange={(e) => setSpouseNotes(e.target.value)} 
                    placeholder={tPlaceholder(
                      'Enter any details regarding bank account paid from or transaction references...',
                      'ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം...'
                    )}
                    className="w-full text-xs font-semibold p-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 focus:ring-0 focus:outline-none min-h-20 bg-white text-slate-900 shadow-2xs"
                  />
                </FormFieldBox>

                {/* 1. PAYMENT MADE DETAILS (1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-indigo-200 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-indigo-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-indigo-50">
                        💳
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('1. DETAILS OF ACCOUNT TO WHICH YOU PAID', '1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ (അറിയാമെങ്കിൽ)')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Account & payment details (Fill only if known / remember)', 'കമ്പനിയിലേക്ക് പണം നൽകിയ വിവരങ്ങൾ (ഓർമ്മയുണ്ടെങ്കിൽ മാത്രം)')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold rounded-lg px-2 py-0.5">
                      {t('Optional', 'ഓപ്ഷണൽ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Number to which paid */}
                    <FormFieldBox 
                      label={tLabel('Account Number you paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ')}
                      icon="💳"
                      theme="indigo"
                      optional
                      className="md:col-span-2"
                    >
                      <Input 
                        value={spousePaidFromAccount} 
                        onChange={(e) => setSpousePaidFromAccount(e.target.value)} 
                        placeholder={tPlaceholder('Enter Account Number paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ നൽകുക')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Paid Bank Name */}
                    <FormFieldBox 
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏦"
                      theme="indigo"
                      optional
                    >
                      <Input 
                        value={spousePaidFromBank} 
                        onChange={(e) => setSpousePaidFromBank(e.target.value)} 
                        placeholder={tPlaceholder('e.g. State Bank of India / HDFC Bank', 'ഉദാ: State Bank of India / Federal Bank')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Branch */}
                    <FormFieldBox 
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      theme="indigo"
                      optional
                    >
                      <Input 
                        value={spousePaidFromBranch} 
                        onChange={(e) => setSpousePaidFromBranch(e.target.value)} 
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Payment Date */}
                    <FormFieldBox 
                      label={tLabel('Payment Date (If Known)', 'പണം കൊടുത്ത തീയതി (അറിയാമെങ്കിൽ)')}
                      icon="📅"
                      theme="indigo"
                      optional
                    >
                      <Input 
                        type="date"
                        value={spousePaymentDate} 
                        onChange={(e) => setSpousePaymentDate(e.target.value)} 
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Transaction ID / UTR */}
                    <FormFieldBox 
                      label={tLabel('Transaction ID / UTR (If Known)', 'ട്രാൻസാക്ഷൻ ഐഡി / UTR (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      theme="indigo"
                      optional
                    >
                      <Input 
                        value={spouseTransactionRef} 
                        onChange={(e) => setSpouseTransactionRef(e.target.value)} 
                        placeholder={tPlaceholder('Transaction ID / UTR Reference', 'ട്രാൻസാക്ഷൻ ഐഡി അല്ലെങ്കിൽ UTR നമ്പർ')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-indigo-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* 2. YOUR ACCOUNT DETAILS PROVIDED TO COMPANY (2. കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-emerald-300 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-emerald-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-emerald-50">
                        🏦
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('2. SPOUSE BANK ACCOUNT DETAILS GIVEN TO COMPANY', '2. കമ്പനിയിൽ നൽകിയ ഭാര്യ / ഭർത്താവിന്റെ അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Registered account for settlements', 'രജിസ്റ്റർ ചെയ്ത ബാങ്ക് അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (settlementAccountNumber) setSpouseSettlementAccountNumber(settlementAccountNumber);
                        if (customerPan) setSpousePan(customerPan);
                        if (settlementBankName) setSpouseSettlementBankName(settlementBankName);
                        if (settlementBranch) setSpouseSettlementBranch(settlementBranch);
                        if (settlementIfsc) setSpouseSettlementIfsc(settlementIfsc);
                        if (paidFromAccount) setSpousePaidFromAccount(paidFromAccount);
                        if (paidFromBank) setSpousePaidFromBank(paidFromBank);
                        if (paidFromBranch) setSpousePaidFromBranch(paidFromBranch);
                        if (paymentDate) setSpousePaymentDate(paymentDate);
                        if (transactionRef) setSpouseTransactionRef(transactionRef);
                        toast.success(t('Applicant bank details copied to Spouse!', 'അപേക്ഷകന്റെ ബാങ്ക് വിവരങ്ങൾ പകർത്തി!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      📋 {t('Copy from Applicant', 'അപേക്ഷകന്റെ വിവരങ്ങൾ പകർത്തുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bank Account Number Column */}
                    <FormFieldBox
                      label={tLabel('Bank Account Number Registered with Company *', 'കമ്പനിയിൽ നൽകിയ ബാങ്ക് അക്കൗണ്ട് നമ്പർ *')}
                      icon="💳"
                      required
                      theme="emerald"
                      className="md:col-span-2"
                    >
                      <Input
                        value={spouseSettlementAccountNumber}
                        onChange={(e) => setSpouseSettlementAccountNumber(e.target.value)}
                        placeholder={tPlaceholder('Bank account number registered with company', 'കമ്പനിയിൽ നൽകിയിട്ടുള്ള ബാങ്ക് അക്കൗണ്ട് നമ്പർ')}
                        className="h-10 border border-emerald-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-2xs focus:border-emerald-600"
                      />
                    </FormFieldBox>

                    {/* Bank Name Column */}
                    <FormFieldBox
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏛️"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={spouseSettlementBankName}
                        onChange={(e) => setSpouseSettlementBankName(e.target.value)}
                        placeholder="e.g. State Bank of India / Federal Bank"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* Branch Name Column */}
                    <FormFieldBox
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={spouseSettlementBranch}
                        onChange={(e) => setSpouseSettlementBranch(e.target.value)}
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* IFSC Code Column */}
                    <FormFieldBox
                      label={tLabel('IFSC Code (If Known)', 'IFSC കോഡ് (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={spouseSettlementIfsc}
                        onChange={(e) => setSpouseSettlementIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex justify-between items-center text-xs font-bold shadow-md">
                  <span className="text-slate-300 font-black uppercase tracking-wide">{t('Spouse Total Pending Amount:', 'ഭാര്യ / ഭർത്താവിന്റെ ആകെ മിച്ച തുക:')}</span>
                  <span className="text-base font-black text-emerald-400 font-mono">₹{spouseTotalPending.toLocaleString('en-IN')}</span>
                </div>

                {/* FUTURE PREFERENCE, HARDSHIPS & CONDITIONS/DECLARATION (INSIDE GOLD BOX) */}
                {(hasSelf && !editingSelf) && renderFutureAndConditionsBlock('spouse')}

                {/* INLINE SUBMIT BUTTON FOR SPOUSE FORM */}
                <div className="space-y-4">
                  <MissingFieldsBanner missing={missingFieldsSummary} onFocusField={scrollToField} />
                  <div className="pt-4 border-t-2 border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-300/60">
                    <div className="text-xs font-bold text-slate-800 space-y-0.5">
                      <div className="font-black text-amber-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('Spouse Form Completed', 'ഭാര്യ / ഭർത്താവിന്റെ ഫോം പൂർത്തിയായി')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {t('Click below to submit claim form with spouse details.', 'ഭാര്യ / ഭർത്താവിന്റെ വിവരങ്ങളോടെ ക്ലെയിം ഫോം സമർപ്പിക്കാൻ താഴെയുള്ള ബട്ടൺ അമർത്തുക.')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('Spouse')}
                      className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all cursor-pointer shrink-0"
                    >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" /> {t('Saving Details...', 'വിവരങ്ങൾ സേവ് ചെയ്യുന്നു...')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-amber-200" />
                        {editingSpouse ? t('Update Form 2 Details', 'ഫോം 2 അപ്ഡേറ്റ് ചെയ്യുക') : t('Submit Spouse Form', 'ഭാര്യ / ഭർത്താവിന്റെ ഫോം സബ്മിറ്റ് ചെയ്യുക')}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
            )}
          </CardContent>
          )}
        </div>
        )}

        {/* SUBMITTED CARD OR FULL FORM: 3. PARENT CLAIM FORM */}
        {hasParent && !editingParent && (
          <div className="border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 rounded-3xl shadow-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-emerald-300">
                  ✓ 3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                      {parentClaim?.userName || parentName}
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      {parentClaim?.relation === 'Mother' ? t('3. Mother (അമ്മ - സമർപ്പിച്ചു)', '3. അമ്മ (സമർപ്പിച്ചു)') : t('3. Father (അച്ഛൻ - സമർപ്പിച്ചു)', '3. അച്ഛൻ (സമർപ്പിച്ചു)')}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                    <span>{t('Token / Serial No:', 'ഔദ്യോഗിക ടോക്കൺ നമ്പർ:')}</span>
                    <span className="font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs">
                      {parentClaim?.tokenNo || parentClaim?.serialNo || 'SUBMITTED'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const allTokensMap: Record<string, string> = {};
                    if (selfClaim?.tokenNo || selfClaim?.serialNo) allTokensMap['Self'] = String(selfClaim.tokenNo || selfClaim.serialNo);
                    if (spouseClaim?.tokenNo || spouseClaim?.serialNo) allTokensMap[spouseClaim.relation || 'Spouse'] = String(spouseClaim.tokenNo || spouseClaim.serialNo);
                    if (parentClaim?.tokenNo || parentClaim?.serialNo) allTokensMap[parentClaim.relation || 'Parent'] = String(parentClaim.tokenNo || parentClaim.serialNo);
                    if (childClaim?.tokenNo || childClaim?.serialNo) allTokensMap[childClaim.relation || 'Child'] = String(childClaim.tokenNo || childClaim.serialNo);
                    setNewlyAssignedTokens(allTokensMap);
                    setCompleted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>{t('Serial Card', 'സീരിയൽ കാർഡ്')}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (parentClaim) populateParentFromClaim(parentClaim);
                    setEditingParent(true);
                    setParentSelected(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-slate-950" />
                  <span>{t('Edit Form 3', 'ഫോം എഡിറ്റ് ചെയ്യുക')}</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Highrich ID', 'ഹൈറിച്ച് ഐഡി')}</span>
                <span className="font-mono font-bold text-slate-800">{parentClaim?.highrichId || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Mobile Number', 'മൊബൈൽ നമ്പർ')}</span>
                <span className="font-mono font-bold text-slate-800">{parentClaim?.individualMobile || (parentClaim?.memberMobile && parentClaim?.memberMobile !== parentClaim?.userMobile ? parentClaim?.memberMobile : '') || parentClaim?.userMobile || parentMobile || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Total Pending', 'ആകെ മിച്ച തുക')}</span>
                <span className="font-black text-emerald-700">₹{(parentClaim?.totalPending || parentTotalPending || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* GOLD WRAPPER: 3. PARENT CLAIM FORM */}
        {(!hasParent || editingParent) && (
        <div className="border-2 border-amber-400 dark:border-amber-500 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl ring-2 ring-amber-400/20 overflow-hidden p-4 sm:p-6 space-y-6">
          {editingParent && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {t('Editing Form 3 (Parent) Information', 'ഫോം 3 (മാതാവ് / പിതാവ് വിവരങ്ങൾ) എഡിറ്റ് ചെയ്യുന്നു')}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingParent(false)}
                className="h-8 px-3 text-[11px] font-bold border-amber-400 text-amber-900 bg-white hover:bg-amber-50"
              >
                {t('Cancel Edit', 'റദ്ദാക്കുക')}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-4 sm:p-5 rounded-2xl gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-300">
                👑 3
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  {t('3. PARENT CLAIM FORM (MOTHER / FATHER)', '3. മാതാവ് / പിതാവ് ക്ലെയിം ഫോം')}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t('Parent Settlement Claim Form', 'മാതാവ് അല്ലെങ്കിൽ പിതാവിന്റെ സെറ്റിൽമെന്റ് ഫോം')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-xl px-3 py-1 shadow-xs">
                {t('Form 3 (Parent)', 'ഫോം 3 (മാതാവ്/പിതാവ്)')}
              </Badge>
              <Checkbox 
                checked={parentSelected} 
                onCheckedChange={(val) => {
                  setParentSelected(!!val);
                  if (!!val) {
                    if (!parentRelation) setParentRelation('Mother');
                    const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                    const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                    const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                    const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                    const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                    if (!parentAddress && addr) setParentAddress(addr);
                    if (!parentDistrict && dist) setParentDistrict(dist);
                    if (!parentConstituency && consti) setParentConstituency(consti);
                    if (!parentPostOffice && po) setParentPostOffice(po);
                    if (!parentPincode && pin) setParentPincode(pin);
                  }
                }} 
                className="w-5 h-5 border-amber-400 rounded-md data-[state=checked]:bg-amber-600 cursor-pointer" 
              />
            </div>
          </div>

          {!parentSelected && (
            <div 
              onClick={() => {
                setParentSelected(true);
                if (!parentRelation) setParentRelation('Mother');
                const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                if (!parentAddress && addr) setParentAddress(addr);
                if (!parentDistrict && dist) setParentDistrict(dist);
                if (!parentConstituency && consti) setParentConstituency(consti);
                if (!parentPostOffice && po) setParentPostOffice(po);
                if (!parentPincode && pin) setParentPincode(pin);
              }}
              className="p-4 bg-amber-50/50 hover:bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👵</span>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {t('Click here to fill Parent (Mother / Father) Form', 'മാതാവ് അല്ലെങ്കിൽ പിതാവിന്റെ വിവരങ്ങൾ പൂരിപ്പിക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {t('Adds an individual court serial registry number for parent (Address auto-filled from Main Applicant)', 'മാതാവ്/പിതാവിന് പ്രത്യേക ഔദ്യോഗിക കോർട്ട് നമ്പർ ലഭിക്കുന്നു (മേൽവിലാസം ഓട്ടോമാറ്റിക്കായി ചേർക്കും)')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs font-bold border-amber-400 text-amber-800 bg-white">
                {t('+ Open Form', '+ ഫോം തുറക്കുക')}
              </Button>
            </div>
          )}

          {parentSelected && (
            <CardContent className="p-0 space-y-6">

            {parentSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Relationship selector - MANDATORY & Restricted to Parent */}
                <FormFieldBox
                  label={tLabel('Relationship with Applicant (Mother / Father)', 'അപേക്ഷകനുമായുള്ള ബന്ധം (മാതാവ് / പിതാവ്)')}
                  icon="👵"
                  badge={t('Required', 'നിർബന്ധം')}
                  badgeType="required"
                  theme="amber"
                >
                  <RadioGroup 
                    value={parentRelation} 
                    onValueChange={(val) => setParentRelation(val as 'Mother' | 'Father')} 
                    className="flex flex-wrap gap-4 pt-1"
                  >
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <RadioGroupItem value="Mother" id="parent-mother" className="text-amber-600" />
                      <Label htmlFor="parent-mother" className="text-xs font-black text-slate-800 cursor-pointer">
                        👵 {t('Mother', 'അമ്മ')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <RadioGroupItem value="Father" id="parent-father" className="text-amber-600" />
                      <Label htmlFor="parent-father" className="text-xs font-black text-slate-800 cursor-pointer">
                        👴 {t('Father', 'അച്ഛൻ')}
                      </Label>
                    </div>
                  </RadioGroup>
                </FormFieldBox>

                {/* Parent Personal Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFieldBox
                    id="field-parentName"
                    label={tLabel('Parent Full Name *', 'മാതാവ് / പിതാവിന്റെ മുഴുവൻ പേര് *')}
                    icon="👤"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="amber"
                    error={validationErrors['parentName']}
                  >
                    <Input 
                      value={parentName} 
                      onChange={(e) => {
                        setParentName(e.target.value);
                        clearFieldError('parentName');
                      }} 
                      placeholder={tPlaceholder('Enter Full Name', 'മുഴുവൻ പേര് നൽകുക')}
                      className={`h-11 border-2 ${validationErrors['parentName'] ? 'border-rose-500 bg-rose-50/50' : 'border-amber-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-amber-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    id="field-parentMobile"
                    label={tLabel('Parent Mobile Number *', 'മാതാവ് / പിതാവിന്റെ മൊബൈൽ നമ്പർ *')}
                    icon="📱"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="amber"
                    error={validationErrors['parentMobile']}
                  >
                    <Input 
                      value={parentMobile} 
                      onChange={(e) => {
                        setParentMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                        clearFieldError('parentMobile');
                      }} 
                      placeholder={tPlaceholder('10-digit Mobile Number', '10 അക്ക മൊബൈൽ നമ്പർ നൽകുക')}
                      type="tel"
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['parentMobile'] ? 'border-rose-500 bg-rose-50/50' : 'border-amber-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-xs focus:border-amber-500`}
                    />
                  </FormFieldBox>

                  {/* Parent PAN Card Number (Mandatory) */}
                  <FormFieldBox
                    id="field-parentPan"
                    label={tLabel('Parent PAN Card Number *', 'മാതാവ് / പിതാവിന്റെ പാൻ കാർഡ് നമ്പർ *')}
                    icon="💳"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="purple"
                    error={validationErrors['parentPan']}
                  >
                    <Input 
                      value={parentPan} 
                      onChange={(e) => {
                        setParentPan(e.target.value.toUpperCase());
                        clearFieldError('parentPan');
                      }} 
                      placeholder={tPlaceholder('e.g. ABCDE1234F', 'പാൻ കാർഡ് നമ്പർ (ഉദാ: ABCDE1234F)')}
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['parentPan'] ? 'border-rose-500 bg-rose-50/50' : 'border-purple-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-xs focus:border-purple-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    label={tLabel('Parent Customer ID', 'മാതാവ് / പിതാവിന്റെ കസ്റ്റമർ ഐഡി')}
                    icon="🆔"
                    badge={t('Optional', 'ഓപ്ഷണൽ')}
                    badgeType="optional"
                    theme="slate"
                  >
                    <Input 
                      value={parentHighrichId} 
                      onChange={(e) => setParentHighrichId(e.target.value)} 
                      placeholder={tPlaceholder('Enter Customer ID if known', 'കസ്റ്റമർ ഐഡി അറിയാമെങ്കിൽ നൽകുക')}
                      className="h-11 border-2 border-slate-200 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-slate-400"
                    />
                  </FormFieldBox>
                </div>

                {/* Parent Residential Address Section */}
                <div className="border-2 border-amber-200 bg-amber-50/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-amber-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-600 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-amber-50">
                        🏠
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex flex-wrap items-center gap-2">
                          <span>{t('Parent Residential Address', 'മാതാവ് / പിതാവിന്റെ മേൽവിലാസം')}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-normal">
                            ✓ {t('Same as Main Applicant', 'മെയിൻ മെമ്പറുടെ അതേ മേൽവിലാസം')}
                          </span>
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Pre-filled automatically. Edit below only if different.', 'ഓട്ടോമാറ്റിക്കായി ചേർത്തതാണ്. മാറ്റമുണ്ടെങ്കിൽ മാത്രം താഴെ തിരുത്തുക.')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                        const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                        const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                        const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                        const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                        setParentAddress(addr);
                        setParentDistrict(dist);
                        setParentConstituency(consti);
                        setParentPostOffice(po);
                        setParentPincode(pin);
                        toast.success(t('Applicant address re-synced to Parent!', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്തു!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-amber-300 text-amber-900 hover:bg-amber-100 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      🔄 {t('Re-sync from Applicant', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്യുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Address */}
                    <FormFieldBox 
                      label={tLabel('Full Residential Address', 'മേൽവിലാസം')}
                      icon="🏠"
                      theme="amber"
                      className="md:col-span-2"
                    >
                      <Input 
                        value={parentAddress} 
                        onChange={(e) => setParentAddress(e.target.value)} 
                        placeholder={tPlaceholder('House Name, Street, Locality', 'വീട്ടുപേര്, സ്ഥലം, ലൊക്കാലിറ്റി')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* District */}
                    <FormFieldBox 
                      label={tLabel('District', 'ജില്ല')}
                      icon="📍"
                      theme="amber"
                    >
                      <Input 
                        value={parentDistrict} 
                        onChange={(e) => setParentDistrict(e.target.value)} 
                        placeholder={tPlaceholder('District', 'ജില്ല')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Assembly Constituency */}
                    <FormFieldBox 
                      label={tLabel('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                      icon="🏛️"
                      theme="amber"
                    >
                      <Input 
                        value={parentConstituency} 
                        onChange={(e) => setParentConstituency(e.target.value)} 
                        placeholder={tPlaceholder('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Post Office */}
                    <FormFieldBox 
                      label={tLabel('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                      icon="📬"
                      theme="slate"
                    >
                      <Input 
                        value={parentPostOffice} 
                        onChange={(e) => setParentPostOffice(e.target.value)} 
                        placeholder={tPlaceholder('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* PIN Code */}
                    <FormFieldBox 
                      label={tLabel('PIN Code', 'പിൻകോഡ്')}
                      icon="📮"
                      theme="slate"
                    >
                      <Input 
                        value={parentPincode} 
                        onChange={(e) => setParentPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        placeholder={tPlaceholder('6-digit PIN', '6 അക്ക പിൻകോഡ്')}
                        maxLength={6}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border-2 border-amber-200 flex items-center gap-3 shadow-xs">
                   <Checkbox 
                     id="parent-no-breakup"
                     checked={parentNoBreakup}
                     onCheckedChange={(val) => setParentNoBreakup(!!val)}
                     className="w-5 h-5 rounded border-amber-400 data-[state=checked]:bg-amber-600 cursor-pointer"
                   />
                   <Label htmlFor="parent-no-breakup" className="text-xs font-black text-amber-950 leading-tight cursor-pointer">
                     {t('Provide single manual total without category breakup', 'കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)')}
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {parentNoBreakup ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormFieldBox
                      label={tLabel('Total Paid Amount', 'ആകെ നൽകിയ തുക')}
                      icon="💵"
                      badge={t('Required', 'നിർബന്ധം')}
                      badgeType="required"
                      theme="amber"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')}
                          value={parentTotalPaid || ''}
                          onChange={(e) => handleTotalChange('parent', 'paid', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-amber-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-amber-500"
                        />
                      </div>
                    </FormFieldBox>

                    <FormFieldBox
                      label={tLabel('Total Received Amount', 'ആകെ ലഭിച്ച തുക')}
                      icon="💰"
                      badge={t('Received', 'ലഭിച്ചത്')}
                      badgeType="info"
                      theme="emerald"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Received', 'ലഭിച്ച തുക')}
                          value={parentTotalReceived || ''}
                          onChange={(e) => handleTotalChange('parent', 'received', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-emerald-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-emerald-500"
                        />
                      </div>
                    </FormFieldBox>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black">1</span>
                        <span>{tLabel('Select Applicable Categories', 'ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക')}</span>
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = parentCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setParentCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3.5 py-2.5 border-2 rounded-2xl cursor-pointer text-xs font-black flex items-center gap-2.5 transition-all ${isSel ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none rounded" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                     {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {parentCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-amber-100 rounded-2xl bg-amber-50/20 gap-3 shadow-xs">
                            <span className="text-xs font-black text-slate-800 shrink-0 w-36 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2.5 flex-1">
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')} 
                                value={parentCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('parent', catId, 'paid', e.target.value)}
                                className="h-10 border-2 border-amber-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Received Amount', 'ലഭിച്ച തുക')} 
                                value={parentCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('parent', catId, 'received', e.target.value)}
                                className="h-10 border-2 border-emerald-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <FormFieldBox
                  label={tLabel('Notes / Remarks Regarding Payment', 'നോട്ട് / പേയ്മെന്റ് കൂടുതൽ വിവരങ്ങൾ')}
                  icon="📝"
                  badge={t('Optional', 'ഓപ്ഷണൽ')}
                  badgeType="optional"
                  theme="slate"
                >
                  <textarea 
                    value={parentNotes} 
                    onChange={(e) => setParentNotes(e.target.value)} 
                    placeholder={tPlaceholder(
                      'Enter any details regarding bank account paid from or transaction references...',
                      'ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം...'
                    )}
                    className="w-full text-xs font-semibold p-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none min-h-20 bg-white text-slate-900 shadow-2xs"
                  />
                </FormFieldBox>

                {/* 1. PAYMENT MADE DETAILS (1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-amber-200 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-amber-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-slate-800 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-amber-50">
                        💳
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('1. DETAILS OF ACCOUNT TO WHICH YOU PAID', '1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ (അറിയാമെങ്കിൽ)')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Account & payment details (Fill only if known / remember)', 'കമ്പനിയിലേക്ക് പണം നൽകിയ വിവരങ്ങൾ (ഓർമ്മയുണ്ടെങ്കിൽ മാത്രം)')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold rounded-lg px-2 py-0.5">
                      {t('Optional', 'ഓപ്ഷണൽ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Number to which paid */}
                    <FormFieldBox 
                      label={tLabel('Account Number you paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ')}
                      icon="💳"
                      theme="amber"
                      optional
                      className="md:col-span-2"
                    >
                      <Input 
                        value={parentPaidFromAccount} 
                        onChange={(e) => setParentPaidFromAccount(e.target.value)} 
                        placeholder={tPlaceholder('Enter Account Number paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ നൽകുക')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Paid Bank Name */}
                    <FormFieldBox 
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏦"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={parentPaidFromBank} 
                        onChange={(e) => setParentPaidFromBank(e.target.value)} 
                        placeholder={tPlaceholder('e.g. State Bank of India / HDFC Bank', 'ഉദാ: State Bank of India / Federal Bank')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Branch */}
                    <FormFieldBox 
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={parentPaidFromBranch} 
                        onChange={(e) => setParentPaidFromBranch(e.target.value)} 
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Payment Date */}
                    <FormFieldBox 
                      label={tLabel('Payment Date (If Known)', 'പണം കൊടുത്ത തീയതി (അറിയാമെങ്കിൽ)')}
                      icon="📅"
                      theme="amber"
                      optional
                    >
                      <Input 
                        type="date"
                        value={parentPaymentDate} 
                        onChange={(e) => setParentPaymentDate(e.target.value)} 
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Transaction ID / UTR */}
                    <FormFieldBox 
                      label={tLabel('Transaction ID / UTR (If Known)', 'ട്രാൻസാക്ഷൻ ഐഡി / UTR (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={parentTransactionRef} 
                        onChange={(e) => setParentTransactionRef(e.target.value)} 
                        placeholder={tPlaceholder('Transaction ID / UTR Reference', 'ട്രാൻസാക്ഷൻ ഐഡി അല്ലെങ്കിൽ UTR നമ്പർ')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* 2. YOUR ACCOUNT DETAILS PROVIDED TO COMPANY (2. കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-emerald-300 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-emerald-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-emerald-50">
                        🏦
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('2. PARENT BANK ACCOUNT DETAILS GIVEN TO COMPANY', '2. കമ്പനിയിൽ നൽകിയ മാതാവ് / പിതാവിന്റെ അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Registered account for settlements', 'രജിസ്റ്റർ ചെയ്ത ബാങ്ക് അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (settlementAccountNumber) setParentSettlementAccountNumber(settlementAccountNumber);
                        if (customerPan) setParentPan(customerPan);
                        if (settlementBankName) setParentSettlementBankName(settlementBankName);
                        if (settlementBranch) setParentSettlementBranch(settlementBranch);
                        if (settlementIfsc) setParentSettlementIfsc(settlementIfsc);
                        if (paidFromAccount) setParentPaidFromAccount(paidFromAccount);
                        if (paidFromBank) setParentPaidFromBank(paidFromBank);
                        if (paidFromBranch) setParentPaidFromBranch(paidFromBranch);
                        if (paymentDate) setParentPaymentDate(paymentDate);
                        if (transactionRef) setParentTransactionRef(transactionRef);
                        toast.success(t('Applicant bank details copied to Parent!', 'അപേക്ഷകന്റെ ബാങ്ക് വിവരങ്ങൾ പകർത്തി!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      📋 {t('Copy from Applicant', 'അപേക്ഷകന്റെ വിവരങ്ങൾ പകർത്തുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bank Account Number Column */}
                    <FormFieldBox
                      label={tLabel('Bank Account Number Registered with Company *', 'കമ്പനിയിൽ നൽകിയ ബാങ്ക് അക്കൗണ്ട് നമ്പർ *')}
                      icon="💳"
                      required
                      theme="emerald"
                      className="md:col-span-2"
                    >
                      <Input
                        value={parentSettlementAccountNumber}
                        onChange={(e) => setParentSettlementAccountNumber(e.target.value)}
                        placeholder={tPlaceholder('Bank account number registered with company', 'കമ്പനിയിൽ നൽകിയിട്ടുള്ള ബാങ്ക് അക്കൗണ്ട് നമ്പർ')}
                        className="h-10 border border-emerald-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-2xs focus:border-emerald-600"
                      />
                    </FormFieldBox>

                    {/* Bank Name Column */}
                    <FormFieldBox
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏛️"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={parentSettlementBankName}
                        onChange={(e) => setParentSettlementBankName(e.target.value)}
                        placeholder="e.g. State Bank of India / Federal Bank"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* Branch Name Column */}
                    <FormFieldBox
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={parentSettlementBranch}
                        onChange={(e) => setParentSettlementBranch(e.target.value)}
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* IFSC Code Column */}
                    <FormFieldBox
                      label={tLabel('IFSC Code (If Known)', 'IFSC കോഡ് (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={parentSettlementIfsc}
                        onChange={(e) => setParentSettlementIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex justify-between items-center text-xs font-bold shadow-md">
                  <span className="text-slate-300 font-black uppercase tracking-wide">{t('Parent Total Pending Amount:', 'മാതാവ് / പിതാവിന്റെ ആകെ മിച്ച തുക:')}</span>
                  <span className="text-base font-black text-emerald-400 font-mono">₹{parentTotalPending.toLocaleString('en-IN')}</span>
                </div>

                {/* FUTURE PREFERENCE, HARDSHIPS & CONDITIONS/DECLARATION (INSIDE GOLD BOX) */}
                {(hasSelf && !editingSelf && hasSpouse && !editingSpouse) && renderFutureAndConditionsBlock('parent')}

                {/* INLINE SUBMIT BUTTON FOR PARENT FORM */}
                <div className="space-y-4">
                  <MissingFieldsBanner missing={missingFieldsSummary} onFocusField={scrollToField} />
                  <div className="pt-4 border-t-2 border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-300/60">
                    <div className="text-xs font-bold text-slate-800 space-y-0.5">
                      <div className="font-black text-amber-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('Parent Form Completed', 'മാതാവ് / പിതാവിന്റെ ഫോം പൂർത്തിയായി')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {t('Click below to submit claim form with parent details.', 'മാതാവ് / പിതാവിന്റെ വിവരങ്ങളോടെ ക്ലെയിം ഫോം സമർപ്പിക്കാൻ താഴെയുള്ള ബട്ടൺ അമർത്തുക.')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('Parent')}
                      className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all cursor-pointer shrink-0"
                    >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" /> {t('Saving Details...', 'വിവരങ്ങൾ സേവ് ചെയ്യുന്നു...')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-amber-200" />
                        {editingParent ? t('Update Form 3 Details', 'ഫോം 3 അപ്ഡേറ്റ് ചെയ്യുക') : t('Submit Parent Form', 'മാതാവ് / പിതാവിന്റെ ഫോം സബ്മിറ്റ് ചെയ്യുക')}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
            )}
          </CardContent>
          )}
        </div>
        )}

        {/* SUBMITTED CARD OR FULL FORM: 4. CHILD CLAIM FORM */}
        {hasChild && !editingChild && (
          <div className="border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 rounded-3xl shadow-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-emerald-300">
                  ✓ 4
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                      {childClaim?.userName || childName}
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      {childClaim?.relation === 'Son' ? t('4. Son (മകൻ - സമർപ്പിച്ചു)', '4. മകൻ (സമർപ്പിച്ചു)') : t('4. Daughter (മകൾ - സമർപ്പിച്ചു)', '4. മകൾ (സമർപ്പിച്ചു)')}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                    <span>{t('Token / Serial No:', 'ഔദ്യോഗിക ടോക്കൺ നമ്പർ:')}</span>
                    <span className="font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs">
                      {childClaim?.tokenNo || childClaim?.serialNo || 'SUBMITTED'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const allTokensMap: Record<string, string> = {};
                    if (selfClaim?.tokenNo || selfClaim?.serialNo) allTokensMap['Self'] = String(selfClaim.tokenNo || selfClaim.serialNo);
                    if (spouseClaim?.tokenNo || spouseClaim?.serialNo) allTokensMap[spouseClaim.relation || 'Spouse'] = String(spouseClaim.tokenNo || spouseClaim.serialNo);
                    if (parentClaim?.tokenNo || parentClaim?.serialNo) allTokensMap[parentClaim.relation || 'Parent'] = String(parentClaim.tokenNo || parentClaim.serialNo);
                    if (childClaim?.tokenNo || childClaim?.serialNo) allTokensMap[childClaim.relation || 'Child'] = String(childClaim.tokenNo || childClaim.serialNo);
                    setNewlyAssignedTokens(allTokensMap);
                    setCompleted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>{t('Serial Card', 'സീരിയൽ കാർഡ്')}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (childClaim) populateChildFromClaim(childClaim);
                    setEditingChild(true);
                    setChildSelected(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-slate-950" />
                  <span>{t('Edit Form 4', 'ഫോം എഡിറ്റ് ചെയ്യുക')}</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Highrich ID', 'ഹൈറിച്ച് ഐഡി')}</span>
                <span className="font-mono font-bold text-slate-800">{childClaim?.highrichId || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Mobile Number', 'മൊബൈൽ നമ്പർ')}</span>
                <span className="font-mono font-bold text-slate-800">{childClaim?.individualMobile || (childClaim?.memberMobile && childClaim?.memberMobile !== childClaim?.userMobile ? childClaim?.memberMobile : '') || childClaim?.userMobile || childMobile || '—'}</span>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold block">{t('Total Pending', 'ആകെ മിച്ച തുക')}</span>
                <span className="font-black text-emerald-700">₹{(childClaim?.totalPending || childTotalPending || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* GOLD WRAPPER: 4. CHILD CLAIM FORM */}
        {(!hasChild || editingChild) && (
        <div className="border-2 border-amber-400 dark:border-amber-500 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl ring-2 ring-amber-400/20 overflow-hidden p-4 sm:p-6 space-y-6">
          {editingChild && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {t('Editing Form 4 (Child) Information', 'ഫോം 4 (മക്കൾ വിവരങ്ങൾ) എഡിറ്റ് ചെയ്യുന്നു')}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingChild(false)}
                className="h-8 px-3 text-[11px] font-bold border-amber-400 text-amber-900 bg-white hover:bg-amber-50"
              >
                {t('Cancel Edit', 'റദ്ദാക്കുക')}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-4 sm:p-5 rounded-2xl gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-300">
                👑 4
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  {t('4. CHILD CLAIM FORM (SON / DAUGHTER)', '4. മകൻ / മകൾ ക്ലെയിം ഫോം')}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t('Child Settlement Claim Form', 'മകൻ അല്ലെങ്കിൽ മകളുടെ സെറ്റിൽമെന്റ് ഫോം')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-xl px-3 py-1 shadow-xs">
                {t('Form 4 (Child)', 'ഫോം 4 (മക്കൾ)')}
              </Badge>
              <Checkbox 
                checked={childSelected} 
                onCheckedChange={(val) => {
                  setChildSelected(!!val);
                  if (!!val) {
                    if (!childRelation) setChildRelation('Son');
                    const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                    const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                    const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                    const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                    const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                    if (!childAddress && addr) setChildAddress(addr);
                    if (!childDistrict && dist) setChildDistrict(dist);
                    if (!childConstituency && consti) setChildConstituency(consti);
                    if (!childPostOffice && po) setChildPostOffice(po);
                    if (!childPincode && pin) setChildPincode(pin);
                  }
                }} 
                className="w-5 h-5 border-amber-400 rounded-md data-[state=checked]:bg-amber-600 cursor-pointer" 
              />
            </div>
          </div>

          {!childSelected && (
            <div 
              onClick={() => {
                setChildSelected(true);
                if (!childRelation) setChildRelation('Son');
                const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                if (!childAddress && addr) setChildAddress(addr);
                if (!childDistrict && dist) setChildDistrict(dist);
                if (!childConstituency && consti) setChildConstituency(consti);
                if (!childPostOffice && po) setChildPostOffice(po);
                if (!childPincode && pin) setChildPincode(pin);
              }}
              className="p-4 bg-amber-50/50 hover:bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👶</span>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {t('Click here to fill Child (Son / Daughter) Form', 'മകൻ അല്ലെങ്കിൽ മകളുടെ വിവരങ്ങൾ പൂരിപ്പിക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {t('Adds an individual court serial registry number for child (Address auto-filled from Main Applicant)', 'മകൻ/മകൾക്ക് പ്രത്യേക ഔദ്യോഗിക കോർട്ട് നമ്പർ ലഭിക്കുന്നു (മേൽവിലാസം ഓട്ടോമാറ്റിക്കായി ചേർക്കും)')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs font-bold border-amber-400 text-amber-800 bg-white">
                {t('+ Open Form', '+ ഫോം തുറക്കുക')}
              </Button>
            </div>
          )}

          {childSelected && (
            <CardContent className="p-0 space-y-6">

            {childSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Relationship selector - MANDATORY & Restricted to Child */}
                <FormFieldBox
                  label={tLabel('Relationship with Applicant (Son / Daughter)', 'അപേക്ഷകനുമായുള്ള ബന്ധം (മകൻ / മകൾ)')}
                  icon="👶"
                  badge={t('Required', 'നിർബന്ധം')}
                  badgeType="required"
                  theme="amber"
                >
                  <RadioGroup 
                    value={childRelation} 
                    onValueChange={(val) => setChildRelation(val as 'Son' | 'Daughter')} 
                    className="flex flex-wrap gap-4 pt-1"
                  >
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <RadioGroupItem value="Son" id="child-son" className="text-amber-600" />
                      <Label htmlFor="child-son" className="text-xs font-black text-slate-800 cursor-pointer">
                        👦 {t('Son', 'മകൻ')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <RadioGroupItem value="Daughter" id="child-daughter" className="text-amber-600" />
                      <Label htmlFor="child-daughter" className="text-xs font-black text-slate-800 cursor-pointer">
                        👧 {t('Daughter', 'മകൾ')}
                      </Label>
                    </div>
                  </RadioGroup>
                </FormFieldBox>

                {/* Child Personal Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFieldBox
                    id="field-childName"
                    label={tLabel('Child Full Name *', 'മകൻ / മകളുടെ മുഴുവൻ പേര് *')}
                    icon="👤"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="amber"
                    error={validationErrors['childName']}
                  >
                    <Input 
                      value={childName} 
                      onChange={(e) => {
                        setChildName(e.target.value);
                        clearFieldError('childName');
                      }} 
                      placeholder={tPlaceholder('Enter Full Name', 'മുഴുവൻ പേര് നൽകുക')}
                      className={`h-11 border-2 ${validationErrors['childName'] ? 'border-rose-500 bg-rose-50/50' : 'border-amber-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-amber-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    id="field-childMobile"
                    label={tLabel('Child Mobile Number *', 'മകൻ / മകളുടെ മൊബൈൽ നമ്പർ *')}
                    icon="📱"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="amber"
                    error={validationErrors['childMobile']}
                  >
                    <Input 
                      value={childMobile} 
                      onChange={(e) => {
                        setChildMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                        clearFieldError('childMobile');
                      }} 
                      placeholder={tPlaceholder('10-digit Mobile Number', '10 അക്ക മൊബൈൽ നമ്പർ നൽകുക')}
                      type="tel"
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['childMobile'] ? 'border-rose-500 bg-rose-50/50' : 'border-amber-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-xs focus:border-amber-500`}
                    />
                  </FormFieldBox>

                  {/* Child PAN Card Number (Mandatory) */}
                  <FormFieldBox
                    id="field-childPan"
                    label={tLabel('Child PAN Card Number *', 'മകൻ / മകളുടെ പാൻ കാർഡ് നമ്പർ *')}
                    icon="💳"
                    badge={t('Required', 'നിർബന്ധം')}
                    badgeType="required"
                    theme="purple"
                    error={validationErrors['childPan']}
                  >
                    <Input 
                      value={childPan} 
                      onChange={(e) => {
                        setChildPan(e.target.value.toUpperCase());
                        clearFieldError('childPan');
                      }} 
                      placeholder={tPlaceholder('e.g. ABCDE1234F', 'പാൻ കാർഡ് നമ്പർ (ഉദാ: ABCDE1234F)')}
                      maxLength={10}
                      className={`h-11 border-2 ${validationErrors['childPan'] ? 'border-rose-500 bg-rose-50/50' : 'border-purple-200'} rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-xs focus:border-purple-500`}
                    />
                  </FormFieldBox>

                  <FormFieldBox
                    label={tLabel('Child Customer ID', 'മകൻ / മകളുടെ കസ്റ്റമർ ഐഡി')}
                    icon="🆔"
                    badge={t('Optional', 'ഓപ്ഷണൽ')}
                    badgeType="optional"
                    theme="slate"
                  >
                    <Input 
                      value={childHighrichId} 
                      onChange={(e) => setChildHighrichId(e.target.value)} 
                      placeholder={tPlaceholder('Enter Customer ID if known', 'കസ്റ്റമർ ഐഡി അറിയാമെങ്കിൽ നൽകുക')}
                      className="h-11 border-2 border-slate-200 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-xs focus:border-slate-400"
                    />
                  </FormFieldBox>
                </div>

                {/* Child Residential Address Section */}
                <div className="border-2 border-amber-200 bg-amber-50/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-amber-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-600 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-amber-50">
                        🏠
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex flex-wrap items-center gap-2">
                          <span>{t('Child Residential Address', 'മകൻ / മകളുടെ മേൽവിലാസം')}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-normal">
                            ✓ {t('Same as Main Applicant', 'മെയിൻ മെമ്പറുടെ അതേ മേൽവിലാസം')}
                          </span>
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Pre-filled automatically. Edit below only if different.', 'ഓട്ടോമാറ്റിക്കായി ചേർത്തതാണ്. മാറ്റമുണ്ടെങ്കിൽ മാത്രം താഴെ തിരുത്തുക.')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const addr = customerAddress || user?.address || user?.residentialAddress || user?.userAddress || selfClaim?.userAddress || selfClaim?.address || '';
                        const dist = customerDistrict || user?.district || user?.userDistrict || selfClaim?.userDistrict || selfClaim?.district || '';
                        const consti = customerConstituency || user?.assemblyConstituency || user?.constituency || user?.assembly || user?.mandalam || selfClaim?.userConstituency || selfClaim?.constituency || '';
                        const po = customerPostOffice || user?.postOffice || user?.po || selfClaim?.postOffice || '';
                        const pin = customerPincode || user?.pincode || user?.pin || selfClaim?.pincode || '';
                        setChildAddress(addr);
                        setChildDistrict(dist);
                        setChildConstituency(consti);
                        setChildPostOffice(po);
                        setChildPincode(pin);
                        toast.success(t('Applicant address re-synced to Child!', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്തു!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-amber-300 text-amber-900 hover:bg-amber-100 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      🔄 {t('Re-sync from Applicant', 'മേൽവിലാസം വീണ്ടും സിങ്ക് ചെയ്യുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Address */}
                    <FormFieldBox 
                      label={tLabel('Full Residential Address', 'മേൽവിലാസം')}
                      icon="🏠"
                      theme="amber"
                      className="md:col-span-2"
                    >
                      <Input 
                        value={childAddress} 
                        onChange={(e) => setChildAddress(e.target.value)} 
                        placeholder={tPlaceholder('House Name, Street, Locality', 'വീട്ടുപേര്, സ്ഥലം, ലൊക്കാലിറ്റി')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* District */}
                    <FormFieldBox 
                      label={tLabel('District', 'ജില്ല')}
                      icon="📍"
                      theme="amber"
                    >
                      <Input 
                        value={childDistrict} 
                        onChange={(e) => setChildDistrict(e.target.value)} 
                        placeholder={tPlaceholder('District', 'ജില്ല')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Assembly Constituency */}
                    <FormFieldBox 
                      label={tLabel('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                      icon="🏛️"
                      theme="amber"
                    >
                      <Input 
                        value={childConstituency} 
                        onChange={(e) => setChildConstituency(e.target.value)} 
                        placeholder={tPlaceholder('Assembly Constituency', 'നിയമസഭാ മണ്ഡലം')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-500 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Post Office */}
                    <FormFieldBox 
                      label={tLabel('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                      icon="📬"
                      theme="slate"
                    >
                      <Input 
                        value={childPostOffice} 
                        onChange={(e) => setChildPostOffice(e.target.value)} 
                        placeholder={tPlaceholder('Post Office', 'പോസ്റ്റ് ഓഫീസ്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* PIN Code */}
                    <FormFieldBox 
                      label={tLabel('PIN Code', 'പിൻകോഡ്')}
                      icon="📮"
                      theme="slate"
                    >
                      <Input 
                        value={childPincode} 
                        onChange={(e) => setChildPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        placeholder={tPlaceholder('6-digit PIN', '6 അക്ക പിൻകോഡ്')}
                        maxLength={6}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-slate-700 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border-2 border-amber-200 flex items-center gap-3 shadow-xs">
                   <Checkbox 
                     id="child-no-breakup"
                     checked={childNoBreakup}
                     onCheckedChange={(val) => setChildNoBreakup(!!val)}
                     className="w-5 h-5 rounded border-amber-400 data-[state=checked]:bg-amber-600 cursor-pointer"
                   />
                   <Label htmlFor="child-no-breakup" className="text-xs font-black text-amber-950 leading-tight cursor-pointer">
                     {t('Provide single manual total without category breakup', 'കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)')}
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {childNoBreakup ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormFieldBox
                      label={tLabel('Total Paid Amount', 'ആകെ നൽകിയ തുക')}
                      icon="💵"
                      badge={t('Required', 'നിർബന്ധം')}
                      badgeType="required"
                      theme="amber"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')}
                          value={childTotalPaid || ''}
                          onChange={(e) => handleTotalChange('child', 'paid', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-amber-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-amber-500"
                        />
                      </div>
                    </FormFieldBox>

                    <FormFieldBox
                      label={tLabel('Total Received Amount', 'ആകെ ലഭിച്ച തുക')}
                      icon="💰"
                      badge={t('Received', 'ലഭിച്ചത്')}
                      badgeType="info"
                      theme="emerald"
                    >
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder={tPlaceholder('Received', 'ലഭിച്ച തുക')}
                          value={childTotalReceived || ''}
                          onChange={(e) => handleTotalChange('child', 'received', e.target.value)}
                          className="pl-9 h-11 bg-white border-2 border-emerald-200 rounded-xl font-black text-sm text-slate-900 shadow-xs focus:border-emerald-500"
                        />
                      </div>
                    </FormFieldBox>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black">1</span>
                        <span>{tLabel('Select Applicable Categories', 'ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക')}</span>
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = childCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setChildCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3.5 py-2.5 border-2 rounded-2xl cursor-pointer text-xs font-black flex items-center gap-2.5 transition-all ${isSel ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none rounded" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                     {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {childCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-amber-100 rounded-2xl bg-amber-50/20 gap-3 shadow-xs">
                            <span className="text-xs font-black text-slate-800 shrink-0 w-36 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2.5 flex-1">
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Paid Amount', 'നൽകിയ തുക')} 
                                value={childCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('child', catId, 'paid', e.target.value)}
                                className="h-10 border-2 border-amber-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                              <Input 
                                type="number" 
                                placeholder={tPlaceholder('Received Amount', 'ലഭിച്ച തുക')} 
                                value={childCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('child', catId, 'received', e.target.value)}
                                className="h-10 border-2 border-emerald-200 text-xs text-slate-800 bg-white rounded-xl font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <FormFieldBox
                  label={tLabel('Notes / Remarks Regarding Payment', 'നോട്ട് / പേയ്മെന്റ് കൂടുതൽ വിവരങ്ങൾ')}
                  icon="📝"
                  badge={t('Optional', 'ഓപ്ഷണൽ')}
                  badgeType="optional"
                  theme="slate"
                >
                  <textarea 
                    value={childNotes} 
                    onChange={(e) => setChildNotes(e.target.value)} 
                    placeholder={tPlaceholder(
                      'Enter any details regarding bank account paid from or transaction references...',
                      'ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം...'
                    )}
                    className="w-full text-xs font-semibold p-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none min-h-20 bg-white text-slate-900 shadow-2xs"
                  />
                </FormFieldBox>

                {/* 1. PAYMENT MADE DETAILS (1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-amber-200 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-amber-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-slate-800 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-amber-50">
                        💳
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('1. DETAILS OF ACCOUNT TO WHICH YOU PAID', '1. നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് വിവരങ്ങൾ (അറിയാമെങ്കിൽ)')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Account & payment details (Fill only if known / remember)', 'കമ്പനിയിലേക്ക് പണം നൽകിയ വിവരങ്ങൾ (ഓർമ്മയുണ്ടെങ്കിൽ മാത്രം)')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold rounded-lg px-2 py-0.5">
                      {t('Optional', 'ഓപ്ഷണൽ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Number to which paid */}
                    <FormFieldBox 
                      label={tLabel('Account Number you paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ')}
                      icon="💳"
                      theme="amber"
                      optional
                      className="md:col-span-2"
                    >
                      <Input 
                        value={childPaidFromAccount} 
                        onChange={(e) => setChildPaidFromAccount(e.target.value)} 
                        placeholder={tPlaceholder('Enter Account Number paid to', 'നിങ്ങൾ പണം നൽകിയ അക്കൗണ്ട് നമ്പർ നൽകുക')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Paid Bank Name */}
                    <FormFieldBox 
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏦"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={childPaidFromBank} 
                        onChange={(e) => setChildPaidFromBank(e.target.value)} 
                        placeholder={tPlaceholder('e.g. State Bank of India / HDFC Bank', 'ഉദാ: State Bank of India / Federal Bank')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Branch */}
                    <FormFieldBox 
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={childPaidFromBranch} 
                        onChange={(e) => setChildPaidFromBranch(e.target.value)} 
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Payment Date */}
                    <FormFieldBox 
                      label={tLabel('Payment Date (If Known)', 'പണം കൊടുത്ത തീയതി (അറിയാമെങ്കിൽ)')}
                      icon="📅"
                      theme="amber"
                      optional
                    >
                      <Input 
                        type="date"
                        value={childPaymentDate} 
                        onChange={(e) => setChildPaymentDate(e.target.value)} 
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 shadow-2xs"
                      />
                    </FormFieldBox>

                    {/* Transaction ID / UTR */}
                    <FormFieldBox 
                      label={tLabel('Transaction ID / UTR (If Known)', 'ട്രാൻസാക്ഷൻ ഐഡി / UTR (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      theme="amber"
                      optional
                    >
                      <Input 
                        value={childTransactionRef} 
                        onChange={(e) => setChildTransactionRef(e.target.value)} 
                        placeholder={tPlaceholder('Transaction ID / UTR Reference', 'ട്രാൻസാക്ഷൻ ഐഡി അല്ലെങ്കിൽ UTR നമ്പർ')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white focus:bg-white focus:border-amber-600 text-xs sm:text-sm text-slate-900 font-mono shadow-2xs"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* 2. YOUR ACCOUNT DETAILS PROVIDED TO COMPANY (2. കമ്പനിയിൽ നിങ്ങൾ നൽകിയ നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ) */}
                <div className="border-2 border-emerald-300 rounded-3xl p-5 md:p-6 space-y-4 bg-white/95 backdrop-blur-xl shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b pb-3.5 border-emerald-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-emerald-50">
                        🏦
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {t('2. CHILD BANK ACCOUNT DETAILS GIVEN TO COMPANY', '2. കമ്പനിയിൽ നൽകിയ മകൻ / മകളുടെ അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {t('Registered account for settlements', 'രജിസ്റ്റർ ചെയ്ത ബാങ്ക് അക്കൗണ്ട് വിവരങ്ങൾ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (settlementAccountNumber) setChildSettlementAccountNumber(settlementAccountNumber);
                        if (customerPan) setChildPan(customerPan);
                        if (settlementBankName) setChildSettlementBankName(settlementBankName);
                        if (settlementBranch) setChildSettlementBranch(settlementBranch);
                        if (settlementIfsc) setChildSettlementIfsc(settlementIfsc);
                        if (paidFromAccount) setChildPaidFromAccount(paidFromAccount);
                        if (paidFromBank) setChildPaidFromBank(paidFromBank);
                        if (paidFromBranch) setChildPaidFromBranch(paidFromBranch);
                        if (paymentDate) setChildPaymentDate(paymentDate);
                        if (transactionRef) setChildTransactionRef(transactionRef);
                        toast.success(t('Applicant bank details copied to Child!', 'അപേക്ഷകന്റെ ബാങ്ക് വിവരങ്ങൾ പകർത്തി!'));
                      }}
                      className="h-8 px-3 text-[11px] font-black border-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50 bg-white rounded-xl cursor-pointer shadow-xs"
                    >
                      📋 {t('Copy from Applicant', 'അപേക്ഷകന്റെ വിവരങ്ങൾ പകർത്തുക')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bank Account Number Column */}
                    <FormFieldBox
                      label={tLabel('Bank Account Number Registered with Company *', 'കമ്പനിയിൽ നൽകിയ ബാങ്ക് അക്കൗണ്ട് നമ്പർ *')}
                      icon="💳"
                      required
                      theme="emerald"
                      className="md:col-span-2"
                    >
                      <Input
                        value={childSettlementAccountNumber}
                        onChange={(e) => setChildSettlementAccountNumber(e.target.value)}
                        placeholder={tPlaceholder('Bank account number registered with company', 'കമ്പനിയിൽ നൽകിയിട്ടുള്ള ബാങ്ക് അക്കൗണ്ട് നമ്പർ')}
                        className="h-10 border border-emerald-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono shadow-2xs focus:border-emerald-600"
                      />
                    </FormFieldBox>

                    {/* Bank Name Column */}
                    <FormFieldBox
                      label={tLabel('Bank', 'ബാങ്ക്')}
                      icon="🏛️"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={childSettlementBankName}
                        onChange={(e) => setChildSettlementBankName(e.target.value)}
                        placeholder="e.g. State Bank of India / Federal Bank"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* Branch Name Column */}
                    <FormFieldBox
                      label={tLabel('Branch', 'ബ്രാഞ്ച്')}
                      icon="📍"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={childSettlementBranch}
                        onChange={(e) => setChildSettlementBranch(e.target.value)}
                        placeholder={tPlaceholder('Branch Name', 'ബ്രാഞ്ച് പേര്')}
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>

                    {/* IFSC Code Column */}
                    <FormFieldBox
                      label={tLabel('IFSC Code (If Known)', 'IFSC കോഡ് (അറിയാമെങ്കിൽ)')}
                      icon="🔢"
                      optional
                      theme="teal"
                    >
                      <Input
                        value={childSettlementIfsc}
                        onChange={(e) => setChildSettlementIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="h-10 border border-slate-300 rounded-xl font-bold bg-white text-xs sm:text-sm text-slate-900 font-mono uppercase shadow-2xs focus:border-teal-600"
                      />
                    </FormFieldBox>
                  </div>
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex justify-between items-center text-xs font-bold shadow-md">
                  <span className="text-slate-300 font-black uppercase tracking-wide">{t('Child Total Pending Amount:', 'മകൻ / മകളുടെ ആകെ മിച്ച തുക:')}</span>
                  <span className="text-base font-black text-emerald-400 font-mono">₹{childTotalPending.toLocaleString('en-IN')}</span>
                </div>

                {/* FUTURE PREFERENCE, HARDSHIPS & CONDITIONS/DECLARATION (INSIDE GOLD BOX) */}
                {(hasSelf && !editingSelf && hasSpouse && !editingSpouse && hasParent && !editingParent) && renderFutureAndConditionsBlock('child')}

                {/* INLINE SUBMIT BUTTON FOR CHILD FORM */}
                <div className="space-y-4">
                  <MissingFieldsBanner missing={missingFieldsSummary} onFocusField={scrollToField} />
                  <div className="pt-4 border-t-2 border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-300/60">
                    <div className="text-xs font-bold text-slate-800 space-y-0.5">
                      <div className="font-black text-amber-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('Child Form Completed', 'മകൻ / മകളുടെ ഫോം പൂർത്തിയായി')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {t('Click below to submit claim form with child details.', 'മകൻ / മകളുടെ വിവരങ്ങളോടെ ക്ലെയിം ഫോം സമർപ്പിക്കാൻ താഴെയുള്ള ബട്ടൺ അമർത്തുക.')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('Child')}
                      className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all cursor-pointer shrink-0"
                    >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" /> {t('Saving Details...', 'വിവരങ്ങൾ സേവ് ചെയ്യുന്നു...')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-amber-200" />
                        {editingChild ? t('Update Form 4 Details', 'ഫോം 4 അപ്ഡേറ്റ് ചെയ്യുക') : t('Submit Child Form', 'മകൻ / മകളുടെ ഫോം സബ്മിറ്റ് ചെയ്യുക')}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
            )}
          </CardContent>
          )}
        </div>
        )}
        {/* COMBINED TOTAL DISPLAY */}
        <section className="bg-brand-blue rounded-3xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-brand-magenta" />
            <h4 className="text-[10px] font-black uppercase tracking-wider opacity-60">
              {t('Combined Totals', 'ആകെ തുക വിവരങ്ങൾ')}
            </h4>
          </div>

          {/* Claimant-wise Breakdown List */}
          <div className="space-y-2 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black opacity-55 uppercase tracking-wider text-pink-300">
              {t('Individual Claimants Breakdown:', 'വ്യക്തിഗത തുകകൾ:')}
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {effectiveSelfTotals.active && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-brand-magenta uppercase">
                        {t('1. Self', '1. സ്വന്തം')}
                      </span>
                      {effectiveSelfTotals.isSubmitted && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
                          {t('Submitted', 'സമർപ്പിച്ചു')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{effectiveSelfTotals.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{effectiveSelfTotals.pending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              {effectiveSpouseTotals.active && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-brand-magenta uppercase">
                        2. {effectiveSpouseTotals.relation === 'Wife' ? t('Wife', 'ഭാര്യ') : effectiveSpouseTotals.relation === 'Husband' ? t('Husband', 'ഭർത്താവ്') : t('Spouse', 'ഭാര്യ/ഭർത്താവ്')}
                      </span>
                      {effectiveSpouseTotals.isSubmitted && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
                          {t('Submitted', 'സമർപ്പിച്ചു')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{effectiveSpouseTotals.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{effectiveSpouseTotals.pending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              {effectiveParentTotals.active && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-brand-magenta uppercase">
                        3. {effectiveParentTotals.relation === 'Mother' ? t('Mother', 'അമ്മ') : effectiveParentTotals.relation === 'Father' ? t('Father', 'അച്ഛൻ') : t('Parent', 'മാതാവ്/പിതാവ്')}
                      </span>
                      {effectiveParentTotals.isSubmitted && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
                          {t('Submitted', 'സമർപ്പിച്ചു')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{effectiveParentTotals.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{effectiveParentTotals.pending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              {effectiveChildTotals.active && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-brand-magenta uppercase">
                        4. {effectiveChildTotals.relation === 'Son' ? t('Son', 'മകൻ') : effectiveChildTotals.relation === 'Daughter' ? t('Daughter', 'മകൾ') : t('Child', 'മകൻ/മകൾ')}
                      </span>
                      {effectiveChildTotals.isSubmitted && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
                          {t('Submitted', 'സമർപ്പിച്ചു')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{effectiveChildTotals.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{effectiveChildTotals.pending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-end justify-between border-b border-white/10 pb-3">
               <div>
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-white">
                    {t('Combined Pending Claim', 'ആകെ മിച്ച ക്ലെയിം തുക')}
                  </p>
                  <p className="text-3xl font-black text-brand-magenta tracking-tight">
                    ₹{combinedTotalPending.toLocaleString('en-IN')}
                  </p>
               </div>
               <Badge className="bg-white/10 text-white border-0 text-[10px] py-1 mb-1">
                 {t('Combined', 'ആകെ')}
               </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
               <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[8px] font-bold opacity-50 uppercase tracking-wider mb-0.5">
                    {t('Total Paid', 'ആകെ നൽകിയത്')}
                  </p>
                  <p className="text-base font-black text-white">₹{combinedTotalPaid.toLocaleString('en-IN')}</p>
               </div>
               <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[8px] font-bold opacity-50 uppercase tracking-wider mb-0.5">
                    {t('Total Received', 'ആകെ ലഭിച്ചത്')}
                  </p>
                  <p className="text-base font-black text-white">₹{combinedTotalReceived.toLocaleString('en-IN')}</p>
               </div>
            </div>
          </div>
        </section>

      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-2xl border-t border-slate-200 z-20 max-w-2xl mx-auto rounded-t-3xl shadow-xl flex items-center justify-center gap-3">
        <Button
          type="button"
          onClick={handleExitToDashboard}
          className="h-12 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.99]"
        >
          <LayoutDashboard className="w-4 h-4 text-amber-400" />
          <span>{t('Back to Dashboard / ID Card', 'തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് / ഐഡി കാർഡ്')}</span>
        </Button>
      </div>
    </div>
  );
}
