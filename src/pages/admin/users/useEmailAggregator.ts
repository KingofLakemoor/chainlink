import { useMemo } from 'react';

export interface EmailRecord {
  email: string;
  rawEmail: string;
  name: string;
  level: string | null;
  sources: string[];
}

export interface PlayerSourceItem {
  email?: string;
  userEmail?: string;
  name?: string;
  displayName?: string;
  username?: string;
  level?: string | null;
  role?: string;
  premiumTier?: string;
  [key: string]: any;
}

export interface OrderSourceItem {
  customer_email?: string;
  userEmail?: string;
  email?: string;
  customer_name?: string;
  name?: string;
  shippingInfo?: { name?: string; [key: string]: any };
  [key: string]: any;
}

export interface CoordinatorSourceItem {
  email?: string;
  userEmail?: string;
  name?: string;
  displayName?: string;
  username?: string;
  level?: string | null;
  role?: string;
  [key: string]: any;
}

export interface EmailAggregatorInput {
  players?: PlayerSourceItem[];
  orders?: OrderSourceItem[];
  coordinators?: CoordinatorSourceItem[];
}

export function useEmailAggregator({ players, orders, coordinators }: EmailAggregatorInput): EmailRecord[] {
  return useMemo(() => {
    const map = new Map<string, EmailRecord>();

    // Helper to register or merge email record
    const addEmail = (
      rawEmail: string | undefined | null,
      name: string | undefined | null,
      level: string | undefined | null,
      sourceTag: string
    ) => {
      if (!rawEmail || typeof rawEmail !== 'string') return;
      const cleanEmail = rawEmail.trim().toLowerCase();
      if (!cleanEmail.includes('@')) return; // Basic validation

      const trimmedName = name && typeof name === 'string' && name.trim() ? name.trim() : 'N/A';
      const trimmedLevel = level && typeof level === 'string' && level.trim() ? level.trim() : null;

      if (!map.has(cleanEmail)) {
        map.set(cleanEmail, {
          email: cleanEmail,
          rawEmail: rawEmail.trim(),
          name: trimmedName,
          level: trimmedLevel,
          sources: [sourceTag],
        });
      } else {
        const existing = map.get(cleanEmail)!;
        if (!existing.sources.includes(sourceTag)) {
          existing.sources.push(sourceTag);
        }
        if (!existing.level && trimmedLevel) {
          existing.level = trimmedLevel;
        }
        if ((!existing.name || existing.name === 'N/A') && trimmedName !== 'N/A') {
          existing.name = trimmedName;
        }
      }
    };

    (players || []).forEach(p => {
      const pEmail = p.email || p.userEmail;
      const pName = p.name || p.displayName || p.username;
      const pLevel = p.level || p.premiumTier || p.role;
      addEmail(pEmail, pName, pLevel, 'Player');
    });

    (orders || []).forEach(o => {
      const oEmail = o.customer_email || o.userEmail || o.email;
      const oName = o.customer_name || o.shippingInfo?.name || o.name;
      addEmail(oEmail, oName, null, 'Commerce');
    });

    (coordinators || []).forEach(c => {
      const cEmail = c.email || c.userEmail;
      const cName = c.name || c.displayName || c.username;
      const cLevel = c.level || c.role;
      addEmail(cEmail, cName, cLevel, 'Coordinator');
    });

    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [players, orders, coordinators]);
}
