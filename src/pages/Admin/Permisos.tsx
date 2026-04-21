import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../store/erp.store';
import { api } from '../../lib/api';

// ============================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================

interface PermissionItem {
  module: string;
  action: string;
  label: string;
}

interface ModuleGroup {
  name: string;
  items: PermissionItem[];
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: 'OPERACIONES',
    items: [
      { module: 'pos', action: 'ver', label: 'Ver POS' },
      { module: 'pos', action: 'crear', label: 'Cobrar/Venta' },
      { module: 'corte', action: 'ver', label: 'Ver corte' },
      { module: 'corte', action: 'crear', label: 'Crear corte' },
      { module: 'corte', action: 'aprobar', label: 'Validar corte' },
      { module: 'oc', action: 'ver', label: 'Ver OC' },
      { module: 'oc', action: 'crear', label: 'Crear OC' },
    ],
  },
  {
    name: 'CATÁLOGOS',
    items: [
      { module: 'catalogo', action: 'ver', label: 'Ver catálogo' },
      { module: 'catalogo', action: 'crear', label: 'Crear productos' },
      { module: 'catalogo', action: 'editar', label: 'Editar productos' },
      { module: 'catalogo', action: 'eliminar', label: 'Eliminar productos' },
      { module: 'inventario', action: 'ver', label: 'Ver inventario' },
      { module: 'inventario', action: 'editar', label: 'Ajustar stock' },
    ],
  },
  {
    name: 'COMPRAS',
    items: [
      { module: 'compras', action: 'ver', label: 'Ver compras' },
      { module: 'compras', action: 'crear', label: 'Nueva compra' },
      { module: 'compras', action: 'eliminar', label: 'Cancelar compra' },
      { module: 'compras', action: 'exportar', label: 'Exportar compras' },
    ],
  },
  {
    name: 'FINANZAS',
    items: [
      { module: 'gastos', action: 'ver', label: 'Ver gastos' },
      { module: 'gastos', action: 'crear', label: 'Nuevo gasto' },
      { module: 'gastos', action: 'aprobar', label: 'Aprobar gasto' },
      { module: 'cxc', action: 'ver', label: 'Ver CxC' },
      { module: 'cxc', action: 'crear', label: 'Nueva CxC' },
      { module: 'cxp', action: 'ver', label: 'Ver CxP' },
      { module: 'cxp', action: 'crear', label: 'Nueva CxP' },
      { module: 'cxp', action: 'editar', label: 'Abonar CxP' },
    ],
  },
  {
    name: 'REPORTES',
    items: [
      { module: 'reportes', action: 'ver', label: 'Ver ER/Flujo' },
      { module: 'reportes', action: 'exportar', label: 'Exportar reportes' },
      { module: 'gastos', action: 'exportar', label: 'Exportar gastos' },
      { module: 'cxc', action: 'exportar', label: 'Exportar CxC' },
    ],
  },
  {
    name: 'RH',
    items: [
      { module: 'rh', action: 'ver', label: 'Ver empleados' },
      { module: 'rh', action: 'crear', label: 'Nuevo empleado' },
      { module: 'rh', action: 'editar', label: 'Editar empleado' },
      { module: 'rh', action: 'aprobar', label: 'Aprobar permisos' },
      { module: 'rh', action: 'exportar', label: 'Exportar RH' },
    ],
  },
  {
    name: 'PALESTRA',
    items: [
      { module: 'membresias', action: 'ver', label: 'Ver membresías' },
      { module: 'membresias', action: 'crear', label: 'Nueva membresía' },
      { module: 'membresias', action: 'editar', label: 'Editar membresía' },
      { module: 'servicios', action: 'ver', label: 'Ver servicios' },
      { module: 'servicios', action: 'crear', label: 'Crear servicio' },
      { module: 'comisiones', action: 'ver', label: 'Ver comisiones' },
      { module: 'comisiones', action: 'aprobar', label: 'Liberar comisiones' },
    ],
  },
  {
    name: 'ADMINISTRACIÓN',
    items: [
      { module: 'admin', action: 'ver', label: 'Ver usuarios' },
      { module: 'admin', action: 'crear', label: 'Crear usuario' },
      { module: 'admin', action: 'editar', label: 'Editar usuario' },
      { module: 'documentos', action: 'ver', label: 'Ver documentos' },
      { module: 'documentos', action: 'crear', label: 'Subir documento' },
    ],
  },
];

const ROLES = ['admin', 'gerente', 'contador', 'cajero', 'rh', 'director'];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const PermisosPage: React.FC = () => {
  const { activeCompany } = useERPStore();
  const companyId = activeCompany?.companyId;
  const [permissions, setPermissions] = useState<Record<string, Record<string, Set<string>>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Cargar permisos desde el backend
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api
      .get(`/permissions/all?companyId=${companyId}`)
      .then((res) => {
        const data = res.data;
        const permMap: Record<string, Record<string, Set<string>>> = {};
        Object.entries(data).forEach(([role, modules]: [string, any]) => {
          permMap[role] = {};
          Object.entries(modules).forEach(([mod, actions]: [string, any]) => {
            permMap[role][mod] = new Set(actions);
          });
        });
        setPermissions(permMap);
      })
      .catch((err) => console.error('Error cargando permisos:', err))
      .finally(() => setLoading(false));
  }, [companyId]);

  // Verificar si un permiso está activo
  const hasPermission = (role: string, module: string, action: string): boolean => {
    return permissions[role]?.[module]?.has(action) ?? false;
  };

  // Alternar permiso
  const togglePermission = async (role: string, module: string, action: string, currentValue: boolean) => {
    if (!companyId) return;
    const key = `${role}-${module}-${action}`;
    setSaving(key);
    const newValue = !currentValue;
    try {
      await api.put(`/permissions/roles/${role}/modules/${module}/actions/${action}`, {
        allowed: newValue,
        companyId,
      });
      setPermissions((prev) => {
        const newPerms = { ...prev };
        if (!newPerms[role]) newPerms[role] = {};
        if (!newPerms[role][module]) newPerms[role][module] = new Set();
        if (newValue) {
          newPerms[role][module].add(action);
        } else {
          newPerms[role][module].delete(action);
        }
        return newPerms;
      });
    } catch (error) {
      console.error('Error al guardar permiso:', error);
      alert('No se pudo guardar el cambio.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Cargando permisos...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Permisos — {activeCompany?.companyName}</h1>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="min-w-full bg-bg-secondary">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="p-3 text-left text-text-muted text-sm font-medium">Módulo / Acción</th>
              {ROLES.map((role) => (
                <th key={role} className="p-3 text-center text-text-muted text-sm font-medium capitalize">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_GROUPS.map((group) => (
              <React.Fragment key={group.name}>
                <tr className="bg-bg-tertiary/30">
                  <td colSpan={ROLES.length + 1} className="p-3 font-semibold text-text">
                    {group.name}
                  </td>
                </tr>
                {group.items.map((item) => (
                  <tr key={`${item.module}-${item.action}`} className="border-t border-border hover:bg-bg-tertiary/20">
                    <td className="p-3 pl-6 text-text-muted">{item.label}</td>
                    {ROLES.map((role) => {
                      const checked = hasPermission(role, item.module, item.action);
                      const isSaving = saving === `${role}-${item.module}-${item.action}`;
                      return (
                        <td key={role} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSaving}
                            onChange={() => togglePermission(role, item.module, item.action, checked)}
                            className="w-4 h-4 text-brand-machete bg-bg border-border rounded focus:ring-2 focus:ring-brand-machete cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermisosPage;
