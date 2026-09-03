import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  Download,
  Search,
  FileCheck,
  FileSpreadsheet,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Crown
} from 'lucide-react';
import {
  renderPersonCompetentAuthorityClaimPage,
  getCompetentAuthorityStyles,
  printCompetentAuthorityClaimReport,
  downloadCompetentAuthorityClaimPdf,
  printManagementAndCompetentAuthorityComboReport,
  downloadManagementAndCompetentAuthorityComboPdf
} from '../lib/competentAuthorityPrint';
import { renderPersonCourtClaimPage, getCourtReportBaseStyles, compareMobiles } from '../lib/claimPrint';
import { UserProfile } from '../types';

interface CompetentAuthorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  claims: any[];
  members: UserProfile[];
  initialClaim?: any;
  initialMember?: UserProfile;
}

export const CompetentAuthorityModal: React.FC<CompetentAuthorityModalProps> = ({
  isOpen,
  onClose,
  claims = [],
  members = [],
  initialClaim,
  initialMember
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberMobile, setSelectedMemberMobile] = useState<string>(
    initialMember?.mobile || initialClaim?.userMobile || ''
  );
  const [selectedClaimId, setSelectedClaimId] = useState<string>(
    initialClaim?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [previewMode, setPreviewMode] = useState<'competent_only' | 'combo_mgmt_competent'>('competent_only');
  const [zoomLevel, setZoomLevel] = useState<number>(85);

  // Synchronize when initialClaim or initialMember changes
  React.useEffect(() => {
    if (initialClaim) {
      setSelectedMemberMobile(initialClaim.userMobile || '');
      setSelectedClaimId(initialClaim.id || '');
    } else if (initialMember) {
      setSelectedMemberMobile(initialMember.mobile || '');
    }
  }, [initialClaim, initialMember, isOpen]);

  // Group all claims by member mobile
  const memberGroups = useMemo(() => {
    const map = new Map<string, { member: UserProfile | null; claims: any[] }>();

    for (const c of claims) {
      const mob = c.userMobile || c.individualMobile || 'UNKNOWN';
      const cleanMob = String(mob).replace(/\D/g, '');
      const key = cleanMob.length >= 10 ? cleanMob.slice(-10) : cleanMob;

      if (!map.has(key)) {
        // Find matching member in members list
        const m = members.find(mem => compareMobiles(mem.mobile, key));
        map.set(key, { member: m || null, claims: [] });
      }
      map.get(key)!.claims.push(c);
    }

    return Array.from(map.entries()).map(([mobileKey, data]) => {
      const primaryClaim = data.claims[0];
      const name = data.member?.name || primaryClaim?.userName || 'Unknown Member';
      const district = data.member?.district || primaryClaim?.userDistrict || 'Kerala';
      const isLifeMember = data.member?.membership_type === 'LIFE_MEMBER' || (data.member as any)?.isLifeMember;
      const membershipId = data.member?.membershipId || primaryClaim?.membershipId || '';

      return {
        mobileKey,
        member: data.member,
        claims: data.claims,
        name,
        district,
        isLifeMember,
        membershipId,
        claimCount: data.claims.length
      };
    });
  }, [claims, members]);

  // Filtered members for the search dropdown/list
  const filteredMemberGroups = useMemo(() => {
    if (!searchTerm.trim()) return memberGroups;
    const s = searchTerm.toLowerCase();
    return memberGroups.filter(g =>
      g.name.toLowerCase().includes(s) ||
      g.mobileKey.includes(s) ||
      g.membershipId.toLowerCase().includes(s) ||
      g.claims.some(c =>
        (c.highrichId && c.highrichId.toLowerCase().includes(s)) ||
        (c.tokenNo && c.tokenNo.toLowerCase().includes(s)) ||
        (c.userName && c.userName.toLowerCase().includes(s))
      )
    );
  }, [memberGroups, searchTerm]);

  // Current selected group
  const currentGroup = useMemo(() => {
    if (!selectedMemberMobile) {
      return memberGroups[0] || null;
    }
    const clean = String(selectedMemberMobile).replace(/\D/g, '');
    const key = clean.length >= 10 ? clean.slice(-10) : clean;
    return memberGroups.find(g => g.mobileKey === key) || memberGroups[0] || null;
  }, [memberGroups, selectedMemberMobile]);

  // Claims to display based on active tab ('all' or specific claim ID)
  const displayedClaims = useMemo(() => {
    if (!currentGroup) return [];
    if (activeTab === 'all') return currentGroup.claims;
    const single = currentGroup.claims.find(c => (c.id || c.highrichId) === activeTab);
    return single ? [single] : currentGroup.claims;
  }, [currentGroup, activeTab]);

  // Current primary member object
  const currentMemberObj = currentGroup?.member || {
    name: currentGroup?.name || 'Member',
    mobile: currentGroup?.mobileKey || '',
    district: currentGroup?.district || 'Kerala'
  };

  // Generate preview HTML string
  const previewHtml = useMemo(() => {
    if (!displayedClaims || displayedClaims.length === 0) {
      return '<div style="padding: 40px; text-align: center; color: #64748b;">ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല (No Claim Records Available)</div>';
    }

    const totalPages = previewMode === 'combo_mgmt_competent'
      ? displayedClaims.length * 2
      : displayedClaims.length;

    let contentHtml = '';
    if (previewMode === 'competent_only') {
      contentHtml = displayedClaims.map((c, idx) =>
        renderPersonCompetentAuthorityClaimPage(c, currentMemberObj, idx + 1, totalPages)
      ).join('');
    } else {
      contentHtml = displayedClaims.map((c, idx) => {
        const mgmtNum = idx * 2 + 1;
        const compNum = idx * 2 + 2;
        return `
          <div style="margin-bottom: 24px;">
            ${renderPersonCourtClaimPage(c, currentMemberObj, mgmtNum, totalPages)}
          </div>
          <div style="margin-bottom: 24px;">
            ${renderPersonCompetentAuthorityClaimPage(c, currentMemberObj, compNum, totalPages)}
          </div>
        `;
      }).join('');
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${getCourtReportBaseStyles()}
            ${getCompetentAuthorityStyles()}
            body {
              background: #f8fafc;
              padding: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            .competent-a4-page, .page-container {
              box-shadow: 0 4px 20px -2px rgba(0,0,0,0.1), 0 2px 6px -1px rgba(0,0,0,0.06);
              border: 1px solid #cbd5e1;
              background: #ffffff;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `;
  }, [displayedClaims, currentMemberObj, previewMode]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[95vh] p-0 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        {/* MODAL HEADER */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-row items-center justify-between border-b border-indigo-900/40 space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                Competent Authority Claim Form
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] uppercase font-black">
                  14 Items • Statutory Format
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-indigo-200/80 font-medium mt-0.5">
                Government Competent Authority Claim Format (HOME-SC3/126/2024-HOME • I/6510468/2025)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* MAIN BODY: 2 COLUMNS (Sidebar Selector + Interactive Preview) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
          {/* LEFT SIDEBAR: MEMBER SELECTION */}
          <div className="w-full lg:w-80 bg-white border-r border-slate-200/80 flex flex-col overflow-hidden flex-shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search name, mobile, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-xs font-bold rounded-xl border-slate-200"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 px-1">
                {filteredMemberGroups.length} Members with claims found
              </p>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredMemberGroups.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-bold">
                  അംഗങ്ങളെ കണ്ടെത്തിയില്ല
                </div>
              ) : (
                filteredMemberGroups.map((grp) => {
                  const isSelected = currentGroup?.mobileKey === grp.mobileKey;
                  return (
                    <button
                      key={grp.mobileKey}
                      type="button"
                      onClick={() => {
                        setSelectedMemberMobile(grp.mobileKey);
                        setActiveTab('all');
                      }}
                      className={`w-full text-left p-3 transition-colors flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-black truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {grp.name}
                          </p>
                          {grp.isLifeMember && (
                            <Crown className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 font-bold mt-0.5">
                          {grp.mobileKey} • {grp.district}
                        </p>
                        {grp.membershipId && (
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                            ID: {grp.membershipId}
                          </p>
                        )}
                      </div>

                      <Badge
                        className={`text-[9px] font-black shrink-0 ${
                          grp.claimCount > 1
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {grp.claimCount} {grp.claimCount > 1 ? 'Claims' : 'Claim'}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PREVIEW & ACTION AREA */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/70">
            {/* PREVIEW TOOLBAR */}
            <div className="bg-white p-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              {/* Claimant Tabs for multi-ID / family groups */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mr-1">Claimant:</span>
                <Button
                  size="sm"
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('all')}
                  className={`h-7 px-2.5 text-[10px] font-black rounded-lg ${
                    activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-700'
                  }`}
                >
                  All ({currentGroup?.claims.length || 0})
                </Button>
                {currentGroup?.claims.map((c, cidx) => {
                  const key = c.id || c.highrichId || String(cidx);
                  const isCurrent = activeTab === key;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={isCurrent ? 'default' : 'outline'}
                      onClick={() => setActiveTab(key)}
                      className={`h-7 px-2.5 text-[10px] font-black rounded-lg ${
                        isCurrent ? 'bg-indigo-600 text-white' : 'text-slate-700'
                      }`}
                    >
                      {c.userName || `Claim #${cidx + 1}`} {c.tokenNo ? `[${c.tokenNo}]` : ''}
                    </Button>
                  );
                })}
              </div>

              {/* Format Switcher & Zoom Controls */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('competent_only')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                      previewMode === 'competent_only'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Competent Form Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('combo_mgmt_competent')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                      previewMode === 'combo_mgmt_competent'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Management + Competent Combo
                  </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                    className="h-6 w-6 p-0 text-slate-600"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-[10px] font-mono font-bold text-slate-700 w-9 text-center">
                    {zoomLevel}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                    className="h-6 w-6 p-0 text-slate-600"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(85)}
                    className="h-6 w-6 p-0 text-slate-600"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW IFRAME */}
            <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="transition-all"
              >
                <iframe
                  title="Competent Authority Claim Form Live Preview"
                  srcDoc={previewHtml}
                  className="w-[794px] h-[1140px] bg-white rounded-lg shadow-xl border border-slate-300"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER WITH CLEAR ACTION BUTTONS */}
        <DialogFooter className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-bold flex items-center gap-2">
            <span>Selected Claimant: <strong className="text-slate-900">{currentGroup?.name || 'None'}</strong></span>
            <span>•</span>
            <span>Records: <strong className="text-indigo-600">{displayedClaims.length}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* PRINT: COMPETENT AUTHORITY FORM */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => printCompetentAuthorityClaimReport(currentMemberObj, displayedClaims)}
              className="h-9 px-3 text-xs font-black uppercase border-indigo-600/40 text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 rounded-xl"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Print Competent Form
            </Button>

            {/* PDF DOWNLOAD: COMPETENT AUTHORITY FORM */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCompetentAuthorityClaimPdf(currentMemberObj, displayedClaims)}
              className="h-9 px-3 text-xs font-black uppercase border-indigo-600/40 text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 rounded-xl"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Download Competent PDF
            </Button>

            {/* COMBO PRINT: MANAGEMENT + COMPETENT AUTHORITY */}
            <Button
              variant="default"
              size="sm"
              onClick={() => printManagementAndCompetentAuthorityComboReport(currentMemberObj, displayedClaims)}
              className="h-9 px-3.5 text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              title="Print Combined: Management Form + Competent Authority Claim Form"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Combo (Mgmt + Competent)
            </Button>

            {/* COMBO PDF: MANAGEMENT + COMPETENT AUTHORITY */}
            <Button
              variant="default"
              size="sm"
              onClick={() => downloadManagementAndCompetentAuthorityComboPdf(currentMemberObj, displayedClaims)}
              className="h-9 px-3.5 text-xs font-black uppercase bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
              title="Download Combined PDF: Management Form + Competent Authority Claim Form"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Combo PDF
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default CompetentAuthorityModal;
