import React from 'react';
import { useI18n } from '../lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Landmark, ShieldCheck, ArrowRight, Heart, ArrowLeft, CreditCard, CheckCircle2 } from 'lucide-react';
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
import { processRazorpayPayment } from '../lib/razorpay';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required / പേര് നൽകുക'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number / 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക'),
  email: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  postOffice: z.string().optional(),
  bloodGroup: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
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

export default function RegistrationForm({ onSubmit, districtQuotas = {}, districtQuotasUsed = {}, initialMobile }: RegistrationFormProps) {
  const { t } = useI18n();
  const [step, setStep] = React.useState<'details' | 'payment'>('details');
  const [agreeAdhoc, setAgreeAdhoc] = React.useState(false);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = React.useState(false);

  const handleRazorpayRegistration = async () => {
    setIsProcessingRazorpay(true);
    const formVals = form.getValues();
    try {
      const paymentDetails = await processRazorpayPayment({
        paymentType: 'registration',
        name: formVals.name,
        mobile: formVals.mobile
      });

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const fullValues = {
        ...formVals,
        transactionId: paymentDetails.paymentId,
        paymentId: paymentDetails.paymentId,
        orderId: paymentDetails.orderId,
        paymentAmount: 200,
        paymentMethod: 'Razorpay',
        paymentStatus: 'PAYMENT_VERIFIED',
        receiptNumber: paymentDetails.receiptNumber,
        paymentDate: todayStr,
        paymentTime: timeStr,
        paymentTimeISO: paymentDetails.paymentTime,
        pin: '123456',
      };

      toast.success('Razorpay Payment Verified! Completing Registration...');
      onSubmit(fullValues);
    } catch (err: any) {
      console.error('Razorpay Registration Error:', err);
      toast.error(err.message || 'Payment failed or cancelled.');
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: initialMobile || '',
      email: '',
      address: '',
      pincode: '',
      postOffice: '',
      bloodGroup: '',
      gender: '',
      dob: '',
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
                  <span>{t('reg_title', 'Membership Registration')}</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm shrink-0">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
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
                          {t('reg_fullname_label', "Full Name (പൂർണ്ണമായ പേര്)")} <span className="text-red-600">*</span>
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
                          {t('reg_mobile_label', "Mobile Number (ഫോൺ നമ്പർ)")} <span className="text-red-600">*</span>
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

                    {/* Optional Profile Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* Email */}
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            Email Address <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="member@email.com"
                              className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900"
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Date of Birth */}
                      <FormField control={form.control} name="dob" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            Date of Birth <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900"
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Gender */}
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            Gender <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900">
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Blood Group */}
                      <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            Blood Group <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900">
                                <SelectValue placeholder="Select Blood Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                                <SelectItem key={group} value={group}>{group}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>

                    {/* Address */}
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                          Address <span className="text-slate-400">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            rows={3}
                            placeholder="Enter your address"
                            className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-sm sm:text-base text-slate-900 outline-none focus:border-brand-blue resize-none"
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* Post Office */}
                      <FormField control={form.control} name="postOffice" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            Post Office <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Post Office"
                              className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900"
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* PIN Code */}
                      <FormField control={form.control} name="pincode" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                            PIN Code <span className="text-slate-400">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              maxLength={6}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="6-digit PIN"
                              className="h-[50px] sm:h-14 bg-white border-2 border-slate-200 focus:border-brand-blue rounded-2xl font-bold text-sm sm:text-base text-slate-900"
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>

                    {/* State Select */}
                    <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-800 font-extrabold uppercase text-xs sm:text-sm tracking-wide ml-1 block">
                          {t('reg_state_label', "State (സംസ്ഥാനം)")} <span className="text-red-600">*</span>
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
                            {t('reg_district_label', "District (ജില്ല)")} <span className="text-red-600">*</span>
                          </FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('assemblyConstituency', '');
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
                            {t('reg_constituency_label', "Assembly Constituency (മണ്ഡലം)")} <span className="text-red-600">*</span>
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
                {/* Razorpay Online Payment Integration */}
                <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 border-2 border-brand-blue shadow-2xl relative overflow-hidden space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-brand-blue/30 flex items-center justify-center text-white border border-brand-blue/50 shrink-0 shadow-inner">
                        <CreditCard className="w-6 h-6 text-brand-magenta" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base sm:text-lg uppercase tracking-wide">
                          Razorpay Instant Payment
                        </h4>
                        <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wider">
                          UPI • GPay • PhonePe • Cards • NetBanking
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                      Amount: ₹200 (Fixed)
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-bold leading-relaxed bg-black/40 p-3.5 rounded-2xl border border-white/10">
                    പുതിയ അംഗത്വ രജിസ്ട്രേഷൻ ഫീസ് <span className="text-emerald-400 font-extrabold">₹200</span> ആയി സിസ്റ്റം നേരിട്ട് ക്രമീകരിച്ചിരിക്കുന്നു. തുക മാറ്റം വരുത്താൻ സാധിക്കില്ല. താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്ത് Razorpay വഴി നേരിട്ട് തുക അടയ്ക്കാം.
                  </p>

                  <Button
                    type="button"
                    onClick={handleRazorpayRegistration}
                    disabled={isProcessingRazorpay}
                    className="w-full h-15 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>{isProcessingRazorpay ? 'Processing Payment...' : 'Pay ₹200 via Razorpay (₹200 ഓൺലൈൻ അടയ്ക്കുക)'}</span>
                  </Button>
                </div>

                <div className="pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setStep('details')}
                    className="w-full h-12 sm:h-13 rounded-2xl text-slate-500 hover:text-slate-800 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('reg_go_back_btn', 'Go Back / വിവരങ്ങൾ തിരുത്തുക')}
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
