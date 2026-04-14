import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';

export default function CorteCajaPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [vista, setVista] = useState<'nuevo'|'historial'>('historial');
  const [form, setForm] = useState({
    fecha:           new Date().toISOString().slice(0,10),
    efectivoContado: 0,
    totalEfectivo:   0,
    totalTarjeta:    0,
    totalTransfer:   0,
    totalCredito:    0,
    totalVentas:     0,
    notasCajero:     '',
  });
  const [corteSeleccionado, setCorteSeleccionado] = useState<any>(null);
  const [efectivoReal, setEfectivoReal]   = useState(0);
  const [notasValid,   setNotasValid]     = useState('');
  const [saving,       setSaving]         = useState(false);
  const [corteRespuesta, setCorteRespuesta] = useState<any>(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  const { data: cortes = [] } = useQuery({
    queryKey: ['cortes-caja', cid],
    queryFn:  () => api.get(`/companies/${cid}/corte-caja`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/corte-caja`, form),
    onSuccess: () => {
      setVista('historial');
      qc.invalidateQueries({ queryKey: ['cortes-caja', cid] });
    },
  });

  const validarM = useMutation({
    mutationFn: (corteId: string) => api.put(`/companies/${cid}/corte-caja/${corteId}/validar`, {
      efectivoReal: efectivoReal || null,
      notasValidador: notasValid,
    }),
    onSuccess: () => {
      setCorteSeleccionado(null);
      qc.invalidateQueries({ queryKey: ['cortes-caja', cid] });
    },
  });

  const rechazarM = useMutation({
    mutationFn: (corteId: string) => api.put(`/companies/${cid}/corte-caja/${corteId}/rechazar`, {
      notas: notasValid,
    }),
    onSuccess: () => {
      setCorteSeleccionado(null);
      qc.invalidateQueries({ queryKey: ['cortes-caja', cid] });
    },
  });

  const STATUS_COLOR: Record<string,string> = {
    PENDIENTE:'#f59e0b', VALIDADO:'#10b981', RECHAZADO:'#f87171'
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Corte de Caja</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setVista(vista==='nuevo'?'historial':'nuevo')}>
            {vista==='nuevo' ? 'Ver historial' : '+ Nuevo corte'}
          </button>
        </div>

        {/* Formulario nuevo corte */}
        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo corte de caja</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.fecha} onChange={e => set('fecha', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Efectivo contado en caja</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={form.efectivoContado||''} onChange={e => set('efectivoContado', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Total efectivo (ventas)</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={form.totalEfectivo||''} onChange={e => set('totalEfectivo', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Total tarjeta</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={form.totalTarjeta||''} onChange={e => set('totalTarjeta', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Total transferencia</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={form.totalTransfer||''} onChange={e => set('totalTransfer', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Total crédito</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={form.totalCredito||''} onChange={e => set('totalCredito', +e.target.value)}/>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.notasCajero}
                onChange={e => set('notasCajero', e.target.value)} placeholder="Observaciones del cajero"/>
            </div>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Efectivo esperado</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{fmt(form.totalEfectivo)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Efectivo contado</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{fmt(form.efectivoContado)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700 }}>Diferencia</span>
                <span style={{ fontSize:16, fontWeight:700,
                  color: form.efectivoContado-form.totalEfectivo >= 0 ? '#10b981' : '#f87171' }}>
                  {fmt(form.efectivoContado - form.totalEfectivo)}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setVista('historial')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending}>
                {crearM.isPending ? 'Enviando…' : 'Enviar corte'}
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        {vista === 'historial' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fecha</th><th>Cajero</th>
                  <th style={{textAlign:'right'}}>Total ventas</th>
                  <th style={{textAlign:'right'}}>Efectivo</th>
                  <th style={{textAlign:'right'}}>Diferencia</th>
                  <th>Estado</th><th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(cortes as any[]).length === 0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cortes registrados</td></tr>
                )}
                {(cortes as any[]).map((c: any) => (
                  <tr key={c.id}>
                    <td>{fmtDate(c.fecha)}</td>
                    <td style={{ fontWeight:500 }}>{c.cajero?.name}</td>
                    <td style={{ textAlign:'right' }}>{fmt(c.totalVentas)}</td>
                    <td style={{ textAlign:'right' }}>{fmt(c.efectivoContado)}</td>
                    <td style={{ textAlign:'right', fontWeight:700,
                      color: Number(c.diferencia) >= 0 ? '#10b981' : '#f87171' }}>
                      {fmt(c.diferencia)}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:99,
                        background: STATUS_COLOR[c.status]+'22', color: STATUS_COLOR[c.status] }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.status === 'PENDIENTE' && (
                        <button onClick={() => { setCorteSeleccionado(c); setEfectivoReal(Number(c.efectivoContado)); setNotasValid(''); }}
                          style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                          Validar
                        </button>
                      )}
                      {c.status === 'RECHAZADO' && (
                        <button onClick={() => { setCorteRespuesta(c); setRespuestaTexto(''); }}
                          style={{ background:'none', border:'none', color:'#f59e0b', cursor:'pointer', fontSize:12 }}>
                          Responder
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal validación */}
        {corteSeleccionado && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:420 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px' }}>
                Validar corte — {fmtDate(corteSeleccionado.fecha)}
              </h3>
              <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Efectivo esperado</span>
                  <span style={{ fontSize:13 }}>{fmt(corteSeleccionado.totalEfectivo)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Efectivo contado por cajero</span>
                  <span style={{ fontSize:13 }}>{fmt(corteSeleccionado.efectivoContado)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Diferencia reportada</span>
                  <span style={{ fontSize:14, fontWeight:700,
                    color: Number(corteSeleccionado.diferencia) >= 0 ? '#10b981' : '#f87171' }}>
                    {fmt(corteSeleccionado.diferencia)}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  Efectivo real en paquete (si difiere del contado)
                </label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={efectivoReal||''} onChange={e => setEfectivoReal(+e.target.value)}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas del validador</label>
                <input className="input-base" style={{ fontSize:13 }} value={notasValid}
                  onChange={e => setNotasValid(e.target.value)}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setCorteSeleccionado(null)}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                    background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                  Cancelar
                </button>
                <button onClick={() => rechazarM.mutate(corteSeleccionado.id)}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                    background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13 }}>
                  Rechazar
                </button>
                <button onClick={() => validarM.mutate(corteSeleccionado.id)}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                    background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal respuesta cajero a corte rechazado */}
      {corteRespuesta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:420, border:'1px solid #f59e0b' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 8px', color:'#f59e0b' }}>
              Responder al contador
            </h3>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Motivo de rechazo:</p>
              <p style={{ fontSize:13, color:'#f87171', margin:0 }}>
                {corteRespuesta.notasValidador || 'Sin nota del validador'}
              </p>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Tu respuesta *
              </label>
              <textarea className="input-base" style={{ fontSize:13, height:80, resize:'none' }}
                value={respuestaTexto} onChange={e => setRespuestaTexto(e.target.value)}
                placeholder="Explica la diferencia o adjunta el ticket del gasto..."/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }}
                onClick={() => setCorteRespuesta(null)}>Cancelar</button>
              <button onClick={async () => {
                if (!respuestaTexto.trim()) return;
                setSaving(true);
                try {
                  await api.put(`/companies/${cid}/corte-caja/${corteRespuesta.id}/responder`,
                    { respuesta: respuestaTexto });
                  setCorteRespuesta(null);
                  qc.invalidateQueries({ queryKey: ['cortes-caja', cid] });
                } finally { setSaving(false); }
              }}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}
                disabled={saving || !respuestaTexto.trim()}>
                {saving ? 'Enviando…' : 'Enviar respuesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
