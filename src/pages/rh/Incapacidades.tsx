import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS = ['IMSS','RIESGO_TRABAJO','MATERNIDAD','PATERNIDAD','CUIDADOS'];

export default function IncapacidadesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,   setShowNew]   = useState(false);
  const [filtroEmp, setFiltroEmp] = useState('');
  const [form, setForm] = useState({
    employeeId:'', type:'IMSS', startDate:'', endDate:'',
    days:'', folio:'', notes:'',
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['disabilities', cid, filtroEmp],
    queryFn:  () => filtroEmp
      ? api.get(`/companies/${cid}/disabilities/employee/${filtroEmp}`).then(r=>r.data)
      : Promise.resolve([]),
    enabled:  !!cid && !!filtroEmp,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/disabilities`, {
      ...form,
      days: form.days ? Number(form.days) : Math.ceil((new Date(form.endDate).getTime()-new Date(form.startDate).getTime())/86400000)+1,
    }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ employeeId:'', type:'IMSS', startDate:'', endDate:'', days:'', folio:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['disabilities', cid] });
    },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const validateM = useMutation({
    mutationFn: (id:string) => api.put(`/companies/${cid}/disabilities/${id}/validate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disabilities', cid] }),
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Incapacidades</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Registrar incapacidad'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Nueva incapacidad</h3>
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
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.type}
                  onChange={e => set('type', e.target.value)}>
                  {TIPOS.map(t => <option key={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Folio IMSS</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.folio}
                  onChange={e => set('folio', e.target.value)} placeholder="Número de folio"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha inicio *</label>
                <input type="date" className="input-base" style={{ fontSize:12 }}
                  value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha fin *</label>
                <input type="date" className="input-base" style={{ fontSize:12 }}
                  value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Días (auto si vacío)</label>
                <input type="number" className="input-base" style={{ fontSize:12 }}
                  value={form.days} onChange={e => set('days', e.target.value)} placeholder="Auto"/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#64748b' }}>
              ℹ Se creará automáticamente una incidencia vinculada que impactará la nómina del período correspondiente.
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()}
              disabled={crearM.isPending || !form.employeeId || !form.startDate || !form.endDate}>
              {crearM.isPending ? 'Registrando…' : 'Registrar incapacidad'}
            </button>
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <select className="input-base" style={{ fontSize:12, maxWidth:300 }}
            value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
            <option value="">— Seleccionar empleado —</option>
            {(employees as any[]).map((e:any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Tipo</th><th>Período</th><th>Días</th><th>Folio</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>
              {!filtroEmp && <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#475569',fontSize:12}}>Selecciona un empleado</td></tr>}
              {filtroEmp && isLoading && <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>}
              {filtroEmp && !isLoading && (list as any[]).length===0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin incapacidades</td></tr>
              )}
              {(list as any[]).map((d:any) => (
                <tr key={d.id}>
                  <td style={{ fontSize:12 }}>{d.type}</td>
                  <td style={{ fontSize:12 }}>{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</td>
                  <td style={{ textAlign:'center', fontWeight:600 }}>{d.days}</td>
                  <td style={{ fontSize:11, color:'#64748b' }}>{d.folio || '—'}</td>
                  <td>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background:d.status==='VALIDADA'?'#10b98122':d.status==='APLICADA'?'#3b82f622':'#8b5cf622',
                      color:d.status==='VALIDADA'?'#10b981':d.status==='APLICADA'?'#3b82f6':'#8b5cf6' }}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.status === 'REGISTRADA' && (
                      <button onClick={() => validateM.mutate(d.id)}
                        style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                        ✓ Validar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
