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
      setActiveCompany: (companyId: string) => {
  const { user } = get();
  const company = user?.companies?.find(c => c.companyId === companyId);
  if (company) {
    set({
      activeCompany: {
        companyId: company.companyId,
        companyCode: company.companyCode,
        companyName: company.companyName,
        color: company.color || '#3b82f6',
        roleCode: company.roleCode,   // <-- AGREGAR ESTA LÍNEA
        permissions: company.permissions || [],
      }
    });
  }
}
