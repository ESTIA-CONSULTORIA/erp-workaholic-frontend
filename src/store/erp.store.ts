import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserCompany {
  companyId: string;
  companyCode: string;
  companyName: string;
  color?: string;
  roleCode: string;
  permissions: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  companies: UserCompany[];
}

interface ActiveCompany {
  companyId: string;
  companyCode: string;
  companyName: string;
  color: string;
  roleCode: string;
  permissions: string[];
}

interface ERPState {
  user: User | null;
  token: string | null;
  activeCompany: ActiveCompany | null;
  activePeriod: string;
  setUser: (user: User | null, token?: string | null) => void;
  setAuth: (user: User | null, token?: string | null) => void;
  setActiveCompany: (companyId: string) => void;
  setActivePeriod: (period: string) => void;
  logout: () => void;
}

const DEFAULT_COMPANY_COLOR = '#3b82f6';

function syncToken(token?: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem('erp_token', token);
  } else {
    window.localStorage.removeItem('erp_token');
  }
}

function toActiveCompany(company: UserCompany): ActiveCompany {
  return {
    companyId: company.companyId,
    companyCode: company.companyCode,
    companyName: company.companyName,
    color: company.color || DEFAULT_COMPANY_COLOR,
    roleCode: company.roleCode,
    permissions: company.permissions || [],
  };
}

export const useERPStore = create<ERPState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeCompany: null,
      activePeriod: new Date().toISOString().slice(0, 7),

      setUser: (user, token = null) => {
        syncToken(token);

        if (!user) {
          set({ user: null, token: null, activeCompany: null });
          return;
        }

        const currentActiveCompany = get().activeCompany;
        const matchingCompany = user.companies.find(
          (company) => company.companyId === currentActiveCompany?.companyId
        );

        set({
          user,
          token,
          activeCompany: matchingCompany
            ? toActiveCompany(matchingCompany)
            : user.companies.length > 0
              ? toActiveCompany(user.companies[0])
              : null,
        });
      },

      setAuth: (user, token = null) => {
        get().setUser(user, token);
      },

      setActiveCompany: (companyId: string) => {
        const { user } = get();
        const company = user?.companies?.find((c) => c.companyId === companyId);
        if (company) {
          set({ activeCompany: toActiveCompany(company) });
        }
      },

      setActivePeriod: (period: string) => set({ activePeriod: period }),

      logout: () => {
        syncToken(null);
        set({ user: null, token: null, activeCompany: null });
      },
    }),
    {
      name: 'erp-store',
    }
  )
);
