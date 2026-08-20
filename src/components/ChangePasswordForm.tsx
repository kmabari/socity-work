import React, { useState } from 'react';
import { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, LogOut, AlertCircle } from 'lucide-react';
import Logo from '@/src/Logo';

interface ChangePasswordFormProps {
  user: UserProfile;
  onPasswordChanged: (newPin: string) => Promise<void>;
  onLogout: () => void;
  isLoading?: boolean;
}

export default function ChangePasswordForm({
  user,
  onPasswordChanged,
  onLogout,
  isLoading = false
}: ChangePasswordFormProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric, maximum 6 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setNewPin(digitsOnly);
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric, maximum 6 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNewPin = newPin.replace(/\D/g, '').slice(0, 6);
    const cleanConfirmPin = confirmPin.replace(/\D/g, '').slice(0, 6);

    if (!cleanNewPin || cleanNewPin.length !== 6) {
      toast.error('പാസ്‌വേഡ് കൃത്യമായി 6 അക്കങ്ങൾ (digits) ആയിരിക്കണം. (Password must be exactly 6 digits)');
      return;
    }

    if (cleanNewPin === '123456') {
      toast.error('ഡീഫോൾട്ട് പാസ്‌വേഡ് (123456) ഉപയോഗിക്കാൻ പാടില്ല. പുതിയ 6 അക്ക പാസ്‌വേഡ് നൽകുക. (Cannot use default password 123456)');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      toast.error('നൽകിയ പാസ്‌വേഡുകൾ പരസ്പരം പൊരുത്തപ്പെടുന്നില്ല! (Passwords do not match)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPasswordChanged(cleanNewPin);
    } catch (err: any) {
      console.error('Change password failed:', err);
      toast.error(err?.message || 'പാസ്‌വേഡ് മാറ്റാൻ സാധിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക. (Failed to change password)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo size="md" className="w-20 h-20 shrink-0 mb-1" />
          
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black tracking-wider uppercase">
            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
            സുരക്ഷാ നിർദ്ദേശം (Security Notice)
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            പാസ്‌വേഡ് മാറ്റുക <br />
            <span className="text-amber-600 text-base sm:text-lg font-extrabold">Change Mandatory Password</span>
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
            സുരക്ഷ മുൻനിർത്തി ആദ്യമായി ലോഗിൻ ചെയ്യുമ്പോൾ ഡീഫോൾട്ട് പാസ്‌വേഡ് (123456) മാറ്റി പുതിയ 6 അക്ക രഹസ്യ കോഡ് നൽകേണ്ടതുണ്ട്.
          </p>
        </div>

        {/* Member Badge */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1 text-xs">
          <div className="flex justify-between items-center text-slate-500 font-bold text-[10px] uppercase">
            <span>അംഗത്തിന്റെ പേര്</span>
            <span>മെമ്പർഷിപ്പ് നമ്പർ</span>
          </div>
          <div className="flex justify-between items-center font-black text-slate-900">
            <span className="truncate max-w-[180px]">{user.name}</span>
            <span className="font-mono text-brand-blue text-[11px]">{user.membershipId || user.mobile}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="new-pin" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand-blue" />
                പുതിയ പാസ്‌വേഡ് (New 6-Digit Password)
              </Label>
              <span className={`text-[11px] font-mono font-black ${newPin.length === 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {newPin.length}/6 digits
              </span>
            </div>
            <div className="relative">
              <Input
                id="new-pin"
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6 അക്ക രഹസ്യ കോഡ് നൽകുക"
                value={newPin}
                onChange={handleNewPinChange}
                className="h-12 rounded-xl border-slate-300 pr-11 font-mono text-base font-black focus-visible:ring-brand-blue tracking-widest"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-bold">കൃത്യമായി 6 അക്കങ്ങൾ ടൈപ്പ് ചെയ്യുക (Only 6 numbers)</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="confirm-pin" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                പാസ്‌വേഡ് വീണ്ടും നൽകുക (Confirm 6-Digit Password)
              </Label>
              <span className={`text-[11px] font-mono font-black ${confirmPin.length === 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {confirmPin.length}/6 digits
              </span>
            </div>
            <div className="relative">
              <Input
                id="confirm-pin"
                type={showConfirmPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="പുതിയ പാസ്‌വേഡ് ഒരിക്കൽ കൂടി"
                value={confirmPin}
                onChange={handleConfirmPinChange}
                className="h-12 rounded-xl border-slate-300 pr-11 font-mono text-base font-black focus-visible:ring-brand-blue tracking-widest"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {newPin === '123456' && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              123456 ഡീഫോൾട്ട് പാസ്‌വേഡ് ആയതിനാൽ പുതിയ മറ്റൊരു 6 അക്ക പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക.
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || newPin.length !== 6 || confirmPin.length !== 6 || newPin === '123456'}
              className="w-full h-12 rounded-xl bg-brand-magenta hover:bg-brand-magenta/95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer border-b-4 border-[#9c7203]/60"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting || isLoading ? 'പാസ്‌വേഡ് മാറ്റുന്നു...' : 'പാസ്‌വേഡ് സേവ് ചെയ്യുക (Save Password)'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              ലോഗ് ഔട്ട് (Sign Out)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
