import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../../lib/api';

const TIPOS = [
  { id:'MACHETE_RES', label:'Machete / Res',  hasGrasa: true  },
  { id:'CHICALI_RES', label:'Chicali / Res',  hasGrasa: false },
  { id:'CERDO',       label:'Cerdo',          hasGrasa: true  },
  { id:'MACHACA',     label:'Machaca',        hasGrasa: false },
];

const STATUS_COLOR: Record<string,string> = {
  EN_PROCESO:'#f59e0b', EMPACADO:'#3b82f6', CERRADO:'#10b981'
};
const STATUS_LABEL: Record<string,string> = {
  EN_PROCESO:'En proceso', EMPACADO:'Empacado', CERRADO:'Cerrado'
};

export default function ProduccionPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();

  const [vista,      setVista]      = useState<'lista'|'nuevo'>('lista');
  const [loteActivo, setLoteActivo] = useState<any>(null);
  const [tab,        setTab]        = useState<'horno'|'empaque'>('horno');

  const [nuevoForm, setNuevoForm] = useState({
    fecha:     new Date().toISOString().slice(0,10),
    tipo:      'MACHETE_RES',
    kgEntrada: 0,
    notas:     '',
  });
  const [insumoLineas,  setInsumoLineas]  = useState<any[]>([]);
  const [hornoForm,     setHornoForm]     = useState({ kgSalida:0, kgGrasa:0, kgEscarchado:0 });
  const [empaqueLineas, setEmpaqueLineas] = useState<any[]>([]);

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/lotes`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/insumos`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/machete/lotes`, {
      ...nuevoForm,
      insumos: insumoLineas.filter(l => l.insumoId && l.cantidad > 0),
    }),
    onSuccess: () => {
      setVista('lista');
      setInsumoLineas([]);
      setNuevoForm({ fecha: new Date().toISOString().slice(0,10), tipo:'MACHETE_RES', kgEntrada:0, notas:'' });
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
      qc.invalidateQueries({ queryKey: ['insumos', cid] });
    },
  });

  const hornoM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/machete/lotes/${loteActivo.id}/salida-horno`, hornoForm),
    onSuccess: (data) => {
      // Actualizar lote activo con datos del horno + nuevo status EMPACADO
      setLoteActivo((prev: any) => ({ ...prev, ...data, status: 'EMPACADO' }));
      setHornoForm({ kgSalida:0, kgGrasa:0, kgEscarchado:0 });
      setTab('empaque'); // Ir directo a empaque
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
    },
  });

  const empaqueM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/machete/lotes/${loteActivo.id}/empaque`, {
      lineas: empaqueLineas.filter(l => l.cantidad > 0 && l.productId),
    }),
    onSuccess: (data) => {
      setEmpaqueLineas([]);
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
      qc.invalidateQueries({ queryKey: ['pt-inventory', cid] });
      // Actualizar lote activo con empaques acumulados del backend
      if (data) {
        setLoteActivo((prev: any) => ({ ...prev, ...data }));
        // Si el lote se cerró automáticamente (todos los kg empacados), cerrar modal
        if (data.status === 'CERRADO') {
          setTimeout(() => setLoteActivo(null), 1500);
        }
      } else {
        api.get(`/companies/${cid}/machete/lotes`).then(r => {
          const updated = r.data.find((l:any) => l.id === loteActivo.id);
          if (updated) setLoteActivo(updated);
        });
      }
    },
  });

  const cerrarM = useMutation({
    mutationFn: (loteId: string) => api.put(`/companies/${cid}/machete/lotes/${loteId}/cerrar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
      setLoteActivo(null);
    },
  });

  const tipoConfig = TIPOS.find(t => t.id === loteActivo?.tipo);

  // Calcular kg ya empacados y kg disponibles
  const kgYaEmpacados = (loteActivo?.empaques || []).reduce((t: number, e: any) => {
    const prod = (productos as any[]).find((p:any) => p.id === e.productId);
    return t + (prod?.gramsWeight ? (Number(e.cantidad) * Number(prod.gramsWeight)) / 1000 : 0);
  }, 0);
  const kgDisponibles = Math.max(0, Number(loteActivo?.kgSalida || 0) - kgYaEmpacados);

  // Kg que se usarían con las líneas actuales
  const kgEnLineas = empaqueLineas.reduce((t, l) => {
    const prod = (productos as any[]).find((p:any) => p.id === l.productId);
    return t + (prod?.gramsWeight ? (l.cantidad * prod.gramsWeight) / 1000 : 0);
  }, 0);

  const costoInsumos = insumoLineas.reduce((t, l) => {
    const ins = (insumos as any[]).find((i:any) => i.id === l.insumoId);
    return t + (Number(l.cantidad) * Number(ins?.costUnit || 0));
  }, 0);

  const setInsumoLinea = (idx: number, k: string, v: any) =>
    setInsumoLineas(ls => ls.map((item, i) => i === idx ? { ...item, [k]: v } : item));

  const loteEsCerrado = loteActivo?.status === 'CERRADO';

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Producción</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { setVista(vista==='nuevo'?'lista':'nuevo'); setInsumoLineas([]); }}>
            {vista==='nuevo' ? 'Ver lotes' : '+ Nuevo lote'}
          </button>
        </div>

        {/* ── NUEVO LOTE ─────────────────────────────────────── */}
        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo lote de producción</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={nuevoForm.fecha} onChange={e => setNuevoForm(f=>({...f,fecha:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo de producción</label>
                <select className="input-base" style={{ fontSize:13 }}
                  value={nuevoForm.tipo} onChange={e => setNuevoForm(f=>({...f,tipo:e.target.value}))}>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Kg entrada al horno</label>
                <input type="number" min="0" step="0.1" className="input-base" style={{ fontSize:13 }}
                  value={nuevoForm.kgEntrada||''} onChange={e => setNuevoForm(f=>({...f,kgEntrada:+e.target.value}))}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }}
                  value={nuevoForm.notas} onChange={e => setNuevoForm(f=>({...f,notas:e.target.value}))}
                  placeholder="Observaciones del lote"/>
              </div>
            </div>

            {/* Insumos */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:0 }}>
                  Insumos utilizados
                </p>
                <button onClick={() => setInsumoLineas(l => [...l, { insumoId:'', cantidad:0 }])}
                  style={{ background:'none', border:`1px solid ${color}`, color, padding:'3px 10px',
                    borderRadius:6, cursor:'pointer', fontSize:12 }}>
                  + Agregar insumo
                </button>
              </div>
              {insumoLineas.length === 0 && (
                <p style={{ fontSize:12, color:'#475569', textAlign:'center', padding:'12px 0' }}>
                  Agrega los insumos que se usaron en este lote
                </p>
              )}
              {insumoLineas.map((l, idx) => {
                const ins = (insumos as any[]).find((i:any) => i.id === l.insumoId);
                const costoLinea = Number(l.cantidad) * Number(ins?.costUnit || 0);
                return (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto',
                    gap:8, marginBottom:8, alignItems:'center' }}>
                    <select className="input-base" style={{ fontSize:12 }} value={l.insumoId}
                      onChange={e => setInsumoLinea(idx, 'insumoId', e.target.value)}>
                      <option value="">— Insumo —</option>
                      {(insumos as any[]).map((i:any) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit} disponibles)</option>
                      ))}
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="Cantidad"
                      className="input-base" style={{ fontSize:12 }}
                      value={l.cantidad||''} onChange={e => setInsumoLinea(idx, 'cantidad', +e.target.value)}/>
                    <div style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px',
                      fontSize:12, color: costoLinea > 0 ? color : '#475569', textAlign:'right' }}>
                      {costoLinea > 0 ? fmt(costoLinea) : '—'}
                    </div>
                    <button onClick={() => setInsumoLineas(ls => ls.filter((_,i) => i !== idx))}
                      style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:16 }}>✕</button>
                  </div>
                );
              })}
              {insumoLineas.length > 0 && (
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8,
                  padding:'8px 0', borderTop:'1px solid #334155', marginTop:4 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Costo total de insumos:</span>
                  <span style={{ fontSize:14, fontWeight:700, color }}>{fmt(costoInsumos)}</span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setVista('lista'); setInsumoLineas([]); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending || !nuevoForm.kgEntrada}>
                {crearM.isPending ? 'Creando…' : 'Iniciar lote'}
              </button>
            </div>
          </div>
        )}

        {/* ── LISTA DE LOTES ─────────────────────────────────── */}
        {vista === 'lista' && (
          <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
            <button onClick={() => exportCSV('produccion', lotes as any[],
              [{key:'tipo',label:'Tipo'},{key:'fecha',label:'Fecha'},
               {key:'kgEntrada',label:'Kg entrada'},{key:'kgSalida',label:'Kg salida'},
               {key:'rendimiento',label:'Rendimiento'},{key:'status',label:'Estado'}])}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ⬇ Exportar CSV
            </button>
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>No. Lote</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto(s)</th>
                  <th style={{textAlign:'right'}}>Kg entrada</th>
                  <th style={{textAlign:'right'}}>Kg salida</th>
                  <th style={{textAlign:'right'}}>Rendimiento</th>
                  <th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>
                )}
                {(lotes as any[]).length === 0 && !isLoading && (
                  <tr><td colSpan={9} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin lotes registrados</td></tr>
                )}
                {(lotes as any[]).map((l: any, idx: number) => {
                  // Número de lote: TIPO-YYYYMMDD-NNN
                  const tipo = TIPOS.find(t=>t.id===l.tipo);
                  const tipoCode = l.tipo?.split('_')[0] || 'LOT';
                  const fechaCode = l.fecha ? new Date(l.fecha).toISOString().slice(0,10).replace(/-/g,'') : '000000';
                  const numLote = `${tipoCode}-${fechaCode.slice(2)}-${String(idx+1).padStart(3,'0')}`;
                  // Productos empacados únicos
                  const productosEmpacados = (l.empaques||[])
                    .map((e:any) => e.product?.name)
                    .filter((n:any,i:number,arr:any[]) => n && arr.indexOf(n)===i)
                    .slice(0,2);
                  return (
                  <tr key={l.id}>
                    <td>
                      <code style={{fontSize:10,background:'#1e293b',padding:'2px 6px',borderRadius:4,color:'#94a3b8',whiteSpace:'nowrap'}}>
                        {numLote}
                      </code>
                    </td>
                    <td style={{whiteSpace:'nowrap'}}>{fmtDate(l.fecha)}</td>
                    <td style={{fontSize:12}}>{tipo?.label||l.tipo}</td>
                    <td style={{fontSize:11,maxWidth:160}}>
                      {productosEmpacados.length > 0
                        ? <span style={{color:'#94a3b8'}}>{productosEmpacados.join(', ')}{(l.empaques||[]).length > 2 ? ` +${(l.empaques||[]).length-2}` : ''}</span>
                        : <span style={{color:'#475569'}}>—</span>
                      }
                    </td>
                    <td style={{textAlign:'right'}}>{l.kgEntrada} kg</td>
                    <td style={{textAlign:'right'}}>{l.kgSalida > 0 ? `${l.kgSalida} kg` : '—'}</td>
                    <td style={{textAlign:'right',color}}>
                      {l.rendimiento > 0 ? `${Number(l.rendimiento).toFixed(1)}%` : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:99,
                        background:(STATUS_COLOR[l.status]||'#64748b')+'22',
                        color:STATUS_COLOR[l.status]||'#64748b' }}>
                        {STATUS_LABEL[l.status]||l.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setLoteActivo(l); setTab(l.kgSalida > 0 ? 'empaque' : 'horno'); setEmpaqueLineas([]); }}
                          style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                          {l.status === 'CERRADO' ? 'Ver' : l.kgSalida > 0 ? '📦 Empacar' : '🔥 Horno'}
                        </button>
                        {l.status === 'EMPACADO' && (
                          <button onClick={() => { if(window.confirm('¿Cerrar lote manualmente?')) cerrarM.mutate(l.id); }}
                            style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                            ✓ Cerrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>)}

        {/* ── MODAL DETALLE / HORNO / EMPAQUE ───────────────── */}
        {loteActivo && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:520,
              maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px', color }}>
                    {TIPOS.find(t=>t.id===loteActivo.tipo)?.label} — {fmtDate(loteActivo.fecha)}
                  </h3>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                    background:(STATUS_COLOR[loteActivo.status]||'#64748b')+'22',
                    color:STATUS_COLOR[loteActivo.status]||'#64748b' }}>
                    {STATUS_LABEL[loteActivo.status]||loteActivo.status}
                  </span>
                </div>
                <button onClick={() => { setLoteActivo(null); setEmpaqueLineas([]); }}
                  style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
              </div>

              {/* Resumen KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
                {[
                  { label:'Kg entrada',   value:`${loteActivo.kgEntrada} kg`, col:'#94a3b8' },
                  { label:'Kg salida',    value: loteActivo.kgSalida > 0 ? `${loteActivo.kgSalida} kg` : '—', col:'#94a3b8' },
                  { label:'Rendimiento',  value: loteActivo.rendimiento > 0 ? `${Number(loteActivo.rendimiento).toFixed(1)}%` : '—', col:'#10b981' },
                ].map(k => (
                  <div key={k.label} style={{ background:'#0f172a', borderRadius:8, padding:'8px 10px' }}>
                    <p style={{ fontSize:10, color:'#64748b', margin:'0 0 2px' }}>{k.label}</p>
                    <p style={{ fontSize:14, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Insumos */}
              {loteActivo.insumos?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                    letterSpacing:1, margin:'0 0 8px' }}>Insumos utilizados</p>
                  <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                    {loteActivo.insumos.map((ins:any) => (
                      <div key={ins.id} style={{ display:'flex', justifyContent:'space-between',
                        fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                        <span>{ins.nombre}</span>
                        <span>{Number(ins.cantidad).toFixed(2)} {ins.unidad}
                          <span style={{ color:'#64748b', marginLeft:8 }}>{fmt(ins.costoTotal)}</span>
                        </span>
                      </div>
                    ))}
                    <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6,
                      display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <span style={{ color:'#64748b' }}>Costo total insumos</span>
                      <span style={{ fontWeight:700, color }}>
                        {fmt(loteActivo.insumos.reduce((t:number,i:any) => t + Number(i.costoTotal), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empaques ya registrados */}
              {loteActivo.empaques?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                    letterSpacing:1, margin:'0 0 8px' }}>Empaques registrados</p>
                  <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                    {loteActivo.empaques.map((e:any) => {
                      const prod = (productos as any[]).find((p:any) => p.id === e.productId);
                      const kg = prod?.gramsWeight ? (Number(e.cantidad) * Number(prod.gramsWeight)) / 1000 : 0;
                      return (
                        <div key={e.id} style={{ display:'flex', justifyContent:'space-between',
                          fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                          <span>{prod?.name || e.productId}</span>
                          <span style={{ color:'#f1f5f9' }}>{e.cantidad} pzas
                            {kg > 0 && <span style={{ color:'#64748b', marginLeft:8 }}>{kg.toFixed(2)} kg</span>}
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6,
                      display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <span style={{ color:'#64748b' }}>Kg empacados</span>
                      <span style={{ fontWeight:700, color:'#3b82f6' }}>{kgYaEmpacados.toFixed(2)} kg</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
                      <span style={{ color:'#64748b' }}>Kg disponibles</span>
                      <span style={{ fontWeight:700, color: kgDisponibles > 0 ? color : '#f87171' }}>
                        {kgDisponibles.toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Si está cerrado, no mostrar formularios */}
              {loteEsCerrado ? (
                <div style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:8,
                  padding:'16px', textAlign:'center' }}>
                  <p style={{ fontSize:20, margin:'0 0 6px' }}>✅</p>
                  <p style={{ fontSize:13, fontWeight:600, color:'#10b981', margin:'0 0 4px' }}>Lote cerrado</p>
                  <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                    Todos los kg fueron empacados. El inventario se actualizó automáticamente.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:16 }}>
                    {(['horno','empaque'] as const).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{ padding:'8px 16px', fontSize:12, fontWeight:500, background:'none', border:'none',
                          borderBottom: tab===t ? `2px solid ${color}` : '2px solid transparent',
                          color: tab===t ? color : '#64748b', cursor:'pointer' }}>
                        {t === 'horno' ? 'Salida del horno' : 'Empaque'}
                      </button>
                    ))}
                  </div>

                  {/* Tab Horno */}
                  {tab === 'horno' && (
                    <div>
                      {loteActivo.kgSalida > 0 ? (
                        // Ya tiene salida registrada — solo lectura
                        <div style={{ background:'#0f172a', borderRadius:8, padding:12 }}>
                          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:1 }}>
                            Salida registrada
                          </p>
                          {[
                            { label:'Kg carne seca',  value:`${loteActivo.kgSalida} kg`,     col:color },
                            { label:'Kg grasa',        value:`${loteActivo.kgGrasa||0} kg`,   col:'#f87171' },
                            { label:'Kg escarchado',   value:`${loteActivo.kgEscarchado||0} kg`, col:'#f59e0b' },
                            { label:'Kg merma',        value:`${Number(loteActivo.kgMerma||0).toFixed(2)} kg`, col:'#64748b' },
                            { label:'Rendimiento',     value:`${Number(loteActivo.rendimiento||0).toFixed(1)}%`, col:'#10b981' },
                          ].map(r => (
                            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                              <span style={{ fontSize:12, color:'#64748b' }}>{r.label}</span>
                              <span style={{ fontSize:13, fontWeight:600, color:r.col }}>{r.value}</span>
                            </div>
                          ))}
                          <p style={{ fontSize:11, color:'#475569', margin:'10px 0 0', textAlign:'center' }}>
                            La salida del horno ya fue registrada y no puede modificarse.
                          </p>
                        </div>
                      ) : (
                        // Sin salida — formulario editable
                        <>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                            <div>
                              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Kg carne seca salida</label>
                              <input type="number" min="0" step="0.1" className="input-base" style={{ fontSize:13 }}
                                value={hornoForm.kgSalida||''} onChange={e => setHornoForm(f=>({...f,kgSalida:+e.target.value}))}/>
                            </div>
                            {tipoConfig?.hasGrasa && (
                              <div>
                                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Kg grasa eliminada</label>
                                <input type="number" min="0" step="0.1" className="input-base" style={{ fontSize:13 }}
                                  value={hornoForm.kgGrasa||''} onChange={e => setHornoForm(f=>({...f,kgGrasa:+e.target.value}))}/>
                              </div>
                            )}
                            <div>
                              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Kg escarchado (del scrap)</label>
                              <input type="number" min="0" step="0.1" className="input-base" style={{ fontSize:13 }}
                                value={hornoForm.kgEscarchado||''} onChange={e => setHornoForm(f=>({...f,kgEscarchado:+e.target.value}))}/>
                            </div>
                          </div>

                          {hornoForm.kgSalida > 0 && (
                            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
                              {[
                                { label:'Kg carne seca',  value:`${hornoForm.kgSalida} kg`,     col:color },
                                { label:'Kg grasa',        value:`${hornoForm.kgGrasa} kg`,      col:'#f87171' },
                                { label:'Kg escarchado',   value:`${hornoForm.kgEscarchado} kg`, col:'#f59e0b' },
                                { label:'Kg merma',
                                  value:`${Math.max(0, Number(loteActivo.kgEntrada) - hornoForm.kgSalida - hornoForm.kgGrasa - hornoForm.kgEscarchado).toFixed(2)} kg`,
                                  col:'#64748b' },
                                { label:'Rendimiento',
                                  value:`${((hornoForm.kgSalida / Number(loteActivo.kgEntrada)) * 100).toFixed(1)}%`,
                                  col:'#10b981' },
                              ].map(r => (
                                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                  <span style={{ fontSize:12, color:'#64748b' }}>{r.label}</span>
                                  <span style={{ fontSize:13, fontWeight:600, color:r.col }}>{r.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button className="btn-primary" style={{ width:'100%', background:color, fontSize:13 }}
                            onClick={() => hornoM.mutate()} disabled={hornoM.isPending || !hornoForm.kgSalida}>
                            {hornoM.isPending ? 'Guardando…' : 'Registrar salida del horno'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab Empaque */}
                  {tab === 'empaque' && (
                    <div>
                      {loteActivo.kgSalida <= 0 ? (
                        <p style={{ color:'#f87171', fontSize:13, textAlign:'center', padding:16 }}>
                          Primero registra la salida del horno para habilitar el empaque.
                        </p>
                      ) : (
                        <>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                            <div>
                              <p style={{ fontSize:12, color:'#64748b', margin:'0 0 2px' }}>
                                Kg disponibles para empacar:
                                <strong style={{ color: kgDisponibles > 0 ? color : '#f87171', marginLeft:6 }}>
                                  {kgDisponibles.toFixed(2)} kg
                                </strong>
                              </p>
                              {kgEnLineas > 0 && (
                                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                                  En este empaque: <strong style={{ color:'#f59e0b' }}>{kgEnLineas.toFixed(2)} kg</strong>
                                  {' · '}Quedarían: <strong style={{ color: kgDisponibles - kgEnLineas >= 0 ? '#10b981' : '#f87171' }}>
                                    {(kgDisponibles - kgEnLineas).toFixed(2)} kg
                                  </strong>
                                </p>
                              )}
                            </div>
                            <button onClick={() => setEmpaqueLineas(l => [...l, { productId:'', cantidad:0 }])}
                              style={{ background:'none', border:`1px solid ${color}`, color, padding:'3px 10px',
                                borderRadius:6, cursor:'pointer', fontSize:12 }}>
                              + Agregar producto
                            </button>
                          </div>

                          {kgDisponibles <= 0 && (
                            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
                              borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#f87171' }}>
                              ⚠ No hay kg disponibles. Todos los kg ya fueron empacados.
                            </div>
                          )}

                          {empaqueLineas.length === 0 && (
                            <p style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:16 }}>
                              Agrega los productos empacados en este lote
                            </p>
                          )}

                          {empaqueLineas.map((l, idx) => {
                            const prod = (productos as any[]).find((p:any) => p.id === l.productId);
                            const kgUsados = prod?.gramsWeight ? (l.cantidad * prod.gramsWeight) / 1000 : 0;
                            return (
                              <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto',
                                gap:8, marginBottom:8, alignItems:'center' }}>
                                <select className="input-base" style={{ fontSize:12 }} value={l.productId}
                                  onChange={e => setEmpaqueLineas(ls => ls.map((x,i) => i===idx?{...x,productId:e.target.value}:x))}>
                                  <option value="">— Producto —</option>
                                  {(productos as any[]).filter((p:any) => p.isActive).map((p:any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <input type="number" min="0" placeholder="Pzas" className="input-base" style={{ fontSize:12 }}
                                  value={l.cantidad||''}
                                  onChange={e => setEmpaqueLineas(ls => ls.map((x,i) => i===idx?{...x,cantidad:+e.target.value}:x))}/>
                                <div style={{ background:'#0f172a', borderRadius:6, padding:'6px 8px',
                                  fontSize:11, textAlign:'right',
                                  color: kgUsados > kgDisponibles ? '#f87171' : '#64748b' }}>
                                  {kgUsados > 0 ? `${kgUsados.toFixed(2)} kg` : '—'}
                                </div>
                                <button onClick={() => setEmpaqueLineas(ls => ls.filter((_,i) => i !== idx))}
                                  style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:16 }}>✕</button>
                              </div>
                            );
                          })}

                          {empaqueLineas.length > 0 && (
                            <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:12 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                                <span style={{ color:'#64748b' }}>Total kg en este empaque</span>
                                <span style={{ fontWeight:700, color: kgEnLineas > kgDisponibles ? '#f87171' : color }}>
                                  {kgEnLineas.toFixed(2)} kg
                                </span>
                              </div>
                            </div>
                          )}

                          <button className="btn-primary"
                            style={{ width:'100%', background: kgEnLineas > kgDisponibles ? '#64748b' : color, fontSize:13 }}
                            onClick={() => empaqueM.mutate()}
                            disabled={empaqueM.isPending || empaqueLineas.filter(l=>l.cantidad>0&&l.productId).length===0 || kgEnLineas > kgDisponibles}>
                            {empaqueM.isPending ? 'Guardando…' : kgEnLineas > kgDisponibles ? 'Excede kg disponibles' : 'Registrar empaque'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
