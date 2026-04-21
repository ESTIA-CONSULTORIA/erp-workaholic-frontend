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
  setActiveCompany: (companyId: string) => void;
  setActivePeriod: (period: string) => void;
  logout: () => void;
}

export const useERPStore = create<ERPState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeCompany: null,
      activePeriod: new Date().toISOString().slice(0, 7),

      setUser: (user, token = null) => {
        set({ user, token });
        // Si hay un usuario y tiene empresas, seleccionar la primera por defecto
        if (user && user.companies.length > 0 && !get().activeCompany) {
          const firstCompany = user.companies[0];
          set({
            activeCompany: {
              companyId: firstCompany.companyId,
              companyCode: firstCompany.companyCode,
              companyName: firstCompany.companyName,
              color: firstCompany.color || '#3b82f6',
              roleCode: firstCompany.roleCode,
              permissions: firstCompany.permissions || [],
            },
          });
        }
      },

      setActiveCompany: (companyId: string) => {
        const { user } = get();
        const company = user?.companies?.find((c) => c.companyId === companyId);
        if (company) {
          set({
            activeCompany: {
              companyId: company.companyId,
              companyCode: company.companyCode,
              companyName: company.companyName,
              color: company.color || '#3b82f6',
              roleCode: company.roleCode,
              permissions: company.permissions || [],
            },
          });
        }
      },

      setActivePeriod: (period: string) => set({ activePeriod: period }),

      logout: () => set({ user: null, token: null, activeCompany: null }),
    }),
    {
      name: 'erp-store',
      // Opcional: puedes definir qué partes del estado persistir
      // partialize: (state) => ({ user: state.user, token: state.token, activePeriod: state.activePeriod }),
    }
  )
);
