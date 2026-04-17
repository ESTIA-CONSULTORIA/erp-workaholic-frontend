import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export default function InventarioPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const navigate = useNavigate();

  const [tab, setTab] = useState<'productos'|'insumos'>('productos');

  const { data: productos = [], isLoading: loadProd } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: insumos = [], isLoading: loadIns } = useQuery({
    queryKey: ['insumos', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/insumos`).then(r => r.data),
    enabled:  !!cid,
  });

  const grupos = Array.isArray(insumos) ? (insumos as any[]).reduce((acc: any, ins: any) => {
    const g = ins.group || 'GENERAL';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ins);
    return acc;
  }, {}) : {};

  const GRUPO_LABELS: Record<string,string> = {
    CARNES_FRESCAS:    'Carnes Frescas',
    CARNES_SECAS:      'Carnes Secas',
    ESPECIAS:          'Especias',
    EMPAQUE_BOLSAS:    'Empaque — Bolsas',
    EMPAQUE_ETIQUETAS: 'Empaque — Etiquetas',
    EMPAQUE_CAJAS:     'Empaque — Cajas y Frascos',
  };

  // KPIs productos
  const prodActivos   = (productos as any[]).filter((p:any) => p.isActive);
  const prodBajoStock = prodActivos.filter((p:any) => Number(p.stock||0) <= Number(p.minStock||5));
  const prodSinStock  = prodActivos.filter((p:any) => Number(p.stock||0) === 0);

  // KPIs insumos
  const insLista      = Array.isArray(insumos) ? insumos as any[] : [];
  const insBajoMin    = insLista.filter((i:any) => Number(i.stock||0) <= Number(i.minStock||0) && Number(i.minStock||0) > 0);
  const valorInsumos  = insLista.reduce((t:number,i:any) => t + Number(i.stock||0)*Number(i.costUnit||0), 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Inventario</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => navigate('/machete/compras')}>
            + Registrar compra
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:20 }}>
          {([['productos','Producto terminado'],['insumos','Insumos']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'10px 20px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===id ? `2px solid ${color}` : '2px solid transparent',
                color: tab===id ? color : '#64748b', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PRODUCTO TERMINADO ── */}
        {tab === 'productos' && (
          <>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Productos activos',  value: prodActivos.length,   col:'#94a3b8' },
                { label:'Stock bajo',         value: prodBajoStock.length, col:'#f59e0b' },
                { label:'Sin stock',          value: prodSinStock.length,  col:'#f87171' },
              ].map(k => (
                <div key={k.label} style={{ background:'#1e293b', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
                  <p style={{ fontSize:22, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th style={{textAlign:'right'}}>Stock</th>
                    <th style={{textAlign:'right'}}>Mínimo</th>
                    <th style={{textAlign:'right'}}>Máximo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loadProd && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
                  {prodActivos.map((p: any) => {
                    const stock = Number(p.stock || 0);
                    const min   = Number(p.minStock || 5);
                    const max   = Number(p.maxStock || 0);
                    const bajo  = stock <= min;
                    const sobre = max > 0 && stock > max;
                    const estado = stock === 0 ? 'Sin stock' : bajo ? 'Stock bajo' : sobre ? 'Exceso' : 'OK';
                    const estadoColor = stock === 0 ? '#f87171' : bajo ? '#f59e0b' : sobre ? '#8b5cf6' : '#10b981';
                    return (
                      <tr key={p.id}>
                        <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                        <td style={{fontWeight:500}}>{p.name}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:bajo||stock===0?'#f87171':color}}>{stock} pzas</td>
                        <td style={{textAlign:'right',color:'#64748b'}}>{min} pzas</td>
                        <td style={{textAlign:'right',color:'#64748b'}}>{max > 0 ? `${max} pzas` : '—'}</td>
                        <td>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background: estadoColor+'22', color: estadoColor }}>
                            {estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── INSUMOS ── */}
        {tab === 'insumos' && (
          <>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Total insumos',    value: insLista.length,    fmt: (v:any) => v,    col:'#94a3b8' },
                { label:'Bajo mínimo',      value: insBajoMin.length,  fmt: (v:any) => v,    col:'#f59e0b' },
                { label:'Valor inventario', value: valorInsumos,       fmt: fmt,              col },
              ].map(k => (
                <div key={k.label} style={{ background:'#1e293b', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
                  <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:0 }}>{k.fmt(k.value)}</p>
                </div>
              ))}
            </div>

            <div>
              {Object.entries(grupos).map(([grupo, items]: any) => (
                <div key={grupo} style={{ marginBottom:16 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
                    {GRUPO_LABELS[grupo] || grupo}
                  </p>
                  <div className="card" style={{ padding:0, overflow:'hidden' }}>
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th>Unidad</th>
                          <th style={{textAlign:'right'}}>Stock</th>
                          <th style={{textAlign:'right'}}>Mínimo</th>
                          <th style={{textAlign:'right'}}>Costo/u</th>
                          <th style={{textAlign:'right'}}>Valor total</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadIns && <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando...</td></tr>}
                        {(items as any[]).map((ins: any) => {
                          const stock  = Number(ins.stock || 0);
                          const min    = Number(ins.minStock || 0);
                          const bajo   = min > 0 && stock <= min;
                          const sinStock = stock === 0;
                          const estadoColor = sinStock ? '#f87171' : bajo ? '#f59e0b' : '#10b981';
                          const estadoLabel = sinStock ? 'Sin stock' : bajo ? 'Bajo mín.' : 'OK';
                          return (
                            <tr key={ins.id}>
                              <td style={{fontWeight:500}}>{ins.name}</td>
                              <td style={{color:'#64748b'}}>{ins.unit}</td>
                              <td style={{textAlign:'right',fontWeight:600,color:bajo||sinStock?'#f87171':color}}>
                                {stock.toFixed(3)}
                              </td>
                              <td style={{textAlign:'right',color:'#64748b'}}>{min > 0 ? min.toFixed(3) : '—'}</td>
                              <td style={{textAlign:'right',color:'#64748b'}}>{fmt(ins.costUnit)}</td>
                              <td style={{textAlign:'right',fontWeight:600,color}}>
                                {fmt(stock * Number(ins.costUnit))}
                              </td>
                              <td>
                                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                                  background: estadoColor+'22', color: estadoColor }}>
                                  {estadoLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
