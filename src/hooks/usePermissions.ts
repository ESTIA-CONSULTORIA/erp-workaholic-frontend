import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const DEFAULTS: Record<string, Record<string, string[]>> = {
  admin:         { pos:['ver','crear'], gastos:['ver','crear','editar','eliminar','aprobar','exportar'], cxc:['ver','crear','editar','eliminar','exportar'], cxp:['ver','crear','editar','eliminar','exportar'], inventario:['ver','crear','editar','eliminar','exportar'], compras:['ver','crear','editar','eliminar','exportar'], produccion:['ver','crear','editar','eliminar'], catalogo:['ver','crear','editar','eliminar'], oc:['ver','crear','editar','eliminar'], rh:['ver','crear','editar','eliminar','aprobar','exportar'], reportes:['ver','exportar'], admin:['ver','crear','editar','eliminar'], corte:['ver','crear','editar','aprobar'], membresias:['ver','crear','editar','eliminar'], servicios:['ver','crear','editar','eliminar'], comisiones:['ver','editar','aprobar'], documentos:['ver','crear','editar'] },
  administrador: { pos:['ver','crear'], gastos:['ver','crear','editar','aprobar','exportar'], cxc:['ver','crear','editar','exportar'], cxp:['ver','crear','editar','exportar'], inventario:['ver','crear','editar','exportar'], compras:['ver','crear','editar','exportar'], produccion:['ver','crear','editar'], catalogo:['ver','crear','editar'], oc:['ver','crear','editar'], rh:['ver','crear','editar','aprobar','exportar'], reportes:['ver','exportar'], admin:['ver','crear','editar'], corte:['ver','aprobar'], membresias:['ver','crear','editar'], servicios:['ver','crear','editar'], comisiones:['ver','aprobar'], documentos:['ver','crear'] },
  gerente:       { pos:['ver','crear'], gastos:['ver','crear','exportar'], cxc:['ver','exportar'], cxp:['ver','exportar'], inventario:['ver','exportar'], compras:['ver','crear','exportar'], produccion:['ver','crear'], catalogo:['ver'], oc:['ver','crear'], rh:['ver','aprobar'], reportes:['ver','exportar'], corte:['ver','aprobar'], membresias:['ver','crear'], servicios:['ver'], comisiones:['ver','aprobar'], documentos:['ver'] },
  contador:      { gastos:['ver','crear','editar','exportar'], cxc:['ver','crear','editar','exportar'], cxp:['ver','crear','editar','exportar'], inventario:['ver','exportar'], compras:['ver','crear','exportar'], reportes:['ver','exportar'], corte:['ver','aprobar'], oc:['ver','exportar'], documentos:['ver'] },
  cajero:        { pos:['ver','crear'], gastos:['ver','crear'], corte:['ver','crear'], oc:['ver'], membresias:['ver','crear'], documentos:['ver'] },
  rh:            { rh:['ver','crear','editar','aprobar','exportar'], reportes:['ver'], comisiones:['ver','aprobar'], documentos:['ver','crear'] },
  director:      { gastos:['ver','exportar'], cxc:['ver','exportar'], cxp:['ver','exportar'], reportes:['ver','exportar'], rh:['ver'], membresias:['ver'], comisiones:['ver'], documentos:['ver'] },
};

export function usePermissions() {
  const { activeCompany } = useERPStore();
  const cid  = activeCompany?.companyId;
  const role = activeCompany?.roleCode || 'cajero';

  const { data: dbPerms } = useQuery({
    queryKey: ['permissions-role', role, cid],
    queryFn:  () => api.get(`/permissions/roles/${role}?companyId=${cid}`).then(r => r.data),
    enabled:  !!cid,
    staleTime: 5 * 60 * 1000,
  });

  const can = (module: string, action: string): boolean => {
    if (role === 'admin' || role === 'administrador') return true;
    if (dbPerms && typeof dbPerms === 'object') {
      const mp = (dbPerms as Record<string,string[]>)[module];
      if (mp) return mp.includes(action);
    }
    return (DEFAULTS[role]?.[module] || []).includes(action);
  };

  return { can, role };
}
