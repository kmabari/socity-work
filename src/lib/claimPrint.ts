import { DISTRICTS, CONSTITUENCIES } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { html2canvasOklchOnClone } from './imageUtils';
import { toast } from 'sonner';

export const formatClaimDateTime = (ts: any): string => {
  if (!ts) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  try {
    let d: Date;
    if (typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(ts);
  }
};

export const formatClaimDateOnly = (ts: any): string => {
  if (!ts) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    let d: Date;
    if (typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(ts);
  }
};

export const getCategoryLabel = (cat: string): string => {
  const c = (cat || '').toLowerCase();
  if (c === 'digital') return 'Digital Redeem Coupon';
  if (c === 'ott') return 'OTT Consignment Advance';
  if (c === 'grocery') return 'Grocery Consignment Advance';
  if (c === 'goodwill') return 'Goodwill Consignment Advance';
  if (c === 'other') return 'Other Consignment Advance';
  return cat || 'Consignment Advance';
};

export const formatClaimCategories = (cats: string[] | string): string => {
  if (!cats) return 'Consignment Advance Account';
  if (Array.isArray(cats)) {
    return cats.map(c => getCategoryLabel(c)).join(', ');
  }
  return getCategoryLabel(String(cats));
};

export const compareMobiles = (m1?: string | number, m2?: string | number): boolean => {
  if (!m1 || !m2) return false;
  const s1 = String(m1).replace(/\D/g, '');
  const s2 = String(m2).replace(/\D/g, '');
  if (!s1 || !s2) return false;
  const last1 = s1.length >= 10 ? s1.slice(-10) : s1;
  const last2 = s2.length >= 10 ? s2.slice(-10) : s2;
  return last1 === last2;
};

export const getCourtReportBaseStyles = (): string => `
  @import url('https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

  @page {
    size: A4 portrait;
    margin: 6mm 8mm 6mm 8mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: 'Noto Sans Malayalam', 'Manjari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11.5px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .page-container {
    width: 100%;
    height: 284mm;
    max-height: 284mm;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1mm 1mm;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    font-family: 'Noto Sans Malayalam', 'Manjari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .page-container:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .header-table {
    width: 100%;
    border-bottom: 3px solid #003366;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .org-title {
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #003366;
    margin: 0;
    line-height: 1.15;
  }
  .sub-title {
    font-size: 12px;
    font-weight: 800;
    color: #1e293b;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .doc-tag {
    display: inline-block;
    background: #003366;
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 800;
    padding: 3.5px 10px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
  .meta-box {
    border: 1.5px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 7px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 18px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px 12px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: 1.15fr 1.25fr 1fr 0.75fr;
    gap: 6px 10px;
  }
  .meta-label {
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    font-size: 9px;
    display: block;
    margin-bottom: 2px;
    letter-spacing: 0.3px;
  }
  .meta-val {
    font-weight: 800;
    color: #0f172a;
    font-size: 12px;
  }
  .section-heading {
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    color: #003366;
    letter-spacing: 0.5px;
    margin: 8px 0 4px 0;
    border-bottom: 2px solid #003366;
    padding-bottom: 3px;
  }
  table.claim-table {
    width: 100%;
    border-collapse: collapse;
    margin: 5px 0 7px 0;
    font-size: 11px;
  }
  table.claim-table th {
    background: #003366;
    color: #ffffff;
    font-weight: 800;
    text-transform: uppercase;
    padding: 6.5px 10px;
    text-align: left;
    font-size: 10px;
    border: 1.5px solid #003366;
    letter-spacing: 0.4px;
  }
  table.claim-table td {
    border: 1px solid #cbd5e1;
    padding: 6.5px 10px;
  }
  table.claim-table tr:nth-child(even) {
    background: #f8fafc;
  }
  .total-row td {
    background: #f1f5f9 !important;
    font-weight: 900;
    color: #003366;
    font-size: 12.5px;
    border-top: 2.5px solid #003366 !important;
  }
  .declaration-box {
    border: 1.5px solid #64748b;
    background: #ffffff;
    border-radius: 6px;
    padding: 9px 12px;
    margin-top: 5px;
    color: #1e293b;
  }
  .signatures-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 10px;
    margin-top: 10px;
  }
  .sig-box {
    text-align: center;
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 8px 7px 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 130px;
  }
  .sig-title-main {
    font-size: 9.5px;
    font-weight: 900;
    color: #003366;
    text-transform: uppercase;
    line-height: 1.25;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }
  .sig-title-sub {
    font-size: 8.5px;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    display: block;
    margin-top: 2px;
  }
  .mgmt-verify-table {
    width: 100%;
    font-size: 8.5px;
    border-collapse: collapse;
    margin: 2px 0 4px 0;
    text-align: left;
  }
  .mgmt-verify-table td {
    padding: 2.5px 2px;
    border: none;
  }
  .mgmt-field-label {
    color: #475569;
    font-weight: 800;
    width: 55%;
    font-size: 8px;
    text-transform: uppercase;
  }
  .mgmt-field-line {
    border-bottom: 1.5px dotted #64748b;
    font-weight: 900;
    font-family: monospace;
    font-size: 9.5px;
    color: #0f172a;
  }
  .sig-line {
    border-top: 1.5px solid #0f172a;
    padding-top: 4px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    color: #0f172a;
  }
  .sig-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 1.5px;
    font-weight: 600;
  }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 34px;
    font-weight: 900;
    color: rgba(0, 51, 102, 0.035);
    text-transform: uppercase;
    pointer-events: none;
    z-index: -1;
    white-space: nowrap;
  }
  .screen-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #003366;
    color: #ffffff;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    z-index: 99999;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    margin-bottom: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toolbar-title {
    display: flex;
    flex-direction: column;
    text-align: left;
  }
  .toolbar-title strong {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.3px;
  }
  .toolbar-title span {
    font-size: 10.5px;
    color: #cbd5e1;
    margin-top: 1px;
  }
  .toolbar-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .toolbar-actions button {
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: transform 0.1s ease, opacity 0.2s ease;
  }
  .toolbar-actions button:active {
    transform: scale(0.96);
  }
  .btn-print {
    background: #10b981;
    color: #ffffff;
  }
  .btn-download {
    background: #ffffff;
    color: #003366;
  }
  .btn-share {
    background: #25d366;
    color: #ffffff;
  }
  .btn-close {
    background: #ef4444;
    color: #ffffff;
  }
  @media print {
    html, body {
      background: #ffffff !important;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print, .screen-toolbar {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  }
`;

/**
 * Render 1 single A4 Person Page for Court / Official Print
 * (Consignment Advance Account Statement & Verification Record)
 * STRICTLY EXCLUDES: Police/court cases, Future Preference, Hardship, Combo Relationship, Admin-only notes.
 * Fills entire A4 page properly with zero extra blank pages.
 */
export const renderPersonCourtClaimPage = (
  claim: any,
  userProf: any,
  pageNum: number = 1,
  totalPages: number = 1
): string => {
  const districtObj = DISTRICTS.find(d => d.code === (claim.userDistrict || userProf?.district));
  const districtName = districtObj?.name || claim.userDistrict || userProf?.district || 'Kerala';
  const asslyName = userProf?.assemblyConstituency || claim.constituency || 'N/A';
  const addressStr = userProf?.address || claim.address || claim.userAddress || 'N/A';
  const postOfficeStr = userProf?.postOffice || '';
  const pinStr = userProf?.pincode || '';
  const fullAddress = `${addressStr}${postOfficeStr ? ', P.O. ' + postOfficeStr : ''}${pinStr ? ', PIN: ' + pinStr : ''}`;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const dateStr = formatClaimDateTime(claim.createdAt);
  const memberName = claim.userName || userProf?.name || 'N/A';
  const mobileStr = claim.userMobile || userProf?.mobile || 'N/A';
  const membershipIdStr = claim.membershipId || userProf?.membershipId || 'PENDING';

  // Bank Particulars
  const paidBankName = claim.paidFromBank || userProf?.bankName || '';
  const paidBranch = claim.paidFromBranch || userProf?.branch || '';
  const paidAccount = claim.paidFromAccount || userProf?.accountNumber || '';
  const paidIfsc = claim.paidFromIfsc || userProf?.ifscCode || '';
  const transRef = claim.transactionRef || claim.transactionId || (claim.tokenNo ? '#' + claim.tokenNo : '');

  // Settlement Bank Details
  const settlementBankName = claim.settlementBankName || userProf?.bankName || paidBankName || '';
  const settlementBranch = claim.settlementBranch || userProf?.branch || paidBranch || '';
  const settlementAccount = claim.settlementAccountNumber || userProf?.accountNumber || paidAccount || '';
  const settlementIfsc = claim.settlementIfsc || userProf?.ifscCode || paidIfsc || '';
  const settlementHolder = claim.settlementAccountHolder || memberName || '';

  return `
    <div class="page-container">
      <div>
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="org-title">HIGHRICH ONLINE SHOPPE Pvt. Ltd.</div>
              <div style="font-size: 8.5px; color: #475569; font-weight: 700; margin-top: 1px;">TC41/1030/14, 2nd Floor, Kanimangalam Tower, Valiyalukkal, Thrissur</div>
              <div class="sub-title" style="margin-top: 3px; font-size: 10px; color: #003366;">Support / Collection: HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)</div>
              <div style="font-size: 8px; color: #64748b; font-weight: 600;">Reg. No: TSR/TC/93/2025 • Room No. 85, Thrissur Dt., Kerala, India • PIN 680312 • PH: 9495465310</div>
              <div class="doc-tag" style="margin-top: 4px;">MEMBER FINANCIAL INFORMATION REGISTRY</div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 200px;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase;">STATEMENT REF</div>
              <div style="font-size: 17px; font-weight: 900; color: #003366; font-family: monospace; line-height: 1.1;">#${tokenDisplay}</div>
              <div style="font-size: 9px; color: #475569; margin-top: 2px; font-weight: 700;">Date: ${dateStr}</div>
              <div style="margin-top: 3px; display: inline-block; background: #003366; color: #ffffff; font-size: 9.5px; font-weight: 900; padding: 2.5px 8px; border-radius: 4px; letter-spacing: 0.5px;">
                PAGE ${pageNum}/${totalPages}
              </div>
            </td>
          </tr>
        </table>

        <!-- 1. Member & Account Holder Information -->
        <div class="section-heading">1. Declarant & Account Holder Details (അംഗത്തിന്റെ വിവരങ്ങൾ)</div>
        <div class="meta-box">
          <div class="grid-2">
            <div>
              <span class="meta-label">Member / Account Holder Name</span>
              <span class="meta-val">${memberName}</span>
            </div>
            <div>
              <span class="meta-label">Membership ID & Status</span>
              <span class="meta-val font-mono">${membershipIdStr} • ${(userProf?.status || 'Active').toUpperCase()}</span>
            </div>
            <div>
              <span class="meta-label">Registered Mobile Number</span>
              <span class="meta-val font-mono">${mobileStr}</span>
            </div>
            <div>
              <span class="meta-label">Highrich Consumer ID (HR ID)</span>
              <span class="meta-val font-mono" style="color: #003366;">${claim.highrichId || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">Sponsor / Leader Name (സ്പോൺസർ / ലീഡർ)</span>
              <span class="meta-val">${claim.sponsorName || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">Sponsor / Leader Mobile (മൊബൈൽ നമ്പർ)</span>
              <span class="meta-val font-mono">${claim.sponsorMobile || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">District & Assembly Constituency</span>
              <span class="meta-val">${districtName} • ${asslyName}</span>
            </div>
            <div>
              <span class="meta-label">Full Residential Address</span>
              <span class="meta-val" style="font-size: 11px;">${fullAddress}</span>
            </div>
          </div>
        </div>

        <!-- 2. Consignment Advance Financial Summary -->
        <div class="section-heading">2. Consignment Advance Financial Statement (കൺസൈൻമെന്റ് അഡ്വാൻസ് തുക വിവരങ്ങൾ)</div>
        <table class="claim-table">
          <thead>
            <tr>
              <th style="width: 37%;">Particulars / Head of Account</th>
              <th style="text-align: right; width: 21%;">Consignment Advance Paid (₹)</th>
              <th style="text-align: right; width: 21%;">Amount Received (₹)</th>
              <th style="text-align: right; width: 21%;">Pending Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${!claim.noBreakup && claim.categoryDetails && Object.keys(claim.categoryDetails).length > 0 ? (
              Object.entries(claim.categoryDetails).map(([catKey, details]: [string, any]) => `
                <tr>
                  <td style="font-weight: 800;">${getCategoryLabel(catKey)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">₹${(details.paid || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">₹${(details.received || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #003366;">₹${(details.pending || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')
            ) : (
              `
                <tr>
                  <td style="font-weight: 800;">Consignment Advance Account (${claim.categories ? formatClaimCategories(claim.categories) : 'General'})</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">₹${(claim.totalPaid || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">₹${(claim.totalReceived || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #003366;">₹${(claim.totalPending || 0).toLocaleString('en-IN')}</td>
                </tr>
              `
            )}
            <tr class="total-row">
              <td>NET BALANCE (ആകെ ശേഷിക്കുന്ന ബാലൻസ്)</td>
              <td style="text-align: right; font-family: monospace;">₹${(claim.totalPaid || 0).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #16a34a;">₹${(claim.totalReceived || 0).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #003366; font-size: 13.5px;">₹${(claim.totalPending || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Transaction & Payment Particulars -->
        <div class="section-heading">3. Payment & Transaction Particulars (തുക നൽകിയ വിവരങ്ങൾ)</div>
        <div class="meta-box">
          <div class="grid-2">
            <div>
              <span class="meta-label">Payment Date (തീയതി)</span>
              <span class="meta-val font-mono">${claim.paymentDate ? formatClaimDateOnly(claim.paymentDate) : dateStr}</span>
            </div>
            <div>
              <span class="meta-label">Transaction / Reference Number</span>
              <span class="meta-val font-mono">${transRef || 'REF-' + tokenDisplay}</span>
            </div>
            <div>
              <span class="meta-label">Payment Bank Name & Branch (നൽകിയ ബാങ്ക്)</span>
              <span class="meta-val">${paidBankName ? `${paidBankName} (${paidBranch || 'Main Branch'})` : 'As per bank transaction record'}</span>
            </div>
            <div>
              <span class="meta-label">Payment Account Number & IFSC</span>
              <span class="meta-val font-mono">${paidAccount ? `${paidAccount} • IFSC: ${paidIfsc || 'N/A'}` : 'As per transaction'}</span>
            </div>
          </div>
        </div>

        <!-- 4. Balance Settlement Bank Details -->
        <div class="section-heading">4. Balance Disbursement Bank Details (തുക ലഭിക്കേണ്ട ബാങ്ക് വിവരങ്ങൾ)</div>
        <div class="meta-box">
          <div class="grid-4">
            <div>
              <span class="meta-label">Account Holder</span>
              <span class="meta-val" style="font-size: 11.5px;">${settlementHolder || memberName}</span>
            </div>
            <div>
              <span class="meta-label">Bank & Branch</span>
              <span class="meta-val" style="font-size: 11.5px;">${settlementBankName || 'Primary Bank'}</span>
            </div>
            <div>
              <span class="meta-label">Account Number</span>
              <span class="meta-val font-mono" style="font-size: 11.5px;">${settlementAccount || 'As per Profile'}</span>
            </div>
            <div>
              <span class="meta-label">IFSC Code</span>
              <span class="meta-val font-mono" style="font-size: 11.5px;">${settlementIfsc || 'Verified'}</span>
            </div>
          </div>
        </div>

        <!-- 5. Declarant Confirmation -->
        <div class="section-heading">5. Declarant Confirmation (അംഗത്തിന്റെ സാക്ഷ്യപ്പെടുത്തൽ)</div>
        <div class="declaration-box">
          <div style="font-size: 11px; font-weight: 800; color: #003366; margin-bottom: 3px;">
            DECLARATION & VERIFICATION CONFIRMATION:
          </div>
          <div style="font-size: 11px; line-height: 1.45; color: #0f172a; font-weight: 600;">
            I hereby confirm and declare that the consignment advance payment and transaction details provided by me above are true and correct to the best of my knowledge and records. I acknowledge that the actual consignment advance amount, receipts, and the final net balance payable are subject to official verification and confirmation by <strong>HIGHRICH ONLINE SHOPPE Pvt. Ltd.</strong> from authentic company records.
          </div>
          <div style="font-size: 10.5px; line-height: 1.4; color: #334155; margin-top: 4px; font-weight: 500;">
            ഞാൻ മുകളിൽ നൽകിയിരിക്കുന്ന കൺസൈൻമെന്റ് അഡ്വാൻസ് പേയ്‌മെന്റ് വിവരങ്ങൾ എൻ്റെ അറിവിൽ ശരിയാണെന്ന് ഇതിനാൽ സാക്ഷ്യപ്പെടുത്തുന്നു. കൺസൈൻമെന്റ് അഡ്വാൻസ് തുകയും ഇതിനകം ലഭിച്ച തുകയും ശേഷിക്കുന്ന അന്തിമ ബാലൻസും കമ്പനി രേഖകളുമായി പരിശോധിച്ച് HIGHRICH ONLINE SHOPPE Pvt. Ltd. മാനേജ്‌മെന്റ് സ്ഥിരീകരിക്കേണ്ടതാണ്.
          </div>
        </div>
      </div>

      <!-- 6. Official Signatures & Verification (Exact Order 1, 2, 3) -->
      <div class="signatures-grid-3">
        <!-- 1. DECLARANT / ACCOUNT HOLDER -->
        <div class="sig-box">
          <div>
            <div class="sig-title-main">
              1. DECLARANT / ACCOUNT HOLDER
              <span class="sig-title-sub">DIGITAL CONFIRMATION</span>
            </div>
            <div style="padding: 8px 2px; text-align: center;">
              <span style="font-size: 9.5px; color: #059669; font-weight: 900; background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                ✓ DIGITALLY CONFIRMED
              </span>
              <div style="font-size: 9px; color: #475569; margin-top: 5px; font-family: monospace; font-weight: 800;">
                AUTH REF: HCRS-CONF-${tokenDisplay}
              </div>
            </div>
          </div>
          <div>
            <div class="sig-line">${memberName}</div>
            <div class="sig-sub">(Signature on record via authenticated portal)</div>
          </div>
        </div>

        <!-- 2. HIGHRICH ONLINE SHOPPE Pvt. Ltd. - MANAGEMENT / OFFICE VERIFICATION -->
        <div class="sig-box" style="background: #ffffff; border-color: #64748b;">
          <div>
            <div class="sig-title-main">
              2. HIGHRICH ONLINE SHOPPE Pvt. Ltd.
              <span class="sig-title-sub">MANAGEMENT / OFFICE VERIFICATION</span>
            </div>
            <table class="mgmt-verify-table">
              <tr>
                <td class="mgmt-field-label">Verified Adv. Amount:</td>
                <td class="mgmt-field-line">₹ .........................</td>
              </tr>
              <tr>
                <td class="mgmt-field-label">Verified Amt. Received:</td>
                <td class="mgmt-field-line">₹ .........................</td>
              </tr>
              <tr>
                <td class="mgmt-field-label">Total Balance Payable:</td>
                <td class="mgmt-field-line">₹ .........................</td>
              </tr>
              <tr>
                <td class="mgmt-field-label">Verification Date:</td>
                <td class="mgmt-field-line">...... / ...... / 202...</td>
              </tr>
            </table>
          </div>
          <div>
            <div class="sig-line">HIGHRICH ONLINE SHOPPE Pvt. Ltd.</div>
            <div class="sig-sub">Authorized Signatory & Seal</div>
          </div>
        </div>

        <!-- 3. HCRS - SUPPORT / COLLECTION AUTHORITY -->
        <div class="sig-box">
          <div>
            <div class="sig-title-main">
              3. HIGHRICH COMMUNITY REVIVAL SOCIETY
              <span class="sig-title-sub">SUPPORT / COLLECTION AUTHORITY</span>
            </div>
            <div style="padding: 4px 2px 2px 2px; text-align: center;">
              <div style="font-size: 8px; color: #475569; font-weight: 800;">
                Reg. No: TSR/TC/93/2025
              </div>
              <div style="font-size: 7.5px; color: #64748b; font-weight: 600; margin-top: 1px;">
                Room No. 85, Thrissur Dt., PIN 680312
              </div>
              <div style="font-size: 7.5px; color: #003366; font-weight: 800; margin-top: 1px;">
                PH: 9495465310
              </div>
            </div>
          </div>
          <div>
            <div class="sig-line">GENERAL SECRETARY / HCRS</div>
            <div class="sig-sub">Authorized Signatory & Seal</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Render 1 Full Admin Page for a Claim (Customer / Admin Print)
 * INCLUDES: All customer details, Combo, Future Preference, Hardship, Priority Category, Notes.
 */
export const renderPersonFullAdminClaimPage = (
  claim: any,
  userProf: any,
  pageNum: number = 1,
  totalPages: number = 1
): string => {
  const districtObj = DISTRICTS.find(d => d.code === (claim.userDistrict || userProf?.district));
  const districtName = districtObj?.name || claim.userDistrict || userProf?.district || 'Kerala';
  const asslyName = userProf?.assemblyConstituency || claim.constituency || 'N/A';
  const addressStr = userProf?.address || claim.address || claim.userAddress || 'N/A';
  const postOfficeStr = userProf?.postOffice || '';
  const pinStr = userProf?.pincode || '';
  const fullAddress = `${addressStr}${postOfficeStr ? ', P.O. ' + postOfficeStr : ''}${pinStr ? ', PIN: ' + pinStr : ''}`;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const dateStr = formatClaimDateTime(claim.createdAt);
  const memberName = claim.userName || userProf?.name || 'N/A';
  const mobileStr = claim.userMobile || userProf?.mobile || 'N/A';
  const membershipIdStr = claim.membershipId || userProf?.membershipId || 'PENDING';

  const priorityLabel = claim.priorityStatus || 'GENERAL';
  const priorityBg = priorityLabel === 'EMERGENCY RED' ? '#dc2626' :
                     priorityLabel === 'RED' ? '#ef4444' :
                     priorityLabel === 'ORANGE' ? '#f97316' : '#16a34a';

  const prefText = claim.futurePreference === 'settlement' ? 'Prefer settlement and closure after receiving balance' :
                   claim.futurePreference === 'wait' ? 'Willing to wait if company continues and grows' :
                   claim.futurePreference === 'continue' ? 'Ready to continue based on future plans' : (claim.futurePreference || 'N/A');

  const hardshipText = Array.isArray(claim.hardshipStatus) ? claim.hardshipStatus.join(', ') : (claim.hardshipStatus || 'None');

  return `
    <div class="page-container">
      <div>
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="org-title">HIGHRICH ONLINE SHOPPE Pvt. Ltd.</div>
              <div style="font-size: 8.5px; color: #475569; font-weight: 700; margin-top: 1px;">TC41/1030/14, 2nd Floor, Kanimangalam Tower, Valiyalukkal, Thrissur</div>
              <div class="sub-title" style="margin-top: 3px; font-size: 10px; color: #003366;">Support / Collection: HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)</div>
              <div style="font-size: 8px; color: #64748b; font-weight: 600;">Reg. No: TSR/TC/93/2025 • Room No. 85, Thrissur Dt., Kerala, India • PIN 680312 • PH: 9495465310</div>
              <div class="doc-tag" style="background: #7e22ce; margin-top: 4px;">MEMBER FINANCIAL INFORMATION REGISTRY • ADMIN MASTER RECORD</div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 180px;">
              <div style="font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase;">ADMIN REF</div>
              <div style="font-size: 13px; font-weight: 900; color: #7e22ce; font-family: monospace;">#${tokenDisplay}</div>
              <div style="font-size: 7px; color: #64748b; margin-top: 1px;">Registered: ${dateStr}</div>
              <div style="margin-top: 2px; display: inline-block; background: ${priorityBg}; color: #ffffff; font-size: 8px; font-weight: 900; padding: 1.5px 7px; border-radius: 4px; letter-spacing: 0.3px;">
                ${priorityLabel} • PAGE ${pageNum}/${totalPages}
              </div>
            </td>
          </tr>
        </table>

        <!-- Member & Administrative Profile -->
        <div class="section-heading">1. Member Profile & Relationship</div>
        <div class="meta-box">
          <div class="grid-3">
            <div>
              <span class="meta-label">Claimant Name</span>
              <span class="meta-val">${memberName}</span>
            </div>
            <div>
              <span class="meta-label">Relationship in Combo</span>
              <span class="meta-val" style="color: #be185d;">${claim.relation || 'Self'}</span>
            </div>
            <div>
              <span class="meta-label">Membership ID & Role</span>
              <span class="meta-val font-mono">${membershipIdStr} • ${(userProf?.role || 'Member').toUpperCase()}</span>
            </div>
            <div>
              <span class="meta-label">Mobile Number</span>
              <span class="meta-val font-mono">${mobileStr}</span>
            </div>
            <div>
              <span class="meta-label">Highrich Consumer ID</span>
              <span class="meta-val font-mono" style="color: #003366;">${claim.highrichId || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">Sponsor / Leader</span>
              <span class="meta-val">${claim.sponsorName ? `${claim.sponsorName} ${claim.sponsorMobile ? `(${claim.sponsorMobile})` : ''}` : 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">District & Assembly</span>
              <span class="meta-val">${districtName} (${asslyName})</span>
            </div>
            <div style="grid-column: span 3;">
              <span class="meta-label">Full Address</span>
              <span class="meta-val" style="font-size: 8px;">${fullAddress}</span>
            </div>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="section-heading">2. HIGHRICH ONLINE SHOPPE Pvt. Ltd. Consignment Advance Financials</div>
        <table class="claim-table">
          <thead>
            <tr>
              <th style="width: 37%;">Category / Head</th>
              <th style="text-align: right; width: 21%;">Consignment Advance Paid (₹)</th>
              <th style="text-align: right; width: 21%;">Amount Received (₹)</th>
              <th style="text-align: right; width: 21%;">Pending Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${!claim.noBreakup && claim.categoryDetails && Object.keys(claim.categoryDetails).length > 0 ? (
              Object.entries(claim.categoryDetails).map(([catKey, details]: [string, any]) => `
                <tr>
                  <td style="font-weight: 700;">${getCategoryLabel(catKey)}</td>
                  <td style="text-align: right; font-family: monospace;">₹${(details.paid || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a;">₹${(details.received || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #7e22ce;">₹${(details.pending || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')
            ) : (
              `
                <tr>
                  <td style="font-weight: 700;">Consignment Advance Account (${claim.categories ? formatClaimCategories(claim.categories) : 'General'})</td>
                  <td style="text-align: right; font-family: monospace;">₹${(claim.totalPaid || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a;">₹${(claim.totalReceived || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #7e22ce;">₹${(claim.totalPending || 0).toLocaleString('en-IN')}</td>
                </tr>
              `
            )}
            <tr class="total-row">
              <td>NET PENDING BALANCE</td>
              <td style="text-align: right; font-family: monospace;">₹${(claim.totalPaid || 0).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #16a34a;">₹${(claim.totalReceived || 0).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #7e22ce; font-size: 9.5px;">₹${(claim.totalPending || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Admin Specific Fields: Priority, Hardship, Future Preference -->
        <div class="section-heading">3. Administrative Assessment Details</div>
        <div class="meta-box" style="border-color: #cbd5e1; background: #fff7ed;">
          <div class="grid-2">
            <div>
              <span class="meta-label">Priority Status & Category</span>
              <span class="meta-val" style="color: ${priorityBg};">${priorityLabel} ${claim.isEmergency ? '• EMERGENCY PRIORITY' : ''}</span>
            </div>
            <div>
              <span class="meta-label">Hardship Factors</span>
              <span class="meta-val">${hardshipText}</span>
            </div>
            <div>
              <span class="meta-label">Future Preference</span>
              <span class="meta-val">${prefText}</span>
            </div>
            <div>
              <span class="meta-label">Verified By</span>
              <span class="meta-val">${userProf?.registeredByName || userProf?.certAdminName || 'Portal Submission'}</span>
            </div>
          </div>
        </div>

        ${claim.notes ? `
          <div class="section-heading">4. Notes & Remarks</div>
          <div class="meta-box">
            <span class="meta-val" style="font-size: 7.5px; color: #334155;">${claim.notes}</span>
          </div>
        ` : ''}

        <!-- Banking Information -->
        <div class="section-heading">${claim.notes ? '5' : '4'}. Bank Details for Balance Settlement</div>
        <div class="meta-box">
          <div class="grid-4">
            <div>
              <span class="meta-label">Account Holder</span>
              <span class="meta-val">${claim.settlementAccountHolder || memberName}</span>
            </div>
            <div>
              <span class="meta-label">Bank Name</span>
              <span class="meta-val">${claim.settlementBankName || userProf?.bankName || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">Account Number</span>
              <span class="meta-val font-mono">${claim.settlementAccountNumber || userProf?.accountNumber || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">IFSC Code</span>
              <span class="meta-val font-mono">${claim.settlementIfsc || userProf?.ifscCode || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Signatures Grid -->
      <div class="signatures-grid-3">
        <div class="sig-box">
          <div class="sig-title">1. CLAIMANT / MEMBER</div>
          <div class="sig-space" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <span style="font-size:6.5px; color:#059669; font-weight:800;">DIGITALLY CONFIRMED</span>
          </div>
          <div class="sig-line">${memberName}</div>
          <div class="sig-sub">(Signature on record)</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">2. VERIFYING ADMIN</div>
          <div class="sig-space"></div>
          <div class="sig-line">ADMIN VERIFICATION</div>
          <div class="sig-sub">HCRS Authorized Representative</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">3. HCRS SECRETARY</div>
          <div class="sig-space"></div>
          <div class="sig-line">SECRETARY</div>
          <div class="sig-sub">Signatory & Official Seal</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Print Court Claim Report (Single person or individual claim)
 */
export const printCourtClaimReport = (claim: any, memberProfile?: any) => {
  if (!claim) return;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const name = claim.userName || memberProfile?.name || 'Member';

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ml">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consignment Advance Statement - #${tokenDisplay} - ${name}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Member Financial Information Registry</strong>
            <span>Official Record • #${tokenDisplay} • ${name}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ പ്രിന്റ് / സേവ് PDF (Print / Save as PDF)</button>
            <button onclick="shareViaWeb()" class="btn-share">📲 വാട്സാപ്പ് / ഷെയർ (WhatsApp)</button>
            <button onclick="window.close()" class="btn-close">✕ ക്ലോസ് (Close)</button>
          </div>
        </div>
        <div class="watermark">MEMBER FINANCIAL REGISTRY</div>
        ${renderPersonCourtClaimPage(claim, memberProfile, 1, 1)}

        <script>
          function shareViaWeb() {
            var text = "HIGHRICH ONLINE SHOPPE Pvt. Ltd. - Member Financial Information Registry\\n" +
                       "Name: ${name}\\n" +
                       "Statement Ref: #${tokenDisplay}\\n" +
                       "Consignment Advance Paid: ₹${(claim.totalPaid || 0).toLocaleString('en-IN')}\\n" +
                       "Pending Balance: ₹${(claim.totalPending || 0).toLocaleString('en-IN')}\\n" +
                       "Digital Confirmation: HCRS-CONF-${tokenDisplay}";
            if (navigator.share) {
              navigator.share({
                title: "Consignment Advance Statement - ${name}",
                text: text,
                url: window.location.href
              }).catch(function(e){});
            } else {
              var waUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
              window.open(waUrl, '_blank');
            }
          }

          // Auto-prompt print after DOM renders
          window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              window.print();
            }, 350);
          });
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Get Court Combo Report Complete HTML string for direct in-app preview iframe / modal
 */
export const getCourtComboHtml = (primaryMember: any, memberClaims: any[]): string => {
  if (!memberClaims || memberClaims.length === 0) return '';
  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  return `<!DOCTYPE html>
<html lang="ml">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${getCourtReportBaseStyles()}
      body {
        padding: 16px 12px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .page-container {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        margin-bottom: 24px;
      }
      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }
        .page-container {
          box-shadow: none;
          border: none;
          margin-bottom: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
    ${cleanClaims.map((claim, idx) => {
      return renderPersonCourtClaimPage(claim, primaryMember, idx + 1, totalCount);
    }).join('')}
  </body>
</html>`;
};

/**
 * Get Single Court Claim Report Complete HTML string for direct in-app preview
 */
export const getSingleCourtClaimHtml = (primaryMember: any, claim: any, pageNum: number = 1, totalPages: number = 1): string => {
  if (!claim) return '';
  return `<!DOCTYPE html>
<html lang="ml">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${getCourtReportBaseStyles()}
      body {
        padding: 16px 12px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .page-container {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
      }
      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }
        .page-container {
          box-shadow: none;
          border: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
    ${renderPersonCourtClaimPage(claim, primaryMember, pageNum, totalPages)}
  </body>
</html>`;
};

/**
 * Print Court Combo Report (All persons in a combo, exactly 1 A4 page per person)
 */
export const printCourtComboReport = (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    alert('No records found to print.');
    return;
  }

  // Deduplicate
  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Member';
  const firstToken = cleanClaims[0]?.tokenNo ?? cleanClaims[0]?.serialNo ?? 'COMBO';

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ml">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consignment Advance Statement (${totalCount} Pages) - ${primeName}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Member Financial Information Registry</strong>
            <span>Official Record (${totalCount} Pages) • ${primeName}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ പ്രിന്റ് / സേവ് PDF (Print / Save as PDF)</button>
            <button onclick="shareViaWeb()" class="btn-share">📲 വാട്സാപ്പ് / ഷെയർ (WhatsApp)</button>
            <button onclick="window.close()" class="btn-close">✕ ക്ലോസ് (Close)</button>
          </div>
        </div>
        <div class="watermark">MEMBER FINANCIAL REGISTRY</div>
        ${cleanClaims.map((claim, idx) => {
          return renderPersonCourtClaimPage(claim, primaryMember, idx + 1, totalCount);
        }).join('')}

        <script>
          function shareViaWeb() {
            var text = "HIGHRICH ONLINE SHOPPE Pvt. Ltd. - Member Financial Information Registry (${totalCount} Persons)\\n" +
                       "Primary Account Holder: ${primeName}\\n" +
                       "Statement Ref: #${firstToken}\\n" +
                       "Total Statement Pages: ${totalCount}\\n" +
                       "Support / Collection: HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)";
            if (navigator.share) {
              navigator.share({
                title: "Consignment Advance Statement - ${primeName}",
                text: text,
                url: window.location.href
              }).catch(function(e){});
            } else {
              var waUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
              window.open(waUrl, '_blank');
            }
          }

          window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              window.print();
            }, 350);
          });
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Generate Multi-page or Single-page high-quality A4 PDF Document
 */
export const generateCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    throw new Error('No claim records available to generate PDF');
  }

  // Deduplicate claims
  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;
  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Member';
  const firstToken = cleanClaims[0]?.tokenNo ?? cleanClaims[0]?.serialNo ?? 'STATEMENT';
  const safeName = primeName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Consignment_Advance_Refund_Form_${firstToken}_${safeName}.pdf`;

  const totalPaid = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0);
  const totalReceived = cleanClaims.reduce((sum, c) => sum + (Number(c.totalReceived) || 0), 0);
  const totalPending = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPending) || 0), 0);

  // Ensure fonts are loaded in browser
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font readiness check error
    }
  }

  // Create temporary container off-screen strictly containing only the clean A4 page without toolbar
  const container = document.createElement('div');
  container.id = 'pdf-render-offscreen';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px'; // Exactly standard A4 width at 96 DPI
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#0f172a';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01'; // renders properly in browser canvas engine
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  // Inject base styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    ${getCourtReportBaseStyles()}
    .pdf-single-page {
      width: 794px !important;
      min-height: 1123px !important;
      max-height: 1123px !important;
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .page-container {
      box-shadow: none !important;
      border: 1.5px solid #003366 !important;
      margin: 0 !important;
      width: 100% !important;
      height: 1123px !important;
      max-height: 1123px !important;
    }
  `;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleanClaims.map((claim, idx) => {
    return `<div class="pdf-single-page">
      ${renderPersonCourtClaimPage(claim, primaryMember, idx + 1, totalCount)}
    </div>`;
  }).join('');
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    // Give browser time to settle DOM & web fonts
    await new Promise(r => setTimeout(r, 250));

    const pageElements = container.querySelectorAll('.pdf-single-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: html2canvasOklchOnClone
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
    }

    return {
      pdf,
      fileName,
      primeName,
      totalCount,
      totalPaid,
      totalReceived,
      totalPending,
      firstToken
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Direct .PDF File Download
 */
export const downloadCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    toast.error('ഡൗൺലോഡ് ചെയ്യാനുള്ള ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('ഔദ്യോഗിക PDF തയ്യാറാക്കുന്നു... (Generating PDF File...)');
  try {
    const { pdf, fileName } = await generateCourtComboPdf(primaryMember, memberClaims);
    
    // Direct blob trigger to guarantee native download across all devices
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    toast.success('PDF ഫയൽ വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!', { id: loadingToast });
  } catch (err: any) {
    console.error('Error downloading PDF:', err);
    toast.error('PDF ഡൗൺലോഡ് ചെയ്യാൻ സാധിച്ചില്ല: ' + (err?.message || 'Error'), { id: loadingToast });
  }
};

/**
 * Direct .PDF Document Sharing via Web Share API / WhatsApp
 */
export const shareCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    toast.error('ഷെയർ ചെയ്യാനുള്ള ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('ഷെയർ ചെയ്യാനായി PDF ഫയൽ തയ്യാറാക്കുന്നു... (Preparing PDF...)');
  try {
    const { pdf, fileName, primeName, totalCount, totalPaid, totalPending, firstToken } = await generateCourtComboPdf(primaryMember, memberClaims);
    
    // Extract real PDF Blob & File
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const shareText = `*HIGHRICH ONLINE SHOPPE Pvt. Ltd. - MEMBER FINANCIAL INFORMATION REGISTRY*\n` +
                      `*HCRS Support / Collection Record*\n\n` +
                      `👤 *Name:* ${primeName}\n` +
                      `📄 *Statement Ref:* #${firstToken}\n` +
                      `👥 *Total Pages:* ${totalCount} Persons\n` +
                      `💰 *Consignment Advance Paid:* ₹${totalPaid.toLocaleString('en-IN')}\n` +
                      `🔴 *Pending Balance:* ₹${totalPending.toLocaleString('en-IN')}\n\n` +
                      `Support / Collection: Highrich Community Revival Society (HCRS)`;

    // Attempt Native Web Share with the actual PDF file
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      toast.dismiss(loadingToast);
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Consignment Advance Refund Form - ${primeName}`,
          text: shareText
        });
        toast.success('PDF വിജയകരമായി ഷെയർ ചെയ്തു!');
        return;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return; // User cancelled share dialog
        }
        console.warn('Share cancelled or failed:', shareErr);
      }
    }

    // Fallback if browser doesn't support direct file attachment share:
    pdf.save(fileName);
    toast.success('PDF ഫയൽ ഡൗൺലോഡ് ചെയ്തു! വാട്സാപ്പിൽ അയക്കാം.', { id: loadingToast });
    
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n\n📄 (PDF File downloaded to your device)")}`;
    window.open(waUrl, '_blank');
  } catch (err) {
    console.error('Error sharing PDF:', err);
    toast.error('PDF തയ്യാറാക്കാൻ സാധിച്ചില്ല. പ്രിന്റ് വിൻഡോ ഉപയോഗിക്കുക.', { id: loadingToast });
    printCourtComboReport(primaryMember, memberClaims);
  }
};

/**
 * Aliases for backwards compatibility
 */
export const shareCourtComboReport = shareCourtComboPdf;
export const downloadCourtComboHtml = downloadCourtComboPdf;
export const downloadCourtClaimPdf = (claim: any, memberProfile?: any) => downloadCourtComboPdf(memberProfile, [claim]);
export const shareCourtClaimPdf = (claim: any, memberProfile?: any) => shareCourtComboPdf(memberProfile, [claim]);


/**
 * Print Full Admin Claim Report (Single person)
 */
export const printFullAdminClaimReport = (claim: any, memberProfile?: any) => {
  if (!claim) return;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const name = claim.userName || memberProfile?.name || 'Member';

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Full Admin Claim Report - #${tokenDisplay} - ${name}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body onload="window.print();">
        <div class="watermark">HCRS ADMIN MASTER REPORT</div>
        ${renderPersonFullAdminClaimPage(claim, memberProfile, 1, 1)}
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Print Full Admin Combo Report (All persons in a combo with full admin fields)
 */
export const printFullAdminComboReport = (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    alert('No records found to print.');
    return;
  }

  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Combo';

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Full Admin Combo Report (${totalCount} Pages) - ${primeName}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body onload="window.print();">
        <div class="watermark">HCRS ADMIN MASTER REPORT</div>
        ${cleanClaims.map((claim, idx) => {
          return renderPersonFullAdminClaimPage(claim, primaryMember, idx + 1, totalCount);
        }).join('')}
      </body>
    </html>
  `);
  printWin.document.close();
};

export const printCustomerClaimReport = printFullAdminClaimReport;
export const printCustomerComboReport = printFullAdminComboReport;
export const printMemberComboReport = printCourtComboReport;
export const printMemberClaimReport = printCourtClaimReport;


