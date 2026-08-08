import { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  UserCheck, 
  RefreshCw, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AdminReportsTabProps {
  members: UserProfile[];
  onApprove: (uid: string) => void;
  onViewDetails: (member: UserProfile) => void;
  DISTRICTS: { code: string; name: string }[];
  userDistrict?: string;
  isSuperAdmin?: boolean;
}

export default function AdminReportsTab({
  members,
  onApprove,
  onViewDetails,
  DISTRICTS,
  userDistrict,
  isSuperAdmin = true
}: AdminReportsTabProps) {
  const [reportType, setReportType] = useState<'new_memberships' | 'renewals'>('new_memberships');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDistrict && !isSuperAdmin ? userDistrict : 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    try {
      if (val.toDate) return val.toDate();
      if (val.seconds) return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const getMemberRegDate = (m: UserProfile): Date | null => {
    if (m.paymentTimeISO) return parseDate(m.paymentTimeISO);
    if (m.paymentDate) return parseDate(m.paymentDate);
    if (m.registrationDate) return parseDate(m.registrationDate);
    if ((m as any).createdAt) return parseDate((m as any).createdAt);
    return null;
  };

  const getMemberRenewalDate = (m: UserProfile): Date | null => {
    if (m.renewalDate) return parseDate(m.renewalDate);
    if (m.renewalPaymentDate) return parseDate(m.renewalPaymentDate);
    return null;
  };

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Calculate KPI Summary Counts
  const newMembersToday = members.filter(m => {
    const d = getMemberRegDate(m);
    return d && d.toISOString().split('T')[0] === todayStr;
  });

  const newMembersYesterday = members.filter(m => {
    const d = getMemberRegDate(m);
    return d && d.toISOString().split('T')[0] === yesterdayStr;
  });

  const renewalsToday = members.filter(m => {
    const d = getMemberRenewalDate(m);
    return d && d.toISOString().split('T')[0] === todayStr;
  });

  const renewalsYesterday = members.filter(m => {
    const d = getMemberRenewalDate(m);
    return d && d.toISOString().split('T')[0] === yesterdayStr;
  });

  const matchesDateFilter = (d: Date | null) => {
    if (!d) return false;
    const dStr = d.toISOString().split('T')[0];

    if (dateFilter === 'today') return dStr === todayStr;
    if (dateFilter === 'yesterday') return dStr === yesterdayStr;
    if (dateFilter === 'this_week') {
      const weekStart = getStartOfWeek(new Date());
      return d >= weekStart && d <= new Date();
    }
    if (dateFilter === 'this_month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    if (dateFilter === 'custom') {
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date('2000-01-01');
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date('2099-12-31');
      return d >= start && d <= end;
    }
    return true;
  };

  const matchesDistrict = (m: UserProfile) => {
    if (selectedDistrict === 'all') return true;
    return (m.district || m.districtCode) === selectedDistrict;
  };

  const matchesSearch = (m: UserProfile) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.mobile || '').includes(q) ||
      (m.membershipId || '').toLowerCase().includes(q)
    );
  };

  // Filter lists based on selected reportType
  const filteredNewMembers = members.filter(m => {
    const regD = getMemberRegDate(m);
    return matchesDateFilter(regD) && matchesDistrict(m) && matchesSearch(m);
  });

  const filteredRenewals = members.filter(m => {
    const renD = getMemberRenewalDate(m);
    return renD && matchesDateFilter(renD) && matchesDistrict(m) && matchesSearch(m);
  });

  const formatDateTime = (val: Date | null) => {
    if (!val) return '---';
    return val.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatExpiryDate = (val: any) => {
    const d = parseDate(val);
    if (!d) return '---';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'new_memberships') {
      headers = ['Sl No', 'Member ID', 'Member Name', 'Mobile Number', 'District', 'Assembly Constituency', 'Payment Amount', 'Payment Status', 'Payment Date & Time', 'Approval Status'];
      rows = filteredNewMembers.map((m, idx) => [
        String(idx + 1),
        m.membershipId || 'N/A',
        `"${(m.name || '').replace(/"/g, '""')}"`,
        m.mobile || 'N/A',
        m.district || 'N/A',
        m.assemblyConstituency || 'N/A',
        '₹200',
        m.paymentStatus || (m.isPaid ? 'PAYMENT_VERIFIED' : 'Pending Verification'),
        `"${formatDateTime(getMemberRegDate(m))}"`,
        m.status === 'active' || m.isApproved ? 'APPROVED' : 'PENDING_APPROVAL'
      ]);
    } else {
      headers = ['Sl No', 'Member ID', 'Member Name', 'Mobile Number', 'District', 'Renewal Payment Date & Time', 'Renewal Amount', 'Transaction ID', 'Payment Status', 'Expiry Date'];
      rows = filteredRenewals.map((m, idx) => [
        String(idx + 1),
        m.membershipId || 'N/A',
        `"${(m.name || '').replace(/"/g, '""')}"`,
        m.mobile || 'N/A',
        m.district || 'N/A',
        `"${formatDateTime(getMemberRenewalDate(m))}"`,
        '₹100',
        m.renewalTransactionId || m.paymentId || 'N/A',
        m.paymentStatus || 'Renewed',
        `"${formatExpiryDate(m.expiryDate)}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HCRS_${reportType}_report_${dateFilter}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">New Reg Today</span>
              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5">₹200</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {newMembersToday.length}
            </div>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Total ₹{newMembersToday.length * 200}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">New Reg Yesterday</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">₹200</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
              {newMembersYesterday.length}
            </div>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Total ₹{newMembersYesterday.length * 200}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">Renewals Today</span>
              <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5">₹100</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {renewalsToday.length}
            </div>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Total ₹{renewalsToday.length * 100}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Renewals Yesterday</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">₹100</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
              {renewalsYesterday.length}
            </div>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Total ₹{renewalsYesterday.length * 100}</span>
          </CardContent>
        </Card>
      </div>

      {/* Control Toolbar: View Selector & Filter Controls */}
      <Card className="p-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Sub-tab toggle (New Memberships vs Renewals) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-full sm:w-auto">
            <Button
              type="button"
              variant={reportType === 'new_memberships' ? 'default' : 'ghost'}
              onClick={() => setReportType('new_memberships')}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                reportType === 'new_memberships'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              New Memberships Report ({filteredNewMembers.length})
            </Button>
            <Button
              type="button"
              variant={reportType === 'renewals' ? 'default' : 'ghost'}
              onClick={() => setReportType('renewals')}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                reportType === 'renewals'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Renewals Report ({filteredRenewals.length})
            </Button>
          </div>

          <Button
            onClick={exportToCSV}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            Export CSV Report
          </Button>
        </div>

        {/* Row 2: Date Filters & District Filter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Button
              size="sm"
              variant={dateFilter === 'today' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('today')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'yesterday' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('yesterday')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Yesterday
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'this_week' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('this_week')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              This Week
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'this_month' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('this_month')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'custom' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('custom')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Custom Range
            </Button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
              <Calendar className="w-4 h-4 text-slate-400 ml-1" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-800"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-800"
              />
            </div>
          )}

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!isSuperAdmin && !!userDistrict}
            className="h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Districts</option>
            {DISTRICTS.map(d => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, mobile, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      </Card>

      {/* Main Table Content */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {reportType === 'new_memberships' ? (
          <div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-blue" />
                New Memberships Report ({filteredNewMembers.length} records)
              </h3>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-none text-[10px] font-bold">
                Fee: ₹200 / registration
              </Badge>
            </div>

            {filteredNewMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold text-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p>No new memberships found for the selected date range and filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Member ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">District</th>
                      <th className="p-3">Assembly</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">Payment Date & Time</th>
                      <th className="p-3">Approval Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-bold text-slate-800 dark:text-slate-200">
                    {filteredNewMembers.map((member, index) => {
                      const isApproved = member.status === 'active' || member.isApproved;
                      const isPaid = member.isPaid || member.paymentStatus === 'PAYMENT_VERIFIED' || member.paymentStatus === 'Active';
                      const regDate = getMemberRegDate(member);

                      return (
                        <tr key={member.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 text-slate-400">{index + 1}</td>
                          <td className="p-3 font-mono font-black text-brand-blue">{member.membershipId || 'PENDING'}</td>
                          <td className="p-3 font-black">{member.name}</td>
                          <td className="p-3 font-mono">{member.mobile}</td>
                          <td className="p-3">{member.district}</td>
                          <td className="p-3">{member.assemblyConstituency || 'N/A'}</td>
                          <td className="p-3">
                            <Badge className={`text-[10px] font-black border-none px-2 py-0.5 ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40'
                            }`}>
                              {isPaid ? 'PAYMENT_VERIFIED (₹200)' : 'Pending Payment'}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {formatDateTime(regDate)}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-none text-[10px] font-black flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                APPROVED
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-none text-[10px] font-black flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 animate-pulse" />
                                PENDING_APPROVAL
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {!isApproved && (
                              <Button
                                size="sm"
                                onClick={() => onApprove(member.uid)}
                                className="h-8 px-3 bg-brand-blue hover:bg-brand-blue/90 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer"
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(member)}
                              className="h-8 px-3 text-[10px] font-bold rounded-lg cursor-pointer"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                Renewals Report ({filteredRenewals.length} records)
              </h3>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-none text-[10px] font-bold">
                Renewal Fee: ₹100 / member
              </Badge>
            </div>

            {filteredRenewals.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold text-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p>No renewals found for the selected date range and filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Member ID</th>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">District</th>
                      <th className="p-3">Renewal Payment Date</th>
                      <th className="p-3">Renewal Fee</th>
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">New Expiry Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-bold text-slate-800 dark:text-slate-200">
                    {filteredRenewals.map((member, index) => {
                      const renDate = getMemberRenewalDate(member);

                      return (
                        <tr key={member.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 text-slate-400">{index + 1}</td>
                          <td className="p-3 font-mono font-black text-brand-blue">{member.membershipId}</td>
                          <td className="p-3 font-black">{member.name}</td>
                          <td className="p-3 font-mono">{member.mobile}</td>
                          <td className="p-3">{member.district}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {formatDateTime(renDate)}
                          </td>
                          <td className="p-3 font-black text-emerald-600">₹100</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {member.renewalTransactionId || member.paymentId || 'N/A'}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-none text-[10px] font-black">
                              {member.paymentStatus || 'Renewed'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            {formatExpiryDate(member.expiryDate)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(member)}
                              className="h-8 px-3 text-[10px] font-bold rounded-lg cursor-pointer"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
