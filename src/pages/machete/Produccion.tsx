import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS = [
  { id:'MACHETE_RES', label:'Machete / Res',   hasGrasa: true  },
  { id:'CHICALI_RES', label:'Chicali / Res',    hasGrasa: false },
  { id:'CERDO',       label:'Cerdo',            hasGrasa: true  },
  { id:'MACHACA',     label:'Machaca (compra)',  hasGrasa: false },
];

const STATUS_COLOR: Record<string,string> = {
  EN_PROCESO:'#f59e0b', EMPACADO:'#3b82f6', CERRADO:'#10b981'
};

export default function ProduccionPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();

  const [vista,        setVista]        = useState<'lista'|'nuevo'>('lista');
  const [loteActivo,   setLoteActivo]   = useState<any>(null);
  const [tab,          setTab]          = useState<'horno'|'empaque'>('horno');

  // Form nuevo lote
  const [nuevoForm, setNuevoForm] = useState({
    fecha:     new Date().toISOString().slice(0,10),
    tipo:      'MACHETE_RES',
    kgEntrada: 0,
    notas:     '',
  });

  // Form salida horno
  const [hornoForm, setHornoForm] = useState({
    kgSalida:     0,
    kgGrasa:      0,
    kgEscarchado: 0,
  });

  // Form empaque
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

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/machete/lotes`, nuevoForm),
    onSuccess: () => {
      setVista('lista');
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
    },
  });

  const hornoM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/machete/lotes/${loteActivo.id}/salida-horno`, hornoForm),
    onSuccess: () => {
      setLoteActivo(null);
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
    },
  });

  const empaqueM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/machete/lotes/${loteActivo.id}/empaque`, {
      lineas: empaqueLineas.filter(l => l.cantidad > 0),
    }),
    onSuccess: () => {
      setLoteActivo(null);
      setEmpaqueLineas([]);
      qc.invalidateQueries({ queryKey: ['lotes', cid] });
      qc.invalidateQueries({ queryKey: ['pt-inventory', cid] });
    },
  });

  const cerrarM = useMutation({
    mutationFn: (loteId: string) => api.put(`/companies/${cid}/machete/lotes/${loteId}/cerrar`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lotes', cid] }),
  });

  const tipoConfig = TIPOS.find(t => t.id === loteActivo?.tipo);

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Producción</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setVista(vista==='nuevo'?'lista':'nuevo')}>
            {vista==='nuevo' ? 'Ver lotes' : '+ Nuevo lote'}
          </button>
        </div>

        {/* Nuevo lote */}
        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo lote de producción</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
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
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }}
                  value={nuevoForm.notas} onChange={e => setNuevoForm(f=>({...f,notas:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={()=>setVista('lista')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending||!nuevoForm.kgEntrada}>
                {crearM.isPending ? 'Creando…' : 'Crear lote'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de lotes */}
        {vista === 'lista' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fecha</th><th>Tipo</th>
                  <th style={{textAlign:'right'}}>Kg entrada</th>
                  <th style={{textAlign:'right'}}>Kg salida</th>
                  <th style={{textAlign:'right'}}>Rendimiento</th>
                  <th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
                {(lotes as any[]).length === 0 && !isLoading && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin lotes registrados</td></tr>
                )}
                {(lotes as any[]).map((l: any) => (
                  <tr key={l.id}>
                    <td>{fmtDate(l.fecha)}</td>
                    <td style={{fontSize:12}}>{TIPOS.find(t=>t.id===l.tipo)?.label||l.tipo}</td>
                    <td style={{textAlign:'right'}}>{l.kgEntrada} kg</td>
                    <td style={{textAlign:'right'}}>{l.kgSalida > 0 ? `${l.kgSalida} kg` : '—'}</td>
                    <td style={{textAlign:'right',color:color}}>
                      {l.rendimiento > 0 ? `${Number(l.rendimiento).toFixed(1)}%` : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:99,
                        background: STATUS_COLOR[l.status]+'22', color: STATUS_COLOR[l.status] }}>
                        {l.status.replace('_',' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {l.status === 'EN_PROCESO' && (
                          <button onClick={() => { setLoteActivo(l); setTab('horno'); }}
                            style={{ background:'none', border:'none', color:'#f59e0b', cursor:'pointer', fontSize:12 }}>
                            Salida horno
                          </button>
                        )}
                        {(l.status === 'EN_PROCESO' || l.status === 'EMPACADO') && (
                          <button onClick={() => { setLoteActivo(l); setTab('empaque'); setEmpaqueLineas([]); }}
                            style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:12 }}>
                            Empacar
                          </button>
                        )}
                        {l.status === 'EMPACADO' && (
                          <button onClick={() => cerrarM.mutate(l.id)}
                            style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                            Cerrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal registro horno / empaque */}
        {loteActivo && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:480, maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0, color }}>
                  Lote {fmtDate(loteActivo.fecha)} — {TIPOS.find(t=>t.id===loteActivo.tipo)?.label}
                </h3>
                <button onClick={() => setLoteActivo(null)}
                  style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:16 }}>
                {(['horno','empaque'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding:'8px 16px', fontSize:12, fontWeight:500, background:'none', border:'none',
                      borderBottom: tab===t ? `2px solid ${color}` : '2px solid transparent',
                      color: tab===t ? color : '#64748b', cursor:'pointer', textTransform:'capitalize' }}>
                    {t === 'horno' ? 'Salida del horno' : 'Empaque'}
                  </button>
                ))}
              </div>

              {/* Salida horno */}
              {tab === 'horno' && (
                <div>
                  <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:12 }}>
                    <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Kg entrada al horno</p>
                    <p style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{loteActivo.kgEntrada} kg</p>
                  </div>
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
                      <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Kg escarchado generado</label>
                      <input type="number" min="0" step="0.1" className="input-base" style={{ fontSize:13 }}
                        value={hornoForm.kgEscarchado||''} onChange={e => setHornoForm(f=>({...f,kgEscarchado:+e.target.value}))}/>
                    </div>
                  </div>
                  {hornoForm.kgSalida > 0 && (
                    <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'#64748b' }}>Merma calculada</span>
                        <span style={{ fontSize:13, color:'#f87171' }}>
                          {(Number(loteActivo.kgEntrada) - hornoForm.kgSalida - hornoForm.kgGrasa).toFixed(2)} kg
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, color:'#64748b' }}>Rendimiento</span>
                        <span style={{ fontSize:14, fontWeight:700, color }}>
                          {((hornoForm.kgSalida / Number(loteActivo.kgEntrada)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                  <button className="btn-primary" style={{ width:'100%', background:color, fontSize:13 }}
                    onClick={() => hornoM.mutate()} disabled={hornoM.isPending||!hornoForm.kgSalida}>
                    {hornoM.isPending ? 'Guardando…' : 'Registrar salida del horno'}
                  </button>
                </div>
              )}

              {/* Empaque */}
              {tab === 'empaque' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Kg disponibles: {loteActivo.kgSalida} kg</p>
                    <button onClick={() => setEmpaqueLineas(l => [...l, { productId:'', cantidad:0 }])}
                      style={{ background:'none', border:`1px solid ${color}`, color, padding:'3px 10px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                      + Agregar producto
                    </button>
                  </div>
                  {empaqueLineas.map((l, idx) => (
                    <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:8, marginBottom:8, alignItems:'center' }}>
                      <select className="input-base" style={{ fontSize:12 }} value={l.productId}
                        onChange={e => setEmpaqueLineas(ls => ls.map((x,i) => i===idx?{...x,productId:e.target.value}:x))}>
                        <option value="">— Producto —</option>
                        {(productos as any[]).filter((p:any)=>p.isActive).map((p:any)=>(
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input type="number" min="0" placeholder="Pzas" className="input-base" style={{ fontSize:12 }}
                        value={l.cantidad||''}
                        onChange={e => setEmpaqueLineas(ls => ls.map((x,i) => i===idx?{...x,cantidad:+e.target.value}:x))}/>
                      <button onClick={() => setEmpaqueLineas(ls => ls.filter((_,i)=>i!==idx))}
                        style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:16 }}>✕</button>
                    </div>
                  ))}
                  {empaqueLineas.length === 0 && (
                    <p style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:16 }}>
                      Agrega los productos empacados en este lote
                    </p>
                  )}
                  <button className="btn-primary" style={{ width:'100%', marginTop:12, background:color, fontSize:13 }}
                    onClick={() => empaqueM.mutate()}
                    disabled={empaqueM.isPending || empaqueLineas.filter(l=>l.cantidad>0&&l.productId).length===0}>
                    {empaqueM.isPending ? 'Guardando…' : 'Registrar empaque'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
