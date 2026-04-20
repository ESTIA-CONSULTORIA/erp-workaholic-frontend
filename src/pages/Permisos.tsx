import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const ROLES = [
  { code:'admin',         label:'Admin'          },
  { code:'administrador', label:'Administrador'  },
  { code:'gerente',       label:'Gerente'        },
  { code:'contador',      label:'Contador'       },
  { code:'cajero',        label:'Cajero'         },
  { code:'rh',            label:'RH'             },
  { code:'director',      label:'Director'       },
];

// Grupos de permisos al estilo Soft Restaurant
const GRUPOS: { label: string; items: { module: string; action: string; label: string }[] }[] = [
  {
    label: 'Operaciones',
    items: [
      { module:'pos',        action:'ver',      label:'Ver POS'            },
      { module:'pos',        action:'crear',    label:'Cobrar/Venta'       },
      { module:'corte',      action:'ver',      label:'Ver corte'          },
      { module:'corte',      action:'crear',    label:'Crear corte'        },
      { module:'corte',      action:'aprobar',  label:'Validar corte'      },
      { module:'oc',         action:'ver',      label:'Ver OC'             },
      { module:'oc',         action:'crear',    label:'Crear OC'           },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { module:'catalogo',   action:'ver',      label:'Ver catálogo'       },
      { module:'catalogo',   action:'crear',    label:'Crear productos'    },
      { module:'catalogo',   action:'editar',   label:'Editar productos'   },
      { module:'catalogo',   action:'eliminar', label:'Eliminar productos' },
      { module:'inventario', action:'ver',      label:'Ver inventario'     },
      { module:'inventario', action:'editar',   label:'Ajustar stock'      },
    ],
  },
  {
    label: 'Compras',
    items: [
      { module:'compras',    action:'ver',      label:'Ver compras'        },
      { module:'compras',    action:'crear',    label:'Nueva compra'       },
      { module:'compras',    action:'eliminar', label:'Cancelar compra'    },
      { module:'compras',    action:'exportar', label:'Exportar compras'   },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { module:'gastos',     action:'ver',      label:'Ver gastos'         },
      { module:'gastos',     action:'crear',    label:'Nuevo gasto'        },
      { module:'gastos',     action:'aprobar',  label:'Aprobar gasto'      },
      { module:'cxc',        action:'ver',      label:'Ver CxC'            },
      { module:'cxc',        action:'crear',    label:'Nueva CxC'          },
      { module:'cxp',        action:'ver',      label:'Ver CxP'            },
      { module:'cxp',        action:'crear',    label:'Nueva CxP'          },
      { module:'cxp',        action:'editar',   label:'Abonar CxP'         },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { module:'reportes',   action:'ver',      label:'Ver ER/Flujo'       },
      { module:'reportes',   action:'exportar', label:'Exportar reportes'  },
      { module:'gastos',     action:'exportar', label:'Exportar gastos'    },
      { module:'cxc',        action:'exportar', label:'Exportar CxC'       },
    ],
  },
  {
    label: 'RH',
    items: [
      { module:'rh',         action:'ver',      label:'Ver empleados'      },
      { module:'rh',         action:'crear',    label:'Nuevo empleado'     },
      { module:'rh',         action:'editar',   label:'Editar empleado'    },
      { module:'rh',         action:'aprobar',  label:'Aprobar permisos'   },
      { module:'rh',         action:'exportar', label:'Exportar RH'        },
    ],
  },
  {
    label: 'Palestra',
    items: [
      { module:'membresias', action:'ver',      label:'Ver membresías'     },
      { module:'membresias', action:'crear',    label:'Nueva membresía'    },
      { module:'membresias', action:'editar',   label:'Editar membresía'   },
      { module:'servicios',  action:'ver',      label:'Ver servicios'      },
      { module:'servicios',  action:'crear',    label:'Crear servicio'     },
      { module:'comisiones', action:'ver',      label:'Ver comisiones'     },
      { module:'comisiones', action:'aprobar',  label:'Liberar comisiones' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { module:'admin',      action:'ver',      label:'Ver usuarios'       },
      { module:'admin',      action:'crear',    label:'Crear usuario'      },
      { module:'admin',      action:'editar',   label:'Editar usuario'     },
      { module:'documentos', action:'ver',      label:'Ver documentos'     },
      { module:'documentos', action:'crear',    label:'Subir documento'    },
    ],
  },
];

export default function PermisosPage() {
  const { activeCompany } = useERPStore();
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('cajero');
  const [saving, setSaving] = useState<string|null>(null);

  const { data: allPerms = {}, isLoading } = useQuery({
    queryKey: ['permissions-all'],
    queryFn:  () => api.get('/permissions/all').then(r => r.data),
  });

  const rolePerms: Record<string,string[]> = (allPerms as any)[selectedRole] || {};

  const has = (module: string, action: string) =>
    (rolePerms[module] || []).includes(action);

  const toggleM = useMutation({
    mutationFn: ({ module, action, allowed }: any) =>
      api.put(`/permissions/roles/${selectedRole}/modules/${module}/actions/${action}`, { allowed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions-all'] }),
  });

  const resetM = useMutation({
    mutationFn: () => api.post(`/permissions/roles/${selectedRole}/reset`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['permissions-all'] }),
  });

  const toggle = (module: string, action: string) => {
    const key = `${module}:${action}`;
    setSaving(key);
    toggleM.mutate({ module, action, allowed: !has(module, action) }, { onSettled: () => setSaving(null) });
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>Perfiles de usuario</h1>
          <button onClick={() => { if(confirm(`¿Restaurar defaults para ${selectedRole}?`)) resetM.mutate(); }}
            style={{ padding:'5px 14px', borderRadius:6, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ↺ Restaurar defaults
          </button>
        </div>

        {/* Selector de rol — estilo tabs horizontales */}
        <div style={{ display:'flex', gap:2, marginBottom:16, background:'#0f172a', borderRadius:8, padding:4 }}>
          {ROLES.map(r => (
            <button key={r.code} onClick={() => setSelectedRole(r.code)}
              style={{ flex:1, padding:'6px 4px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                background: selectedRole===r.code ? color : 'transparent',
                color: selectedRole===r.code ? '#fff' : '#64748b',
                transition:'all 0.15s' }}>
              {r.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color:'#64748b', textAlign:'center', padding:40 }}>Cargando…</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {GRUPOS.map(grupo => (
              <div key={grupo.label} style={{ background:'#1e293b', borderRadius:8, border:'1px solid #334155', overflow:'hidden' }}>
                {/* Grupo header */}
                <div style={{ background:'#334155', padding:'6px 10px' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#f1f5f9', margin:0, textTransform:'uppercase', letterSpacing:0.5 }}>
                    {grupo.label}
                  </p>
                </div>
                {/* Items */}
                <div style={{ padding:'6px 8px' }}>
                  {grupo.items.map(item => {
                    const allowed = has(item.module, item.action);
                    const key     = `${item.module}:${item.action}`;
                    const busy    = saving === key;
                    return (
                      <label key={key}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 0', cursor:'pointer', userSelect:'none' }}>
                        <input
                          type="checkbox"
                          checked={allowed}
                          disabled={busy}
                          onChange={() => toggle(item.module, item.action)}
                          style={{ width:13, height:13, accentColor:color, cursor:'pointer' }}
                        />
                        <span style={{ fontSize:11, color: allowed ? '#f1f5f9' : '#64748b' }}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
