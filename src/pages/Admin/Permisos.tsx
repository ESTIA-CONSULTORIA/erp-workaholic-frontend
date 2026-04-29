import AppLayout from '../../components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ── Acciones ─────────────────────────────────────────────────────
const ACCION: Record<string,{label:string;color:string;icon:string}> = {
  ver:       {label:'Ver',       color:'#3b82f6', icon:'👁'},
  crear:     {label:'Crear',     color:'#10b981', icon:'➕'},
  editar:    {label:'Editar',    color:'#f59e0b', icon:'✎'},
  eliminar:  {label:'Eliminar',  color:'#f87171', icon:'🗑'},
  cancelar:  {label:'Cancelar',  color:'#f87171', icon:'✕'},
  aprobar:   {label:'Aprobar',   color:'#8b5cf6', icon:'✔'},
  exportar:  {label:'Exportar',  color:'#06b6d4', icon:'⬇'},
  importar:  {label:'Importar',  color:'#06b6d4', icon:'⬆'},
  abonar:    {label:'Abonar',    color:'#10b981', icon:'💰'},
  ajustar:   {label:'Ajustar',   color:'#f59e0b', icon:'⚖'},
  descuento: {label:'Descuento', color:'#f59e0b', icon:'%'},
  reabrir:   {label:'Reabrir',   color:'#8b5cf6', icon:'↺'},
  calcular:  {label:'Calcular',  color:'#8b5cf6', icon:'⚙'},
  suspender: {label:'Suspender', color:'#f87171', icon:'⏸'},
  recargar:  {label:'Recargar',  color:'#10b981', icon:'🔋'},
};

// ── Módulos agrupados ────────────────────────────────────────────
const GRUPOS: {label:string;icon:string;mods:{key:string;label:string;desc:string}[]}[] = [
  { label:'Operación', icon:'🏪', mods:[
    {key:'pos',          label:'Punto de Venta',        desc:'Cobrar, aplicar descuentos y cancelar ventas'},
    {key:'corte',        label:'Corte de Caja',          desc:'Crear, ver y validar cortes del cajero'},
    {key:'oc',           label:'Órdenes de Compra',      desc:'Gestionar órdenes de compra a clientes'},
  ]},
  { label:'Inventario', icon:'📦', mods:[
    {key:'catalogo',     label:'Catálogo Productos',     desc:'Gestionar productos y precios'},
    {key:'inventario',   label:'Stock / Inventario',     desc:'Ver existencias y hacer ajustes'},
    {key:'compras',      label:'Compras de Insumos',     desc:'Registrar y gestionar compras a proveedores'},
    {key:'produccion',   label:'Producción (Lotes)',      desc:'Gestionar lotes de producción'},
    {key:'surtido',      label:'Surtido de Turno',       desc:'Surtir productos al inicio del turno'},
    {key:'alumnos',      label:'Alumnos y Prepago',      desc:'Gestionar alumnos y recargar saldo'},
  ]},
  { label:'Finanzas', icon:'💰', mods:[
    {key:'gastos',       label:'Gastos',                 desc:'Registrar y aprobar gastos de la empresa'},
    {key:'cxc',          label:'Cuentas por Cobrar',     desc:'Ver, abonar y cancelar CxC'},
    {key:'cxp',          label:'Cuentas por Pagar',      desc:'Ver, abonar y cancelar CxP'},
    {key:'intercompany', label:'Transferencias Intercompany', desc:'Transferencias entre empresas del grupo'},
  ]},
  { label:'Reportes', icon:'Σ', mods:[
    {key:'reporte_ventas',      label:'Reporte de Ventas',      desc:''},
    {key:'reporte_cxc',         label:'Reporte CxC',            desc:''},
    {key:'reporte_cxp',         label:'Reporte CxP',            desc:''},
    {key:'reporte_gastos',      label:'Reporte de Gastos',      desc:''},
    {key:'reporte_er',          label:'Estado de Resultados',   desc:''},
    {key:'reporte_flujo',       label:'Flujo de Efectivo',      desc:''},
    {key:'reporte_balance',     label:'Balance General',        desc:''},
    {key:'reporte_consolidado', label:'Consolidado Grupo',      desc:''},
    {key:'reporte_nomina',      label:'Reporte de Nómina',      desc:''},
  ]},
  { label:'Recursos Humanos', icon:'👥', mods:[
    {key:'rh_empleados',    label:'Empleados (Altas)',    desc:'Gestionar expedientes y altas de personal'},
    {key:'rh_bajas',        label:'Bajas de Personal',   desc:'Procesar y aprobar bajas laborales'},
    {key:'rh_incidencias',  label:'Incidencias',         desc:'Registrar y gestionar incidencias'},
    {key:'rh_incapacidades',label:'Incapacidades',       desc:'Gestionar incapacidades IMSS'},
    {key:'rh_vacaciones',   label:'Vacaciones',          desc:'Aprobar y gestionar solicitudes de vacaciones'},
    {key:'rh_contratos',    label:'Contratos Activos',   desc:'Ver y gestionar contratos de empleados'},
    {key:'nomina',          label:'Nómina',              desc:'Calcular, aprobar y exportar nóminas'},
    {key:'documentos',      label:'Documentos Legales',  desc:'Generar y gestionar documentos laborales'},
  ]},
  { label:'Membresías', icon:'🏅', mods:[
    {key:'membresias',    label:'Membresías',      desc:'Gestionar membresías de clientes'},
    {key:'servicios',     label:'Servicios',       desc:'Catálogo de servicios y precios'},
    {key:'comisiones',    label:'Comisiones',      desc:'Ver y liberar comisiones de coaches'},
    {key:'espacios',      label:'Espacios / Salas',desc:'Gestionar espacios disponibles'},
    {key:'reservaciones', label:'Reservaciones',   desc:'Gestionar reservaciones de espacios'},
  ]},
  { label:'Administración', icon:'⊛', mods:[
    {key:'admin_usuarios', label:'Usuarios del Sistema', desc:'Crear, editar y suspender usuarios'},
    {key:'admin_permisos', label:'Permisos y Perfiles',  desc:'Modificar perfiles de acceso'},
  ]},
];

const COLORS = ['#6366f1','#10b981','#f59e0b','#f87171','#8b5cf6','#06b6d4','#ec4899','#64748b'];

export default function PermisosPage() {
  const { activeCompany } = useERPStore();
  const cid         = activeCompany?.companyId;
  const companyCode = activeCompany?.companyCode || 'MACHETE';
  const companyName = activeCompany?.companyName || '';
  const color       = activeCompany?.color || '#6366f1';
  const qc          = useQueryClient();
  const navigate    = useNavigate();

  const [selectedRole, setSelectedRole] = useState('');
  const [editMode,     setEditMode]     = useState(false);   // editing a role's metadata
  const [saving,       setSaving]       = useState<string|null>(null);
  const [showNew,      setShowNew]      = useState(false);
  const [confirmDel,   setConfirmDel]   = useState<any>(null);
  const [busqueda,     setBusqueda]     = useState('');
  const [newRole,      setNewRole]      = useState({label:'',color:'#6366f1',description:'',copyFrom:''});
  const [editMeta,     setEditMeta]     = useState({label:'',color:'',description:''});

  // ── Queries ──────────────────────────────────────────────────
  const {data:roles=[],isLoading:rolesLoading} = useQuery({
    queryKey:['company-roles',cid],
    queryFn: ()=>api.get(`/companies/${cid}/permissions/roles?companyCode=${companyCode}`).then(r=>r.data),
    enabled: !!cid,
  });

  const {data:modules=[]} = useQuery({
    queryKey:['company-modules',companyCode],
    queryFn: ()=>api.get(`/companies/${cid}/permissions/modules?companyCode=${companyCode}`).then(r=>r.data),
    enabled: !!cid,
  });

  const {data:rolePerms={},isLoading:permsLoading} = useQuery({
    queryKey:['role-perms',cid,selectedRole],
    queryFn: ()=>api.get(`/companies/${cid}/permissions/roles/${selectedRole}`).then(r=>r.data),
    enabled: !!cid && !!selectedRole,
    staleTime:0,
  });

  useEffect(()=>{
    if(!selectedRole && (roles as any[]).length>0)
      setSelectedRole((roles as any[])[0].code);
  },[roles,selectedRole]);

  // ── Mutations ────────────────────────────────────────────────
  const toggleM = useMutation({
    mutationFn:({mod,action,allowed}:any)=>
      api.put(`/companies/${cid}/permissions/roles/${selectedRole}/modules/${mod}/actions/${action}`,{allowed}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['role-perms',cid,selectedRole]}),
  });

  const resetM = useMutation({
    mutationFn:()=>api.post(`/companies/${cid}/permissions/roles/${selectedRole}/reset`),
    onSuccess:()=>qc.invalidateQueries({queryKey:['role-perms',cid,selectedRole]}),
  });

  const createM = useMutation({
    mutationFn:()=>api.post(`/companies/${cid}/permissions/roles`,{...newRole,companyId:cid}),
    onSuccess:(d:any)=>{
      const code=d.data?.code||d.code;
      setShowNew(false);
      setNewRole({label:'',color:'#6366f1',description:'',copyFrom:''});
      qc.invalidateQueries({queryKey:['company-roles',cid]});
      if(code) setTimeout(()=>setSelectedRole(code),300);
    },
    onError:(e:any)=>alert(e.response?.data?.message||'Error'),
  });

  const updateMetaM = useMutation({
    mutationFn:()=>api.put(`/companies/${cid}/permissions/roles/${selectedRole}`,editMeta),
    onSuccess:()=>{
      setEditMode(false);
      qc.invalidateQueries({queryKey:['company-roles',cid]});
    },
    onError:(e:any)=>alert(e.response?.data?.message||'Error'),
  });

  const suspendM = useMutation({
    mutationFn:(code:string)=>api.put(`/companies/${cid}/permissions/roles/${code}/suspend`),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['company-roles',cid]});setConfirmDel(null);setSelectedRole('');},
  });

  const deleteM = useMutation({
    mutationFn:(code:string)=>api.delete(`/companies/${cid}/permissions/roles/${code}`),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['company-roles',cid]});qc.invalidateQueries({queryKey:['role-perms',cid,selectedRole]});setConfirmDel(null);setSelectedRole('');},
    onError:(e:any)=>alert(e.response?.data?.message||'Error'),
  });

  // ── Helpers ──────────────────────────────────────────────────
  const has=(mod:string,action:string)=>Array.isArray(rolePerms)?false:((rolePerms as any)[mod]||[]).includes(action);
  const toggle=(mod:string,action:string)=>{
    const key=`${mod}:${action}`;
    setSaving(key);
    toggleM.mutate({mod,action,allowed:!has(mod,action)},{onSettled:()=>setSaving(null)});
  };
  const moduleAllowed=(mod:string)=>modules.length>0 && (modules as any[]).some((m:any)=>m.key===mod);
  const activeRoles=(roles as any[]).filter((r:any)=>r.isActive!==false);
  const selectedObj=activeRoles.find((r:any)=>r.code===selectedRole);
  const isBase=selectedObj?.isBase===true;
  const rc=selectedObj?.color||color;

  // Count active permissions for a role in the selector
  const countPerms=(perms:any)=>Object.values(perms||{}).flat().length;

  if(rolesLoading||(!selectedRole&&activeRoles.length>0)){
    return <AppLayout><div style={{textAlign:'center',padding:60,color:'#64748b'}}><p style={{fontSize:32,margin:'0 0 12px'}}>🔐</p><p>Cargando perfiles…</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div style={{maxWidth:1100}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={()=>navigate(-1)}
              style={{padding:'6px 12px',borderRadius:7,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:12}}>
              ← Regresar
            </button>
            <div>
              <h1 style={{fontSize:20,fontWeight:800,margin:'0 0 2px'}}>Perfiles de Acceso</h1>
              <p style={{fontSize:12,color:'#64748b',margin:0}}>{companyName} · Permisos granulares por módulo y acción</p>
            </div>
          </div>
          <button onClick={()=>setShowNew(true)}
            style={{padding:'8px 18px',borderRadius:8,border:'none',background:color,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
            + Nuevo perfil
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'230px 1fr',gap:16}}>

          {/* ── Panel izquierdo: lista de roles ── */}
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <p style={{fontSize:10,color:'#475569',textTransform:'uppercase',letterSpacing:1,fontWeight:700,margin:'0 0 6px'}}>
              Perfiles en {companyName}
            </p>
            {activeRoles.map((r:any)=>{
              const rc2=r.color||'#64748b';
              const isSelected=selectedRole===r.code;
              return(
                <button key={r.code} onClick={()=>{setSelectedRole(r.code);setEditMode(false);}}
                  style={{padding:'10px 12px',borderRadius:8,textAlign:'left',cursor:'pointer',
                    border:`1px solid ${isSelected?rc2:'#334155'}`,
                    background:isSelected?rc2+'18':'#1e293b',transition:'all 0.12s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:rc2,flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:600,color:isSelected?rc2:'#f1f5f9',flex:1}}>{r.label}</span>
                    {!r.isBase&&<span style={{fontSize:9,color:'#64748b'}}>✦</span>}
                  </div>
                  <p style={{fontSize:10,color:'#475569',margin:'3px 0 0 15px'}}>{r.description||''}</p>
                </button>
              );
            })}
          </div>

          {/* ── Panel derecho: permisos + header perfil ── */}
          <div>

            {/* Header del perfil seleccionado */}
            {selectedObj && (
              <div style={{background:'#1e293b',borderRadius:10,padding:'12px 16px',
                marginBottom:14,border:`1px solid ${rc}33`}}>
                {editMode ? (
                  /* Modo edición del perfil */
                  <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                    <div style={{flex:2,minWidth:140}}>
                      <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Nombre</label>
                      <input className="input-base" style={{fontSize:13,fontWeight:600}}
                        value={editMeta.label} onChange={e=>setEditMeta(m=>({...m,label:e.target.value}))}/>
                    </div>
                    <div style={{flex:2,minWidth:140}}>
                      <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Descripción</label>
                      <input className="input-base" style={{fontSize:12}}
                        value={editMeta.description} onChange={e=>setEditMeta(m=>({...m,description:e.target.value}))}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Color</label>
                      <div style={{display:'flex',gap:4}}>
                        {COLORS.map(c=>(
                          <button key={c} onClick={()=>setEditMeta(m=>({...m,color:c}))}
                            style={{width:22,height:22,borderRadius:'50%',border:`3px solid ${editMeta.color===c?'#fff':'transparent'}`,background:c,cursor:'pointer'}}/>
                        ))}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
                      <button onClick={()=>setEditMode(false)}
                        style={{padding:'7px 12px',borderRadius:7,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:12}}>
                        Cancelar
                      </button>
                      <button onClick={()=>updateMetaM.mutate()} disabled={updateMetaM.isPending||!editMeta.label}
                        style={{padding:'7px 14px',borderRadius:7,border:'none',background:editMeta.color||rc,color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}>
                        {updateMetaM.isPending?'Guardando…':'💾 Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Vista normal del perfil */
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:12,height:12,borderRadius:3,background:rc}}/>
                      <div>
                        <p style={{fontSize:15,fontWeight:700,margin:'0 0 2px',color:'#f1f5f9'}}>{selectedObj.label}</p>
                        <p style={{fontSize:11,color:'#64748b',margin:0}}>
                          {selectedObj.description||'Sin descripción'}
                          {isBase&&<span style={{marginLeft:8,fontSize:10,background:'#334155',color:'#475569',padding:'1px 6px',borderRadius:99}}>Rol base</span>}
                        </p>
                      </div>
                    </div>
                    {/* Botones de acción del perfil */}
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {!isBase&&(
                        <button onClick={()=>{setEditMeta({label:selectedObj.label,color:selectedObj.color||rc,description:selectedObj.description||''});setEditMode(true);}}
                          style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${rc}`,background:'none',color:rc,cursor:'pointer',fontSize:11,fontWeight:600}}>
                          ✎ Editar perfil
                        </button>
                      )}
                      <button onClick={()=>{if(window.confirm(`¿Restaurar permisos por defecto de "${selectedObj.label}"?`))resetM.mutate();}}
                        style={{padding:'5px 12px',borderRadius:6,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:11}}>
                        ↺ Defaults
                      </button>
                      {!isBase&&(
                        <>
                          <button onClick={()=>setConfirmDel({code:selectedRole,action:'suspend',label:selectedObj.label})}
                            style={{padding:'5px 10px',borderRadius:6,border:'1px solid #f59e0b',background:'none',color:'#f59e0b',cursor:'pointer',fontSize:11}}>
                            ⏸
                          </button>
                          <button onClick={()=>setConfirmDel({code:selectedRole,action:'delete',label:selectedObj.label})}
                            style={{padding:'5px 10px',borderRadius:6,border:'1px solid #f87171',background:'none',color:'#f87171',cursor:'pointer',fontSize:11}}>
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buscador de módulos */}
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
              <input placeholder="Buscar módulo…" value={busqueda} onChange={e=>setBusqueda(e.target.value)}
                style={{flex:1,padding:'6px 12px',borderRadius:7,border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:12}}/>
              <div style={{display:'flex',gap:8,fontSize:11,color:'#475569'}}>
                {Object.entries(ACCION).slice(0,6).map(([k,v])=>(
                  <div key={k} style={{display:'flex',alignItems:'center',gap:3}}>
                    <div style={{width:8,height:8,borderRadius:2,background:v.color+'44',border:`1px solid ${v.color}`}}/>
                    <span style={{color:'#64748b'}}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid de permisos por grupo */}
            {permsLoading ? (
              <p style={{color:'#64748b',textAlign:'center',padding:40}}>Cargando permisos…</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {GRUPOS.map(grupo=>{
                  const visibleMods=grupo.mods.filter(m=>
                    moduleAllowed(m.key) &&
                    (!busqueda||m.label.toLowerCase().includes(busqueda.toLowerCase()))
                  );
                  if(!visibleMods.length) return null;
                  const modData=(modules as any[]);

                  return(
                    <div key={grupo.label}>
                      <p style={{fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',
                        letterSpacing:1.5,margin:'0 0 6px',display:'flex',alignItems:'center',gap:6}}>
                        <span>{grupo.icon}</span> {grupo.label}
                      </p>
                      <div style={{background:'#1e293b',borderRadius:10,border:'1px solid #334155',overflow:'hidden'}}>
                        {visibleMods.map((mod,modIdx)=>{
                          const actions=modData.find((m:any)=>m.key===mod.key)?.actions||[];
                          const anyAllowed=actions.some((a:string)=>has(mod.key,a));
                          const countAllowed=actions.filter((a:string)=>has(mod.key,a)).length;

                          return(
                            <div key={mod.key}
                              style={{display:'flex',alignItems:'center',gap:0,
                                borderTop:modIdx>0?'1px solid #0f172a':'none',
                                padding:'9px 14px',
                                background:anyAllowed?rc+'08':'transparent'}}>
                              {/* Nombre del módulo */}
                              <div style={{width:190,flexShrink:0}}>
                                <p style={{fontSize:12,fontWeight:600,color:anyAllowed?'#f1f5f9':'#64748b',margin:'0 0 2px'}}>{mod.label}</p>
                                {mod.desc&&<p style={{fontSize:10,color:'#334155',margin:0}}>{mod.desc}</p>}
                              </div>
                              {/* Checkboxes */}
                              <div style={{display:'flex',gap:4,flex:1,flexWrap:'wrap'}}>
                                {actions.map((action:string)=>{
                                  const allowed=has(mod.key,action);
                                  const key=`${mod.key}:${action}`;
                                  const busy=saving===key;
                                  const ac=ACCION[action]||{label:action,color:'#64748b',icon:'•'};
                                  return(
                                    <label key={action} title={ac.label}
                                      style={{display:'flex',alignItems:'center',gap:4,
                                        padding:'4px 9px',borderRadius:6,cursor:busy?'wait':'pointer',userSelect:'none',
                                        background:allowed?ac.color+'20':'#0f172a',
                                        border:`1px solid ${allowed?ac.color+'80':'#334155'}`,
                                        transition:'all 0.1s',opacity:busy?0.6:1,minWidth:72}}>
                                      <input type="checkbox" checked={allowed} disabled={busy}
                                        onChange={()=>toggle(mod.key,action)}
                                        style={{width:12,height:12,accentColor:ac.color,cursor:'pointer',flexShrink:0}}/>
                                      <span style={{fontSize:10,fontWeight:allowed?700:400,
                                        color:allowed?ac.color:'#475569',whiteSpace:'nowrap'}}>
                                        {busy?'…':`${ac.icon} ${ac.label}`}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              {/* Contador */}
                              <div style={{width:50,textAlign:'right',flexShrink:0}}>
                                <span style={{fontSize:10,color:anyAllowed?rc:'#334155'}}>
                                  {countAllowed}/{actions.length}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo perfil */}
      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:14,padding:28,width:440,border:`1px solid ${color}44`}}>
            <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 4px',color}}>Nuevo perfil — {companyName}</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 18px'}}>
              Existirá solo en esta empresa. Puedes copiar los permisos de otro perfil como base.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Nombre *</label>
                <input className="input-base" style={{fontSize:14,fontWeight:600}} placeholder="Ej: Supervisor de Turno"
                  value={newRole.label} onChange={e=>setNewRole(r=>({...r,label:e.target.value}))} autoFocus/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Descripción</label>
                <input className="input-base" style={{fontSize:12}} placeholder="¿Para qué sirve este perfil?"
                  value={newRole.description} onChange={e=>setNewRole(r=>({...r,description:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:6}}>Color</label>
                <div style={{display:'flex',gap:6}}>
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewRole(r=>({...r,color:c}))}
                      style={{width:28,height:28,borderRadius:'50%',border:`3px solid ${newRole.color===c?'#fff':'transparent'}`,background:c,cursor:'pointer'}}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Copiar permisos de (opcional)</label>
                <select className="input-base" style={{fontSize:12}} value={newRole.copyFrom}
                  onChange={e=>setNewRole(r=>({...r,copyFrom:e.target.value}))}>
                  <option value="">— Sin permisos iniciales —</option>
                  {activeRoles.map((r:any)=><option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowNew(false)}
                style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>
                Cancelar
              </button>
              <button onClick={()=>createM.mutate()} disabled={createM.isPending||!newRole.label.trim()}
                style={{flex:1,padding:'9px',borderRadius:8,border:'none',
                  background:newRole.label.trim()?newRole.color:'#334155',
                  color:'#fff',cursor:newRole.label.trim()?'pointer':'not-allowed',fontSize:13,fontWeight:700}}>
                {createM.isPending?'Creando…':'Crear perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar/suspender */}
      {confirmDel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:14,padding:28,width:380,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 10px',
              color:confirmDel.action==='delete'?'#f87171':'#f59e0b'}}>
              {confirmDel.action==='delete'?'🗑 Eliminar perfil':'⏸ Suspender perfil'}
            </h3>
            <p style={{fontSize:13,color:'#94a3b8',margin:'0 0 20px',lineHeight:1.5}}>
              <strong style={{color:'#f1f5f9'}}>{confirmDel.label}</strong><br/>
              {confirmDel.action==='delete'
                ?'Se eliminará permanentemente. Los usuarios con este perfil perderán acceso de inmediato.'
                :'Los usuarios no podrán acceder hasta que se reactive.'}
            </p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmDel(null)}
                style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>
                Cancelar
              </button>
              <button
                onClick={()=>confirmDel.action==='delete'?deleteM.mutate(confirmDel.code):suspendM.mutate(confirmDel.code)}
                disabled={deleteM.isPending||suspendM.isPending}
                style={{flex:1,padding:'9px',borderRadius:8,border:'none',
                  background:confirmDel.action==='delete'?'#f87171':'#f59e0b',
                  color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
                {deleteM.isPending||suspendM.isPending?'Procesando…'
                  :confirmDel.action==='delete'?'Sí, eliminar':'Sí, suspender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
