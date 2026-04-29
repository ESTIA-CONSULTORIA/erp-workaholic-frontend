// ╔══════════════════════════════════════════════════════════════╗
// ║  EXPEDIENTE DEL EMPLEADO — Vista completa                   ║
// ║  Tabs: Datos · Contratos · Vacaciones · Incidencias ·       ║
// ║        Incapacidades · Nómina · Documentos · Legal          ║
// ╚══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

type Tab = 'datos'|'contratos'|'vacaciones'|'incidencias'|'incapacidades'|'nomina'|'documentos'|'legal';

const STATUS_COLOR: Record<string,string> = {
  ACTIVO:'#10b981',VIGENTE:'#10b981',APROBADO:'#10b981',FIRMADO:'#10b981',
  BAJA:'#f87171',CANCELADO:'#f87171',RECHAZADO:'#f87171',
  PENDIENTE:'#f59e0b',BORRADOR:'#f59e0b',
  SUSPENDIDO:'#8b5cf6',GENERADO:'#3b82f6',
};
const sc = (s:string) => STATUS_COLOR[s] || '#64748b';

const TIPO_DOC_LABELS: Record<string,string> = {
  CARTA_TRABAJO:'Carta trabajo', FINIQUITO:'Finiquito', LIQUIDACION:'Liquidación',
  ACTA_ADMINISTRATIVA:'Acta admin.', CONVENIO:'Convenio', RENUNCIA:'Renuncia',
  AVISO_RETENCION:'Aviso retención', CONTRATO:'Contrato',
};

const CONTRATO_TIPOS = ['INDEFINIDO','DETERMINADO','HONORARIOS','PRUEBA','EVENTUAL'];
const HORARIO_TIPOS  = ['COMPLETO','MEDIO_TIEMPO','POR_HORAS'];

function Badge({ label, status }: { label:string; status:string }) {
  const c = sc(status);
  return (
    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, fontWeight:600,
      background:c+'22', color:c }}>
      {label}
    </span>
  );
}

export default function ExpedientePage() {
  const { id }  = useParams<{ id: string }>();
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();
  const nav   = useNavigate();

  const [tab,        setTab]        = useState<Tab>('datos');
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState<any>({});
  const [showContrato, setShowContrato] = useState(false);
  const [contratoForm, setContratoForm] = useState({type:'INDEFINIDO',startDate:'',endDate:'',workSchedule:'COMPLETO',notes:''});
  const [showLegalDoc, setShowLegalDoc] = useState(false);
  const [legalForm,  setLegalForm]  = useState({type:'CARTA_TRABAJO',notes:''});

  // ── Main query: expediente completo ──────────────────────────
  const { data: emp, isLoading } = useQuery({
    queryKey: ['expediente', cid, id],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees/${id}/expediente`).then(r => r.data),
    enabled:  !!cid && !!id,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/rh/employees/${id}`, editForm),
    onSuccess: () => { setEditMode(false); qc.invalidateQueries({ queryKey: ['expediente', cid, id] }); },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const contratoM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/rh/employees/${id}/contracts`, contratoForm),
    onSuccess: () => { setShowContrato(false); setContratoForm({type:'INDEFINIDO',startDate:'',endDate:'',workSchedule:'COMPLETO',notes:''}); qc.invalidateQueries({ queryKey: ['expediente', cid, id] }); },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const cancelContratoM = useMutation({
    mutationFn: (cid2:string) => api.put(`/companies/${cid}/rh/contracts/${cid2}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expediente', cid, id] }),
  });

  const legalDocM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/legal/generate`, { ...legalForm, employeeId: id }),
    onSuccess: () => { setShowLegalDoc(false); setLegalForm({type:'CARTA_TRABAJO',notes:''}); qc.invalidateQueries({ queryKey: ['expediente', cid, id] }); },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const signDocM = useMutation({
    mutationFn: ({ docId, byEmployee }: any) => api.put(`/companies/${cid}/legal/${docId}/sign`, { byEmployee }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expediente', cid, id] }),
  });

  if (isLoading) return (
    <AppLayout>
      <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
        <p style={{ fontSize:32, margin:'0 0 12px' }}>⏳</p>
        <p>Cargando expediente…</p>
      </div>
    </AppLayout>
  );

  if (!emp) return (
    <AppLayout>
      <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
        <p>Empleado no encontrado</p>
        <button onClick={() => nav(-1)} style={{ marginTop:16, padding:'8px 18px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>← Regresar</button>
      </div>
    </AppLayout>
  );

  const TABS: { id:Tab; label:string; icon:string; count?:number }[] = [
    { id:'datos',        label:'Datos',          icon:'👤' },
    { id:'contratos',    label:'Contratos',       icon:'📋', count:(emp.contracts||[]).filter((c:any)=>c.status==='VIGENTE').length },
    { id:'vacaciones',   label:'Vacaciones',      icon:'🏖',  count:(emp.vacations||[]).filter((v:any)=>v.status==='PENDIENTE').length },
    { id:'incidencias',  label:'Incidencias',     icon:'⚠',   count:(emp.hrIncidents||[]).filter((i:any)=>!i.resolved).length },
    { id:'incapacidades',label:'Incapacidades',   icon:'🏥',  count:(emp.disabilities||[]).filter((d:any)=>d.status==='ACTIVA').length },
    { id:'nomina',       label:'Nómina',          icon:'💰' },
    { id:'documentos',   label:'Documentos',      icon:'📄',  count:(emp.documents||[]).filter((d:any)=>d.status==='VIGENTE').length },
    { id:'legal',        label:'Legal',           icon:'⚖',   count:(emp.legalDocuments||[]).length },
  ];

  const fullName = `${emp.firstName} ${emp.lastName}${emp.secondLastName ? ' '+emp.secondLastName : ''}`;
  const contratoVigente = (emp.contracts||[]).find((c:any) => c.status === 'VIGENTE');

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <button onClick={() => nav(-1)}
              style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ← Empleados
            </button>
            <div style={{ width:44, height:44, borderRadius:'50%', background:color+'22',
              border:`2px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, fontWeight:800, color }}>
              {emp.firstName[0]}{emp.lastName[0]}
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, margin:'0 0 3px' }}>{fullName}</h1>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>#{emp.employeeNumber} · {emp.position}</span>
                <Badge label={emp.status} status={emp.status} />
                {contratoVigente && (
                  <span style={{ fontSize:10, color:'#64748b' }}>
                    Contrato {contratoVigente.type} desde {fmtDate(contratoVigente.startDate)}
                    {contratoVigente.endDate && ` hasta ${fmtDate(contratoVigente.endDate)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {!editMode && (
              <button onClick={() => { setEditForm({...emp}); setEditMode(true); }}
                style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                ✎ Editar
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:2, background:'#0f172a', borderRadius:9, padding:3, marginBottom:16, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'6px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
                background: tab===t.id ? color : 'transparent',
                color: tab===t.id ? '#fff' : '#64748b',
                display:'flex', alignItems:'center', gap:5 }}>
              {t.icon} {t.label}
              {!!t.count && (
                <span style={{ background: tab===t.id ? '#ffffff44' : color+'44', color: tab===t.id ? '#fff' : color,
                  fontSize:9, fontWeight:800, padding:'1px 5px', borderRadius:99 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: DATOS                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'datos' && (
          <div>
            {editMode ? (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
                  {[
                    ['Nombre(s)','firstName'],['Apellido Paterno','lastName'],['Apellido Materno','secondLastName'],
                    ['RFC','rfc'],['CURP','curp'],['NSS','nss'],
                    ['Puesto','position'],['Departamento','department'],['Teléfono','phone'],
                    ['Email','email'],['Banco','bankName'],['Cuenta bancaria','bankAccount'],
                    ['REPSE','repseNumber'],
                  ].map(([label,key]) => (
                    <div key={key}>
                      <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>{label}</label>
                      <input className="input-base" style={{ fontSize:12 }} value={editForm[key]||''}
                        onChange={e => setEditForm((f:any)=>({...f,[key]:e.target.value}))}/>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Salario bruto</label>
                    <input type="number" className="input-base" style={{ fontSize:12 }} value={editForm.grossSalary||0}
                      onChange={e => setEditForm((f:any)=>({...f,grossSalary:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Tipo de nómina</label>
                    <select className="input-base" style={{ fontSize:12 }} value={editForm.splitMode||'TOTAL_TIMBRADO'}
                      onChange={e => setEditForm((f:any)=>({...f,splitMode:e.target.value}))}>
                      <option value="TOTAL_TIMBRADO">100% Timbrado</option>
                      <option value="MIXTO">Mixto</option>
                      <option value="TOTAL_EFECTIVO">100% Efectivo</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Estado</label>
                    <select className="input-base" style={{ fontSize:12 }} value={editForm.status||'ACTIVO'}
                      onChange={e => setEditForm((f:any)=>({...f,status:e.target.value}))}>
                      {['ACTIVO','BAJA','SUSPENDIDO'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setEditMode(false)}
                    style={{ padding:'9px 20px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                    Cancelar
                  </button>
                  <button onClick={() => updateM.mutate()} disabled={updateM.isPending}
                    style={{ padding:'9px 24px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                    {updateM.isPending ? 'Guardando…' : '💾 Guardar cambios'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {/* Datos personales */}
                <Section title="Datos personales" icon="👤">
                  {[
                    ['Nombre completo', fullName],
                    ['RFC', emp.rfc],
                    ['CURP', emp.curp],
                    ['NSS (IMSS)', emp.nss],
                    ['Fecha nacimiento', fmtDate(emp.birthDate)],
                    ['Género', emp.gender],
                    ['Teléfono', emp.phone],
                    ['Email', emp.email],
                    ['Domicilio', emp.address],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <Row key={k as string} label={k as string} value={v as string}/>
                  ))}
                </Section>
                {/* Datos laborales */}
                <Section title="Datos laborales" icon="💼">
                  {[
                    ['No. empleado', emp.employeeNumber],
                    ['Puesto', emp.position],
                    ['Departamento', emp.department],
                    ['Fecha ingreso', fmtDate(emp.startDate)],
                    ['Tipo contrato', emp.contractType],
                    ['Tipo jornada', emp.salaryType],
                    ['Salario bruto', fmt(emp.grossSalary)],
                    ['Salario diario', fmt(emp.dailySalary)],
                    ['Tipo nómina', emp.splitMode?.replace('_',' ')],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <Row key={k as string} label={k as string} value={v as string}/>
                  ))}
                </Section>
                {/* Banco */}
                <Section title="Datos bancarios" icon="🏦">
                  {[
                    ['Banco', emp.bankName],
                    ['Cuenta / CLABE', emp.bankAccount],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <Row key={k as string} label={k as string} value={v as string}/>
                  ))}
                  {!emp.bankName && !emp.bankAccount && (
                    <p style={{ fontSize:12, color:'#334155' }}>Sin datos bancarios registrados</p>
                  )}
                </Section>
                {/* REPSE */}
                <Section title="REPSE / Outsourcing" icon="📋">
                  {[
                    ['No. REPSE', emp.repseNumber],
                    ['Vencimiento REPSE', fmtDate(emp.repseExpiry)],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <Row key={k as string} label={k as string} value={v as string}/>
                  ))}
                  {!emp.repseNumber && (
                    <p style={{ fontSize:12, color:'#334155' }}>Sin registro REPSE</p>
                  )}
                </Section>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: CONTRATOS                                          */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'contratos' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowContrato(true)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                + Nuevo contrato
              </button>
            </div>
            {(emp.contracts||[]).length === 0 ? (
              <Empty icon="📋" text="Sin contratos registrados" sub="Crea el primer contrato para este empleado"/>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(emp.contracts||[]).map((c:any) => (
                  <div key={c.id} style={{ background:'#1e293b', borderRadius:10, padding:'14px 18px',
                    border:`1px solid ${sc(c.status)}33`,
                    borderLeft:`4px solid ${sc(c.status)}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>
                            Contrato {c.type}
                          </span>
                          <Badge label={c.status} status={c.status}/>
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b' }}>
                          <span>Inicio: {fmtDate(c.startDate)}</span>
                          <span>Fin: {c.endDate ? fmtDate(c.endDate) : 'Indefinido'}</span>
                          <span>Salario: {fmt(c.salaryAtSigning)}</span>
                          <span>Puesto: {c.position}</span>
                          {c.workSchedule && <span>Jornada: {c.workSchedule.replace('_',' ')}</span>}
                        </div>
                        {c.notes && <p style={{ fontSize:11, color:'#475569', margin:'6px 0 0' }}>{c.notes}</p>}
                      </div>
                      {c.status === 'VIGENTE' && (
                        <button onClick={() => { if(window.confirm('¿Cancelar este contrato?')) cancelContratoM.mutate(c.id); }}
                          style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>
                          ✕ Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: VACACIONES                                         */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'vacaciones' && (
          <div>
            {(emp.vacations||[]).length === 0 ? (
              <Empty icon="🏖" text="Sin solicitudes de vacaciones" sub="Las solicitudes del empleado aparecerán aquí"/>
            ) : (
              <table className="table-base" style={{ background:'#1e293b', borderRadius:10 }}>
                <thead><tr>
                  <th>Tipo</th><th>Inicio</th><th>Fin</th><th>Días</th>
                  <th>Modalidad</th><th>Estado</th><th>Monto</th>
                </tr></thead>
                <tbody>
                  {(emp.vacations||[]).map((v:any) => (
                    <tr key={v.id}>
                      <td style={{ fontSize:12 }}>{v.type}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(v.startDate)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(v.endDate)}</td>
                      <td style={{ textAlign:'center', fontWeight:700 }}>{v.days}</td>
                      <td style={{ fontSize:11 }}>{v.paymentType?.replace('_',' ')}</td>
                      <td><Badge label={v.status} status={v.status}/></td>
                      <td style={{ textAlign:'right', fontSize:12 }}>
                        {v.montoPrima ? fmt(Number(v.montoTimbrado||0)+Number(v.montoPrima||0)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: INCIDENCIAS                                        */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'incidencias' && (
          <div>
            {(emp.hrIncidents||[]).length === 0 ? (
              <Empty icon="⚠" text="Sin incidencias registradas" sub="Las faltas, tardanzas y permisos aparecerán aquí"/>
            ) : (
              <table className="table-base" style={{ background:'#1e293b', borderRadius:10 }}>
                <thead><tr>
                  <th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Impacto</th><th>Estado</th>
                </tr></thead>
                <tbody>
                  {(emp.hrIncidents||[]).map((i:any) => (
                    <tr key={i.id}>
                      <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(i.date)}</td>
                      <td><Badge label={i.type} status={i.type==='FALTA'?'BAJA':i.type==='TARDANZA'?'PENDIENTE':'ACTIVO'}/></td>
                      <td style={{ fontSize:12, color:'#94a3b8' }}>{i.description||i.notes||'—'}</td>
                      <td style={{ fontSize:12, color:i.deduction>0?'#f87171':'#64748b' }}>
                        {i.deduction > 0 ? `-${fmt(i.deduction)}` : '—'}
                      </td>
                      <td><Badge label={i.resolved?'Resuelto':'Pendiente'} status={i.resolved?'ACTIVO':'PENDIENTE'}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: INCAPACIDADES                                      */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'incapacidades' && (
          <div>
            {(emp.disabilities||[]).length === 0 ? (
              <Empty icon="🏥" text="Sin incapacidades registradas"/>
            ) : (
              <table className="table-base" style={{ background:'#1e293b', borderRadius:10 }}>
                <thead><tr>
                  <th>Inicio</th><th>Fin</th><th>Días</th><th>Tipo</th><th>Folio IMSS</th><th>Estado</th>
                </tr></thead>
                <tbody>
                  {(emp.disabilities||[]).map((d:any) => (
                    <tr key={d.id}>
                      <td style={{ fontSize:12 }}>{fmtDate(d.startDate)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(d.endDate)}</td>
                      <td style={{ textAlign:'center', fontWeight:700 }}>{d.days}</td>
                      <td style={{ fontSize:12 }}>{d.type||d.disabilityType||'—'}</td>
                      <td style={{ fontSize:11, color:'#64748b' }}>{d.folioImss||d.imssNumber||'—'}</td>
                      <td><Badge label={d.status||'ACTIVA'} status={d.status||'ACTIVO'}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: NÓMINA                                             */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'nomina' && (
          <div>
            {(emp.payrollLines||[]).length === 0 ? (
              <Empty icon="💰" text="Sin recibos de nómina" sub="Los últimos 6 períodos aparecerán aquí"/>
            ) : (
              <table className="table-base" style={{ background:'#1e293b', borderRadius:10 }}>
                <thead><tr>
                  <th>Período</th><th>Tipo</th><th>Base</th>
                  <th style={{ textAlign:'right' }}>Percepciones</th>
                  <th style={{ textAlign:'right' }}>Deducciones</th>
                  <th style={{ textAlign:'right' }}>Neto</th>
                  <th style={{ textAlign:'right', color:'#3b82f6' }}>Neto SAT</th>
                </tr></thead>
                <tbody>
                  {(emp.payrollLines||[]).map((l:any) => (
                    <tr key={l.id}>
                      <td style={{ fontSize:12 }}>
                        {l.period?.name || l.period?.startDate?.slice(0,7) || '—'}
                      </td>
                      <td style={{ fontSize:11, color:'#64748b' }}>{l.period?.type||'—'}</td>
                      <td style={{ fontSize:12 }}>{fmt(l.baseSalary)}</td>
                      <td style={{ textAlign:'right', fontSize:12 }}>{fmt(l.totalPerceptions)}</td>
                      <td style={{ textAlign:'right', fontSize:12, color:'#f87171' }}>{fmt(l.totalDeductions)}</td>
                      <td style={{ textAlign:'right', fontWeight:700, color }}>{fmt(l.netPay)}</td>
                      <td style={{ textAlign:'right', fontSize:11, color:'#3b82f6' }}>{fmt(l.netTimbrado||l.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: DOCUMENTOS                                         */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'documentos' && (
          <div>
            {(emp.documents||[]).length === 0 ? (
              <Empty icon="📄" text="Sin documentos en el expediente" sub="Contratos físicos, identificaciones, comprobantes, etc."/>
            ) : (
              <table className="table-base" style={{ background:'#1e293b', borderRadius:10 }}>
                <thead><tr>
                  <th>Tipo</th><th>Título</th><th>Vigencia</th><th>Firmado</th><th>Estado</th>
                </tr></thead>
                <tbody>
                  {(emp.documents||[]).map((d:any) => (
                    <tr key={d.id}>
                      <td style={{ fontSize:11, color:'#64748b' }}>{d.type}</td>
                      <td style={{ fontSize:12, fontWeight:500 }}>{d.title}</td>
                      <td style={{ fontSize:12 }}>
                        {d.endDate ? (
                          <span style={{ color: new Date(d.endDate) < new Date() ? '#f87171' : '#f1f5f9' }}>
                            {fmtDate(d.endDate)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize:12 }}>{d.signedAt ? fmtDate(d.signedAt) : '—'}</td>
                      <td><Badge label={d.status} status={d.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* TAB: LEGAL                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'legal' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowLegalDoc(true)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                + Generar documento
              </button>
            </div>
            {(emp.legalDocuments||[]).length === 0 ? (
              <Empty icon="⚖" text="Sin documentos legales"
                sub="Cartas trabajo, finiquitos, actas administrativas, convenios…"/>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(emp.legalDocuments||[]).map((d:any) => (
                  <div key={d.id} style={{ background:'#1e293b', borderRadius:10, padding:'14px 18px',
                    border:`1px solid ${sc(d.status)}33`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>
                          {TIPO_DOC_LABELS[d.type] || d.type}
                        </span>
                        {d.documentNumber && (
                          <code style={{ fontSize:11, background:'#334155', padding:'2px 6px', borderRadius:4, color:'#94a3b8' }}>
                            {d.documentNumber}
                          </code>
                        )}
                        <Badge label={d.status} status={d.status}/>
                      </div>
                      <div style={{ display:'flex', gap:14, fontSize:11, color:'#64748b' }}>
                        <span>Generado: {fmtDate(d.generatedAt||d.createdAt)}</span>
                        {d.signedByEmployeeAt && <span>✍ Empleado: {fmtDate(d.signedByEmployeeAt)}</span>}
                        {d.signedByCompanyAt  && <span>✍ Empresa: {fmtDate(d.signedByCompanyAt)}</span>}
                      </div>
                      {d.notes && <p style={{ fontSize:11, color:'#475569', margin:'4px 0 0' }}>{d.notes}</p>}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {d.status === 'GENERADO' && (
                        <>
                          <button onClick={() => signDocM.mutate({ docId:d.id, byEmployee:false })}
                            style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:11 }}>
                            Firmar empresa
                          </button>
                          <button onClick={() => signDocM.mutate({ docId:d.id, byEmployee:true })}
                            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #10b981', background:'none', color:'#10b981', cursor:'pointer', fontSize:11 }}>
                            Firmar empleado
                          </button>
                        </>
                      )}
                      {d.pdfUrl && (
                        <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer"
                          style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #334155', background:'none', color:'#94a3b8', cursor:'pointer', fontSize:11, textDecoration:'none' }}>
                          📄 Ver PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo contrato ── */}
      {showContrato && (
        <Modal title="Nuevo contrato" color={color} onClose={() => setShowContrato(false)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo de contrato *</label>
              <select className="input-base" style={{ fontSize:13 }}
                value={contratoForm.type} onChange={e => setContratoForm(f=>({...f,type:e.target.value}))}>
                {CONTRATO_TIPOS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Jornada</label>
              <select className="input-base" style={{ fontSize:13 }}
                value={contratoForm.workSchedule} onChange={e => setContratoForm(f=>({...f,workSchedule:e.target.value}))}>
                {HORARIO_TIPOS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha inicio *</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={contratoForm.startDate} onChange={e => setContratoForm(f=>({...f,startDate:e.target.value}))}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>
                Fecha fin {contratoForm.type==='INDEFINIDO'?'(dejar vacío si indefinido)':'*'}
              </label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={contratoForm.endDate} onChange={e => setContratoForm(f=>({...f,endDate:e.target.value}))}/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
              <input className="input-base" style={{ fontSize:12 }} placeholder="Condiciones especiales, motivo, etc."
                value={contratoForm.notes} onChange={e => setContratoForm(f=>({...f,notes:e.target.value}))}/>
            </div>
          </div>
          <p style={{ fontSize:11, color:'#475569', margin:'0 0 14px', padding:'8px 10px', background:'#0f172a', borderRadius:7 }}>
            ⚠ Al crear un nuevo contrato, el contrato vigente anterior se marcará como <strong>FINALIZADO</strong>.
            El salario al momento de firma se toma del expediente actual: <strong>{fmt(emp.grossSalary)}</strong>.
          </p>
          <ModalFooter
            onCancel={() => setShowContrato(false)}
            onConfirm={() => contratoM.mutate()}
            loading={contratoM.isPending}
            disabled={!contratoForm.startDate || !contratoForm.type}
            color={color}
            label="Crear contrato"
          />
        </Modal>
      )}

      {/* ── Modal: Generar documento legal ── */}
      {showLegalDoc && (
        <Modal title={`Generar documento legal — ${fullName}`} color={color} onClose={() => setShowLegalDoc(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo de documento *</label>
              <select className="input-base" style={{ fontSize:13 }}
                value={legalForm.type} onChange={e => setLegalForm(f=>({...f,type:e.target.value}))}>
                {Object.entries(TIPO_DOC_LABELS).map(([k,v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div style={{ background:'#0f172a', borderRadius:8, padding:'10px 12px' }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px', fontWeight:600 }}>
                Datos que se incluirán automáticamente:
              </p>
              {[
                ['Empleado', fullName],
                ['RFC', emp.rfc||'—'],
                ['Puesto', emp.position],
                ['Empresa', activeCompany?.companyName||'—'],
                ['Fecha ingreso', fmtDate(emp.startDate)],
                ['Salario mensual', fmt(emp.grossSalary)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:11, color:'#475569' }}>{k}</span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas / términos adicionales</label>
              <textarea className="input-base" rows={3} style={{ fontSize:12, resize:'vertical' }}
                value={legalForm.notes} onChange={e => setLegalForm(f=>({...f,notes:e.target.value}))}
                placeholder="Términos adicionales o condiciones específicas…"/>
            </div>
          </div>
          <ModalFooter
            onCancel={() => setShowLegalDoc(false)}
            onConfirm={() => legalDocM.mutate()}
            loading={legalDocM.isPending}
            color={color}
            label="📄 Generar documento"
          />
        </Modal>
      )}
    </AppLayout>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────

function Section({ title, icon, children }: any) {
  return (
    <div style={{ background:'#1e293b', borderRadius:10, padding:16, border:'1px solid #334155' }}>
      <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 10px' }}>
        {icon} {title}
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label:string; value:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', borderBottom:'1px solid #0f172a', paddingBottom:5 }}>
      <span style={{ fontSize:11, color:'#475569' }}>{label}</span>
      <span style={{ fontSize:12, color:'#f1f5f9', fontWeight:500, maxWidth:200, textAlign:'right' }}>{value}</span>
    </div>
  );
}

function Empty({ icon, text, sub }: { icon:string; text:string; sub?:string }) {
  return (
    <div style={{ textAlign:'center', padding:48, color:'#334155' }}>
      <p style={{ fontSize:36, margin:'0 0 10px' }}>{icon}</p>
      <p style={{ fontSize:14, fontWeight:600, color:'#64748b', margin:'0 0 6px' }}>{text}</p>
      {sub && <p style={{ fontSize:12, color:'#475569', margin:0 }}>{sub}</p>}
    </div>
  );
}

function Modal({ title, color, onClose, children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#1e293b', borderRadius:14, padding:28, width:500,
        maxHeight:'90vh', overflowY:'auto', border:`1px solid ${color}44` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <h3 style={{ fontSize:15, fontWeight:800, margin:0, color }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, loading, disabled, color, label }: any) {
  return (
    <div style={{ display:'flex', gap:8 }}>
      <button onClick={onCancel}
        style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
        Cancelar
      </button>
      <button onClick={onConfirm} disabled={loading||disabled}
        style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
          background:!disabled?color:'#334155', color:'#fff',
          cursor:!disabled?'pointer':'not-allowed', fontSize:13, fontWeight:700 }}>
        {loading ? 'Procesando…' : label}
      </button>
    </div>
  );
}
