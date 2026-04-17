import AppLayout from '../../components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';
import { useState } from 'react';

const TIPOS_EVENTO = [
  { id:'VACACIONES',   label:'Vacaciones' },
  { id:'PERMISO',      label:'Permiso' },
  { id:'SUSPENSION',   label:'Suspensión' },
  { id:'BAJA',         label:'Baja' },
  { id:'INCAPACIDAD',  label:'Incapacidad' },
  { id:'AMONESTACION', label:'Amonestación' },
  { id:'OTRO',         label:'Otro' },
];

const STATUS_EVENT_COLOR: Record<string,string> = {
  PENDIENTE:'#f59e0b', APROBADO:'#10b981', RECHAZADO:'#f87171'
};

export default function ExpedientePage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const esAdmin = ['admin','administrador','gerente','rh'].includes(role);

  const [tab,       setTab]       = useState('datos');
  const [editando,  setEditando]  = useState(false);
  const [editForm,  setEditForm]  = useState<any>({});
  const [eventoModal, setEventoModal] = useState(false);
  const [vacModal,    setVacModal]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const [eventoForm, setEventoForm] = useState({
    type: 'PERMISO',
    fechaSolicitud: new Date().toISOString().slice(0,10),
    fechaInicio: '', fechaFin: '',
    conGoce: true,
    description: '', resolution: '',
  });
  const [vacForm, setVacForm] = useState({
    type: 'VACACIONES', startDate: '', endDate: '', days: 0, notes: '',
  });

  const { data: emp, isLoading, refetch } = useQuery({
    queryKey: ['employee', id],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees/${id}`).then(r => r.data),
    enabled:  !!cid && !!id,
  });

  const editarM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/rh/employees/${id}`, editForm),
    onSuccess: () => { setEditando(false); refetch(); qc.invalidateQueries({ queryKey: ['employees', cid] }); },
  });

  const eventoM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/rh/employees/${id}/events`, { ...eventoForm, date: eventoForm.fechaSolicitud }),
    onSuccess: () => { setEventoModal(false); setEventoForm({ type:'PERMISO', fechaSolicitud:new Date().toISOString().slice(0,10), fechaInicio:'', fechaFin:'', conGoce:true, description:'', resolution:'' }); refetch(); },
  });

  const vacM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/rh/employees/${id}/vacations`, vacForm),
    onSuccess: () => { setVacModal(false); setVacForm({ type:'VACACIONES', startDate:'', endDate:'', days:0, notes:'' }); refetch(); },
  });

  const aprobarVacM = useMutation({
    mutationFn: (vacId: string) => api.put(`/companies/${cid}/rh/vacations/${vacId}`, { status:'APROBADO' }),
    onSuccess: () => refetch(),
  });

  const rechazarVacM = useMutation({
    mutationFn: (vacId: string) => api.put(`/companies/${cid}/rh/vacations/${vacId}`, { status:'RECHAZADO' }),
    onSuccess: () => refetch(),
  });

  const darDeBajaM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/rh/employees/${id}`, {
      status: 'BAJA', endDate: new Date().toISOString().slice(0,10)
    }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['employees', cid] }); },
  });

  if (isLoading) return <AppLayout><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,color:'#64748b'}}>Cargando…</div></AppLayout>;
  if (!emp)     return <AppLayout><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,color:'#64748b'}}>No encontrado</div></AppLayout>;

  const fullName = `${emp.firstName} ${emp.lastName} ${emp.secondLastName||''}`.trim();
  const TABS = ['datos','vacaciones','eventos','documentos','nómina'];

  const setEF = (k: string, v: any) => setEditForm((f:any) => ({...f,[k]:v}));
  const setEv = (k: string, v: any) => setEventoForm(f => ({...f,[k]:v}));
  const setVF = (k: string, v: any) => setVacForm(f => ({...f,[k]:v}));

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <button onClick={() => navigate('/rh')}
          style={{ background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:13,marginBottom:12,padding:0 }}>
          ← Volver
        </button>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 6px' }}>{fullName}</h1>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <code style={{ fontSize:11, background:'#334155', padding:'2px 8px', borderRadius:4 }}>{emp.employeeNumber}</code>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{emp.position}</span>
              {emp.department && <span style={{ fontSize:12, color:'#64748b' }}>{emp.department}</span>}
              <span className={emp.status==='ACTIVO'?'badge-green':emp.status==='BAJA'?'badge-red':'badge-amber'}>
                {emp.status}
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ textAlign:'right', marginRight:8 }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>Salario mensual</p>
              <p style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{fmt(emp.grossSalary)}</p>
              <p style={{ fontSize:11, color:'#64748b', margin:0 }}>Ingreso: {fmtDate(emp.startDate)}</p>
            </div>
            {esAdmin && emp.status === 'ACTIVO' && (
              <>
                <button onClick={() => { setEditForm({...emp}); setEditando(true); setTab('datos'); }}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12 }}>
                  ✏ Editar
                </button>

                {emp.status !== 'BAJA' && (
                  <button onClick={() => { if(confirm('¿Confirmas la baja del empleado?')) darDeBajaM.mutate(); }}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                    Dar de baja
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:20, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'10px 16px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===t?`2px solid ${color}`:'2px solid transparent',
                color: tab===t?color:'#64748b', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── DATOS ── */}
        {tab==='datos' && !editando && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { title:'Datos personales', items:[
                ['RFC',emp.rfc||'—'],['CURP',emp.curp||'—'],['NSS',emp.nss||'—'],
                ['Fecha nac.',emp.birthDate?fmtDate(emp.birthDate):'—'],
                ['Teléfono',emp.phone||'—'],['Email',emp.email||'—'],
                ['Dirección',emp.address||'—'],
              ]},
              { title:'Datos laborales', items:[
                ['Puesto',emp.position],['Área',emp.department||'—'],
                ['Contrato',emp.contractType],['Salario diario',fmt(emp.dailySalary)],
                ['CLABE',emp.bankAccount||'—'],['Banco',emp.bankName||'—'],
                ['REPSE',emp.repseNumber||'—'],
              ]},
            ].map(card => (
              <div key={card.title} className="card">
                <p style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>{card.title}</p>
                {card.items.map(([label,value]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, paddingBottom:6, borderBottom:'1px solid #1e293b' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:500 }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── EDITAR DATOS ── */}
        {tab==='datos' && editando && (
          <div className="card">
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Editar datos del empleado</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
              {[
                ['Nombre *','firstName','text'],['Apellido paterno *','lastName','text'],
                ['Apellido materno','secondLastName','text'],['RFC','rfc','text'],
                ['CURP','curp','text'],['NSS','nss','text'],
                ['Teléfono','phone','text'],['Email','email','email'],
                ['Puesto *','position','text'],['Área','department','text'],
              ].map(([label,key,type]) => (
                <div key={key as string}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{label}</label>
                  <input className="input-base" type={type as string} style={{ fontSize:13 }}
                    value={editForm[key as string]||''}
                    onChange={e => setEF(key as string, e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Salario bruto *</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={editForm.grossSalary||''} onChange={e=>setEF('grossSalary',+e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Salario diario</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={editForm.dailySalary||''} onChange={e=>setEF('dailySalary',+e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>CLABE</label>
                <input className="input-base" style={{ fontSize:13 }} value={editForm.bankAccount||''}
                  onChange={e=>setEF('bankAccount',e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Banco</label>
                <input className="input-base" style={{ fontSize:13 }} value={editForm.bankName||''}
                  onChange={e=>setEF('bankName',e.target.value)}/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, marginBottom:8 }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
              <button className="btn-primary" style={{ background:color }}
                onClick={() => editarM.mutate()} disabled={editarM.isPending}>
                {editarM.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* ── VACACIONES / PERMISOS ── */}
        {tab==='vacaciones' && (
          <>
            {esAdmin && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
                <button onClick={() => setVacModal(true)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
                    background:'none', color, cursor:'pointer', fontSize:12 }}>
                  + Nueva solicitud
                </button>
              </div>
            )}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead><tr>
                  <th>Tipo</th><th>Inicio</th><th>Fin</th>
                  <th style={{textAlign:'right'}}>Días</th>
                  <th>Estado</th>
                  {esAdmin && <th>Acciones</th>}
                </tr></thead>
                <tbody>
                  {(emp.vacations||[]).length===0 && (
                    <tr><td colSpan={esAdmin?6:5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin solicitudes</td></tr>
                  )}
                  {(emp.vacations||[]).map((v:any) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight:500 }}>{v.type}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(v.startDate)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(v.endDate)}</td>
                      <td style={{ textAlign:'right', fontWeight:600 }}>{v.days}</td>
                      <td>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                          background:(STATUS_EVENT_COLOR[v.status]||'#64748b')+'22',
                          color: STATUS_EVENT_COLOR[v.status]||'#64748b' }}>
                          {v.status}
                        </span>
                      </td>
                      {esAdmin && (
                        <td>
                          {v.status === 'PENDIENTE' && (
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => aprobarVacM.mutate(v.id)}
                                style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                                ✓ Aprobar
                              </button>
                              <button onClick={() => rechazarVacM.mutate(v.id)}
                                style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                                ✕ Rechazar
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── EVENTOS ── */}
        {tab==='eventos' && (
          <>
            {esAdmin && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
                <button onClick={() => setEventoModal(true)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
                    background:'none', color, cursor:'pointer', fontSize:12 }}>
                  + Registrar evento
                </button>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(emp.hrEvents||[]).length===0 && (
                <p style={{ color:'#64748b', textAlign:'center', padding:32 }}>Sin eventos registrados</p>
              )}
              {(emp.hrEvents||[]).map((ev:any) => (
                <div key={ev.id} className="card" style={{ borderLeft:`3px solid ${color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{ev.type.replace(/_/g,' ')}</span>
                    <span style={{ fontSize:12, color:'#64748b' }}>{fmtDate(ev.date)}</span>
                  </div>
                  <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{ev.description}</p>
                  {ev.resolution && (
                    <p style={{ fontSize:12, color:'#60a5fa', margin:'4px 0 0' }}>
                      Resolución: {ev.resolution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── DOCUMENTOS ── */}
        {tab==='documentos' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Tipo</th><th>Título</th><th>Firmado</th><th>Vencimiento</th><th>Estado</th>
              </tr></thead>
              <tbody>
                {(emp.documents||[]).length===0 && (
                  <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin documentos</td></tr>
                )}
                {(emp.documents||[]).map((d:any) => (
                  <tr key={d.id}>
                    <td><span style={{ fontSize:11, background:'#334155', padding:'2px 6px', borderRadius:4 }}>{d.type}</span></td>
                    <td style={{fontWeight:500}}>{d.title}</td>
                    <td>{d.signedAt?fmtDate(d.signedAt):'—'}</td>
                    <td>{d.endDate?fmtDate(d.endDate):'—'}</td>
                    <td>
                      <span className={d.status==='VIGENTE'?'badge-green':d.status==='VENCIDO'?'badge-red':'badge-gray'}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── NÓMINA ── */}
        {tab==='nómina' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Período</th>
                <th style={{textAlign:'right'}}>Percepciones</th>
                <th style={{textAlign:'right'}}>Deducciones</th>
                <th style={{textAlign:'right'}}>Neto</th>
              </tr></thead>
              <tbody>
                {(emp.payrollLines||[]).length===0 && (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin registros de nómina</td></tr>
                )}
                {(emp.payrollLines||[]).map((l:any) => (
                  <tr key={l.id}>
                    <td>{l.period?.periodLabel}</td>
                    <td style={{textAlign:'right',color:'#10b981'}}>{fmt(l.totalPerceptions)}</td>
                    <td style={{textAlign:'right',color:'#f87171'}}>{fmt(l.totalDeductions)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(l.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo evento */}
      {eventoModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:440,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,margin:0,color}}>Registrar evento</h3>
              <button onClick={()=>setEventoModal(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div style={{gridColumn:'span 2'}}>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Tipo de evento</label>
                <select className="input-base" style={{fontSize:13}} value={eventoForm.type}
                  onChange={e=>setEv('type',e.target.value)}>
                  {TIPOS_EVENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha de solicitud</label>
                <input type="date" className="input-base" style={{fontSize:13}} value={eventoForm.fechaSolicitud}
                  onChange={e=>setEv('fechaSolicitud',e.target.value)}/>
              </div>
              {['PERMISO','SUSPENSION','INCAPACIDAD','VACACIONES'].includes(eventoForm.type) && (<>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha inicio del período</label>
                  <input type="date" className="input-base" style={{fontSize:13}} value={eventoForm.fechaInicio}
                    onChange={e=>setEv('fechaInicio',e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha fin del período</label>
                  <input type="date" className="input-base" style={{fontSize:13}} value={eventoForm.fechaFin}
                    onChange={e=>setEv('fechaFin',e.target.value)}/>
                </div>
              </>)}
              {eventoForm.type === 'PERMISO' && (
                <div style={{gridColumn:'span 2'}}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:6}}>Tipo de permiso</label>
                  <div style={{display:'flex',gap:8}}>
                    {[{v:true,l:'Con goce de sueldo'},{v:false,l:'Sin goce de sueldo'}].map(op=>(
                      <button key={String(op.v)} onClick={()=>setEv('conGoce',op.v)}
                        style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontSize:12,
                          border:`1px solid ${eventoForm.conGoce===op.v?color:'#334155'}`,
                          background:eventoForm.conGoce===op.v?color+'22':'transparent',
                          color:eventoForm.conGoce===op.v?color:'#64748b'}}>
                        {op.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{gridColumn:'span 2'}}>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Descripción / Motivo *</label>
                <textarea className="input-base" style={{fontSize:13,height:80,resize:'none'}}
                  value={eventoForm.description} onChange={e=>setEv('description',e.target.value)}
                  placeholder="Describe el motivo de la solicitud..."/>
              </div>
              {esAdmin && (
                <div style={{gridColumn:'span 2'}}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>
                    Resolución <span style={{color:'#475569'}}>(solo RH/Admin)</span>
                  </label>
                  <input className="input-base" style={{fontSize:13}} value={eventoForm.resolution}
                    onChange={e=>setEv('resolution',e.target.value)} placeholder="Acuerdo o resolución"/>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>setEventoModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,fontSize:13,background:color}}
                onClick={()=>eventoM.mutate()} disabled={eventoM.isPending||!eventoForm.description}>
                {eventoM.isPending?'Guardando…':'Registrar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva solicitud vacaciones/permiso */}
      {vacModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:420,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,margin:0,color}}>Nueva solicitud</h3>
              <button onClick={()=>setVacModal(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Tipo</label>
                <select className="input-base" style={{fontSize:13}} value={vacForm.type}
                  onChange={e=>setVF('type',e.target.value)}>
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="INCAPACIDAD">Incapacidad</option>
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha inicio</label>
                  <input type="date" className="input-base" style={{fontSize:13}} value={vacForm.startDate}
                    onChange={e=>{
                      const s=e.target.value;
                      const days = vacForm.endDate ? Math.ceil((new Date(vacForm.endDate).getTime()-new Date(s).getTime())/(1000*60*60*24))+1 : 0;
                      setVacForm(f=>({...f,startDate:s,days:Math.max(0,days)}));
                    }}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha fin</label>
                  <input type="date" className="input-base" style={{fontSize:13}} value={vacForm.endDate}
                    onChange={e=>{
                      const en=e.target.value;
                      const days = vacForm.startDate ? Math.ceil((new Date(en).getTime()-new Date(vacForm.startDate).getTime())/(1000*60*60*24))+1 : 0;
                      setVacForm(f=>({...f,endDate:en,days:Math.max(0,days)}));
                    }}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Días</label>
                <input type="number" min="1" className="input-base" style={{fontSize:13}} value={vacForm.days||''}
                  onChange={e=>setVF('days',+e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Notas</label>
                <input className="input-base" style={{fontSize:13}} value={vacForm.notes}
                  onChange={e=>setVF('notes',e.target.value)} placeholder="Motivo (opcional)"/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>setVacModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,fontSize:13,background:color}}
                onClick={()=>vacM.mutate()} disabled={vacM.isPending||!vacForm.startDate||!vacForm.endDate}>
                {vacM.isPending?'Guardando…':'Registrar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
