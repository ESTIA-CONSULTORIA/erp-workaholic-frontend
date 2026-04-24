import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS = [
  { id:'FALTA',            label:'Falta',            icon:'✗', color:'#f87171' },
  { id:'RETARDO',          label:'Retardo',          icon:'⏰', color:'#f59e0b' },
  { id:'HORAS_EXTRA',      label:'Horas extra',      icon:'⏱', color:'#10b981' },
  { id:'BONO',             label:'Bono',             icon:'⭐', color:'#f59e0b' },
  { id:'DESCUENTO',        label:'Descuento',        icon:'↓',  color:'#f87171' },
  { id:'PERMISO_GOCE',     label:'Permiso con goce', icon:'📅', color:'#3b82f6' },
  { id:'PERMISO_SIN_GOCE', label:'Permiso sin goce', icon:'📋', color:'#64748b' },
  { id:'VACACION',         label:'Vacación',         icon:'🏖', color:'#10b981' },
  { id:'INCAPACIDAD',      label:'Incapacidad',      icon:'🏥', color:'#8b5cf6' },
  { id:'SUSPENSION',       label:'Suspensión',       icon:'⛔', color:'#f87171' },
];

export default function IncidenciasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,   setShowNew]   = useState(false);
  const [filtroEmp, setFiltroEmp] = useState('');
  const [form, setForm] = useState({
    employeeId:'', type:'FALTA', dateFrom:'', dateTo:'',
    quantity:'1', unit:'DIAS', amount:'', notes:'',
    affectsPayroll: true, affectsAttendance: true,
  });
  const set = (k:string, v:any) => setForm(f => ({...f,[k]:v}));

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', cid, filtroEmp],
    queryFn:  () => filtroEmp
      ? api.get(`/companies/${cid}/incidents/employee/${filtroEmp}`).then(r => r.data)
      : Promise.resolve([]),
    enabled:  !!cid && !!filtroEmp,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/incidents`, {
      ...form, quantity: Number(form.quantity), amount: form.amount ? Number(form.amount) : undefined,
    }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ employeeId:'', type:'FALTA', dateFrom:'', dateTo:'', quantity:'1', unit:'DIAS', amount:'', notes:'', affectsPayroll:true, affectsAttendance:true });
      qc.invalidateQueries({ queryKey: ['incidents', cid] });
    },
    onError: (e:any) => alert(e.response?.data?.message || 'Error al crear incidencia'),
  });

  const tipoSel = TIPOS.find(t => t.id === form.type);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Incidencias</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Nueva incidencia'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Nueva incidencia</h3>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {TIPOS.map(t => (
                <button key={t.id} onClick={() => set('type', t.id)}
                  style={{ padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:11,
                    border:`1px solid ${form.type===t.id?t.color:'#334155'}`,
                    background:form.type===t.id?t.color+'22':'transparent',
                    color:form.type===t.id?t.color:'#64748b', fontWeight:form.type===t.id?700:400 }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Empleado *</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.employeeId}
                  onChange={e => set('employeeId', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {(employees as any[]).map((e:any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha inicio *</label>
                <input type="date" className="input-base" style={{ fontSize:12 }}
                  value={form.dateFrom} onChange={e => set('dateFrom', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha fin</label>
                <input type="date" className="input-base" style={{ fontSize:12 }}
                  value={form.dateTo} min={form.dateFrom} onChange={e => set('dateTo', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Cantidad</label>
                <input type="number" className="input-base" style={{ fontSize:12 }}
                  value={form.quantity} onChange={e => set('quantity', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Unidad</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.unit}
                  onChange={e => set('unit', e.target.value)}>
                  {['DIAS','HORAS','IMPORTE'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Monto ($)</label>
                <input type="number" className="input-base" style={{ fontSize:12 }}
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="Auto"/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:6, alignItems:'center', cursor:'pointer' }}>
                <input type="checkbox" checked={form.affectsPayroll} onChange={e => set('affectsPayroll', e.target.checked)} style={{ accentColor:color }}/>
                Afecta nómina
              </label>
              <label style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:6, alignItems:'center', cursor:'pointer' }}>
                <input type="checkbox" checked={form.affectsAttendance} onChange={e => set('affectsAttendance', e.target.checked)} style={{ accentColor:color }}/>
                Afecta asistencia
              </label>
            </div>
            {tipoSel && (
              <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:12,
                background:tipoSel.color+'11', border:`1px solid ${tipoSel.color}33` }}>
                <span style={{ fontSize:12, color:tipoSel.color, fontWeight:600 }}>
                  {tipoSel.icon} {tipoSel.label} · {form.affectsPayroll?'Impacta nómina':'Sin impacto en nómina'}
                </span>
              </div>
            )}
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()}
              disabled={crearM.isPending || !form.employeeId || !form.dateFrom}>
              {crearM.isPending ? 'Guardando…' : 'Registrar incidencia'}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
          <select className="input-base" style={{ fontSize:12, maxWidth:280 }}
            value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
            <option value="">— Seleccionar empleado para ver incidencias —</option>
            {(employees as any[]).map((e:any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Tipo</th><th>Período</th><th>Cantidad</th><th>Monto</th><th>Nómina</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {!filtroEmp && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#475569',fontSize:12}}>
                  Selecciona un empleado para ver sus incidencias
                </td></tr>
              )}
              {filtroEmp && isLoading && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>
              )}
              {filtroEmp && !isLoading && (incidents as any[]).length===0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin incidencias</td></tr>
              )}
              {(incidents as any[]).map((inc:any) => {
                const tipo = TIPOS.find(t => t.id === inc.type);
                return (
                  <tr key={inc.id}>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:(tipo?.color||'#64748b')+'22', color:tipo?.color||'#64748b', fontWeight:600 }}>
                        {tipo?.icon} {tipo?.label||inc.type}
                      </span>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {fmtDate(inc.dateFrom)}{inc.dateTo&&inc.dateTo!==inc.dateFrom?` → ${fmtDate(inc.dateTo)}`:''}
                    </td>
                    <td style={{ textAlign:'center', fontSize:12 }}>{inc.quantity} {inc.unit}</td>
                    <td style={{ textAlign:'right', fontWeight:600, color:inc.amount>0?'#10b981':inc.amount<0?'#f87171':'#64748b' }}>
                      {inc.amount ? fmt(inc.amount) : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      {inc.affectsPayroll
                        ? <span style={{color:'#f59e0b',fontSize:11}}>✓</span>
                        : <span style={{color:'#334155',fontSize:11}}>—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 6px', borderRadius:99,
                        background: inc.status==='APLICADA'?'#10b98122':inc.status==='APROBADA'?'#3b82f622':'#f59e0b22',
                        color: inc.status==='APLICADA'?'#10b981':inc.status==='APROBADA'?'#3b82f6':'#f59e0b' }}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
