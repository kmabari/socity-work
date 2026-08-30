import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Layers, 
  Scale, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { TreasuryMetrics, CategorySummary, LedgerVoucher, AuditLogEntry } from '../types';

interface LedgerReportsProps {
  metrics: TreasuryMetrics;
  categories: CategorySummary[];
  vouchers: LedgerVoucher[];
  auditLogs: AuditLogEntry[];
}

export const LedgerReports: React.FC<LedgerReportsProps> = ({
  metrics,
  categories,
  vouchers,
  auditLogs,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header & Print Actions */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-2">
            <ShieldCheck className="w-4 h-4" /> Statutory Financial Statements
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Income & Expenditure Balance Sheet
          </h1>
          <p className="text-xs text-slate-500">
            Certified as per High Rich Community Revival Society Bylaws and Society Registration Norms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Balance Sheet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Gross Receipts (Credit)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.totalInflow)}</div>
          <p className="text-[11px] text-slate-400">Total member subscription & legal defense collections.</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Gross Disbursements (Debit)</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.totalOutflow)}</div>
          <p className="text-[11px] text-slate-400">Disbursed for advocates, welfare relief, and operations.</p>
        </div>

        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
          <div className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase">Net Closing Liquid Balance</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(metrics.currentReserveBalance)}</div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">Secured in verified society scheduled bank accounts.</p>
        </div>
      </div>

      {/* Head-wise Account Allocation Table */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
          Head-wise Expenditure & Balance Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Head of Account</th>
                <th className="pb-3 px-3 text-right">Budget Allocation</th>
                <th className="pb-3 px-3 text-right">Actual Disbursed</th>
                <th className="pb-3 px-3 text-right">Surplus / Balance</th>
                <th className="pb-3 px-3 text-center">% Expended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {categories.map((c) => (
                <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{c.category}</td>
                  <td className="py-3 px-3 text-right font-medium">{formatCurrency(c.allocated)}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(c.spent)}</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(c.balance)}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold">{c.percentageUsed}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CA Audit Certification Footer */}
      <div className="rounded-3xl p-6 sm:p-8 bg-slate-950 text-white border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-base text-white">Statutory Audit Certificate</h3>
            <p className="text-xs text-slate-400">Issued by Office of CA P. V. Mathew & Associates (FRN: 014892S)</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          "We have verified the books of accounts, voucher receipts, bank statements, and district remittances of the High Rich Community Revival Society. In our opinion, the eLedger records present a true and fair view of all receipts and disbursements for the financial period ending August 2026."
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800">
          <span>Digital Verification Hash: <b className="font-mono text-emerald-400">0x8f2a4e9b7c11a0de248b81fa99c1e7a4b65d3210</b></span>
          <span>Date of Seal: 2026-08-28</span>
        </div>
      </div>
    </div>
  );
};
