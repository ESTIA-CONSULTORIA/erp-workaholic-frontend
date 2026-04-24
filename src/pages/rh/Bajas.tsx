import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS_BAJA = [
  { id:'RENUNCIA_VOLUNTARIA',             label:'Renuncia voluntaria' },
  { id:'TERMINACION_MUTUO_CONSENTIMIENTO',label:'Mutuo consentimiento' },
  { id:'TERMINACION_FIN_CONTRATO',        label:'Fin de contrato' },
  { id:'RESCISION_PATRON_JUSTIFICADA',    label:'Rescisión justificada' },
  { id:'DESPIDO_INJUSTIFICADO_PRESUNTO',  label:'Despido injustificado' },
  { id:'INCAPACIDAD_PERMANENTE',          label:'Incapacidad permanente' },
  { id:'MUERTE',                          label:'Fallecimiento' },
  { id:'ABANDONO',                        label:'Abandono' },
];

const STATUS_COLOR: Record<string,string> = {
  BORRADOR:'#64748b', EN_REVISION_RH:'#f59e0b', EN_REVISION_DIRECCION:'#3b82f6',
  PENDIENTE_DOCUMENTOS:'#8b5cf6', PENDIENTE_PAGO:'#f97316',
  PAGADA:'#10b981', CERRADA:'#10b981', CANCELADA:'#f87171',
};

export default function BajasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [form, setForm] = useState({
    employeeId:'', type:'RENUNCIA_VOLUNTARIA',
    terminationDate: new Date().toISOString().slice(0,10),
    lastWorkDay:'', reason:'', notes:'',
  });
  const set = (k:string, v:any) => setForm(f=>({...f,[k]:v}));

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-activos', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: bajas = [], isLoading } = useQuery({
    queryKey: ['terminations', cid],
    queryFn:  () => api.get(`/companies/${cid}/terminations`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/terminations`, form),
    onSuccess: (data:any) => {
      setShowNew(false);
      setDetalle(data.data || data);
      qc.invalidateQueries({ queryKey: ['terminations', cid] });
    },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const submitM = useMutation({
    mutationFn: (id:string) => api.post(`/companies/${cid}/terminations/${id}/submit`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terminations', cid] });
      qc.invalidateQueries({ queryKey: ['approvals-pending', cid] });
      setDetalle((d:any) => d ? {...d, status:'EN_REVISION_RH'} : null);
    },
  });

  const checklistM = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/companies/${cid}/terminations/${id}`, data),
    onSuccess: (res:any, vars:any) => {
      setDetalle((d:any) => d ? {...d, ...vars.data} : null);
      qc.invalidateQueries({ queryKey: ['terminations', cid] });
    },
  });

  const genDocM = useMutation({
    mutationFn: (type:string) => api.post(`/companies/${cid}/legal/generate`, {
      employeeId: detalle?.employeeId,
      terminationId: detalle?.id,
      type, title: `${type} - ${detalle?.employee?.firstName} ${detalle?.employee?.lastName}`,
      totalFiniquito: detalle?.totalFiniquito,
    }),
    onSuccess: () => {
      alert('Documento generado. Disponible en Documentos Legales del expediente del empleado.');
    },
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Bajas de Personal</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Iniciar baja'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Iniciar proceso de baja</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Empleado *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.employeeId}
                  onChange={e => set('employeeId', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {(employees as any[]).map((e:any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.position}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo de baja *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.type}
                  onChange={e => set('type', e.target.value)}>
                  {TIPOS_BAJA.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha efectiva *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.terminationDate} onChange={e => set('terminationDate', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Último día laborado</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.lastWorkDay} onChange={e => set('lastWorkDay', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Motivo</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.reason}
                  onChange={e => set('reason', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas internas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            {form.type === 'DESPIDO_INJUSTIFICADO_PRESUNTO' && (
              <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
                borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                <p style={{ fontSize:12, color:'#f87171', fontWeight:700, margin:'0 0 4px' }}>⚠ Despido injustificado</p>
                <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
                  Implica 90 días + 20 días/año + partes proporcionales. Se calcula automáticamente.
                </p>
              </div>
            )}
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()}
              disabled={crearM.isPending || !form.employeeId || !form.terminationDate}>
              {crearM.isPending ? 'Calculando…' : 'Crear expediente de baja'}
            </button>
          </div>
        )}

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Empleado</th><th>Tipo</th><th>Fecha efectiva</th>
              <th style={{textAlign:'right'}}>Finiquito</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (bajas as any[]).length===0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin bajas registradas</td></tr>
              )}
              {(bajas as any[]).map((b:any) => {
                const st   = STATUS_COLOR[b.status] || '#64748b';
                const tipo = TIPOS_BAJA.find(t=>t.id===b.type);
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight:500 }}>
                      {b.employee?.firstName} {b.employee?.lastName}
                      <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{b.employee?.employeeNumber}</p>
                    </td>
                    <td style={{ fontSize:12 }}>{tipo?.label||b.type}</td>
                    <td style={{ fontSize:12 }}>{fmtDate(b.terminationDate)}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color }}>{b.totalFiniquito?fmt(b.totalFiniquito):'—'}</td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:st+'22', color:st, fontWeight:600 }}>{b.status}</span>
                    </td>
                    <td>
                      <button onClick={() => setDetalle(b)}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24,
            width:560, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color }}>
                {detalle.employee?.firstName} {detalle.employee?.lastName}
              </h3>
              <button onClick={() => setDetalle(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {/* Finiquito */}
            <div style={{ background:'#0f172a', borderRadius:8, padding:14, marginBottom:14 }}>
              <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', margin:'0 0 10px' }}>
                Cálculo de finiquito (LFT)
              </p>
              {[
                ['Días laborados',        `${detalle.diasLaborados||0} días`],
                ['Vacaciones pendientes', fmt(Number(detalle.vacacionesPendientes||0))],
                ['Partes proporcionales', fmt(detalle.partesProporcionales||0)],
                ['Prima de antigüedad',   fmt(detalle.primaAntiguedad||0)],
                ['Indemnización',         fmt(detalle.indemnizacion||0)],
              ].map(([label,val]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#f1f5f9' }}>{val}</span>
                </div>
              ))}
              <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8,
                display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>Total finiquito</span>
                <span style={{ fontSize:18, fontWeight:800, color }}>{fmt(detalle.totalFiniquito||0)}</span>
              </div>
            </div>

            {/* Checklist */}
            <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', margin:'0 0 8px' }}>
              Checklist de salida
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
              {[
                ['checklistEquipo',    '🖥 Devolución de equipo'],
                ['checklistUniformes', '👕 Devolución de uniformes'],
                ['checklistAccesos',   '🔑 Revocación de accesos'],
                ['checklistDocumentos','📄 Documentos firmados'],
                ['checklistAdeudos',   '💰 Adeudos liquidados'],
              ].map(([field, label]) => (
                <label key={field} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'6px 10px', background:'#0f172a', borderRadius:7, cursor:'pointer', fontSize:12 }}>
                  <input type="checkbox" checked={(detalle as any)[field]||false}
                    onChange={e => checklistM.mutate({ id:detalle.id, data:{ [field]: e.target.checked } })}
                    style={{ accentColor:color }}/>
                  <span style={{ color:(detalle as any)[field]?'#10b981':'#94a3b8' }}>{label}</span>
                </label>
              ))}
            </div>

            {/* Generar documentos */}
            <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', margin:'0 0 8px' }}>
              Documentos legales
            </p>
            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              {['FINIQUITO','CARTA_TRABAJO','RENUNCIA'].map(tipo => (
                <button key={tipo} onClick={() => genDocM.mutate(tipo)}
                  disabled={genDocM.isPending}
                  style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${color}`,
                    background:'none', color, cursor:'pointer', fontSize:11 }}>
                  📄 {tipo.replace(/_/g,' ')}
                </button>
              ))}
            </div>

            {/* Acción principal */}
            {detalle.status === 'BORRADOR' ? (
              <button onClick={() => submitM.mutate(detalle.id)} disabled={submitM.isPending}
                style={{ width:'100%', padding:'10px', borderRadius:8, border:'none',
                  background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                {submitM.isPending ? 'Enviando…' : '📤 Enviar para aprobación RH'}
              </button>
            ) : (
              <div style={{ textAlign:'center', padding:'8px', background:'#0f172a', borderRadius:8 }}>
                <span style={{ fontSize:12, color:STATUS_COLOR[detalle.status]||'#64748b', fontWeight:600 }}>
                  Estado actual: {detalle.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
