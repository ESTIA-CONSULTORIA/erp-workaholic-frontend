import React, { useState, useEffect } from 'react';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const ROLES = [
  { code: 'admin', name: 'Administrador' },
  { code: 'gerente', name: 'Gerente' },
  { code: 'contador', name: 'Contador' },
  { code: 'cajero', name: 'Cajero' },
  { code: 'rh', name: 'Recursos Humanos' },
  { code: 'director', name: 'Director' },
];

const MODULOS = [
  { key: 'catalogos', label: 'Catálogos' },
  { key: 'operaciones', label: 'Operaciones' },
  { key: 'almacen', label: 'Almacén' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'reportes', label: 'Reportes' },
];

const ACCIONES = [
  { key: 'ver', label: 'Ver', color: 'bg-blue-500' },
  { key: 'crear', label: 'Crear', color: 'bg-green-500' },
  { key: 'editar', label: 'Editar', color: 'bg-yellow-500' },
  { key: 'eliminar', label: 'Eliminar', color: 'bg-red-500' },
  { key: 'aprobar', label: 'Aprobar', color: 'bg-purple-500' },
  { key: 'exportar', label: 'Exportar', color: 'bg-cyan-500' },
];

// ⚠️ CAMBIA ESTO POR UN COMPANY ID REAL DE TU BD
const DEFAULT_COMPANY_ID = 'cmnduf82h0002j266uep007dr';

// ============================================================
// COMPONENTE
// ============================================================
const Permisos: React.FC = () => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState(DEFAULT_COMPANY_ID);
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    fetch(`https://erp-grupo-workaholic-production.up.railway.app/api/permissions?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => {
        setPermissions(data);
        const modified = new Set<string>();
        data.forEach((perm: any) => {
          if (!perm.allowed) {
            modified.add(`${perm.roleCode}|${perm.module}|${perm.action}`);
          }
        });
        setModifiedCells(modified);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando permisos:', err);
        setLoading(false);
      });
  }, [companyId]);

  const getPermissionValue = (role: string, module: string, action: string) => {
    const perm = permissions.find(p => p.roleCode === role && p.module === module && p.action === action);
    return perm?.allowed ?? true;
  };

  const isModified = (role: string, module: string, action: string) => {
    return modifiedCells.has(`${role}|${module}|${action}`);
  };

  const togglePermission = async (role: string, module: string, action: string, current: boolean) => {
    const key = `${role}|${module}|${action}`;
    setSaving(key);
    const newValue = !current;
    try {
      const res = await fetch(`https://erp-grupo-workaholic-production.up.railway.app/api/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCode: role, module, action, allowed: newValue, companyId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPermissions(prev => [
          ...prev.filter(p => !(p.roleCode === role && p.module === module && p.action === action)),
          updated,
        ]);
        setModifiedCells(prev => {
          const newSet = new Set(prev);
          if (!newValue) {
            newSet.add(key);
          } else {
            newSet.delete(key);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setSaving(null);
    }
  };

  const restoreDefaults = async (role: string) => {
    if (!confirm(`¿Restaurar todos los permisos del rol ${role} a sus valores por defecto?`)) return;
    setSaving(`role-${role}`);
    try {
      for (const mod of MODULOS) {
        for (const acc of ACCIONES) {
          await fetch(`https://erp-grupo-workaholic-production.up.railway.app/api/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleCode: role, module: mod.key, action: acc.key, allowed: true, companyId }),
          });
        }
      }
      const res = await fetch(`https://erp-grupo-workaholic-production.up.railway.app/api/permissions?companyId=${companyId}`);
      const data = await res.json();
      setPermissions(data);
      setModifiedCells(new Set());
    } catch (error) {
      console.error('Error al restaurar:', error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Cargando configuración de permisos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Gestión de Permisos por Rol</h1>
        <div className="mt-2 flex items-center gap-4">
          <input
            type="text"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Company ID"
            className="border px-3 py-1 rounded text-sm"
          />
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >
            Recargar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Módulo / Acción</th>
              {ROLES.map(role => (
                <th key={role.code} className="p-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    <button
                      onClick={() => restoreDefaults(role.code)}
                      disabled={saving === `role-${role.code}`}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Restaurar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(mod =>
              ACCIONES.map(acc => (
                <tr key={`${mod.key}-${acc.key}`} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <span className="font-medium">{mod.label}</span>
                    <span className={`ml-2 text-sm text-${acc.color.replace('bg-', '')}-600`}>({acc.label})</span>
                  </td>
                  {ROLES.map(role => {
                    const val = getPermissionValue(role.code, mod.key, acc.key);
                    const modified = isModified(role.code, mod.key, acc.key);
                    const isSaving = saving === `${role.code}|${mod.key}|${acc.key}`;
                    return (
                      <td key={role.code} className="p-3 text-center">
                        <div className="flex flex-col items-center">
                          <button
                            onClick={() => togglePermission(role.code, mod.key, acc.key, val)}
                            disabled={isSaving}
                            className={`w-8 h-8 rounded-md text-white flex items-center justify-center transition-all ${
                              val ? acc.color : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''} ${
                              modified ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
                            }`}
                          >
                            {val ? '✓' : '✗'}
                          </button>
                          {modified && (
                            <span className="text-[10px] text-yellow-600 font-medium mt-0.5">
                              Modificado
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Permisos;
