// src/store/erp.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompanyAccess {
  companyId:   string;
  companyCode: string;
  companyName: string;
  color:       string;
  roleCode:    string;
  permissions: string[];
}

interface User {
  id: string; email: string; name: string;
  companies: CompanyAccess[];
}

interface ERPStore {
  user: User | null; token: string | null;
  activeCompany: CompanyAccess | null;
  activePeriod:  string;
  setAuth: (user: User, token: string) => void;
  logout:  () => void;
  setActiveCompany: (c: CompanyAccess) => void;
  setActivePeriod:  (p: string) => void;
  isAdmin: () => boolean;
}

export const useERPStore = create<ERPStore>()(
  persist(
    (set, get) => ({
      user: null, token: null, activeCompany: null,
      activePeriod: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      })(),
      setAuth: (user, token) => {
        localStorage.setItem('erp_token', token);
        set({ user, token, activeCompany: user.companies[0] || null });
      },
      logout: () => {
        localStorage.removeItem('erp_token');
        set({ user: null, token: null, activeCompany: null });
        window.location.href = '/login';
      },
      setActiveCompany: (c) => set({ activeCompany: c }),
      setActivePeriod:  (p) => set({ activePeriod: p }),
      isAdmin: () => get().activeCompany?.roleCode === 'admin',
    }),
    {
      name: 'erp-store',
      partialize: s => ({ user:s.user, token:s.token, activeCompany:s.activeCompany, activePeriod:s.activePeriod }),
    }
  )
);
