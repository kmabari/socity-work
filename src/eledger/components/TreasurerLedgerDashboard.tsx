import React, { useState } from 'react';
import { 
  PlusCircle, 
  Building2, 
  Receipt, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Sparkles,
  Users,
  Wallet,
  Coins,
  Send,
  Layers,
  Search
} from 'lucide-react';
import { LedgerVoucher, FundCategory, VoucherType, ELedgerUser, MemberFinancialAccount, CategorySummary } from '../types';

interface TreasurerLedgerDashboardProps {
  vouchers: LedgerVoucher[];
  categories: CategorySummary[];
  users: ELedgerUser[];
  memberAccounts: Record<string, MemberFinancialAccount>;
  onCreateVoucher: (voucher: Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'status' | 'preparedBy'>) => void;
  onAllocateMemberCredit?: (memberId: string, amount: number) => void;
}

export const TreasurerLedgerDashboard: React.FC<TreasurerLedgerDashboardProps> = ({
  vouchers,
  categories,
  users,
  memberAccounts,
  onCreateVoucher,
  onAllocateMemberCredit,
}) => {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'member_credits' | 'fund_transfers'>('vouchers');
  const [showForm, setShowForm] = useState(false);
  
  // Voucher Form State
  const [type, setType] = useState<VoucherType>('expense');
  const [category, setCategory] = useState<FundCategory>('Legal Defense & Court Fund');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer (NEFT/RTGS)' | 'UPI / Digital' | 'Cheque' | 'Cash / Impress'>('Bank Transfer (NEFT/RTGS)');
  const [referenceNo, setReferenceNo] = useState('');
  const [district, setDistrict] = useState('State HQ');

  // Member Credit Allocation State
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState('');
  const [allocationSuccess, setAllocationSuccess] = useState('');

  const committeeMembers = users.filter(u => u.role === 'member');

  const availableCategories: FundCategory[] = [
    'Legal Defense & Court Fund',
    'Welfare & Emergency Relief',
    'Revival & Administrative Operations',
    'State & District Chapter Fund',
    'Special Member Allocation Pool',
    'General Reserve Vault',
  ];

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !payee) return;

    onCreateVoucher({
      date: new Date().toISOString().split('T')[0],
      type,
      category,
      amount: parseFloat(amount),
      description,
      paidToOrReceivedFrom: payee,
      paymentMode,
      referenceNo: referenceNo || `REF-${Date.now().toString().slice(-6)}`,
      attachmentsCount: 1,
      district,
    });

    setShowForm(false);
    setAmount('');
    setDescription('');
    setPayee('');
    setReferenceNo('');
  };

  const handleMemberCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !creditAmount) return;

    if (onAllocateMemberCredit) {
      onAllocateMemberCredit(selectedMemberId, parseFloat(creditAmount));
    }

    setAllocationSuccess(`₹${parseFloat(creditAmount).toLocaleString('en-IN')} credit successfully assigned.`);
    setTimeout(() => {
      setAllocationSuccess('');
      setCreditAmount('');
    }, 3000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-500/20 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" /> State Treasury Operations
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">State Treasurer Ledger Terminal</h1>
          <p className="text-xs text-slate-300">
            Disbursement vouchers, member operational credits, fund transfers, and treasury reconciliation.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('vouchers');
            setShowForm(!showForm);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Close Voucher' : '+ Create Voucher'}</span>
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'vouchers'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Voucher Management ({vouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('member_credits')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'member_credits'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Operational Credits ({committeeMembers.length}/17)</span>
        </button>

        <button
          onClick={() => setActiveTab('fund_transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'fund_transfers'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Society Fund Heads</span>
        </button>
      </div>

      {/* TAB 1: VOUCHERS */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          {/* New Voucher Modal / Form */}
          {showForm && (
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/40 shadow-xl space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <span>Create Official Transaction Voucher</span>
                </h2>
              </div>

              <form onSubmit={handleSubmitVoucher} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as VoucherType)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="expense">Disbursement / Expense (Debit)</option>
                    <option value="income">Corpus / Receipt (Credit)</option>
                    <option value="transfer">Head Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fund Head / Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FundCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Beneficiary / Source Party</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High Court Retainer / Chapter Escrow"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI / Digital">UPI / Digital</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash / Impress">Cash / Impress</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank UTR / Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-9821034821"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purpose / Statutory Description</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Detailed explanation of voucher purpose and statutory justification..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer"
                  >
                    Submit Voucher to Executive Approval Queue
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Full Voucher List */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              All Recorded Vouchers
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Voucher #</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Description</th>
                    <th className="pb-3 px-3">Payee / Source</th>
                    <th className="pb-3 px-3 text-right">Amount</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold">{v.voucherNumber}</td>
                      <td className="py-3 px-3 text-slate-500">{v.date}</td>
                      <td className="py-3 px-3 font-semibold">{v.category}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{v.description}</td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200">{v.paidToOrReceivedFrom}</td>
                      <td className={`py-3 px-3 text-right font-black ${v.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {v.type === 'income' ? '+' : '-'}{formatCurrency(v.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          v.status === 'audited'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : v.status === 'approved'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBER OPERATIONAL CREDITS */}
      {activeTab === 'member_credits' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span>Allocate Committee Member Operational Credits</span>
            </h2>
            <p className="text-xs text-slate-500">
              Assign approved operational spending pools to verified State Committee Members for travel, district reviews, and documentation expenses.
            </p>

            {allocationSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{allocationSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMemberCreditSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Committee Member</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="">-- Choose Member --</option>
                  {committeeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.membershipId || 'Member'}) - {m.district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer"
                >
                  Assign Member Credit
                </button>
              </div>
            </form>
          </div>

          {/* Members Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              State Committee Member Allocation Roster ({committeeMembers.length} Members)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Member Name</th>
                    <th className="pb-3 px-3">District</th>
                    <th className="pb-3 px-3 text-right">Allocated Pool</th>
                    <th className="pb-3 px-3 text-right">Expenses Settled</th>
                    <th className="pb-3 px-3 text-right">Available Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {committeeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No committee members registered yet. Add members via Admin User Management.
                      </td>
                    </tr>
                  ) : (
                    committeeMembers.map((m) => {
                      const acc = memberAccounts[m.id] || memberAccounts['default-member'] || {
                        allocatedCredit: 25000,
                        expensesClaimed: 0,
                        availableBalance: 25000,
                      };
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                          <td className="py-3 px-3 text-slate-500">{m.district || 'State HQ'}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(acc.allocatedCredit)}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(acc.expensesClaimed)}</td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(acc.availableBalance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUND TRANSFERS */}
      {activeTab === 'fund_transfers' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>Society Escrow & Head Reconciliations</span>
          </h2>
          <p className="text-xs text-slate-500">
            Treasury reconciliation summary across statutory scheduled accounts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {categories.map((c) => (
              <div key={c.category} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{c.category}</div>
                <div className="text-xs text-slate-500">
                  Allocated: <b>{formatCurrency(c.allocated)}</b>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-black">
                  Liquid Reserve: {formatCurrency(c.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
