import { useState, useEffect } from 'react';
import { useI18n } from './lib/i18n';
import { motion } from 'motion/react';
import { Search, ArrowRight, ArrowLeft, ShieldCheck, Heart, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, limit, addDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Logo from './Logo';
import { processRazorpayPayment } from './lib/razorpay';

interface RenewalFormProps {
  onBack: () => void;
  onSuccess: (member: UserProfile) => void;
  initialMobile?: string;
}

export default function RenewalForm({ onBack, onSuccess, initialMobile }: RenewalFormProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'search' | 'confirm' | 'payment'>('search');
  const [searchQuery, setSearchQuery] = useState(initialMobile || '');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<UserProfile | null>(null);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

  const handleRazorpayRenewal = async () => {
    if (!foundMember) return;
    setIsProcessingRazorpay(true);
    const loadingToast = toast.loading('Initiating Razorpay Renewal Payment...');
    try {
      const paymentDetails = await processRazorpayPayment({
        paymentType: 'renewal',
        memberId: foundMember.uid,
        mobile: foundMember.mobile,
        name: foundMember.name
      });

      toast.loading('Saving renewal payment record to database...', { id: loadingToast });

      const memberRef = doc(db, 'users', foundMember.uid);
      const now = new Date();
      
      // Calculate extended expiry date (current expiry + 1 year, or today + 1 year)
      let newExpiryDate = new Date();
      if (foundMember.expiryDate) {
        const expD = (foundMember.expiryDate as any).toDate ? (foundMember.expiryDate as any).toDate() : ((foundMember.expiryDate as any).seconds ? new Date((foundMember.expiryDate as any).seconds * 1000) : new Date(foundMember.expiryDate as any));
        if (!isNaN(expD.getTime()) && expD.getTime() > Date.now()) {
          newExpiryDate = new Date(expD);
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        } else {
          newExpiryDate.setFullYear(now.getFullYear() + 1);
        }
      } else {
        newExpiryDate.setFullYear(now.getFullYear() + 1);
      }

      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const renewalData = {
        status: 'active',
        isApproved: true,
        renewalPending: false,
        renewalTransactionId: paymentDetails.paymentId,
        renewalDate: serverTimestamp(),
        renewalPaymentDate: todayStr,
        renewalPaymentTime: timeStr,
        paymentAmount: 100,
        paymentId: paymentDetails.paymentId,
        orderId: paymentDetails.orderId,
        transactionId: paymentDetails.paymentId,
        paymentTime: paymentDetails.paymentTime,
        paymentMethod: 'Razorpay',
        paymentStatus: 'Renewed',
        receiptNumber: paymentDetails.receiptNumber,
        expiryDate: newExpiryDate
      };

      await updateDoc(memberRef, renewalData);

      // Save receipt to users/{uid}/receipts subcollection
      try {
        const receiptsRef = collection(db, 'users', foundMember.uid, 'receipts');
        await addDoc(receiptsRef, {
          receiptNo: paymentDetails.receiptNumber,
          receiptType: 'Membership Renewal',
          receiptLabel: 'Membership Renewal Receipt',
          amount: 100,
          paymentId: paymentDetails.paymentId,
          orderId: paymentDetails.orderId,
          transactionId: paymentDetails.paymentId,
          paymentTime: paymentDetails.paymentTime,
          paymentMethod: 'Razorpay',
          paymentStatus: 'Renewed',
          status: 'Paid',
          paymentDate: todayStr,
          createdAt: serverTimestamp(),
          memberId: foundMember.membershipId || foundMember.uid
        });
      } catch (rErr) {
        console.warn("Notice saving renewal receipt document:", rErr);
      }

      toast.success('Membership Renewed Successfully! (അംഗത്വം വിജയകരമായി പുതുക്കി)', { id: loadingToast });

      const updatedMember: UserProfile = {
        ...foundMember,
        ...renewalData,
        expiryDate: newExpiryDate
      } as UserProfile;

      onSuccess(updatedMember);
    } catch (err: any) {
      console.error('Razorpay Renewal Error:', err);
      toast.error(err.message || 'Renewal payment failed or cancelled.', { id: loadingToast });
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  // Check if member has active validity
  const getMemberValidityInfo = (member: UserProfile) => {
    const isLifeMember = String(member.membership_type || member.membershipType || '').toUpperCase().includes('LIFE');
    if (isLifeMember) {
      return { hasActiveValidity: true, message: 'താങ്കൾ ഒരു ലൈഫ് മെമ്പർ (Life Member) ആണ്. താങ്കൾക്ക് റിന്യൂ ചെയ്യേണ്ടതില്ല.' };
    }

    if (member.role === 'admin' || member.role === 'operator' || member.isAdmin) {
      return { hasActiveValidity: true, message: 'താങ്കൾ ഒരു അഡ്മിൻ/ഓപ്പറേറ്റർ ആണ്. പുതുക്കൽ ആവശ്യമില്ല.' };
    }
    
    if (member.renewalPending) {
      return { hasActiveValidity: false, message: null }; // Wait for admin approval
    }

    const exp = member.expiryDate || (() => {
      const reg = member.registrationDate;
      if (!reg) return null;
      const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
      if (isNaN(regD.getTime())) return null;
      const expD = new Date(regD);
      expD.setFullYear(expD.getFullYear() + 1);
      return expD;
    })();

    if (!exp) return { hasActiveValidity: false, message: null };

    const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
    if (isNaN(d.getTime())) return { hasActiveValidity: false, message: null };

    const isActive = d.getTime() > Date.now();
    if (isActive) {
      const dateString = d.toLocaleDateString('en-IN');
      return { 
        hasActiveValidity: true, 
        message: `താങ്കൾക്ക് ഈ വർഷം ${dateString} വരെ വാലിഡിറ്റി ഉണ്ട്. താങ്കൾക്ക് റിന്യൂ ചെയ്യാൻ സമയമായിട്ടില്ല.` 
      };
    }

    return { hasActiveValidity: false, message: null };
  };

  useEffect(() => {
    if (initialMobile) {
      const runAutoSearch = async () => {
        setSearching(true);
        try {
          const qMob = query(collection(db, 'users'), where('mobile', '==', initialMobile), limit(1));
          const snapMob = await getDocs(qMob);
          const docSnap = snapMob.docs[0];
          if (docSnap) {
            setFoundMember({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            setStep('confirm');
          }
        } catch (e) {
          console.error("Auto search from landing page failed", e);
        } finally {
          setSearching(false);
        }
      };
      runAutoSearch();
    }
  }, [initialMobile]);

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter Membership ID or Mobile Number');
      return;
    }

    setSearching(true);
    try {
      // Search by membershipId OR mobile
      const qId = query(collection(db, 'users'), where('membershipId', '==', searchQuery.toUpperCase()), limit(1));
      const qMob = query(collection(db, 'users'), where('mobile', '==', searchQuery), limit(1));
      
      const [snapId, snapMob] = await Promise.all([getDocs(qId), getDocs(qMob)]);
      
      let docSnap = snapId.docs[0] || snapMob.docs[0];
      
      if (docSnap) {
        setFoundMember({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        setStep('confirm');
      } else {
        toast.error('No membership found. Please check details or contact admin.');
      }
    } catch (error) {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <Logo className="mb-4 scale-125" />
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mt-6">{t('renewal_title', 'Membership Renewal')}</h2>
          <p className="text-[#c9a227] text-[10px] font-black tracking-[0.2em] mt-1 uppercase">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        <Card className="border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[32px]">
          {step === 'search' && (
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-foreground/70 font-black uppercase text-[10px] tracking-widest ml-1">{t('renewal_search_label', 'Search ID or Mobile')}</label>
                <div className="relative">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-foreground/30" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('renewal_search_placeholder', "e.g. KL/MLP/KTK/1001 or mobile number")}
                    className="pl-12 h-14 bg-white/5 border-border focus:border-brand-blue/50 transition-all rounded-[20px] font-bold text-lg"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl shadow-brand-blue/10 group bg-brand-blue text-white hover:bg-brand-blue/90"
              >
                {searching ? t('search_loading', 'Looking up...') : t('find_profile_btn', 'Find Profile')}
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                {t('return_home_btn', 'Return Home')}
              </Button>
            </CardContent>
          )}

          {step === 'confirm' && foundMember && (
            <CardContent className="p-8 space-y-8">
              <div className="bg-brand-blue/5 border border-brand-blue/20 p-6 rounded-[28px] text-center">
                <div className="w-16 h-16 bg-brand-magenta/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-magenta/20">
                  <Heart className="w-8 h-8 text-brand-magenta" />
                </div>
                <h3 className="text-2xl font-black text-brand-blue uppercase tracking-tight truncate">{foundMember.name}</h3>
                <p className="text-[10px] font-black text-foreground/40 tracking-[0.2em] mt-1">{foundMember.membershipId}</p>
              </div>

              {(() => {
                const validity = getMemberValidityInfo(foundMember);
                if (validity.hasActiveValidity) {
                  return (
                    <div className="space-y-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-[24px] text-center space-y-3 shadow-md">
                        <div className="w-12 h-12 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto border border-amber-500/35">
                          <ShieldCheck className="w-6 h-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-black text-amber-600 leading-relaxed">
                          {validity.message}
                        </p>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <Button 
                          onClick={() => setStep('search')}
                          className="w-full h-14 rounded-[20px] text-md font-black bg-brand-blue text-white hover:bg-brand-blue/90 shadow-xl shadow-brand-blue/10"
                        >
                          {t('renewal_search_another', 'പകരം വേറെ ഐഡി തിരയുക (Search Another)')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={onBack}
                          className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
                        >
                          {t('return_home_btn', 'Return Home')}
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">{t('renewal_fee_label', 'Renewal Fee')}</span>
                      <span className="text-xl font-black text-brand-blue">₹100</span>
                    </div>
                    <Button 
                      onClick={() => setStep('payment')}
                      className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl shadow-brand-blue/10 bg-brand-blue text-white hover:bg-brand-blue/90"
                    >
                      {t('reg_proceed_to_payment', 'Proceed to Payment')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setStep('search')}
                      className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
                    >
                      {t('renewal_not_you', 'Not you? Search again')}
                    </Button>
                  </div>
                );
              })()}
            </CardContent>
          )}

          {step === 'payment' && (
            <CardContent className="p-8 space-y-6">
              {/* Razorpay Online Payment Integration for Renewal */}
              <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-[28px] p-6 border-2 border-brand-blue shadow-2xl relative overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/30 flex items-center justify-center text-white border border-brand-blue/50 shrink-0 shadow-inner">
                      <CreditCard className="w-5 h-5 text-brand-magenta" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base uppercase tracking-wide">
                        Razorpay Renewal Payment
                      </h4>
                      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                        UPI • GPay • PhonePe • Cards • NetBanking
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                    Fee: ₹100 (Fixed)
                  </div>
                </div>

                <p className="text-xs text-slate-200 font-bold leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 text-left">
                  അംഗത്വം പുതുക്കൽ ഫീസ് <span className="text-emerald-400 font-extrabold">₹100</span> ആയി സിസ്റ്റം ഓട്ടോമാറ്റിക് ആയി ക്രമീകരിച്ചിരിക്കുന്നു. Razorpay വഴി തൽക്ഷണം പുതുക്കൽ പൂർത്തിയാക്കാം.
                </p>

                <Button
                  type="button"
                  onClick={handleRazorpayRenewal}
                  disabled={isProcessingRazorpay}
                  className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>{isProcessingRazorpay ? 'Processing Renewal...' : 'Pay ₹100 via Razorpay (₹100 അടയ്ക്കുക)'}</span>
                </Button>
              </div>

              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('confirm')}
                  className="w-full h-12 rounded-2xl text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('reg_go_back_btn', 'Go Back / വിവരങ്ങൾ തിരുത്തുക')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
