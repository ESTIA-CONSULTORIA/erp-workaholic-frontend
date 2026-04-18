// src/pages/rh/RH.tsx
import AppLayout from '../../components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import ImportCSV from '../../components/ImportCSV';

const TIPOS_SOLICITUD = [
  { id: 'VACACIONES',          label: 'Vacaciones',           goce: true  },
  { id: 'PERMISO_CON_GOCE',    label: 'Permiso con goce',     goce: true  },
  { id: 'PERMISO_SIN_GOCE',    label: 'Permiso sin goce',     goce: false },
  { id: 'SUSPENSION',          label: 'Suspensión',           goce: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE:      { label: 'Pendiente jefe',  color: '#f59e0b' },
  APROBADO_JEFE:  { label: 'Pend. RH',        color: '#3b82f6' },
  APROBADO:       { label: 'Aprobado',         color: '#10b981' },
  RECHAZADO:      { label: 'Rechazado',        color: '#f87171' },
  CANCELADO:      { label: 'Cancelado',        color: '#64748b' },
};

function NuevoEmpleadoForm({ companyId, color, onSuccess }: any) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    firstName:'', lastName:'', secondLastName:'',
    rfc:'', curp:'', nss:'', phone:'', email:'',
    position:'', department:'', startDate:today,
    contractType:'INDEFINIDO', grossSalary:'', dailySalary:'',
    bankAccount:'', bankName:'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!form.firstName || !form.lastName || !form.position) return;
    setSaving(true);
    try {
      await api.post(`/companies/${companyId}/rh/employees`, {
        ...form,
        grossSalary: Number(form.grossSalary),
        dailySalary: form.dailySalary ? Number(form.dailySalary) : Number(form.grossSalary) / 30,
      });
      onSuccess();
    } finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>
        {label}{required && ' *'}
      </label>
      <input type={type} className="input-base" style={{ fontSize:13 }}
        value={(form as any)[key]} onChange={e => set(key, e.target.value)}/>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom:20 }}>
      <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nuevo empleado</h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
        {field('Nombre *',          'firstName',  'text', true)}
        {field('Apellido paterno *','lastName',   'text', true)}
        {field('Apellido materno',  'secondLastName')}
        {field('Puesto *',          'position',   'text', true)}
        {field('Área / Depto',      'department')}
        {field('Fecha ingreso *',   'startDate',  'date', true)}
        {field('Salario bruto',     'grossSalary','number')}
        {field('Salario diario',    'dailySalary','number')}
        {field('RFC',               'rfc')}
        {field('CURP',              'curp')}
        {field('NSS',               'nss')}
        {field('Teléfono',          'phone')}
        {field('Email',             'email', 'email')}
        {field('CLABE',             'bankAccount')}
        {field('Banco',             'bankName')}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo contrato</label>
          <select className="input-base" style={{ fontSize:13 }} value={form.contractType}
            onChange={e => set('contractType', e.target.value)}>
            {['INDEFINIDO','DETERMINADO','OBRA','HONORARIOS'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button className="btn-secondary" style={{ fontSize:12 }} onClick={onSuccess}>Cancelar</button>
        <button className="btn-primary" style={{ background:color, fontSize:12 }}
          onClick={guardar} disabled={saving || !form.firstName || !form.position}>
          {saving ? 'Guardando…' : 'Crear empleado'}
        </button>
      </div>
    </div>
  );
}

export default function RHPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();
  const navigate = useNavigate();

  const [tab,          setTab]          = useState<'empleados'|'solicitudes'>('empleados');
  const [showNew,      setShowNew]      = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('ACTIVO');
  const [showSolicitud,setShowSolicitud]= useState(false);
  const [solForm,      setSolForm]      = useState({
    employeeId:'', type:'VACACIONES', startDate:'', endDate:'', notes:'', conGoce: true,
  });
  const [saving, setSaving] = useState(false);

  const esRH    = ['admin','administrador','rh'].includes(role);
  const esJefe  = ['admin','administrador','gerente'].includes(role);
  const rolLabel = esRH ? 'rh' : esJefe ? 'jefe' : 'empleado';

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees', cid, filterStatus],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=${filterStatus}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: solicitudes = [], refetch: refetchSol } = useQuery({
    queryKey: ['rh-requests', cid, rolLabel],
    queryFn:  () => api.get(`/companies/${cid}/rh/requests?role=${rolLabel}`).then(r => r.data),
    enabled:  !!cid,
  });

  const pendientes = (solicitudes as any[]).filter(s =>
    s.status === 'PENDIENTE' || s.status === 'APROBADO_JEFE'
  ).length;

  const crearSolicitud = async () => {
    if (!solForm.employeeId || !solForm.startDate || !solForm.endDate) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/rh/employees/${solForm.employeeId}/vacations`, solForm);
      setShowSolicitud(false);
      setSolForm({ employeeId:'', type:'VACACIONES', startDate:'', endDate:'', notes:'', conGoce: true });
      refetchSol();
    } finally { setSaving(false); }
  };

  const aprobar = async (id: string, approved: boolean, reason?: string) => {
    await api.put(`/companies/${cid}/rh/vacations/${id}/approve`, {
      approved, role: rolLabel, reason,
    });
    refetchSol();
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Recursos Humanos</h1>
          <div style={{ display:'flex', gap:8 }}>
            {esRH && (
              <button className="btn-secondary" style={{ fontSize:12 }}
                onClick={() => setShowImport(s => !s)}>
                ⬆ Importar CSV
              </button>
            )}
            {(esRH || esJefe) && (
              <button className="btn-primary" style={{ background:color, fontSize:12 }}
                onClick={() => setShowSolicitud(true)}>
                + Nueva solicitud
              </button>
            )}
            {esRH && (
              <button className="btn-primary" style={{ background:color, fontSize:12 }}
                onClick={() => setShowNew(s => !s)}>
                + Nuevo empleado
              </button>
            )}
          </div>
        </div>

        {showNew && (
          <NuevoEmpleadoForm companyId={cid} color={color} onSuccess={() => { setShowNew(false); refetch(); }}/>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid #334155' }}>
          {[
            { id:'empleados',   label:'Empleados' },
            { id:'solicitudes', label:`Solicitudes${pendientes > 0 ? ` (${pendientes})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontSize:13,
                background: tab === t.id ? '#1e293b' : 'transparent',
                color: tab === t.id ? color : '#64748b',
                fontWeight: tab === t.id ? 700 : 400,
                borderBottom: tab === t.id ? `2px solid ${color}` : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Empleados */}
        {tab === 'empleados' && (
          <>
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {['ACTIVO','BAJA','SUSPENDIDO'].map(st => (
                <button key={st} onClick={() => setFilterStatus(st)}
                  style={{ padding:'5px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
                    border:`1px solid ${filterStatus===st?color:'#334155'}`,
                    background:filterStatus===st?color+'22':'transparent',
                    color:filterStatus===st?color:'#64748b', fontWeight:filterStatus===st?700:400 }}>
                  {st}
                </button>
              ))}
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead><tr>
                  <th>#</th><th>Nombre</th><th>Puesto</th><th>Ingreso</th>
                  <th style={{textAlign:'right'}}>Salario</th><th>Estado</th><th>Expediente</th>
                </tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                  {!isLoading && (employees as any[]).length===0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin empleados</td></tr>
                  )}
                  {(employees as any[]).map((e:any) => (
                    <tr key={e.id}>
                      <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{e.employeeNumber}</code></td>
                      <td style={{fontWeight:500}}>{e.firstName} {e.lastName}</td>
                      <td>{e.position}</td>
                      <td>{fmtDate(e.startDate)}</td>
                      <td style={{textAlign:'right',fontWeight:600,color}}>${Number(e.grossSalary).toLocaleString('es-MX')}</td>
                      <td><span className={e.status==='ACTIVO'?'badge-green':e.status==='BAJA'?'badge-red':'badge-amber'}>{e.status}</span></td>
                      <td>
                        <button onClick={() => navigate(`/rh/empleados/${e.id}`)}
                          style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                          Ver expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab: Solicitudes */}
        {tab === 'solicitudes' && (
          <div>
            {/* Nueva solicitud modal */}
            {showSolicitud && (
              <div className="card" style={{ marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Nueva solicitud</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Empleado *</label>
                    <select className="input-base" style={{ fontSize:13 }} value={solForm.employeeId}
                      onChange={e => setSolForm(f => ({ ...f, employeeId: e.target.value }))}>
                      <option value="">— Seleccionar —</option>
                      {(employees as any[]).filter((e:any) => e.status === 'ACTIVO').map((e:any) => (
                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.position}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo</label>
                    <select className="input-base" style={{ fontSize:13 }} value={solForm.type}
                      onChange={e => setSolForm(f => ({ ...f, type: e.target.value, conGoce: TIPOS_SOLICITUD.find(t => t.id===e.target.value)?.goce ?? true }))}>
                      {TIPOS_SOLICITUD.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha inicio *</label>
                    <input type="date" className="input-base" style={{ fontSize:13 }} value={solForm.startDate}
                      onChange={e => setSolForm(f => ({ ...f, startDate: e.target.value }))}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha fin *</label>
                    <input type="date" className="input-base" style={{ fontSize:13 }} value={solForm.endDate}
                      onChange={e => setSolForm(f => ({ ...f, endDate: e.target.value }))}/>
                  </div>
                  <div style={{ gridColumn:'span 2' }}>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                    <input className="input-base" style={{ fontSize:13 }} value={solForm.notes}
                      onChange={e => setSolForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Motivo o comentario adicional"/>
                  </div>
                </div>
                {/* Indicador de goce */}
                <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8,
                  background: solForm.conGoce ? '#10b98111' : '#f8717111',
                  border: `1px solid ${solForm.conGoce ? '#10b98133' : '#f8717133'}` }}>
                  <span style={{ fontSize:12, color: solForm.conGoce ? '#10b981' : '#f87171' }}>
                    {solForm.conGoce ? '✓ Con goce de sueldo — no afecta nómina' : '✕ Sin goce de sueldo — se descuenta en nómina'}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => setShowSolicitud(false)}>Cancelar</button>
                  <button className="btn-primary" style={{ background:color, fontSize:12 }}
                    onClick={crearSolicitud}
                    disabled={saving || !solForm.employeeId || !solForm.startDate || !solForm.endDate}>
                    {saving ? 'Enviando…' : 'Enviar solicitud'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de solicitudes */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead><tr>
                  <th>Empleado</th><th>Tipo</th><th>Período</th>
                  <th>Días</th><th>Estado</th>
                  {(esJefe || esRH) && <th>Acciones</th>}
                </tr></thead>
                <tbody>
                  {(solicitudes as any[]).length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin solicitudes</td></tr>
                  )}
                  {(solicitudes as any[]).map((s:any) => {
                    const st = STATUS_CONFIG[s.status] || { label: s.status, color: '#64748b' };
                    const tipo = TIPOS_SOLICITUD.find(t => t.id === s.type);
                    const canApproveJefe = esJefe && s.status === 'PENDIENTE';
                    const canApproveRH   = esRH   && s.status === 'APROBADO_JEFE';

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight:500 }}>
                          {s.employee?.firstName} {s.employee?.lastName}
                          <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{s.employee?.position}</p>
                        </td>
                        <td>
                          <span style={{ fontSize:11 }}>{tipo?.label || s.type}</span>
                          <p style={{ fontSize:10, margin:0, color: s.conGoce?'#10b981':'#f87171' }}>
                            {s.conGoce ? 'Con goce' : 'Sin goce'}
                          </p>
                        </td>
                        <td style={{ fontSize:12 }}>
                          {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                        </td>
                        <td style={{ textAlign:'center' }}>
                          <p style={{ margin:0, fontWeight:600 }}>{s.days}</p>
                          {s.businessDays && s.businessDays !== s.days && (
                            <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{s.businessDays} hábiles</p>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background: st.color + '22', color: st.color, fontWeight:600 }}>
                            {st.label}
                          </span>
                        </td>
                        {(esJefe || esRH) && (
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              {(canApproveJefe || canApproveRH) && (
                                <>
                                  <button onClick={() => aprobar(s.id, true)}
                                    style={{ padding:'3px 10px', borderRadius:5, border:'1px solid #10b981',
                                      background:'none', color:'#10b981', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                                    ✓ {canApproveJefe ? 'Aprobar' : 'Aprobar (RH)'}
                                  </button>
                                  <button onClick={() => {
                                    const reason = window.prompt('Motivo de rechazo:');
                                    if (reason !== null) aprobar(s.id, false, reason);
                                  }}
                                    style={{ padding:'3px 10px', borderRadius:5, border:'1px solid #f87171',
                                      background:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>
                                    ✕ Rechazar
                                  </button>
                                </>
                              )}
                              {s.primaVacacional > 0 && s.status === 'APROBADO' && (
                                <span style={{ fontSize:10, color:'#f59e0b', padding:'3px 8px', borderRadius:5,
                                  border:'1px solid #f59e0b44', background:'#f59e0b11' }}>
                                  Prima: {fmt(s.primaVacacional)}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showImport && (
          <ImportCSV title="Empleados" color={color}
            columns={[
              { key:'nombre',    label:'Nombre',        required:true },
              { key:'apellido',  label:'Apellido paterno', required:true },
              { key:'apellido2', label:'Apellido materno' },
              { key:'puesto',    label:'Puesto',        required:true },
              { key:'area',      label:'Área' },
              { key:'salario',   label:'Salario bruto', type:'number' },
              { key:'ingreso',   label:'Fecha ingreso', type:'date' },
              { key:'rfc',       label:'RFC' },
              { key:'curp',      label:'CURP' },
              { key:'nss',       label:'NSS' },
              { key:'email',     label:'Email' },
              { key:'telefono',  label:'Teléfono' },
              { key:'clabe',     label:'CLABE' },
              { key:'banco',     label:'Banco' },
            ]}
            onImport={async (rows) => {
              const res = await api.post(`/companies/${cid}/import/empleados`, { rows });
              refetch();
              return res.data;
            }}
            onClose={() => setShowImport(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
