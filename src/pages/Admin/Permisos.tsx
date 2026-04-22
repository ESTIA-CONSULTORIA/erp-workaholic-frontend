import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Pencil, Plus, RefreshCcw, Save, Search, Shield, Trash2 } from 'lucide-react';
import { useERPStore } from '../../store/erp.store';
import { api } from '../../lib/api';

interface PermissionItem {
  module: string;
  action: string;
  label: string;
}

interface ModuleGroup {
  name: string;
  icon: string;
  items: PermissionItem[];
}

const ROLE_LIST = [
  { code: 'admin', label: 'ADMINISTRADOR', note: 'Acceso operativo total al ERP.' },
  { code: 'administrador', label: 'GERENTE GENERAL', note: 'Control general multiempresa y autorizaciones.' },
  { code: 'gerente', label: 'GERENTE', note: 'Operación diaria, supervisión y validaciones.' },
  { code: 'contador', label: 'CONTADOR', note: 'Control financiero y conciliaciones.' },
  { code: 'cajero', label: 'CAJERO', note: 'Caja, POS y captura operativa.' },
  { code: 'rh', label: 'RH', note: 'Expedientes, nómina e incidencias.' },
  { code: 'director', label: 'DIRECTOR', note: 'Consulta ejecutiva y reportes.' },
];

const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: 'Catálogos',
    icon: '▣',
    items: [
      { module: 'catalogo', action: 'productos', label: 'Productos y servicios' },
      { module: 'catalogo', action: 'clientes', label: 'Clientes' },
      { module: 'catalogo', action: 'proveedores', label: 'Proveedores' },
      { module: 'catalogo', action: 'unidades', label: 'Unidades y presentaciones' },
      { module: 'catalogo', action: 'marcas', label: 'Marcas y categorías' },
      { module: 'catalogo', action: 'sucursales', label: 'Sucursales' },
      { module: 'catalogo', action: 'almacenes', label: 'Almacenes' },
      { module: 'catalogo', action: 'precios', label: 'Listas de precios' },
    ],
  },
  {
    name: 'Operaciones',
    icon: '◫',
    items: [
      { module: 'corte', action: 'apertura', label: 'Apertura y cierre de turno' },
      { module: 'corte', action: 'cortes', label: 'Cortes de caja' },
      { module: 'inventario', action: 'traspasos', label: 'Traspasos entre almacenes' },
      { module: 'inventario', action: 'ajustes', label: 'Ajustes de inventario' },
      { module: 'pos', action: 'devoluciones', label: 'Devoluciones' },
      { module: 'documentos', action: 'facturacion_global', label: 'Facturación global' },
      { module: 'comisiones', action: 'ver', label: 'Comisiones' },
      { module: 'bitacora', action: 'operaciones', label: 'Bitácora de operaciones' },
    ],
  },
  {
    name: 'Inventario y Almacén',
    icon: '◩',
    items: [
      { module: 'inventario', action: 'movimientos', label: 'Movimientos de almacén' },
      { module: 'inventario', action: 'recepciones', label: 'Recepciones' },
      { module: 'inventario', action: 'salidas', label: 'Salidas y embarques' },
      { module: 'inventario', action: 'inventario_fisico', label: 'Inventario físico' },
      { module: 'inventario', action: 'ajustes_costo', label: 'Ajustes de costo' },
      { module: 'inventario', action: 'kardex', label: 'Kardex y existencias' },
      { module: 'inventario', action: 'lotes_series', label: 'Lotes y series' },
      { module: 'inventario', action: 'alertas', label: 'Alertas de inventario' },
    ],
  },
  {
    name: 'Compras',
    icon: '◪',
    items: [
      { module: 'oc', action: 'crear', label: 'Órdenes de compra' },
      { module: 'compras', action: 'recepciones', label: 'Recepciones' },
      { module: 'compras', action: 'devoluciones_proveedor', label: 'Devoluciones a proveedor' },
      { module: 'compras', action: 'facturas_proveedor', label: 'Facturas de proveedor' },
      { module: 'compras', action: 'notas_credito', label: 'Notas de crédito' },
      { module: 'compras', action: 'gastos_importacion', label: 'Gastos de importación' },
      { module: 'compras', action: 'control_gastos', label: 'Control de gastos' },
      { module: 'compras', action: 'evaluacion_proveedores', label: 'Evaluación de proveedores' },
    ],
  },
  {
    name: 'Ventas y POS',
    icon: '◧',
    items: [
      { module: 'pos', action: 'cotizaciones', label: 'Cotizaciones' },
      { module: 'pos', action: 'pedidos', label: 'Pedidos' },
      { module: 'pos', action: 'ventas', label: 'Ventas' },
      { module: 'pos', action: 'devoluciones_venta', label: 'Devoluciones de venta' },
      { module: 'documentos', action: 'facturacion', label: 'Facturación' },
      { module: 'documentos', action: 'notas_credito', label: 'Notas de crédito' },
      { module: 'corte', action: 'caja_pos', label: 'Cortes de caja POS' },
      { module: 'pos', action: 'descuentos', label: 'Descuentos y promociones' },
    ],
  },
  {
    name: 'Finanzas y Contabilidad',
    icon: '◭',
    items: [
      { module: 'gastos', action: 'plan_cuentas', label: 'Plan de cuentas' },
      { module: 'gastos', action: 'polizas', label: 'Pólizas contables' },
      { module: 'conciliacion', action: 'bancos', label: 'Bancos y cuentas' },
      { module: 'conciliacion', action: 'ver', label: 'Conciliaciones bancarias' },
      { module: 'reportes', action: 'presupuestos', label: 'Presupuestos' },
      { module: 'reportes', action: 'cierre_contable', label: 'Cierre contable' },
      { module: 'reportes', action: 'estados_financieros', label: 'Estados financieros' },
      { module: 'reportes', action: 'consolidado', label: 'Consolidado' },
    ],
  },
  {
    name: 'CxC',
    icon: '◬',
    items: [
      { module: 'cxc', action: 'ver', label: 'Cuentas por cobrar' },
      { module: 'cxc', action: 'aplicaciones', label: 'Aplicaciones de cobro' },
      { module: 'cxc', action: 'notas_credito', label: 'Notas de crédito' },
      { module: 'cxc', action: 'estados_cuenta', label: 'Estados de cuenta' },
      { module: 'cxc', action: 'antiguedad', label: 'Antigüedad de saldos' },
      { module: 'cxc', action: 'recordatorios', label: 'Recordatorios de pago' },
      { module: 'cxc', action: 'cobranza', label: 'Cobranza' },
    ],
  },
  {
    name: 'CxP',
    icon: '◨',
    items: [
      { module: 'cxp', action: 'ver', label: 'Cuentas por pagar' },
      { module: 'cxp', action: 'pagos_proveedores', label: 'Pagos a proveedores' },
      { module: 'cxp', action: 'notas_credito', label: 'Notas de crédito' },
      { module: 'cxp', action: 'programacion', label: 'Programación de pagos' },
      { module: 'cxp', action: 'estados_cuenta', label: 'Estados de cuenta' },
      { module: 'cxp', action: 'antiguedad', label: 'Antigüedad de saldos' },
      { module: 'cxp', action: 'gastos_pagar', label: 'Gastos por pagar' },
    ],
  },
  {
    name: 'RH y Nómina',
    icon: '◰',
    items: [
      { module: 'rh', action: 'empleados', label: 'Empleados' },
      { module: 'rh', action: 'expedientes', label: 'Expedientes' },
      { module: 'rh', action: 'puestos', label: 'Puestos y departamentos' },
      { module: 'rh', action: 'asistencia', label: 'Asistencia y horarios' },
      { module: 'nomina', action: 'prenomina', label: 'Prenómina' },
      { module: 'nomina', action: 'ver', label: 'Nómina' },
      { module: 'nomina', action: 'recibos', label: 'Recibos de nómina' },
      { module: 'rh', action: 'incidencias', label: 'Incidencias' },
    ],
  },
  {
    name: 'Palestra',
    icon: '◱',
    items: [
      { module: 'membresias', action: 'planes', label: 'Membresías y planes' },
      { module: 'membresias', action: 'socios', label: 'Clientes / Socios' },
      { module: 'servicios', action: 'canchas', label: 'Canchas y áreas' },
      { module: 'servicios', action: 'clases', label: 'Clases y horarios' },
      { module: 'servicios', action: 'reservaciones', label: 'Reservaciones' },
      { module: 'servicios', action: 'checkins', label: 'Check-ins' },
      { module: 'membresias', action: 'cobros_renovaciones', label: 'Cobros y renovaciones' },
      { module: 'reportes', action: 'reportes_deportivos', label: 'Reportes deportivos' },
    ],
  },
  {
    name: 'Administración',
    icon: '◲',
    items: [
      { module: 'admin', action: 'parametros', label: 'Parámetros del sistema' },
      { module: 'admin', action: 'sucursales', label: 'Sucursales' },
      { module: 'admin', action: 'impuestos', label: 'Impuestos' },
      { module: 'documentos', action: 'plantillas', label: 'Plantillas de documentos' },
      { module: 'documentos', action: 'numeraciones', label: 'Numeraciones' },
      { module: 'admin', action: 'backups', label: 'Backups' },
      { module: 'admin', action: 'integraciones', label: 'Integraciones y API' },
    ],
  },
  {
    name: 'Seguridad',
    icon: '◳',
    items: [
      { module: 'admin', action: 'usuarios', label: 'Usuarios' },
      { module: 'admin', action: 'roles', label: 'Roles y perfiles' },
      { module: 'admin', action: 'permisos_modulo', label: 'Permisos por módulo' },
      { module: 'admin', action: 'permisos_usuario', label: 'Permisos por usuario' },
      { module: 'seguridad', action: 'politicas_password', label: 'Políticas de contraseñas' },
      { module: 'seguridad', action: 'dos_pasos', label: 'Autenticación en 2 pasos' },
      { module: 'seguridad', action: 'bloqueo_sesiones', label: 'Bloqueo de sesiones' },
      { module: 'seguridad', action: 'historial_login', label: 'Historial de inicios de sesión' },
    ],
  },
  {
    name: 'Auditoría / Bitácora',
    icon: '◴',
    items: [
      { module: 'bitacora', action: 'cambios', label: 'Bitácora de cambios' },
      { module: 'bitacora', action: 'accesos', label: 'Bitácora de accesos' },
      { module: 'bitacora', action: 'operaciones', label: 'Bitácora de operaciones' },
      { module: 'bitacora', action: 'auditoria', label: 'Consultas y reportes de auditoría' },
      { module: 'bitacora', action: 'catalogos', label: 'Cambios en catálogos' },
      { module: 'bitacora', action: 'documentos', label: 'Cambios en documentos' },
      { module: 'bitacora', action: 'exportar', label: 'Exportar bitácora' },
    ],
  },
];

const SECURITY_EVENTS: PermissionItem[] = [
  { module: 'seguridad', action: 'login', label: 'Inicios de sesión' },
  { module: 'seguridad', action: 'password', label: 'Cambios de contraseña' },
  { module: 'admin', action: 'crear_usuario', label: 'Creación de usuarios' },
  { module: 'admin', action: 'editar_usuario', label: 'Edición de usuarios' },
  { module: 'admin', action: 'eliminar_usuario', label: 'Eliminación de usuarios' },
  { module: 'admin', action: 'cambios_roles', label: 'Cambios de roles/permisos' },
  { module: 'bitacora', action: 'catalogos', label: 'Cambios en catálogos' },
  { module: 'documentos', action: 'crear', label: 'Creación de documentos' },
  { module: 'documentos', action: 'editar', label: 'Edición de documentos' },
  { module: 'documentos', action: 'eliminar', label: 'Eliminación de documentos' },
  { module: 'documentos', action: 'cancelar', label: 'Cancelación de documentos' },
  { module: 'documentos', action: 'imprimir', label: 'Impresión de documentos' },
  { module: 'reportes', action: 'exportar', label: 'Exportación de datos' },
  { module: 'inventario', action: 'movimientos', label: 'Movimientos de inventario' },
  { module: 'inventario', action: 'ajustes', label: 'Ajustes de inventario' },
  { module: 'catalogo', action: 'precios', label: 'Cambios en precios' },
  { module: 'corte', action: 'cierre', label: 'Cierres de caja' },
  { module: 'cxc', action: 'cobranza', label: 'Pagos y cobros' },
  { module: 'conciliacion', action: 'ver', label: 'Conciliaciones bancarias' },
];

const ACTION_PANEL: PermissionItem[] = [
  { module: 'global', action: 'incluir_propina', label: 'Incluir propina' },
  { module: 'global', action: 'incluir_impuestos', label: 'Incluir impuestos' },
  { module: 'global', action: 'ver_detalles', label: 'Ver detalles completos' },
];

const PAGE_BG = '#07090d';
const PANEL_BG = 'linear-gradient(180deg, rgba(12,14,18,0.96), rgba(8,10,14,0.92))';
const PANEL_ALT = 'linear-gradient(180deg, rgba(14,17,22,0.95), rgba(8,10,14,0.92))';
const GOLD = '#d6a56d';
const GOLD_SOFT = 'rgba(214,165,109,0.14)';
const BORDER = 'rgba(214,165,109,0.26)';

const PermisosPage: React.FC = () => {
  const { activeCompany } = useERPStore();
  const companyId = activeCompany?.companyId;
  const [permissions, setPermissions] = useState<Record<string, Record<string, Set<string>>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('admin');

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

  const currentRoleMeta = useMemo(
    () => ROLE_LIST.find((role) => role.code === selectedRole) || ROLE_LIST[0],
    [selectedRole]
  );

  const hasPermission = (role: string, module: string, action: string) => {
    return permissions[role]?.[module]?.has(action) ?? false;
  };

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
        const next = { ...prev };
        if (!next[role]) next[role] = {};
        if (!next[role][module]) next[role][module] = new Set();
        if (newValue) next[role][module].add(action);
        else next[role][module].delete(action);
        return next;
      });
    } catch (error) {
      console.error('Error al guardar permiso:', error);
      alert('No se pudo guardar el cambio.');
    } finally {
      setSaving(null);
    }
  };

  const renderCheckbox = (item: PermissionItem, compact = false) => {
    const checked = hasPermission(selectedRole, item.module, item.action);
    const isSaving = saving === `${selectedRole}-${item.module}-${item.action}`;

    return (
      <label
        key={`${item.module}-${item.action}`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          fontSize: compact ? 13 : 13.5,
          color: '#e2e8f0',
          lineHeight: 1.35,
          padding: compact ? '4px 0' : '5px 0',
          cursor: isSaving ? 'wait' : 'pointer',
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isSaving}
          onChange={() => togglePermission(selectedRole, item.module, item.action, checked)}
          style={{
            marginTop: 2,
            width: 15,
            height: 15,
            accentColor: GOLD,
            cursor: isSaving ? 'wait' : 'pointer',
          }}
        />
        <span>{item.label}</span>
      </label>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 28, color: '#94a3b8' }}>
        Cargando permisos...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100%',
        background: PAGE_BG,
        color: '#f8fafc',
        padding: 20,
        borderRadius: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ color: GOLD, fontSize: 28, lineHeight: 1 }}>—</div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Perfiles de usuario / Permisos</h1>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
            <section
              style={{
                background: PANEL_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 12px 36px rgba(0,0,0,0.24)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: GOLD, fontWeight: 700, fontSize: 17 }}>Perfiles</div>
                <button style={{ background: GOLD_SOFT, border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 10, width: 28, height: 28, cursor: 'pointer' }}>
                  <Plus size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {ROLE_LIST.map((role) => {
                  const selected = selectedRole === role.code;
                  return (
                    <button
                      key={role.code}
                      onClick={() => setSelectedRole(role.code)}
                      style={{
                        textAlign: 'left',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: selected ? `1px solid ${BORDER}` : '1px solid rgba(214,165,109,0.08)',
                        background: selected ? 'linear-gradient(90deg, rgba(214,165,109,0.22), rgba(214,165,109,0.08))' : 'rgba(255,255,255,0.02)',
                        color: selected ? '#fff7ed' : '#e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{role.label}</span>
                        <span style={{ color: selected ? '#f7d7ab' : GOLD }}>•</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 12 }}>{ROLE_LIST.length} perfiles</div>
            </section>

            <section
              style={{
                background: PANEL_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: 16,
                boxShadow: '0 12px 36px rgba(0,0,0,0.24)',
              }}
            >
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
                {[
                  { label: 'Nuevo', icon: Plus },
                  { label: 'Guardar', icon: Save },
                  { label: 'Editar', icon: Pencil },
                  { label: 'Buscar', icon: Search },
                  { label: 'Eliminar', icon: Trash2, color: '#ef4444' },
                  { label: 'Duplicar', icon: Copy },
                ].map(({ label, icon: Icon, color }) => (
                  <button
                    key={label}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: color || '#e2e8f0',
                      display: 'grid',
                      gap: 6,
                      justifyItems: 'center',
                      minWidth: 70,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ fontSize: 12.5 }}>{label}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12.5, color: '#d6a56d', marginBottom: 6 }}>Clave</div>
                  <div style={{ padding: '11px 12px', borderRadius: 12, background: '#151922', border: '1px solid rgba(214,165,109,0.16)', color: '#e2e8f0', fontWeight: 600 }}>
                    {currentRoleMeta.code.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, color: '#d6a56d', marginBottom: 6 }}>Descripción</div>
                  <div style={{ padding: '11px 12px', borderRadius: 12, background: '#151922', border: '1px solid rgba(214,165,109,0.16)', color: '#e2e8f0', fontWeight: 600 }}>
                    {currentRoleMeta.label} DEL SISTEMA
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12.5, color: '#d6a56d', marginBottom: 6 }}>Comentario</div>
                <div style={{ minHeight: 72, padding: '12px 14px', borderRadius: 14, background: '#151922', border: '1px solid rgba(214,165,109,0.16)', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {currentRoleMeta.note}
                </div>
              </div>
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {MODULE_GROUPS.map((group) => (
              <section
                key={group.name}
                style={{
                  background: PANEL_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: '12px 14px 14px',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: GOLD, fontSize: 18 }}>{group.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#f8fafc' }}>{group.name}</h3>
                </div>
                <div>{group.items.map((item) => renderCheckbox(item, true))}</div>
              </section>
            ))}
          </div>
        </div>

        <aside style={{ width: 300, display: 'grid', gap: 14 }}>
          <section
            style={{
              background: PANEL_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 16,
              boxShadow: '0 12px 36px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Shield size={18} color={GOLD} />
              <div style={{ fontWeight: 700, color: GOLD, fontSize: 17 }}>Eventos de seguridad</div>
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 10 }}>Solo se muestran las opciones aplicables al ERP.</div>
            <div>{SECURITY_EVENTS.map((item) => renderCheckbox(item, true))}</div>
          </section>

          <section
            style={{
              background: PANEL_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 16,
              boxShadow: '0 12px 36px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle size={18} color={GOLD} />
              <div style={{ fontWeight: 700, color: GOLD, fontSize: 17 }}>Acciones globales</div>
            </div>

            <div style={{ fontSize: 12.5, color: '#d6a56d', marginBottom: 8 }}>Filtros y configuración</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Máximo</div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#151922', border: '1px solid rgba(214,165,109,0.16)', color: '#e2e8f0' }}>0.00</div>
              </div>
              <div style={{ width: 108, alignSelf: 'end' }}>
                <button style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: GOLD_SOFT, border: `1px solid ${BORDER}`, color: '#f8fafc', cursor: 'pointer' }}>
                  Descuentos
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>{ACTION_PANEL.map((item) => renderCheckbox(item, true))}</div>

            <div style={{ borderTop: '1px solid rgba(214,165,109,0.14)', paddingTop: 14, display: 'grid', gap: 8 }}>
              {[
                { label: 'Desmarcar todo', icon: Trash2 },
                { label: 'Copiar permisos a otro perfil', icon: Copy },
                { label: 'Restablecer permisos por defecto', icon: RefreshCcw },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(214,165,109,0.12)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={16} color={GOLD} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PermisosPage;
