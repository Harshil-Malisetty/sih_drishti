import type { Role } from '../types';

type WorkspaceRole = Exclude<Role, 'landing'>;
const key = 'drishti-demo-session';

export function savedRole(): WorkspaceRole | null {
  try {
    const value = localStorage.getItem(key);
    return value === 'police' || value === 'municipal' || value === 'citizen' ? value : null;
  } catch {
    // Private/restricted browsers can deny storage. React state still works.
    return null;
  }
}

export function persistRole(role: WorkspaceRole | null): void {
  try {
    if (role) localStorage.setItem(key, role);
    else localStorage.removeItem(key);
  } catch {
    // Role persistence is optional, never a prerequisite for demo access.
  }
}