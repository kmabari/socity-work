import React from 'react';
import { 
  Building2, 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  FileText, 
  LayoutDashboard, 
  LogOut,
  UserCheck
} from 'lucide-react';
import { ELedgerUser } from '../types';

interface ELedgerNavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: ELedgerUser | null;
  onLogout: () => void;
  onBackToWebsite: () => void;
  onOpenLogin: () => void;
}

export const ELedgerNavbar: React.FC<ELedgerNavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  onBackToWebsite,
  onOpenLogin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/20 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left Brand with Back Button */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onBackToWebsite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-xs font-black border border-amber-500/30 hover:border-amber-400 transition cursor-pointer shadow-xs shrink-0"
              title="Return to Main HCRS Website"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Return to HCRS Website</span>
              <span className="sm:hidden">Website</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-300 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-lg tracking-tight text-white">HCRS <span className="text-amber-400">eLedger</span></span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    <Lock className="w-2.5 h-2.5" /> Authorized Only
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block">
                  High Rich Community Revival Society • State Committee Official Ledger
                </p>
              </div>
            </div>
          </div>

          {/* Center Navigation Links - Rendered ONLY for Authenticated Users */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="capitalize">
                  {currentUser.role === 'member' ? 'My Financial Account' : `${currentUser.role} Dashboard`}
                </span>
              </button>

              {/* Reports tab is accessible to Admin, Treasurer, and Auditor */}
              {(currentUser.role === 'admin' || currentUser.role === 'treasurer' || currentUser.role === 'auditor') && (
                <button
                  onClick={() => onSelectTab('reports')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'reports'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Financial Reports</span>
                </button>
              )}
            </nav>
          )}

          {/* Right Role Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!currentUser ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Restricted Access</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-black text-white leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>{currentUser.role}</span>
                    </div>
                  </div>
                </div>

                <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

                <button
                  onClick={onLogout}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs"
                  title="Sign Out of Committee Portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px] font-bold">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
