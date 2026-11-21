/**
 * Security Rules Verification Suite (Dirty Dozen + Positive Path Spec)
 * Documents the expected allow/deny matrix for Udaya Firestore rules.
 * Can be executed against the Firebase Local Emulator Suite when available.
 */
export interface RuleTestCase {
  id: string;
  title: string;
  actor: 'anonymous' | 'owner_alice' | 'other_bob' | 'admin';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expected: 'ALLOW' | 'DENY';
  rationale: string;
}

export const UDAYA_FIRESTORE_RULE_TESTS: RuleTestCase[] = [
  {
    id: 'T01',
    title: 'Anonymous user cannot read any user profile',
    actor: 'anonymous',
    operation: 'get',
    path: '/users/alice',
    expected: 'DENY',
    rationale: 'PII isolation: unauthenticated access is denied everywhere.',
  },
  {
    id: 'T02',
    title: 'Owner can create own renter/owner profile with serverTimestamp',
    actor: 'owner_alice',
    operation: 'create',
    path: '/users/alice',
    expected: 'ALLOW',
    rationale: 'Self-registration with non-admin role and valid schema is permitted.',
  },
  {
    id: 'T03',
    title: 'Self-promotion to admin on create is denied',
    actor: 'other_bob',
    operation: 'create',
    path: '/users/bob',
    expected: 'DENY',
    rationale: 'Privilege escalation blocked: role must be renter or owner for non-admins.',
  },
  {
    id: 'T04',
    title: 'Cross-tenant read of savedEquipment is denied',
    actor: 'other_bob',
    operation: 'get',
    path: '/users/alice/savedEquipment/101',
    expected: 'DENY',
    rationale: 'Subcollection Master Gate enforces isOwner(userId) || isAdmin().',
  },
  {
    id: 'T05',
    title: 'Non-admin collection list on /users is denied',
    actor: 'owner_alice',
    operation: 'list',
    path: '/users',
    expected: 'DENY',
    rationale: 'Prevents bulk PII email enumeration.',
  },
  {
    id: 'T06',
    title: 'Field pollution with undeclared keys is denied',
    actor: 'owner_alice',
    operation: 'create',
    path: '/users/alice/savedEquipment/101',
    expected: 'DENY',
    rationale: 'hasOnly() rejects extra fields like adminOverride.',
  },
  {
    id: 'T07',
    title: 'ChatMessage mutation on update is denied',
    actor: 'owner_alice',
    operation: 'update',
    path: '/users/alice/chatSessions/s1/messages/m1',
    expected: 'DENY',
    rationale: 'Messages are immutable audit records (allow update: if false).',
  },
  {
    id: 'T08',
    title: 'Oversized SiteNote (>1500 chars) is denied',
    actor: 'owner_alice',
    operation: 'create',
    path: '/users/alice/siteNotes/n1',
    expected: 'DENY',
    rationale: 'DoS prevention enforces .size() <= 1500.',
  },
  {
    id: 'T09',
    title: 'Owner can bookmark equipment when user profile exists',
    actor: 'owner_alice',
    operation: 'create',
    path: '/users/alice/savedEquipment/101',
    expected: 'ALLOW',
    rationale: 'Valid payload with userExists(alice) and savedAt == request.time succeeds.',
  },
  {
    id: 'T10',
    title: 'Admin can inspect user profiles for moderation',
    actor: 'admin',
    operation: 'list',
    path: '/users',
    expected: 'ALLOW',
    rationale: 'Bootstrapped verified admin or /admins/{uid} member has oversight access.',
  },
];
