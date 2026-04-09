import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function InventarioPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();

  const [tab, setTab] = useState<'productos'|'insumos'|'compras'>('productos');
  const [showCompra, setShowCompra] = useState(false);
  const [compraForm, setCompraForm] = useState({
    insumoId: '', nombreInsumo: '', unidad: 'kg',
    cantidad: 0, costoUnitario: 0,
    fecha: new Date().toISOString().slice(0,10),
    metodoPago: 'efectivo_mxn', cuentaId: '',
  });
  const [saving, setSaving] = useState(false);

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

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentas', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
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

  const setC = (k: string, v: any) => setCompraForm(f => ({...f, [k]: v}));

  const guardarCompra = async () => {
    if (!compraForm.insumoId || !compraForm.cantidad || !compraForm.costoUnitario) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/machete/insumos/compra`, compraForm);
      setShowCompra(false);
      setCompraForm({ insumoId:'', nombreInsumo:'', unidad:'kg', cantidad:0, costoUnitario:0,
        fecha:new Date().toISOString().slice(0,10), metodoPago:'efectivo_mxn', cuentaId:'' });
      qc.invalidateQueries({ queryKey: ['insumos', cid] });
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Inventario</h1>
          {tab === 'insumos' && (
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => setShowCompra(!showCompra)}>
              + Registrar compra
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:24 }}>
          {([['productos','Producto terminado'],['insumos','Insumos'],['compras','Historial compras']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'10px 20px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===id ? `2px solid ${color}` : '2px solid transparent',
                color: tab===id ? color : '#64748b', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Formulario compra */}
        {showCompra && tab === 'insumos' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Registrar compra de insumo</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Insumo *</label>
                <select className="input-base" style={{ fontSize:13 }} value={compraForm.insumoId}
                  onChange={e => {
                    const ins = (insumos as any[]).find(i => i.id === e.target.value);
                    setC('insumoId', e.target.value);
                    if (ins) { setC('nombreInsumo', ins.name); setC('unidad', ins.unit); setC('costoUnitario', ins.costUnit); }
                  }}>
                  <option value="">— Seleccionar —</option>
                  {(insumos as any[]).map((ins: any) => (
                    <option key={ins.id} value={ins.id}>{ins.name} ({ins.group})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={compraForm.fecha} onChange={e => setC('fecha', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Cantidad ({compraForm.unidad})</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={compraForm.cantidad||''} onChange={e => setC('cantidad', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Costo unitario</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={compraForm.costoUnitario||''} onChange={e => setC('costoUnitario', +e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={compraForm.metodoPago}
                  onChange={e => setC('metodoPago', e.target.value)}>
                  <option value="efectivo_mxn">Efectivo MXN</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="credito">Crédito (CxP)</option>
                </select>
              </div>
              {compraForm.metodoPago !== 'credito' && (
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Cuenta</label>
                  <select className="input-base" style={{ fontSize:13 }} value={compraForm.cuentaId}
                    onChange={e => setC('cuentaId', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {(cuentas as any[]).map((c: any) => (
                      <option key={c.id} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {compraForm.cantidad > 0 && compraForm.costoUnitario > 0 && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Total de la compra</span>
                  <span style={{ fontSize:16, fontWeight:700, color }}>{fmt(compraForm.cantidad * compraForm.costoUnitario)}</span>
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setShowCompra(false)}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardarCompra} disabled={saving || !compraForm.insumoId || !compraForm.cantidad}>
                {saving ? 'Guardando…' : 'Registrar compra'}
              </button>
            </div>
          </div>
        )}

        {/* Producto terminado */}
        {tab === 'productos' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>SKU</th><th>Producto</th>
                  <th style={{textAlign:'right'}}>Stock</th>
                  <th style={{textAlign:'right'}}>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadProd && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
                {(productos as any[]).filter((p:any) => p.isActive).map((p: any) => {
                  const stock = Number(p.stock || 0);
                  const min   = Number(p.minStock || 5);
                  const bajo  = stock <= min;
                  return (
                    <tr key={p.id}>
                      <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                      <td style={{fontWeight:500}}>{p.name}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:bajo?'#f87171':color}}>{stock} pzas</td>
                      <td style={{textAlign:'right',color:'#64748b'}}>{min} pzas</td>
                      <td><span className={bajo ? 'badge-red' : 'badge-green'}>{bajo ? 'Stock bajo' : 'OK'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Insumos */}
        {tab === 'insumos' && (
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
                        <th>Insumo</th><th>Unidad</th>
                        <th style={{textAlign:'right'}}>Stock</th>
                        <th style={{textAlign:'right'}}>Costo unitario</th>
                        <th style={{textAlign:'right'}}>Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(items as any[]).map((ins: any) => (
                        <tr key={ins.id}>
                          <td style={{fontWeight:500}}>{ins.name}</td>
                          <td style={{color:'#64748b'}}>{ins.unit}</td>
                          <td style={{textAlign:'right',fontWeight:600,color:Number(ins.stock)<=Number(ins.minStock)?'#f87171':color}}>
                            {Number(ins.stock).toFixed(3)}
                          </td>
                          <td style={{textAlign:'right',color:'#64748b'}}>{fmt(ins.costUnit)}</td>
                          <td style={{textAlign:'right',fontWeight:600,color}}>
                            {fmt(Number(ins.stock) * Number(ins.costUnit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historial compras - pendiente */}
        {tab === 'compras' && (
          <div className="card" style={{ textAlign:'center', padding:48 }}>
            <p style={{ fontSize:36, marginBottom:12 }}>📦</p>
            <p style={{ color:'#94a3b8', fontWeight:500 }}>Historial de compras próximamente</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
