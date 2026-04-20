import React, { useState, useEffect } from 'react';

// ============================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================

interface PermissionAction {
  key: string;
  label: string;
  description?: string;
}

interface ModuleConfig {
  key: string;
  label: string;
  actions: PermissionAction[];
}

interface SectionConfig {
  key: string;
  label: string;
  modules: ModuleConfig[];
}

// Acciones disponibles (personalizadas según necesidad)
const ACTION_TEMPLATES: Record<string, PermissionAction> = {
  ver: { key: 'ver', label: 'Ver' },
  crear: { key: 'crear', label: 'Crear' },
  editar: { key: 'editar', label: 'Editar' },
  eliminar: { key: 'eliminar', label: 'Eliminar' },
  aprobar: { key: 'aprobar', label: 'Aprobar' },
  exportar: { key: 'exportar', label: 'Exportar' },
  descuento: { key: 'descuento', label: 'Aplicar descuentos' },
  cortesia: { key: 'cortesia', label: 'Aplicar cortesías' },
  cancelar: { key: 'cancelar', label: 'Cancelar' },
  reimprimir: { key: 'reimprimir', label: 'Reimprimir ticket' },
  maxDescuento: { key: 'maxDescuento', label: 'Máximo descuento' },
  tipoDescuento: { key: 'tipoDescuento', label: 'Tipos de descuento' },
};

// Configuración completa de secciones y módulos (basada en tu imagen)
const SECTIONS: SectionConfig[] = [
  {
    key: 'catalogos',
    label: 'Catálogos',
    modules: [
      { key: 'productos', label: 'Productos para venta', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'meseros', label: 'Meseros / Repartidores', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'clientes', label: 'Clientes', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'promociones', label: 'Promociones', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'tiposDescuento', label: 'Tipos de descuento a clientes', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'insumos', label: 'Insumos', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'almacenes', label: 'Almacenes', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'conceptosMotivos', label: 'Conceptos de motivos', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'proveedores', label: 'Proveedores', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'comisionesReservaciones', label: 'Comisiones y Reservaciones', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'mapaMesas', label: 'Mapa de mesas', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
    ]
  },
  {
    key: 'operaciones',
    label: 'Operaciones',
    modules: [
      { key: 'gastos', label: 'Gastos', actions: ['ver','crear','editar','eliminar','aprobar','exportar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'cxp', label: 'Cuentas por pagar', actions: ['ver','crear','editar','eliminar','aprobar','exportar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'reservaciones', label: 'Reservaciones', actions: ['ver','crear','editar','eliminar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'pagoComisiones', label: 'Pago de comisiones', actions: ['ver','crear','aprobar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'cortesiasMonedero', label: 'Cortesías monedero', actions: ['ver','crear'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'suspenderProductos', label: 'Suspender productos', actions: ['ver','editar'].map(k => ACTION_TEMPLATES[k]) },
    ]
  },
  {
    key: 'almacen',
    label: 'Almacén',
    modules: [
      { key: 'pedidos', label: 'Pedidos', actions: ['ver','crear','editar','eliminar','aprobar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'cedis', label: 'CEDIS', actions: ['ver','crear','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'ordenesCompra', label: 'Órdenes de compra', actions: ['ver','crear','editar','eliminar','aprobar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'compras', label: 'Compras', actions: ['ver','crear','editar','eliminar','cancelar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'movimientosAlmacen', label: 'Movimientos de almacén', actions: ['ver','crear','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'traspasos', label: 'Traspasos', actions: ['ver','crear','aprobar','cancelar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'inventarioFisico', label: 'Inventario físico', actions: ['ver','crear','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'elaboracionInsumo', label: 'Elaboración de insumo', actions: ['ver','crear','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'desperdicios', label: 'Desperdicios', actions: ['ver','crear'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'explosionInsumos', label: 'Explosión insumos', actions: ['ver'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'costosInsumos', label: 'Costos de insumos por proveedor', actions: ['ver','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'inventarioPendiente', label: 'Inventario pendiente por descargar', actions: ['ver'].map(k => ACTION_TEMPLATES[k]) },
    ]
  },
  {
    key: 'ventas',
    label: 'Ventas',
    modules: [
      { key: 'servicioComedor', label: 'Servicio Comedor', actions: ['ver','crear','descuento','cortesia','cancelar','reimprimir'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'foliosComandos', label: 'Folios de comandos', actions: ['ver','crear','reimprimir'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'servicioDomicilio', label: 'Servicio Domicilio', actions: ['ver','crear','descuento','cancelar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'repartidores', label: 'Repartidores', actions: ['ver','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'servicioRapido', label: 'Servicio Rápido', actions: ['ver','crear','descuento'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'comedorEmpleados', label: 'Comedor empleados', actions: ['ver','crear'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'facturacion', label: 'Facturación', actions: ['ver','crear','cancelar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'cxc', label: 'Cuentas por cobrar', actions: ['ver','editar'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'tarjetaCredito', label: 'Tarjeta de crédito bancaria', actions: ['ver','crear'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'monedero', label: 'Tarjeta monedero', actions: ['ver','crear'].map(k => ACTION_TEMPLATES[k]) },
      { key: 'autorizarEmenu', label: 'Autorizar productos e-Menu', actions: ['aprobar'].map(k => ACTION_TEMPLATES[k]) },
    ]
  },
  // Puedes agregar el resto de secciones (Eventos de seguridad, Caña, Reportes, etc.) de la misma manera
];

// Usuarios de ejemplo (simulados; en producción vendrían de API)
const MOCK_USERS = [
  { id: '1', name: 'Miguel Lora', email: 'loraloraangel@gmail.com', role: 'admin' },
  { id: '2', name: 'Cajero Palestra', email: 'cajero@palestra.com', role: 'cajero' },
  { id: '3', name: 'Gerente Palestra', email: 'gerente@palestra.com', role: 'gerente' },
  { id: '4', name: 'Julia Alvarado', email: 'julia@grupoworkaholic.com', role: 'contador' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const Permisos: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>('');

  // Inicializar permisos para el usuario seleccionado
  useEffect(() => {
    if (!selectedUserId) {
      setPermissions({});
      return;
    }
    setLoading(true);
    // Simular carga de permisos desde backend (reemplazar con fetch cuando funcione)
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.id === selectedUserId);
      const role = user?.role || 'cajero';
      // Mapeo de permisos simulados por rol (igual que DEFAULT_PERMISSIONS anterior)
      const mockPerms: Record<string, string[]> = {
        admin: [
          'catalogos.productos.ver', 'catalogos.productos.crear', 'catalogos.productos.editar', 'catalogos.productos.eliminar',
          'ventas.servicioComedor.ver', 'ventas.servicioComedor.crear', 'ventas.servicioComedor.descuento', 'ventas.servicioComedor.cortesia', 'ventas.servicioComedor.cancelar',
          'ventas.facturacion.ver', 'ventas.facturacion.crear',
        ],
        cajero: [
          'ventas.servicioComedor.ver', 'ventas.servicioComedor.crear',
          'ventas.facturacion.ver',
        ],
        gerente: [
          'catalogos.productos.ver', 'catalogos.productos.crear', 'catalogos.productos.editar',
          'ventas.servicioComedor.ver', 'ventas.servicioComedor.crear', 'ventas.servicioComedor.descuento', 'ventas.servicioComedor.cancelar',
          'ventas.facturacion.ver', 'ventas.facturacion.crear', 'ventas.facturacion.cancelar',
        ],
        contador: [
          'operaciones.gastos.ver', 'operaciones.gastos.crear', 'operaciones.gastos.editar',
          'operaciones.cxp.ver', 'operaciones.cxp.crear',
        ],
      };
      const permSet = new Set<string>(mockPerms[role] || []);
      setPermissions(prev => ({ ...prev, ...Object.fromEntries(SECTIONS.flatMap(s => s.modules.map(m => [`${s.key}.${m.key}`, new Set<string>]))), [selectedUserId]: permSet }));
      setLoading(false);
    }, 300);
  }, [selectedUserId]);

  const handlePermissionChange = (sectionKey: string, moduleKey: string, actionKey: string, checked: boolean) => {
    if (!selectedUserId) return;
    const key = `${sectionKey}.${moduleKey}`;
    const permKey = `${key}.${actionKey}`;
    setPermissions(prev => {
      const newPerms = new Set(prev[selectedUserId] || []);
      if (checked) newPerms.add(permKey);
      else newPerms.delete(permKey);
      return { ...prev, [selectedUserId]: newPerms };
    });
  };

  const isPermissionGranted = (sectionKey: string, moduleKey: string, actionKey: string): boolean => {
    if (!selectedUserId) return false;
    const permKey = `${sectionKey}.${moduleKey}.${actionKey}`;
    return permissions[selectedUserId]?.has(permKey) || false;
  };

  const handleSave = () => {
    // Simular guardado
    setSavedMessage('Cambios guardados (modo demostración)');
    setTimeout(() => setSavedMessage(''), 3000);
    // Cuando el backend funcione, aquí iría fetch PUT a /api/v1/permissions/bulk
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Permisos por Usuario</h1>
        <p className="text-gray-600 mt-1">Selecciona un usuario para configurar sus permisos específicos.</p>
      </div>

      {/* Selector de usuario */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
        <select
          className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">-- Selecciona un usuario --</option>
          {MOCK_USERS.map(user => (
            <option key={user.id} value={user.id}>{user.name} ({user.email}) - Rol: {user.role}</option>
          ))}
        </select>
      </div>

      {selectedUserId && (
        <>
          {loading ? (
            <div className="text-center py-8">Cargando permisos...</div>
          ) : (
            <div className="space-y-4">
              {SECTIONS.map(section => {
                const isExpanded = expandedSections[section.key] ?? true;
                return (
                  <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="bg-gray-50 px-4 py-3 flex items-center cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSection(section.key)}
                    >
                      <span className="font-semibold text-gray-700">{section.label}</span>
                      <span className="ml-2 text-gray-500 text-sm">({section.modules.length} módulos)</span>
                      <svg className={`ml-auto transform ${isExpanded ? 'rotate-90' : ''} w-5 h-5 text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-white divide-y divide-gray-100">
                        {section.modules.map(module => (
                          <div key={module.key} className="py-3 first:pt-0 last:pb-0">
                            <h4 className="font-medium text-gray-800 mb-2">{module.label}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {module.actions.map(action => {
                                const granted = isPermissionGranted(section.key, module.key, action.key);
                                return (
                                  <label key={action.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={granted}
                                      onChange={(e) => handlePermissionChange(section.key, module.key, action.key, e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{action.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-end gap-4 pt-4">
                {savedMessage && <span className="text-green-600 text-sm">{savedMessage}</span>}
                <button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Permisos;
