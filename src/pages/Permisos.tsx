import React, { useState, useEffect } from 'react';

// ============================================================
// CONFIGURACIÓN DE ROLES
// ============================================================
const ROLES = [
  { code: 'admin', name: 'Administrador' },
  { code: 'gerente', name: 'Gerente' },
  { code: 'contador', name: 'Contador' },
  { code: 'cajero', name: 'Cajero' },
  { code: 'rh', name: 'Recursos Humanos' },
  { code: 'director', name: 'Director' },
];

// ============================================================
// ACCIONES DISPONIBLES (con colores)
// ============================================================
const ACCIONES = [
  { key: 'ver', label: 'Ver', color: 'bg-blue-500' },
  { key: 'crear', label: 'Crear', color: 'bg-green-500' },
  { key: 'editar', label: 'Editar', color: 'bg-yellow-500' },
  { key: 'eliminar', label: 'Eliminar', color: 'bg-red-500' },
  { key: 'aprobar', label: 'Aprobar', color: 'bg-purple-500' },
  { key: 'exportar', label: 'Exportar', color: 'bg-cyan-500' },
];

// ============================================================
// PERMISOS POR DEFECTO (copia exacta del backend)
// ============================================================
const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    pos:        ['ver','crear','editar','eliminar','exportar'],
    gastos:     ['ver','crear','editar','eliminar','aprobar','exportar'],
    cxc:        ['ver','crear','editar','eliminar','exportar'],
    cxp:        ['ver','crear','editar','eliminar','exportar'],
    inventario: ['ver','crear','editar','eliminar','exportar'],
    compras:    ['ver','crear','editar','eliminar','exportar'],
    produccion: ['ver','crear','editar','eliminar'],
    catalogo:   ['ver','crear','editar','eliminar'],
    rh:         ['ver','crear','editar','eliminar','aprobar','exportar'],
    reportes:   ['ver','exportar'],
    admin:      ['ver','crear','editar','eliminar'],
    corte:      ['ver','crear','editar','aprobar'],
    oc:         ['ver','crear','editar','eliminar'],
    membresias: ['ver','crear','editar','eliminar'],
    servicios:  ['ver','crear','editar','eliminar'],
    comisiones: ['ver','editar','aprobar'],
  },
  administrador: {
    pos:        ['ver','crear'],
    gastos:     ['ver','crear','editar','aprobar','exportar'],
    cxc:        ['ver','crear','editar','exportar'],
    cxp:        ['ver','crear','editar','exportar'],
    inventario: ['ver','crear','editar','exportar'],
    compras:    ['ver','crear','editar','exportar'],
    produccion: ['ver','crear','editar'],
    catalogo:   ['ver','crear','editar'],
    rh:         ['ver','crear','editar','aprobar','exportar'],
    reportes:   ['ver','exportar'],
    admin:      ['ver','crear','editar'],
    corte:      ['ver','aprobar'],
    oc:         ['ver','crear','editar'],
    membresias: ['ver','crear','editar'],
    servicios:  ['ver','crear','editar'],
    comisiones: ['ver','aprobar'],
  },
  gerente: {
    pos:        ['ver','crear'],
    gastos:     ['ver','crear','exportar'],
    cxc:        ['ver','exportar'],
    cxp:        ['ver','exportar'],
    inventario: ['ver','exportar'],
    compras:    ['ver','crear','exportar'],
    produccion: ['ver','crear'],
    catalogo:   ['ver'],
    rh:         ['ver','aprobar'],
    reportes:   ['ver','exportar'],
    corte:      ['ver','aprobar'],
    oc:         ['ver','crear'],
    membresias: ['ver','crear'],
    servicios:  ['ver'],
    comisiones: ['ver','aprobar'],
  },
  contador: {
    gastos:     ['ver','crear','editar','exportar'],
    cxc:        ['ver','crear','editar','exportar'],
    cxp:        ['ver','crear','editar','exportar'],
    inventario: ['ver','exportar'],
    compras:    ['ver','crear','exportar'],
    reportes:   ['ver','exportar'],
    corte:      ['ver','aprobar'],
    oc:         ['ver','exportar'],
    membresias: ['ver','exportar'],
  },
  cajero: {
    pos:        ['ver','crear'],
    gastos:     ['ver','crear'],
    corte:      ['ver','crear'],
    oc:         ['ver'],
    membresias: ['ver','crear'],
  },
  rh: {
    rh:         ['ver','crear','editar','aprobar','exportar'],
    reportes:   ['ver'],
    comisiones: ['ver','aprobar'],
  },
  director: {
    gastos:     ['ver','exportar'],
    cxc:        ['ver','exportar'],
    cxp:        ['ver','exportar'],
    reportes:   ['ver','exportar'],
    rh:         ['ver'],
    membresias: ['ver'],
    comisiones: ['ver'],
  },
};

// ============================================================
// SECCIONES Y MÓDULOS (completo según tu imagen)
// ============================================================
interface ModuleSection {
  key: string;
  label: string;
  modules: {
    key: string;
    label: string;
    actions: typeof ACCIONES;
  }[];
}

const MODULE_SECTIONS: ModuleSection[] = [
  {
    key: 'catalogos',
    label: 'Catálogos',
    modules: [
      { key: 'catalogo', label: 'Productos para venta', actions: ACCIONES },
      { key: 'meseros', label: 'Meseros / Repartidores', actions: ACCIONES },
      { key: 'clientes', label: 'Clientes', actions: ACCIONES },
      { key: 'promociones', label: 'Promociones', actions: ACCIONES },
      { key: 'tipos_descuento', label: 'Tipos de descuento a clientes', actions: ACCIONES },
      { key: 'insumos', label: 'Insumos', actions: ACCIONES },
      { key: 'almacenes', label: 'Almacenes', actions: ACCIONES },
      { key: 'conceptos_motivos', label: 'Conceptos de motivos', actions: ACCIONES },
      { key: 'proveedores', label: 'Proveedores', actions: ACCIONES },
      { key: 'comisiones_reservaciones', label: 'Comisiones y Reservaciones', actions: ACCIONES },
      { key: 'mapa_mesas', label: 'Mapa de mesas', actions: ACCIONES },
    ],
  },
  {
    key: 'operaciones',
    label: 'Operaciones',
    modules: [
      { key: 'gastos', label: 'Gastos', actions: ACCIONES },
      { key: 'cxp', label: 'Cuentas por pagar', actions: ACCIONES },
      { key: 'reservaciones', label: 'Reservaciones', actions: ACCIONES },
      { key: 'pago_comisiones', label: 'Pago de comisiones', actions: ACCIONES },
      { key: 'cortesias_monedero', label: 'Cortesías monedero', actions: ACCIONES },
      { key: 'suspender_productos', label: 'Suspender productos', actions: ACCIONES },
    ],
  },
  {
    key: 'almacen',
    label: 'Almacén',
    modules: [
      { key: 'inventario', label: 'Pedidos', actions: ACCIONES },
      { key: 'cedis', label: 'CEDIS', actions: ACCIONES },
      { key: 'oc', label: 'Órdenes de compra', actions: ACCIONES },
      { key: 'compras', label: 'Compras', actions: ACCIONES },
      { key: 'movimientos_almacen', label: 'Movimientos de almacén', actions: ACCIONES },
      { key: 'traspasos', label: 'Traspasos', actions: ACCIONES },
      { key: 'inventario_fisico', label: 'Inventario físico', actions: ACCIONES },
      { key: 'elaboracion_insumo', label: 'Elaboración de insumo', actions: ACCIONES },
      { key: 'desperdicios', label: 'Desperdicios', actions: ACCIONES },
      { key: 'explosion_insumos', label: 'Explosión insumos', actions: ACCIONES },
      { key: 'costos_insumos', label: 'Costos de insumos por proveedor', actions: ACCIONES },
      { key: 'inventario_pendiente', label: 'Inventario pendiente por descargar', actions: ACCIONES },
    ],
  },
  {
    key: 'consultas',
    label: 'Consultas',
    modules: [
      { key: 'monitor_ventas', label: 'Monitor de ventas', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'consultar_precios', label: 'Consultar precios', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'turnos_abiertos', label: 'Consultar turnos abiertos', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'consulta_cuentas', label: 'Consulta de cuentas', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'consulta_facturas', label: 'Consulta de facturas', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'retiros_depositos', label: 'Consulta de retiros y depósitos', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'cxc', label: 'Consulta de cuentas por cobrar', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'saldo_tarjetas', label: 'Saldo de tarjetas promocionales', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'impresora_fiscal', label: 'Impresora fiscal - Consultas', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'hotel_bitacora', label: 'Hotel - Bitácora cargos a hotel', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'hotel_consulta', label: 'Hotel - Consulta habitación', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'licencias', label: 'Licencias registradas', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'facturacion_electronica', label: 'Facturación electrónica - México', actions: ACCIONES.filter(a => a.key === 'ver') },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    modules: [
      { key: 'administracion', label: 'Administración', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'ventas', label: 'Ventas', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'caja', label: 'Caja', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'compras', label: 'Compras', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'almacen', label: 'Almacén', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'costos', label: 'Costos', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'cxp', label: 'Cuentas por pagar', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'contabilidad', label: 'Contabilidad', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'consolidados', label: 'Consolidados', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'formas_pago', label: 'Formas de pago', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'de_turno', label: 'De turno', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
    ],
  },
  {
    key: 'eventos_seguridad',
    label: 'Eventos de seguridad',
    modules: [
      { key: 'cancelaciones', label: 'Cancelaciones', actions: ACCIONES.filter(a => a.key === 'aprobar' || a.key === 'ver') },
      { key: 'cancelar_productos', label: 'Cancelar productos', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'cancelar_facturas', label: 'Cancelar facturas', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'cancelar_compras', label: 'Cancelar compras', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'cancelar_traspasos', label: 'Cancelar traspasos', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'cancelar_motivos_almacen', label: 'Cancelar motivos almacén', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'reapertura_cuentas', label: 'Reapertura de cuentas', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'reapertura_cuentas_pagadas', label: 'Reapertura de cuentas pagadas', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'descuentos', label: 'Descuentos', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'editar' || a.key === 'eliminar') },
      { key: 'maximo_descuento', label: 'Máximo descuento', actions: ACCIONES.filter(a => a.key === 'editar') },
      { key: 'tipos_descuento', label: 'Tipos descuento', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'editar') },
    ],
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    modules: [
      { key: 'editar_movimientos_almacen', label: 'Editar movimientos de almacén', actions: ACCIONES.filter(a => a.key === 'editar') },
      { key: 'traspasos_centros_consumo', label: 'Traspasos desde centros de consumo', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'aprobar') },
      { key: 'inventario_fisico_ciego', label: 'Inventario físico ciego', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'autorizar_pedidos', label: 'Autorizar pedidos', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'enviar_oc_email', label: 'Enviar órdenes de compra por email', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'configuracion_sistema', label: 'Configuración del sistema', actions: ACCIONES.filter(a => a.key === 'editar') },
      { key: 'cambio_usuario', label: 'Cambio de usuario', actions: ACCIONES.filter(a => a.key === 'editar') },
      { key: 'ver_costo', label: 'Ver costo en pedidos, OC y compras', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'editar_fecha_compras', label: 'Editar fecha de compras', actions: ACCIONES.filter(a => a.key === 'editar') },
      { key: 'ver_recetas_productos', label: 'Ver recetas de Productos', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'ver_recetas_insumos', label: 'Ver recetas de Insumo Elaborados', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'asignar_huella', label: 'Asignar huella digital', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'editar') },
    ],
  },
  {
    key: 'cana',
    label: 'Caña',
    modules: [
      { key: 'apertura_cierre_turno', label: 'Apertura / Cierre de turno', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'aprobar') },
      { key: 'pagar_propinas', label: 'Pagar propinas de meseros', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'retiros_depositos', label: 'Retiros / Depósitos', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'corte_x', label: 'Corte de caja X', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'exportar') },
      { key: 'corte_z', label: 'Corte de caja Z', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'aprobar') },
      { key: 'cierre_diario', label: 'Cierre diario', actions: ACCIONES.filter(a => a.key === 'aprobar') },
      { key: 'abrir_cajon', label: 'Abrir cajón de dinero', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'visualizar_corte_otros', label: 'Visualizar corte X de otros usuarios', actions: ACCIONES.filter(a => a.key === 'ver') },
    ],
  },
  {
    key: 'ventas',
    label: 'Ventas',
    modules: [
      { key: 'pos', label: 'Servicio Comedor', actions: ACCIONES.filter(a => a.key !== 'exportar') },
      { key: 'folios_comandos', label: 'Folios de comandos', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'crear') },
      { key: 'servicio_domicilio', label: 'Servicio Domicilio', actions: ACCIONES.filter(a => a.key !== 'exportar') },
      { key: 'repartidores', label: 'Repartidores', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'editar') },
      { key: 'servicio_rapido', label: 'Servicio Rápido', actions: ACCIONES.filter(a => a.key !== 'exportar') },
      { key: 'comedor_empleados', label: 'Comedor empleados', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'crear') },
      { key: 'facturacion', label: 'Facturación', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'cxc', label: 'Cuentas por cobrar', actions: ACCIONES.filter(a => a.key === 'ver' || a.key === 'editar') },
      { key: 'imprimir_nota_consumo', label: 'Imprimir nota de consumo nueva', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'reimprimir_folios', label: 'Reimprimir folios', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'tarjeta_credito', label: 'Tarjeta de crédito bancaria', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'consultar_saldo_monedero', label: 'Consultar saldo a tarjeta monedero', actions: ACCIONES.filter(a => a.key === 'ver') },
      { key: 'abonar_saldo_monedero', label: 'Abonar saldo a tarjeta monedero', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'autorizar_productos_emenu', label: 'Autorizar productos e-Menu', actions: ACCIONES.filter(a => a.key === 'aprobar') },
    ],
  },
  {
    key: 'mantenimiento',
    label: 'Mantenimiento',
    modules: [
      { key: 'base_datos', label: 'Base de datos', actions: ACCIONES.filter(a => a.key === 'editar' || a.key === 'ver') },
      { key: 'respaldo_recuperacion', label: 'Respaldo y recuperación', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'inicializar', label: 'Inicializar', actions: ACCIONES.filter(a => a.key === 'crear') },
      { key: 'exportar_importar', label: 'Exportar / Importar datos', actions: ACCIONES.filter(a => a.key === 'crear' || a.key === 'ver') },
      { key: 'herramientas_admin', label: 'Herramientas para administradores', actions: ACCIONES.filter(a => a.key === 'editar' || a.key === 'ver') },
      { key: 'actualizar_sistema', label: 'Actualizar sistema', actions: ACCIONES.filter(a => a.key === 'editar') },
    ],
  },
];

// ============================================================
// COMPONENTE PRINCIPAL (Modo local, 100% funcional visualmente)
// ============================================================
const Permisos: React.FC = () => {
  const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>>>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Simula carga inicial
    setTimeout(() => setLoading(false), 200);
  }, []);

  const hasPermission = (role: string, module: string, action: string): boolean => {
    const rolePerms = permissions[role];
    if (!rolePerms) return false;
    return (rolePerms[module] || []).includes(action);
  };

  const togglePermission = (role: string, module: string, action: string, current: boolean) => {
    const key = `${role}|${module}|${action}`;
    setSaving(key);
    const newValue = !current;

    setTimeout(() => {
      setPermissions(prev => {
        const newPerms = { ...prev };
        if (!newPerms[role]) newPerms[role] = {};
        if (!newPerms[role][module]) newPerms[role][module] = [];
        if (newValue) {
          if (!newPerms[role][module].includes(action)) {
            newPerms[role][module] = [...newPerms[role][module], action];
          }
        } else {
          newPerms[role][module] = newPerms[role][module].filter(a => a !== action);
        }
        return newPerms;
      });
      setSaving(null);
    }, 150);
  };

  const restoreDefaults = (role: string) => {
    if (!confirm(`¿Restaurar permisos de ${role} a valores por defecto?`)) return;
    setSaving(`role-${role}`);
    setTimeout(() => {
      setPermissions(prev => ({
        ...prev,
        [role]: DEFAULT_PERMISSIONS[role] || {},
      }));
      setSaving(null);
    }, 200);
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Cargando permisos...</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Gestión de Permisos por Rol</h1>
        <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded inline-block mt-2">
          ⚠️ Modo demostración local (los cambios no se guardan en el servidor)
        </p>
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
                      className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50"
                    >
                      Restaurar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_SECTIONS.map(section => (
              <React.Fragment key={section.key}>
                <tr className="bg-gray-50">
                  <td colSpan={ROLES.length + 1} className="p-3 font-semibold">
                    {section.label}
                  </td>
                </tr>
                {section.modules.map(mod =>
                  mod.actions.map(acc => (
                    <tr key={`${mod.key}-${acc.key}`} className="border-t hover:bg-gray-50">
                      <td className="p-3 pl-6">
                        <span className="font-medium">{mod.label}</span>
                        <span className={`ml-2 text-sm text-${acc.color.replace('bg-', '')}-600`}>
                          ({acc.label})
                        </span>
                      </td>
                      {ROLES.map(role => {
                        const val = hasPermission(role.code, mod.key, acc.key);
                        const isSaving = saving === `${role.code}|${mod.key}|${acc.key}`;
                        return (
                          <td key={role.code} className="p-3 text-center">
                            <button
                              onClick={() => togglePermission(role.code, mod.key, acc.key, val)}
                              disabled={isSaving}
                              className={`w-8 h-8 rounded-md text-white flex items-center justify-center transition-all ${
                                val ? acc.color : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                              } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {val ? '✓' : '✗'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Permisos;
