import React, { useState } from 'react';
import { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Lock, Save, ArrowLeft, Mail, MapPin, Heart, Calendar, EyeOff } from 'lucide-react';
import { DISTRICTS, BLOOD_GROUPS, CONSTITUENCIES, getAssemblyCode } from '@/src/constants';

interface ProfileEditFormProps {
  user: UserProfile;
  onSave: (updatedData: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
  isMandatory?: boolean;
}

export default function ProfileEditForm({ user, onSave, onCancel, isMandatory = false }: ProfileEditFormProps) {
  const [address, setAddress] = useState(user.address || '');
  const [email, setEmail] = useState(user.email || '');
  const [pincode, setPincode] = useState(user.pincode || '');
  const [postOffice, setPostOffice] = useState(user.postOffice || '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dob, setDob] = useState(user.dob || '');
  const [district, setDistrict] = useState(user.district || DISTRICTS[0].code);
  const [assemblyConstituency, setAssemblyConstituency] = useState(user.assemblyConstituency || '');
  const [sponsorName, setSponsorName] = useState(user.sponsorName || '');
  const [sponsorMobile, setSponsorMobile] = useState(user.sponsorMobile || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Sanitize values
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    const cleanSponsorMobile = sponsorMobile.trim().replace(/\D/g, '');
    if (cleanSponsorMobile && cleanSponsorMobile.length !== 10) {
      toast.error('സ്പോൺസറുടെ മൊബൈൽ നമ്പർ 10 അക്കങ്ങൾ ആയിരിക്കണം. (Leader/Sponsor mobile must be 10 digits)');
      setIsSubmitting(false);
      return;
    }

    const updatedData: Partial<UserProfile> = {
      address: address.trim(),
      email: cleanEmail,
      pincode: pincode.trim().replace(/\D/g, ''),
      postOffice: postOffice.trim(),
      bloodGroup: bloodGroup,
      gender: gender,
      dob: dob,
      district: district,
      assemblyConstituency: assemblyConstituency,
      sponsorName: sponsorName.trim(),
      sponsorMobile: cleanSponsorMobile,
      mustCompleteProfile: false,
      profileCompleted: true
    };

    try {
      await onSave(updatedData);
      onCancel();
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("Failed to update profile details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDistrictName = (code: string) => {
    return DISTRICTS.find(d => d.code === code)?.name || code;
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-premium p-6 sm:p-8 max-w-lg w-full mx-auto space-y-6 text-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={onCancel}
            className="rounded-xl h-9 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>തിരികെ (Back)</span>
          </Button>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Edit Profile (പ്രൊഫൈൽ തിരുത്തുക)
            </h3>
            <p className="text-[10px] text-amber-700 font-extrabold uppercase">
              Update Personal Details
            </p>
          </div>
        </div>
      </div>

      {isMandatory && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs font-bold text-amber-950 leading-relaxed">
          പ്രിയ അംഗമേ, മെമ്പർഷിപ്പ് ഐഡി കാർഡ് കാണുന്നതിനായി താങ്കളുടെ മേൽവിലാസം, മണ്ഡലം, രക്തഗ്രൂപ്പ് തുടങ്ങിയ വിവരങ്ങൾ ഒരിക്കൽ പരിശോധിച്ച് താഴെ സേവ് ചെയ്യുക. പിന്നീട് ലോഗിൻ ചെയ്യുമ്പോൾ ഇത് വീണ്ടും ചോദിക്കില്ല.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* PERMANENTLY LOCKED FIELDS SECTION */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            Locked Fields (Permanently Permanent)
          </div>
          
          <div className="grid grid-cols-2 gap-3.5 divide-y divide-slate-100/50">
            <div className="pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Name</span>
              <span className="text-xs font-black text-slate-600 truncate block">{user.name}</span>
            </div>
            <div className="pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Mobile</span>
              <span className="text-xs font-mono font-black text-slate-600 truncate block">{user.mobile}</span>
            </div>
            <div className="pt-2 pb-1.5 col-span-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Membership ID</span>
              <span className="text-xs font-mono font-black text-brand-blue truncate block">{user.membershipId || 'KL/HCRS/PENDING'}</span>
            </div>
            <div className="pt-2 pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Constituency Code</span>
              <span className="text-xs font-mono font-black text-brand-blue truncate block">
                {user.constituencyCode || (user.assemblyConstituency ? getAssemblyCode(user.assemblyConstituency) : 'NA')}
              </span>
            </div>
            <div className="pt-2 pb-0.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">State</span>
              <span className="text-xs font-black text-slate-600 truncate block">{user.state || 'Kerala'}</span>
            </div>
          </div>
          <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-xl p-3 text-center">
            <p className="text-xs sm:text-sm font-bold text-amber-950 leading-snug">
              പേര്, മൊബൈൽ നമ്പർ, മെമ്പർഷിപ്പ് നമ്പർ എന്നിവയിൽ മാറ്റങ്ങൾ വരുത്തുവാൻ അഡ്മിനുമായി ബന്ധപ്പെടുക.
            </p>
            <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
              (Contact admin to update core credentials)
            </p>
          </div>
        </div>

        {/* EDITABLE FIELDS SECTION */}
        <div className="space-y-4">
          <div className="font-black text-[10px] text-brand-blue uppercase tracking-wider border-b border-slate-100 pb-1.5">
            Editable Personal Information
          </div>

          {/* District & Assembly Constituency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                District / ജില്ലാ
              </Label>
              <Select value={district} onValueChange={(val) => {
                setDistrict(val);
                setAssemblyConstituency(CONSTITUENCIES[val]?.[0] || 'NA');
              }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {DISTRICTS.map(d => (
                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Assembly Constituency / മണ്ഡലം
              </Label>
              <Select value={assemblyConstituency} onValueChange={setAssemblyConstituency}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                  <SelectValue placeholder="Select Constituency" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(CONSTITUENCIES[district] || []).map(ac => (
                    <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="m-email" className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" /> Email Address
            </Label>
            <Input 
              id="m-email"
              type="text"
              placeholder="e.g. member@email.com"
              className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth
              </Label>
              <Input 
                type="date"
                className="h-11 rounded-xl border-slate-200 px-3 focus-visible:ring-brand-blue text-xs font-bold"
                value={dob}
                onChange={e => setDob(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Gender
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="m-address" className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Correspondence Address
            </Label>
            <Textarea 
              id="m-address"
              placeholder="Enter full permanent/mailing address"
              className="min-h-16 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Post Office & Pin Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-post" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Post Office
              </Label>
              <Input 
                id="m-post"
                type="text"
                placeholder="Post Town"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
                value={postOffice}
                onChange={e => setPostOffice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-pin" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Pin Code
              </Label>
              <Input 
                id="m-pin"
                type="text"
                maxLength={6}
                placeholder="6 digits pincode"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold font-mono"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" /> Blood Group
            </Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BLOOD_GROUPS.map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leader / Sponsor Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                Leader / Sponsor Details <span className="text-[10px] font-bold text-slate-500 normal-case">(Optional)</span>
              </Label>
              <span className="text-[10px] font-bold text-slate-500">For printed membership form (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sponsor-name" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Leader / Sponsor Name <span className="text-[9px] font-bold text-slate-400 normal-case">(Optional)</span>
                </Label>
                <Input 
                  id="edit-sponsor-name"
                  type="text"
                  placeholder="Leader Name (Optional)"
                  className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
                  value={sponsorName}
                  onChange={e => setSponsorName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-sponsor-mobile" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Leader Mobile <span className="text-[9px] font-bold text-slate-400 normal-case">(Optional)</span>
                </Label>
                <Input 
                  id="edit-sponsor-mobile"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile (Optional)"
                  className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold font-mono"
                  value={sponsorMobile}
                  onChange={e => setSponsorMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border-slate-300 hover:bg-slate-100 text-slate-800 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> തിരികെ (Back)
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-[1.5] h-12 rounded-xl bg-brand-magenta hover:bg-brand-magenta/90 text-slate-950 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
          >
            <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Profile (സേവ് ചെയ്യുക)'}
          </Button>
        </div>
      </form>
    </div>
  );
}
