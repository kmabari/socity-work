import React from 'react';
import { useI18n } from '../lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Landmark, ShieldCheck, ArrowRight, Heart, Receipt, ArrowLeft } from 'lucide-react';
import { DISTRICTS, STATES, CONSTITUENCIES } from '@/src/constants';
import Logo from '../Logo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required / പേര് നൽകുക'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number / 10 അക്ക മെബൈൽ നമ്പർ നൽകുക'),
  district: z.string().min(1, 'Select district / ജില്ല തിരഞ്ഞെടുക്കുക'),
  state: z.string().min(1, 'Select state / സ്റ്റേറ്റ് തിരഞ്ഞെടുക്കുക'),
  assemblyConstituency: z.string().min(1, 'Assembly constituency is required / മണ്ഡലം തിരഞ്ഞെടുക്കുക'),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  onSubmit: (values: any) => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  initialMobile?: string;
}

const QR_MIRRORS = [
  'https://images.weserv.nl/?url=https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg',
  'https://wsrv.nl/?url=https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg',
  'https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg'
];

export default function RegistrationForm({ onSubmit, districtQuotas = {}, districtQuotasUsed = {}, initialMobile }: RegistrationFormProps) {
  const { t } = useI18n();
  const [step, setStep] = React.useState<'details' | 'payment'>('details');
  const [transactionId, setTransactionId] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [paymentTime, setPaymentTime] = React.useState(() => {
    const today = new Date();
    return today.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
  });
  const [mirrorIndex, setMirrorIndex] = React.useState(0);
  const [qrSrc, setQrSrc] = React.useState(QR_MIRRORS[0]);
  const [agreeAdhoc, setAgreeAdhoc] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: initialMobile || '',
      district: '',
      state: 'Kerala',
      assemblyConstituency: '',
    },
  });

  const district = form.watch('district');
  const availableConstituencies = CONSTITUENCIES[district] || [];

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeAdhoc) {
      toast.error('Please accept the Adhoc Membership agreement / രജിസ്റ്റർ ചെയ്യുന്നതിനായി അഡ്ഹോക്ക് മെമ്പർഷിപ്പ് നിബന്ധനകൾ അംഗീകരിക്കുക');
      return;
    }
    const isValid = await form.trigger();
    if (isValid) {
      const loadingToast = toast.loading('Auditing registration status...');
      try {
        const cleanMobile = form.getValues('mobile').replace(/\D/g, '').slice(-10);
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('mobile', '==', cleanMobile), 
          where('status', 'in', ['pending', 'active', 'offline', 'disabled']),
          limit(1)
        );
        const res = await getDocs(q);
        if (!res.empty) {
          toast.error("This mobile number is already registered. Please go back and log in.");
          toast.dismiss(loadingToast);
          return;
        }
        toast.dismiss(loadingToast);
        setStep("payment");
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Failed to verify mobile number. Please try again.");
      }
    }
  };

  const handleFinalSubmit = () => {
    if (!transactionId.trim()) {
      toast.error('Please enter payment transaction ID / ട്രാന്സാക്ഷൻ ഐഡി നൽകുക');
      return;
    }
    const data = form.getValues();
    const fullValues = {
      ...data,
      email: '',
      address: '',
      pincode: '',
      postOffice: '',
      bloodGroup: '',
      transactionId: transactionId.trim(),
      paymentDate: paymentDate,
      paymentTime: paymentTime,
      pin: '123456', // default lock pin
    };
    onSubmit(fullValues);
  };

  return (
    <div className="min-h-screen pt-2 pb-8 sm:py-12 md:py-20 px-3 sm:px-6 font-sans relative overflow-x-hidden flex flex-col items-center justify-start sm:justify-center">
      {/* Dynamic graphic backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-magenta/8 blur-3xl pointer-events-none max-md:hidden" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/8 blur-3xl pointer-events-none max-md:hidden" />

      <div className="max-w-xl w-full z-10 mx-auto px-0.5 sm:px-2">
        <div className="text-center mb-3 sm:mb-8">
          {/* Logo container shifted upward on mobile with optimized padding */}
          <div className="inline-block p-3 sm:p-5 bg-white shadow-premium rounded-[26px] sm:rounded-[36px] mb-2 sm:mb-4 border border-slate-100 transition-all hover:scale-105">
            <Logo className="w-28 h-28 xs:w-32 xs:h-32 sm:w-48 sm:h-48 md:w-52 md:h-52 mx-auto" size="lg" />
          </div>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight px-1 sm:px-0">
            {t('reg_title', 'Membership Registration')}
          </h2>
          <p className="text-[#c9a227] text-[10.5px] xs:text-xs sm:text-base font-black tracking-widest mt-1 sm:mt-2 uppercase px-1">
            HIGHRICH COMMUNITY REVIVAL SOCIETY
          </p>
        </div>

        {/* Sleek Form Container */}
        <Card className="border-2 border-slate-200 bg-white shadow-2xl overflow-hidden rounded-[26px] sm:rounded-[36px] w-full">
          <CardHeader className="bg-slate-50 border-b border-slate-200/80 p-4 sm:p-8 md:p-10">
            <CardTitle className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-tight">
              {step === 'details' ? (
                <>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span>{t('reg_fast_title', 'Fast Registration')}</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm shrink-0">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span>{t('reg_payment_title', 'Membership Payment')}</span>
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-600 font-extrabold uppercase tracking-wider text-[11px] sm:text-sm mt-1 sm:mt-2.5">
              {step === 'details' ? t('reg_step_1_desc', 'Secure Registration Node • Step 1') : t('reg_step_2_desc', 'Treasury Portal • Step 2')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-8 md:p-10">
            {step === 'details' ? (
              <Form {...form}>
                <form onSubmit={handleNextStep} className="space-y-5 sm:space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4.5 sm:space-y-6">
                    {/* Name Input */}
                    <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                          {t('reg_fullname_label', "Full Name (പൂർണ്ണമായ പേര്)")}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-400"}`} />
                            <Input 
                              {...field} 
                              placeholder={t('reg_fullname_placeholder', "Enter your full legal name")} 
                              className={`pl-12 h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm sm:text-base text-slate-900 placeholder:text-slate-500 placeholder:font-medium ${fieldState.error ? 'border-red-500 focus:border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    {/* Phone Input */}
                    <FormField control={form.control} name="mobile" render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                          {t('reg_mobile_label', "Mobile Number (ഫോൺ നമ്പർ)")}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-400"}`} />
                            <Input 
                              {...field} 
                              maxLength={10}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '');
                                field.onChange(cleaned);
                              }}
                              placeholder="**********" 
                              className={`pl-12 h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm sm:text-base text-slate-900 placeholder:text-slate-500 placeholder:font-medium ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    {/* State Select */}
                    <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                          {t('reg_state_label', "State (സംസ്ഥാനം)")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={`h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue transition-all rounded-2xl font-bold text-sm sm:text-base text-slate-900 ${fieldState.error ? 'border-red-500' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Landmark className={`w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-400"}`} />
                                <SelectValue placeholder={t('reg_state_placeholder', "Select State")} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* District */}
                      <FormField control={form.control} name="district" render={({ field, fieldState }) => (
                        <FormItem className="col-span-1 space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            {t('reg_district_label', "District (ജില്ല)")}
                          </FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('assemblyConstituency', CONSTITUENCIES[val]?.[0] || '');
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue transition-all rounded-2xl font-bold text-sm sm:text-base text-slate-900 ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={t('reg_district_placeholder', "Select District")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Assembly Constituency */}
                      <FormField control={form.control} name="assemblyConstituency" render={({ field, fieldState }) => (
                        <FormItem className="col-span-1 space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            {t('reg_constituency_label', "Assembly Constituency (മണ്ഡലം)")}
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            disabled={!district}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue transition-all rounded-2xl font-bold text-sm sm:text-base text-slate-900 ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={district ? t('reg_constituency_placeholder', "Select Assembly") : t('reg_constituency_select_dist_first', "Select District first")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {availableConstituencies.map(ac => <SelectItem key={ac} value={ac}>{ac}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>
                  </motion.div>

                  {/* Terms Info */}
                  <div className="border-t border-slate-200 pt-5 sm:pt-6 flex items-start gap-3.5 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-800 font-bold leading-relaxed">
                      {t('reg_terms_note', "നിങ്ങൾ വിജയകരമായി രജിസ്റ്റർ ചെയ്താൽ, നിങ്ങളുടെ മൊബൈൽ നമ്പറും പാസ്‌വേഡ് '123456' ഉം ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം. തുടർന്ന് പ്രൊഫൈൽ എഡിറ്റ് ചെയ്ത് നിങ്ങളുടെ മറ്റ് വിവരങ്ങൾ പൂർത്തീകരിക്കാവുന്നതാണ്.")}
                    </p>
                  </div>

                  {/* Adhoc Membership Acceptance Checklist */}
                  <div 
                    onClick={() => setAgreeAdhoc(!agreeAdhoc)}
                    className={`p-4.5 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                        agreeAdhoc 
                          ? 'border-brand-magenta bg-brand-magenta/5 shadow-sm' 
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 shadow-sm'
                    }`}
                  >
                    <Checkbox 
                      checked={agreeAdhoc} 
                      onCheckedChange={(val) => setAgreeAdhoc(!!val)} 
                      className={`w-5.5 h-5.5 mt-0.5 pointer-events-none shrink-0 ${
                        agreeAdhoc 
                          ? 'border-brand-magenta bg-brand-magenta text-white' 
                          : 'border-slate-400 bg-white'
                      }`} 
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-xs sm:text-sm md:text-base font-bold leading-relaxed ${agreeAdhoc ? 'text-slate-900' : 'text-slate-800'}`}>
                        {t('reg_agreement_text', 'I wish to continue as an Adhoc Member of the Highrich Community Revival Society (HCRS) and agree to abide by the Society Rules, Regulations and Terms & Conditions. *')}
                      </p>
                    </div>
                  </div>

                  {/* Move to Step 2 Button */}
                  <Button 
                    type="submit" 
                    disabled={!agreeAdhoc || (district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])}
                    className="w-full h-[52px] sm:h-15 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 uppercase tracking-widest bg-brand-blue hover:bg-[#083D91] text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:translate-y-[-1px] active:translate-y-0 px-4"
                  >
                    {(district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])
                      ? t('reg_quota_exhausted', 'Quota Exhausted / ക്വാട്ട കഴിഞ്ഞു') 
                      : t('reg_proceed_to_payment', 'Proceed to Payment / പേയ്മെന്റിലേക്ക് പോവുക')}
                    <ArrowRight className="w-5 h-5 text-white shrink-0" />
                  </Button>
                </form>
              </Form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 sm:space-y-7">
                <div className="bg-[#030e1d] text-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 border-3 border-brand-blue shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-brand-blue/20 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-brand-magenta/15 blur-3xl pointer-events-none" />
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue to-brand-magenta" />
                  
                  <h4 className="font-extrabold text-white text-base sm:text-lg md:text-xl flex items-center justify-center sm:justify-start gap-3 mb-4 uppercase tracking-wider">
                    <span className="p-2 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center animate-pulse shrink-0">
                      <Receipt className="w-5 h-5 text-brand-magenta" />
                    </span>
                    <span>{t('reg_upi_qr_title', 'പേയ്മെന്റ് ക്യു ആർ കോഡ് (UPI Payment QR)')}</span>
                  </h4>
                  
                  <p className="text-xs sm:text-sm text-slate-100 font-extrabold leading-relaxed text-center sm:text-left bg-brand-blue/10 p-3.5 sm:p-4 rounded-2xl border border-brand-blue/30 mb-5">
                    {t('reg_upi_scan_instruction', 'Scan the QR code below using GPay, PhonePe, or Paytm to pay <span className="text-brand-magenta font-black text-lg underline decoration-brand-magenta">₹200</span> for 1-Year National Active Membership. (താഴെയുള്ള ക്യു ആർ കോഡ് സ്കാൻ ചെയ്ത് ₹200 അടയ്ക്കുക):')}
                  </p>

                  <div className="flex flex-col items-center justify-center gap-4 bg-slate-900/80 p-5 sm:p-6 rounded-[24px] border-2 border-slate-800 shadow-inner">
                    {/* Public UPI Payment QR with Proxy support for Palakkad cellular ISP blocks */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-xl shrink-0">
                      <img 
                        src={qrSrc}
                        onError={() => {
                          if (mirrorIndex < QR_MIRRORS.length - 1) {
                            const nextIndex = mirrorIndex + 1;
                             setMirrorIndex(nextIndex);
                            setQrSrc(QR_MIRRORS[nextIndex]);
                          }
                        }}
                        alt="UPI Payment QR Code"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full text-center mt-1">
                      <p className="text-xs sm:text-sm font-black text-white bg-slate-950/90 px-4 py-2.5 rounded-xl border border-slate-800 tracking-wider flex items-center gap-2 justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{t('reg_upi_scan_box_text', 'ഈ QR കോഡ് സ്കാൻ ചെയ്ത് ₹200 അടയ്ക്കുക')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Payment Date & Time Input fields */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-slate-700 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                        {t('reg_payment_date_label', 'അടച്ച തീയതി (Payment Date)')} <span className="text-brand-magenta font-black">*</span>
                      </label>
                      <Input 
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-14 bg-white border-2 border-slate-200 focus:border-[#0066FF] transition-all rounded-2xl font-bold font-mono text-center text-sm sm:text-base text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-700 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                        {t('reg_payment_time_label', 'അടച്ച സമയം (Payment Time)')} <span className="text-brand-magenta font-black">*</span>
                      </label>
                      <Input 
                        type="time"
                        value={paymentTime}
                        onChange={(e) => setPaymentTime(e.target.value)}
                        className="h-14 bg-white border-2 border-slate-200 focus:border-[#0066FF] transition-all rounded-2xl font-bold font-mono text-center text-sm sm:text-base text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Quick Helper Button and indicator */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 sm:p-4 rounded-2xl">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">
                      {t('reg_current_time_info', 'തീയതിയും സമയവും ഇപ്പോഴത്തെ സമയത്തേക്ക് സെറ്റ് ചെയ്യുവാൻ:')}
                    </span>
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setPaymentDate(today.toISOString().split('T')[0]);
                        setPaymentTime(today.toTimeString().split(' ')[0].substring(0, 5));
                        toast.success(t('reg_toast_date_time_set', 'തീയതിയും സമയവും ഇപ്പോഴത്തെ സമയത്തേക്ക് മാറ്റി!'));
                      }}
                      className="border-2 border-[#0066FF]/40 text-[#0066FF] hover:bg-[#0066FF]/10 text-xs font-black uppercase px-3.5 h-10 rounded-xl shrink-0 flex items-center gap-1.5 bg-white"
                    >
                      {t('reg_use_current_btn', 'ഇപ്പോൾ (Use Current)')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-700 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                      {t('reg_txnid_label', 'ട്രാൻസാക്ഷൻ ഐഡി നമ്പർ അടിക്കുക (Enter Transaction ID)')} <span className="text-brand-magenta font-black">*</span>
                    </label>
                    <Input 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="E.g. TXN123456789 or 12-digit UTR"
                      maxLength={25}
                      className="h-14 sm:h-15 bg-white border-2 border-slate-200 focus:border-[#0066FF] transition-all rounded-2xl font-black font-mono tracking-wider text-center text-base sm:text-lg text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
                    {t('reg_txnid_note', '* അടച്ച തുകയുടെ ശരിയായ യു.പി.ഐ റഫറൻസ് നമ്പറോ ട്രാന്സാക്ഷൻ ഐഡിയോ ഇവിടെ നൽകുക. പരിശോധനയ്ക്ക് ശേഷം അഡ്മിൻ പ്രൊഫൈൽ ആക്റ്റീവ് ചെയ്യുന്നതാണ്.')}
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <Button 
                      type="button" 
                      onClick={handleFinalSubmit}
                      disabled={transactionId.trim().length < 8}
                      className="w-full h-14 sm:h-15 rounded-2xl font-black bg-gradient-to-r from-[#0066FF] to-indigo-600 text-white shadow-lg shadow-[#0066FF]/20 hover:shadow-brand-blue/30 transition-all text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:translate-y-[-1.5px] active:translate-y-0 px-4"
                    >
                      {t('reg_complete_btn', 'Complete Registration / രജിസ്റ്റർ ചെയ്യുക')}
                      <ArrowRight className="w-5 h-5 text-white shrink-0" />
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setStep('details')}
                      className="w-full h-12 sm:h-13 rounded-2xl text-slate-500 hover:text-slate-800 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> {t('reg_go_back_btn', 'Go Back / വിവരങ്ങൾ തിരുത്തുക')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
