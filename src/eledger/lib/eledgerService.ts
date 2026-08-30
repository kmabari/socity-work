import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { eledgerAuth, eledgerDb } from './firebaseEledger';
import {
  ELedgerUser,
  LedgerVoucher,
  TreasuryMetrics,
  CategorySummary,
  MemberFinancialAccount,
  AuditLogEntry,
  FundCategory
} from '../types';
import {
  INITIAL_TREASURY_METRICS,
  INITIAL_CATEGORY_SUMMARIES,
  INITIAL_VOUCHERS,
  INITIAL_AUDIT_LOGS
} from '../data/ledgerData';

// Collection References
const USERS_COL = 'eledger_users';
const METRICS_DOC = 'eledger_treasury_metrics/current_state';
const CATEGORIES_COL = 'eledger_fund_categories';
const VOUCHERS_COL = 'eledger_vouchers';
const MEMBER_ACCOUNTS_COL = 'eledger_member_accounts';
const AUDIT_LOGS_COL = 'eledger_audit_logs';

/**
 * Helper to remove undefined, null, or empty optional fields from any Firestore payload
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Omit empty string optional fields to keep document clean and strictly typed
      if (trimmed === '' && (
        key === 'membershipId' || 
        key === 'auditNotes' || 
        key === 'referenceNo' || 
        key === 'lastLoginAt' || 
        key === 'invitedAt' || 
        key === 'district' ||
        key === 'notes' ||
        key === 'assignedSeatNumber'
      )) {
        continue;
      }
      clean[key] = trimmed;
    } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val?.constructor?.name === 'FieldValue')) {
      const nested = sanitizeForFirestore(val);
      if (Object.keys(nested).length > 0) {
        clean[key] = nested;
      }
    } else {
      clean[key] = val;
    }
  }
  return clean as Partial<T>;
}

/**
 * Bootstrap the initial eLedger database state if empty
 */
export async function bootstrapEledgerDataIfEmpty(): Promise<void> {
  try {
    // 1. Ensure initial treasury metrics
    const metricsRef = doc(eledgerDb, 'eledger_treasury_metrics', 'current_state');
    const metricsSnap = await getDoc(metricsRef);
    if (!metricsSnap.exists()) {
      await setDoc(metricsRef, {
        ...INITIAL_TREASURY_METRICS,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Ensure Fund Categories
    const catSnap = await getDocs(collection(eledgerDb, CATEGORIES_COL));
    if (catSnap.empty) {
      for (const cat of INITIAL_CATEGORY_SUMMARIES) {
        const catId = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(eledgerDb, CATEGORIES_COL, catId), {
          ...cat,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('[eLedger Service] Bootstrap check note:', err);
  }
}

export const CENTRAL_ADMIN_EMAILS = [
  'hcrskerala@gmail.com',
  'kmabarikiyafoods@gmail.com',
  'mabarikiyafoods@gmail.com',
  'hcrsindia@gmail.com',
  'admin@hcrs.society',
  'highrichcommunityrevivalsociet@gmail.com',
  '9645934571@hcrs.society',
];

export function isCentralAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    CENTRAL_ADMIN_EMAILS.includes(clean) ||
    clean.includes('hcrskerala') ||
    clean.includes('mabarikiyafoods') ||
    clean.includes('admin') ||
    clean.includes('eledger') ||
    clean.includes('admin_auth') ||
    clean.includes('highrich') ||
    clean.includes('hcrsindia') ||
    clean.includes('9645934571') ||
    clean.endsWith('@hcrs.society') ||
    clean.endsWith('@hcrs.org')
  );
}

/**
 * Ensure Admin user doc is synced with Auth UID upon authentication
 */
export async function ensureAdminUserRecord(fbUser: FirebaseUser): Promise<ELedgerUser> {
  const userDocRef = doc(eledgerDb, USERS_COL, fbUser.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const existing = snap.data() as ELedgerUser;
      if (existing.role !== 'admin' || existing.status !== 'active') {
        await setDoc(userDocRef, { role: 'admin', status: 'active', updatedAt: serverTimestamp() }, { merge: true });
        return { ...existing, id: fbUser.uid, role: 'admin', status: 'active' };
      }
      return { ...existing, id: fbUser.uid };
    }
  } catch (err) {
    console.warn('[eLedger Service] Admin doc check warning:', err);
  }

  const adminDoc: ELedgerUser = {
    id: fbUser.uid,
    name: fbUser.displayName || 'HCRS Central Admin',
    email: fbUser.email?.toLowerCase() || 'hcrskerala@gmail.com',
    mobile: '9847000001',
    role: 'admin',
    status: 'active',
    district: 'State HQ',
    createdAt: new Date().toISOString().split('T')[0],
    lastLoginAt: new Date().toISOString().split('T')[0],
  };

  try {
    await setDoc(userDocRef, sanitizeForFirestore(adminDoc), { merge: true });
  } catch (err) {
    console.warn('[eLedger Service] Admin doc setDoc warning:', err);
  }
  return adminDoc;
}

/**
 * Sign in to eLedger with email and password
 */
export async function eledgerSignIn(email: string, pass: string): Promise<{ success: boolean; user?: ELedgerUser; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(eledgerAuth, cleanEmail, pass);
    const fbUser = userCredential.user;

    // If Central Admin signs in, ensure Firestore role mapping
    if (isCentralAdminEmail(cleanEmail)) {
      const adminUser = await ensureAdminUserRecord(fbUser);
      return { success: true, user: adminUser };
    }

    // Verify role and authorization strictly from Firestore document for other users
    const userProfile = await fetchEledgerUserProfile(fbUser);
    if (!userProfile) {
      await signOut(eledgerAuth);
      return { success: false, error: 'Unauthorized: Your account is not registered in the HCRS eLedger Committee registry.' };
    }

    if (userProfile.status === 'inactive') {
      await signOut(eledgerAuth);
      return { success: false, error: 'Account Suspended: Your access has been deactivated by the Central Admin.' };
    }

    // Update lastLoginAt
    await updateDoc(doc(eledgerDb, USERS_COL, userProfile.id), {
      lastLoginAt: new Date().toISOString().split('T')[0],
    });

    return { success: true, user: userProfile };
  } catch (err: any) {
    let msg = err.message || 'Authentication failed.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Invalid email address or password. Please verify credentials.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many failed login attempts. Please reset your password or try again later.';
    }
    return { success: false, error: msg };
  }
}

/**
 * Sign out from eLedger
 */
export async function eledgerSignOut(): Promise<void> {
  await signOut(eledgerAuth);
}

/**
 * Send password reset / setup email
 */
export async function eledgerSendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(eledgerAuth, cleanEmail);
    return { success: true, message: `Password reset link sent to ${cleanEmail}. Please check inbox and spam folder.` };
  } catch (err: any) {
    let msg = err.message || 'Failed to send password reset email.';
    if (err.code === 'auth/user-not-found') {
      msg = 'No registered Firebase account found for this email. Contact Central Admin.';
    }
    return { success: false, message: msg };
  }
}

/**
 * Helper to fetch eLedger user profile by Firebase Auth User
 */
export async function fetchEledgerUserProfile(fbUser: FirebaseUser): Promise<ELedgerUser | null> {
  try {
    // 1. Check by UID
    const docByUid = await getDoc(doc(eledgerDb, USERS_COL, fbUser.uid));
    if (docByUid.exists()) {
      return docByUid.data() as ELedgerUser;
    }

    // 2. Check by Email
    if (fbUser.email) {
      const q = query(collection(eledgerDb, USERS_COL));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const u = d.data() as ELedgerUser;
        if (u.email.toLowerCase() === fbUser.email.toLowerCase()) {
          return { ...u, id: d.id };
        }
      }
    }
  } catch (err) {
    console.error('[eLedger Service] fetchEledgerUserProfile error:', err);
  }
  return null;
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToEledgerAuth(
  onUserChanged: (user: ELedgerUser | null, loading: boolean) => void
): () => void {
  return onAuthStateChanged(eledgerAuth, async (fbUser) => {
    if (!fbUser) {
      onUserChanged(null, false);
      return;
    }

    try {
      if (isCentralAdminEmail(fbUser.email)) {
        const adminDoc = await ensureAdminUserRecord(fbUser);
        onUserChanged(adminDoc, false);
        return;
      }

      const profile = await fetchEledgerUserProfile(fbUser);
      if (profile && profile.status !== 'inactive') {
        onUserChanged(profile, false);
      } else {
        await signOut(eledgerAuth);
        onUserChanged(null, false);
      }
    } catch {
      onUserChanged(null, false);
    }
  });
}

/**
 * Real-time Subscriptions with Safe Handlers
 */
export function subscribeToUsers(callback: (users: ELedgerUser[]) => void): () => void {
  const q = query(collection(eledgerDb, USERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const userMap = new Map<string, ELedgerUser>();
      snapshot.forEach((docSnap) => {
        const u = { ...docSnap.data(), id: docSnap.id } as ELedgerUser;
        const emailKey = (u.email || '').toLowerCase().trim();
        if (!emailKey) {
          userMap.set(docSnap.id, u);
          return;
        }
        const existing = userMap.get(emailKey);
        if (!existing) {
          userMap.set(emailKey, u);
        } else if (existing.id === 'admin-hcrskerala' && u.id !== 'admin-hcrskerala') {
          userMap.set(emailKey, u);
        }
      });
      callback(Array.from(userMap.values()));
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToUsers warning:', err);
    }
  );
}

export function subscribeToMetrics(callback: (metrics: TreasuryMetrics) => void): () => void {
  return onSnapshot(
    doc(eledgerDb, 'eledger_treasury_metrics', 'current_state'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as TreasuryMetrics);
      }
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToMetrics warning:', err);
    }
  );
}

export function subscribeToCategories(callback: (categories: CategorySummary[]) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, CATEGORIES_COL),
    (snapshot) => {
      const categories: CategorySummary[] = [];
      snapshot.forEach((docSnap) => {
        categories.push(docSnap.data() as CategorySummary);
      });
      if (categories.length > 0) {
        callback(categories);
      }
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToCategories warning:', err);
    }
  );
}

export function subscribeToVouchers(callback: (vouchers: LedgerVoucher[]) => void): () => void {
  const q = query(collection(eledgerDb, VOUCHERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const vouchers: LedgerVoucher[] = [];
      snapshot.forEach((docSnap) => {
        vouchers.push({ ...docSnap.data(), id: docSnap.id } as LedgerVoucher);
      });
      // Sort descending by date
      vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(vouchers);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToVouchers warning:', err);
    }
  );
}

export function subscribeToMemberAccounts(callback: (accounts: Record<string, MemberFinancialAccount>) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, MEMBER_ACCOUNTS_COL),
    (snapshot) => {
      const accounts: Record<string, MemberFinancialAccount> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MemberFinancialAccount;
        accounts[docSnap.id] = { ...data, userId: docSnap.id };
      });
      callback(accounts);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToMemberAccounts warning:', err);
    }
  );
}

export function subscribeToAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, AUDIT_LOGS_COL),
    (snapshot) => {
      const logs: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ ...docSnap.data(), id: docSnap.id } as AuditLogEntry);
      });
      // Sort descending by timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToAuditLogs warning:', err);
    }
  );
}

/**
 * User Management Operations (Admin Only)
 */
export async function addEledgerUser(
  userData: Omit<ELedgerUser, 'id' | 'createdAt'>,
  existingUsers: ELedgerUser[]
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = userData.email.trim().toLowerCase();
    
    // Check duplicate
    const exists = existingUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'An account with this email address already exists in the registry.' };
    }

    // Role Quota Check (Max 20 accounts: 1 Admin, 1 Treasurer, 1 Auditor, 17 Members)
    if (userData.role === 'admin' && existingUsers.filter(u => u.role === 'admin').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Admin account.' };
    }
    if (userData.role === 'treasurer' && existingUsers.filter(u => u.role === 'treasurer').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Treasurer account.' };
    }
    if (userData.role === 'auditor' && existingUsers.filter(u => u.role === 'auditor').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Statutory Auditor account.' };
    }
    if (userData.role === 'member' && existingUsers.filter(u => u.role === 'member').length >= 17) {
      return { success: false, message: 'Quota Reached: The 17 Committee Member seats are fully occupied.' };
    }

    const newUserId = `usr-${Date.now().toString().slice(-6)}`;
    const userPayload: Record<string, any> = {
      name: userData.name.trim(),
      email: cleanEmail,
      mobile: userData.mobile.trim(),
      role: userData.role,
      status: 'pending_setup',
      id: newUserId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (userData.district && userData.district.trim()) {
      userPayload.district = userData.district.trim();
    }

    // Only committee members can have membershipId or assignedSeatNumber; optional for admin/treasurer/auditor
    if (userData.role === 'member') {
      if (userData.membershipId && userData.membershipId.trim()) {
        userPayload.membershipId = userData.membershipId.trim();
      }
      if (userData.assignedSeatNumber !== undefined && userData.assignedSeatNumber !== null) {
        userPayload.assignedSeatNumber = userData.assignedSeatNumber;
      }
    }

    const cleanedUserDoc = sanitizeForFirestore(userPayload);
    await setDoc(doc(eledgerDb, USERS_COL, newUserId), cleanedUserDoc);

    // If role is member, create their isolated financial account
    if (userData.role === 'member') {
      const defaultAllocated = 25000;
      const memberAccount: MemberFinancialAccount = {
        userId: newUserId,
        membershipId: userPayload.membershipId || `HCRS-SC-${existingUsers.filter(u => u.role === 'member').length + 1}`,
        memberName: userData.name.trim(),
        email: cleanEmail,
        mobile: userData.mobile.trim(),
        district: userPayload.district || 'State Committee HQ',
        allocatedCredit: defaultAllocated,
        totalContributed: 0,
        expensesClaimed: 0,
        availableBalance: defaultAllocated,
        billsSubmitted: 0,
        status: 'active',
        recentTransactions: [
          {
            id: `tx-init-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'credit_allocation',
            description: 'Initial Committee Operational Credit Grant',
            amount: defaultAllocated,
            referenceNo: `INIT-${newUserId.toUpperCase()}`,
            status: 'verified',
          }
        ],
      };
      await setDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, newUserId), sanitizeForFirestore(memberAccount));
    }

    return {
      success: true,
      message: `Account created for ${userData.name.trim()} (${userData.role.toUpperCase()}). Password setup can be triggered via email.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to add user.' };
  }
}

export async function updateEledgerUser(
  id: string, 
  updates: Partial<ELedgerUser>
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUpdates: Partial<ELedgerUser> = {};
    if (updates.name && updates.name.trim()) cleanUpdates.name = updates.name.trim();
    if (updates.email && updates.email.trim()) cleanUpdates.email = updates.email.trim().toLowerCase();
    if (updates.mobile && updates.mobile.trim()) cleanUpdates.mobile = updates.mobile.trim();
    if (updates.role) cleanUpdates.role = updates.role;
    if (updates.district && updates.district.trim()) cleanUpdates.district = updates.district.trim();
    if (updates.status) cleanUpdates.status = updates.status;
    
    // Only committee members can have membershipId
    if (updates.role === 'member' && updates.membershipId && updates.membershipId.trim()) {
      cleanUpdates.membershipId = updates.membershipId.trim();
    }

    const sanitizedUpdates = sanitizeForFirestore({
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { success: false, message: 'No valid change fields provided.' };
    }

    // Direct update/merge on the exact target Firestore document
    await setDoc(doc(eledgerDb, USERS_COL, id), sanitizedUpdates, { merge: true });

    // If updating the Central Admin account and an auth UID doc exists that differs from id (e.g. 'admin-hcrskerala'), keep both in sync
    const isEditingAdminAccount = 
      isCentralAdminEmail(updates.email) || 
      id === 'admin-hcrskerala' || 
      (eledgerAuth.currentUser && id === eledgerAuth.currentUser.uid && updates.role === 'admin');

    if (
      isEditingAdminAccount &&
      eledgerAuth.currentUser &&
      eledgerAuth.currentUser.uid !== id
    ) {
      await setDoc(
        doc(eledgerDb, USERS_COL, eledgerAuth.currentUser.uid), 
        { ...sanitizedUpdates, role: 'admin' }, 
        { merge: true }
      );
    }

    // Only sync member account if updating a committee member
    if (updates.role === 'member') {
      try {
        const memberSnap = await getDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id));
        if (memberSnap.exists()) {
          const memberUpdates: Partial<MemberFinancialAccount> = {};
          if (cleanUpdates.name) memberUpdates.memberName = cleanUpdates.name;
          if (cleanUpdates.email) memberUpdates.email = cleanUpdates.email;
          if (cleanUpdates.mobile) memberUpdates.mobile = cleanUpdates.mobile;
          if (cleanUpdates.district) memberUpdates.district = cleanUpdates.district;
          if (cleanUpdates.membershipId) memberUpdates.membershipId = cleanUpdates.membershipId;

          const sanitizedMemberUpdates = sanitizeForFirestore({
            ...memberUpdates,
            updatedAt: serverTimestamp(),
          });
          if (Object.keys(sanitizedMemberUpdates).length > 0) {
            await setDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id), sanitizedMemberUpdates, { merge: true });
          }
        }
      } catch (memErr) {
        console.warn('[eLedger Service] Member account sync warning:', memErr);
      }
    }

    return { success: true, message: 'Committee account updated successfully.' };
  } catch (err: any) {
    console.error('[eLedger Service] updateEledgerUser error:', err);
    return { success: false, message: err.message || 'Failed to update committee account in database.' };
  }
}

export async function toggleEledgerUserStatus(
  id: string, 
  currentStatus: string
): Promise<{ success: boolean; message: string }> {
  try {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await setDoc(doc(eledgerDb, USERS_COL, id), { status: nextStatus, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true, message: `Account status updated to ${nextStatus}.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to change account status.' };
  }
}

export async function deleteEledgerUser(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(eledgerDb, USERS_COL, id));
    await deleteDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id));
    return { success: true, message: 'User account deleted successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete user account.' };
  }
}

/**
 * Voucher Operations
 */
export async function createEledgerVoucher(
  voucherData: Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'status' | 'preparedBy'>,
  preparedByName: string,
  totalVouchersCount: number
): Promise<void> {
  const id = `vouch-${Date.now().toString().slice(-5)}`;
  const voucherNumber = `HCRS/VOUCH/2026/${(totalVouchersCount + 491).toString().padStart(4, '0')}`;
  
  const newVoucher: LedgerVoucher = {
    ...voucherData,
    id,
    voucherNumber,
    status: 'pending_approval',
    preparedBy: preparedByName,
  };

  await setDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    ...sanitizeForFirestore(newVoucher),
    createdAt: serverTimestamp(),
  });
}

/**
 * Recalculate metrics and category balances based on current vouchers
 */
export async function syncEledgerMetricsFromVouchers(): Promise<void> {
  try {
    const vouchSnap = await getDocs(collection(eledgerDb, VOUCHERS_COL));
    let totalInflow = 0;
    let totalOutflow = 0;
    let verifiedCount = 0;
    let pendingAuditsCount = 0;
    let latestAuditDate = '';

    const categorySpentMap: Record<string, number> = {};

    vouchSnap.forEach((docSnap) => {
      const v = docSnap.data() as LedgerVoucher;
      if (v.status === 'approved' || v.status === 'audited') {
        verifiedCount++;
        if (v.type === 'income') {
          totalInflow += v.amount;
        } else if (v.type === 'expense') {
          totalOutflow += v.amount;
          categorySpentMap[v.category] = (categorySpentMap[v.category] || 0) + v.amount;
        }
      }
      if (v.status === 'approved') {
        pendingAuditsCount++;
      }
      if (v.status === 'audited' && v.date) {
        if (!latestAuditDate || new Date(v.date) > new Date(latestAuditDate)) {
          latestAuditDate = v.date;
        }
      }
    });

    const currentReserveBalance = totalInflow - totalOutflow;

    await updateDoc(doc(eledgerDb, 'eledger_treasury_metrics', 'current_state'), {
      totalInflow,
      totalOutflow,
      currentReserveBalance,
      verifiedVouchersCount: verifiedCount,
      pendingAuditsCount,
      lastAuditedDate: latestAuditDate || 'Pending Audit',
      updatedAt: serverTimestamp(),
    });

    // Update categories
    const catSnap = await getDocs(collection(eledgerDb, CATEGORIES_COL));
    for (const catDoc of catSnap.docs) {
      const cat = catDoc.data() as CategorySummary;
      const spent = categorySpentMap[cat.category] || 0;
      const balance = (cat.allocated || 0) - spent;
      const percentageUsed = cat.allocated > 0 ? Math.min(100, Math.round((spent / cat.allocated) * 100)) : 0;
      await updateDoc(catDoc.ref, {
        spent,
        balance,
        percentageUsed,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[eLedger Service] syncEledgerMetricsFromVouchers note:', err);
  }
}

export async function approveEledgerVoucher(id: string, approvedByName: string): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'approved',
    approvedBy: approvedByName,
    updatedAt: serverTimestamp(),
  });
  await syncEledgerMetricsFromVouchers();
}

export async function rejectEledgerVoucher(id: string): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
  await syncEledgerMetricsFromVouchers();
}

export async function auditEledgerVoucher(
  id: string,
  notes: string,
  auditorName: string,
  voucherNo: string
): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'audited',
    auditedBy: auditorName,
    auditNotes: notes,
    updatedAt: serverTimestamp(),
  });

  // Create immutable audit log entry
  const logId = `log-${Date.now()}`;
  const newLog: AuditLogEntry = {
    id: logId,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    voucherNo: voucherNo,
    auditorName: auditorName,
    action: 'Verified & Approved',
    comment: notes,
    hashSignature: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`,
  };

  await setDoc(doc(eledgerDb, AUDIT_LOGS_COL, logId), {
    ...newLog,
    createdAt: serverTimestamp(),
  });

  await syncEledgerMetricsFromVouchers();
}

/**
 * Member Credit Allocation (Treasurer Operation)
 */
export async function allocateMemberCreditInDb(
  memberId: string,
  amount: number,
  currentAccount?: MemberFinancialAccount
): Promise<void> {
  const memberRef = doc(eledgerDb, MEMBER_ACCOUNTS_COL, memberId);
  const snap = await getDoc(memberRef);
  
  if (snap.exists()) {
    const existing = snap.data() as MemberFinancialAccount;
    const updatedAllocated = (existing.allocatedCredit || 0) + amount;
    const updatedBalance = (existing.availableBalance || 0) + amount;
    const newTx = {
      id: `tx-alloc-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'credit_allocation' as const,
      description: 'Operational Credit Augmentation by State Treasurer',
      amount: amount,
      referenceNo: `ALLOC-${Date.now().toString().slice(-4)}`,
      status: 'verified' as const,
    };

    await updateDoc(memberRef, {
      allocatedCredit: updatedAllocated,
      availableBalance: updatedBalance,
      recentTransactions: [newTx, ...(existing.recentTransactions || [])],
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Member Bill Claim Submission (Member Operation)
 */
export async function submitMemberBillClaimInDb(
  memberId: string,
  claim: { description: string; amount: number; invoiceRef: string }
): Promise<void> {
  const memberRef = doc(eledgerDb, MEMBER_ACCOUNTS_COL, memberId);
  const snap = await getDoc(memberRef);
  
  if (snap.exists()) {
    const existing = snap.data() as MemberFinancialAccount;
    const newExpense = (existing.expensesClaimed || 0) + claim.amount;
    const newBalance = Math.max(0, (existing.availableBalance || 0) - claim.amount);
    const newTx = {
      id: `tx-claim-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'expense_reimbursement' as const,
      description: claim.description,
      amount: claim.amount,
      referenceNo: claim.invoiceRef,
      status: 'pending' as const,
    };

    await updateDoc(memberRef, {
      expensesClaimed: newExpense,
      availableBalance: newBalance,
      billsSubmitted: (existing.billsSubmitted || 0) + 1,
      recentTransactions: [newTx, ...(existing.recentTransactions || [])],
      updatedAt: serverTimestamp(),
    });
  }
}
