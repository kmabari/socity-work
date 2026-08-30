import React, { useState } from 'react';
import { 
  Users, 
  Wallet, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpRight, 
  FileText,
  Clock,
  PlusCircle,
  Receipt,
  AlertCircle,
  TrendingDown,
  Building2,
  Calendar
} from 'lucide-react';
import { MemberFinancialAccount, ELedgerUser, MemberTransaction } from '../types';

interface MemberLedgerDashboardProps {
  currentUser: ELedgerUser;
  financialAccount: MemberFinancialAccount;
  onSubmitBillClaim?: (claim: { description: string; amount: number; invoiceRef: string }) => void;
}

export const MemberLedgerDashboard: React.FC<MemberLedgerDashboardProps> = ({
  currentUser,
  financialAccount,
  onSubmitBillClaim,
}) => {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimDesc, setClaimDesc] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimRef, setClaimRef] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimDesc || !claimAmount) return;

    if (onSubmitBillClaim) {
      onSubmitBillClaim({
        description: claimDesc,
        amount: parseFloat(claimAmount),
        invoiceRef: claimRef || `INV-${Date.now().toString().slice(-4)}`,
      });
    }

    setClaimSubmitted(true);
    setTimeout(() => {
      setClaimSubmitted(false);
      setShowClaimModal(false);
      setClaimDesc('');
      setClaimAmount('');
      setClaimRef('');
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Member Profile Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-950 via-slate-900 to-slate-900 border border-purple-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase">
            <Users className="w-3.5 h-3.5" /> State Committee Member Account
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
            <span>Seat / Membership ID: <b className="font-mono text-amber-300">{financialAccount.membershipId || currentUser.membershipId || 'HCRS-SC-01'}</b></span>
            <span>•</span>
            <span>District: <b className="text-white">{currentUser.district || financialAccount.district || 'State HQ'}</b></span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Entitlement Verified
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md text-right space-y-1 min-w-[220px]">
          <div className="text-xs text-purple-200 font-bold uppercase">Allocated Member Credit</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300">
            {formatCurrency(financialAccount.allocatedCredit)}
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-end gap-1">
            <span>Available Balance:</span>
            <b className="text-emerald-400 font-bold">{formatCurrency(financialAccount.availableBalance)}</b>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards for This Member Only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
            <span>Expenses Claimed</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialAccount.expensesClaimed)}
          </div>
          <p className="text-xs text-slate-500">{financialAccount.billsSubmitted} Verified Bills / Invoices Settled</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
            <span>Welfare & Relief Eligible</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">Active Tier 1</div>
          <p className="text-xs text-slate-500">Full advocate legal defense pool coverage & relief eligibility.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500">Quick Actions</div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowClaimModal(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-black text-slate-950 flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Submit Bill Claim
            </button>
            <button 
              onClick={() => window.print()}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 transition cursor-pointer"
              title="Download Statement"
            >
              <Download className="w-3.5 h-3.5" /> Statement
            </button>
          </div>
        </div>
      </div>

      {/* Member's Isolated Transaction Log */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-500" />
            <span>Your Personal Transaction & Allocation History</span>
          </h2>
          <span className="text-[11px] font-bold text-slate-500">Strictly Private to Your Account</span>
        </div>

        <div className="space-y-3">
          {financialAccount.recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No transactions recorded yet for this member account.
            </div>
          ) : (
            financialAccount.recentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold uppercase">
                      {tx.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {tx.date}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{tx.description}</div>
                  <div className="text-[11px] text-slate-500 font-mono">Ref: {tx.referenceNo}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(tx.amount)}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bill Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Submit Operational Bill Claim
                </h3>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {claimSubmitted ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bill Claim Submitted!</h4>
                <p className="text-xs text-slate-500">Transferred to State Treasurer and Admin for review.</p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Purpose / Head</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. District meeting transport & court document xerox"
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Claimed (₹ INR)</label>
                  <input
                    type="number"
                    required
                    max={financialAccount.availableBalance}
                    placeholder={`Max available: ₹${financialAccount.availableBalance}`}
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Receipt / Invoice Ref No.</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-2026-9912"
                    value={claimRef}
                    onChange={(e) => setClaimRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-slate-950 shadow-sm cursor-pointer"
                  >
                    Submit to Treasurer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
