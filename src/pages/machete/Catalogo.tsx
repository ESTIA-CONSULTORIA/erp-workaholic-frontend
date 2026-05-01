import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, exportCSV } from '../../lib/api';
import ImportExportBar from '../../components/ImportExportBar';
import AppLayout from '../../components/layout/AppLayout';
import { useERPStore } from '../../store/erp.store';
import ImportCSV from '../../components/ImportCSV';

function ProductosTab({ cid, color, qc }: any) {
  const [showNew,   setShowNew]   = useState(false);
  const [editProd,  setEditProd]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<'todos'|'activos'|'inactivos'>('activos');

  const initForm = {
    sku:'', name:'', meatType:'RES', flavor:'NAT',
    presentation:'', gramsWeight:'', minStock:'5',
    priceMostrador:'', priceMayoreo:'', priceOnline:'', priceML:'',
  };
  const [form, setForm] = useState(initForm);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: products = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/products`).then(r => r.data),
    enabled:  !!cid,
  });

  const filtrados = (products as any[]).filter(p => {
    if (filtroActivo === 'activos')   return p.isActive !== false;
    if (filtroActivo === 'inactivos') return p.isActive === false;
    return true;
  });

  const crearProducto = async () => {
    if (!form.sku || !form.name) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/machete/products`, form);
      qc.invalidateQueries({ queryKey: ['products', cid] });
      setShowNew(false);
      setForm(initForm);
    } finally { setSaving(false); }
  };

  const guardarEdicion = async () => {
    if (!editProd) return;
    setSaving(true);
    try {
      await api.put(`/companies/${cid}/machete/products/${editProd.id}`, editProd);
      qc.invalidateQueries({ queryKey: ['products', cid] });
      setEditProd(null);
    } finally { setSaving(false); }
  };

  const toggleActivo = async (p: any) => {
    await api.put(`/companies/${cid}/machete/products/${p.id}`, { isActive: !p.isActive });
    qc.invalidateQueries({ queryKey: ['products', cid] });
  };

  const setEdit = (k: string, v: any) => setEditProd((p:any) => ({ ...p, [k]: v }));

  const PRECIO_COLS = [
    { key:'priceMostrador', label:'Tienda',       col:color },
    { key:'priceMayoreo',   label:'Mayoreo',      col:'#f59e0b' },
    { key:'priceOnline',    label:'Distribuidor', col:'#8b5cf6' },
    { key:'priceML',        label:'Online',       col:'#10b981' },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:4 }}>
          {(['activos','inactivos','todos'] as const).map(f => (
            <button key={f} onClick={() => setFiltroActivo(f)}
              style={{ padding:'4px 12px', borderRadius:99, fontSize:12, cursor:'pointer',
                border:`1px solid ${filtroActivo===f ? color : '#334155'}`,
                background: filtroActivo===f ? color+'22' : 'transparent',
                color: filtroActivo===f ? color : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ fontSize:13, color:'#64748b', alignSelf:'center', marginLeft:8 }}>
            {filtrados.length} productos
          </span>
        </div>
        <button className="btn-primary" style={{ background:color, fontSize:13 }}
          onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {/* Formulario nuevo producto */}
      {showNew && (
        <div className="card" style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo producto</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>SKU *</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.sku}
                onChange={e => set('sku', e.target.value)} placeholder="MCH-NAT-250G"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Machete Natural 250g"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo de carne</label>
              <select className="input-base" style={{ fontSize:13 }} value={form.meatType}
                onChange={e => set('meatType', e.target.value)}>
                <option value="RES">Res</option>
                <option value="CER">Cerdo</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Sabor</label>
              <select className="input-base" style={{ fontSize:13 }} value={form.flavor}
                onChange={e => set('flavor', e.target.value)}>
                {FLAVORS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Presentación</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.presentation}
                onChange={e => set('presentation', e.target.value)} placeholder="250G, 1KG, Jumbo..."/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Gramos</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.gramsWeight}
                onChange={e => set('gramsWeight', e.target.value)} placeholder="250"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Stock mínimo</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.minStock}
                onChange={e => set('minStock', e.target.value)}/>
            </div>
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
            Precios por canal
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {PRECIO_COLS.map(({ key, label, col }) => (
              <div key={key}>
                <label style={{ fontSize:11, color:col, display:'block', marginBottom:3 }}>{label}</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder="0.00"/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={crearProducto} disabled={saving || !form.sku || !form.name}>
              {saving ? 'Guardando…' : 'Crear producto'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla productos */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={() => exportCSV('productos', productos as any[], [
          {key:'sku',label:'SKU'},{key:'name',label:'Nombre'},
          {key:'priceMostrador',label:'P.Mostrador'},{key:'priceMayoreo',label:'P.Mayoreo'},
          {key:'priceOnline',label:'P.Online'},{key:'isActive',label:'Activo'},
        ])}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
          ⬇ Exportar CSV
        </button>
      </div>
      
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <ImportExportBar
            onExport={() => exportCSV('catalogo_machete', inventory as any[], [{ key:'sku', label:'SKU' }, { key:'name', label:'Nombre' }, { key:'group', label:'Grupo' }, { key:'price', label:'Precio' }, { key:'stock', label:'Stock' }])}
            importColumns={[{ key:'sku', label:'SKU', required:true, example:'MCH-RES-001' }, { key:'name', label:'Nombre', required:true, example:'Filete de Res 500g' }, { key:'group', label:'Grupo', example:'Machete' }, { key:'price', label:'Precio', required:true, example:'150.00' }, { key:'cost', label:'Costo', example:'90.00' }]}
            templateName="catalogo_machete"
            color={color}
          />
        </div>
<div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th><th>Producto</th><th>Stock</th>
              <th style={{textAlign:'right'}}>Tienda</th>
              <th style={{textAlign:'right'}}>Mayoreo</th>
              <th style={{textAlign:'right'}}>Dist.</th>
              <th style={{textAlign:'right'}}>Online</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin productos</td></tr>
            )}
            {filtrados.map((p: any) => (
              <tr key={p.id} style={{ opacity: p.isActive === false ? 0.5 : 1 }}>
                <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                <td style={{fontWeight:500,fontSize:13}}>{p.name}</td>
                <td>
                  <span style={{ fontSize:12, fontWeight:600,
                    color: (p.currentStock?.stock||0) <= (p.currentStock?.minStock||5) ? '#f87171' : '#10b981' }}>
                    {p.currentStock?.stock || 0} pzas
                  </span>
                </td>
                <td style={{textAlign:'right',color}}>{p.priceMostrador>0?fmt(p.priceMostrador):'—'}</td>
                <td style={{textAlign:'right',color:'#f59e0b'}}>{p.priceMayoreo>0?fmt(p.priceMayoreo):'—'}</td>
                <td style={{textAlign:'right',color:'#8b5cf6'}}>{p.priceOnline>0?fmt(p.priceOnline):'—'}</td>
                <td style={{textAlign:'right',color:'#10b981'}}>{p.priceML>0?fmt(p.priceML):'—'}</td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={() => setEditProd({...p})}
                      style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                      Editar
                    </button>
                    <button onClick={() => toggleActivo(p)}
                      style={{background:'none',border:'none',
                        color: p.isActive === false ? '#10b981' : '#f87171',
                        cursor:'pointer',fontSize:12}}>
                      {p.isActive === false ? 'Activar' : 'Desactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal edición completa */}
      {editProd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:560,
            maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color }}>Editar producto</h3>
              <button onClick={() => setEditProd(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>SKU</label>
                <input className="input-base" style={{ fontSize:13 }} value={editProd.sku||''}
                  onChange={e => setEdit('sku', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre</label>
                <input className="input-base" style={{ fontSize:13 }} value={editProd.name||''}
                  onChange={e => setEdit('name', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo de carne</label>
                <select className="input-base" style={{ fontSize:13 }} value={editProd.meatType||'RES'}
                  onChange={e => setEdit('meatType', e.target.value)}>
                  <option value="RES">Res</option>
                  <option value="CER">Cerdo</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Sabor</label>
                <select className="input-base" style={{ fontSize:13 }} value={editProd.flavor||'NAT'}
                  onChange={e => setEdit('flavor', e.target.value)}>
                  {FLAVORS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Presentación</label>
                <input className="input-base" style={{ fontSize:13 }} value={editProd.presentation||''}
                  onChange={e => setEdit('presentation', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Gramos</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                  value={editProd.gramsWeight||''} onChange={e => setEdit('gramsWeight', +e.target.value)}/>
              </div>
            </div>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 8px' }}>Precios por canal</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {PRECIO_COLS.map(({ key, label, col }) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:col, display:'block', marginBottom:3 }}>{label}</label>
                  <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                    value={editProd[key]||''} onChange={e => setEdit(key, e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setEditProd(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardarEdicion} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsumosTab({ cid, color, qc }: any) {
  const [showNew, setShowNew] = useState(false);
  const [editId,  setEditId]  = useState<string|null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    sku:'', name:'', unit:'kg', costUnit:'', group:'GENERAL', stock:'0', minStock:'0',
  });
  const set     = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k: string, v: any) => setEditForm((f:any) => ({ ...f, [k]: v }));

  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/insumos`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearInsumo = async () => {
    if (!form.sku || !form.name) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/machete/insumos`, form);
      qc.invalidateQueries({ queryKey: ['insumos', cid] });
      setShowNew(false);
      setForm({ sku:'', name:'', unit:'kg', costUnit:'', group:'GENERAL', stock:'0', minStock:'0' });
    } finally { setSaving(false); }
  };

  const startEdit = (ins: any) => {
    setEditId(ins.id);
    setEditForm({ name: ins.name, unit: ins.unit, costUnit: ins.costUnit, group: ins.group, minStock: ins.minStock });
  };

  const guardarInsumo = async (id: string) => {
    setSaving(true);
    try {
      await api.put(`/companies/${cid}/machete/insumos/${id}`, editForm);
      qc.invalidateQueries({ queryKey: ['insumos', cid] });
      setEditId(null);
    } finally { setSaving(false); }
  };

  // Agrupar por group
  const grupos = (insumos as any[]).reduce((acc: any, ins: any) => {
    const g = ins.group || 'GENERAL';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ins);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
          {(insumos as any[]).length} insumos registrados
        </p>
        <button className="btn-primary" style={{ background:color, fontSize:13 }}
          onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Cancelar' : '+ Nuevo insumo'}
        </button>
      </div>

      {/* Formulario nuevo insumo */}
      {showNew && (
        <div className="card" style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo insumo</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>SKU *</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.sku}
                onChange={e => set('sku', e.target.value)} placeholder="CARNE-RES-FRESCA"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Carne de res fresca"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Grupo</label>
              <select className="input-base" style={{ fontSize:13 }} value={form.group}
                onChange={e => set('group', e.target.value)}>
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Unidad</label>
              <select className="input-base" style={{ fontSize:13 }} value={form.unit}
                onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Costo unitario</label>
              <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                value={form.costUnit} onChange={e => set('costUnit', e.target.value)} placeholder="0.00"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Stock inicial</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                value={form.stock} onChange={e => set('stock', e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Stock mínimo</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                value={form.minStock} onChange={e => set('minStock', e.target.value)}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={crearInsumo} disabled={saving || !form.sku || !form.name}>
              {saving ? 'Guardando…' : 'Crear insumo'}
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por grupo */}
      {Object.keys(grupos).length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:32, color:'#64748b' }}>
          Sin insumos registrados
        </div>
      )}

      {Object.entries(grupos).map(([grupo, items]: any) => (
        <div key={grupo} style={{ marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 8px' }}>
            {grupo}
          </p>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>SKU</th><th>Nombre</th><th>Unidad</th>
                  <th style={{textAlign:'right'}}>Stock</th>
                  <th style={{textAlign:'right'}}>Stock mín.</th>
                  <th style={{textAlign:'right'}}>Costo unit.</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ins: any) => (
                  <tr key={ins.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{ins.sku}</code></td>
                    {editId === ins.id ? (
                      <>
                        <td>
                          <input className="input-base" style={{fontSize:12,width:160}} value={editForm.name||''}
                            onChange={e => setEdit('name', e.target.value)}/>
                        </td>
                        <td>
                          <select className="input-base" style={{fontSize:12}} value={editForm.unit||'kg'}
                            onChange={e => setEdit('unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{textAlign:'right'}}>
                          <span style={{fontSize:12,color:'#94a3b8'}}>{Number(ins.stock).toFixed(2)}</span>
                        </td>
                        <td style={{textAlign:'right'}}>
                          <input type="number" min="0" className="input-base" style={{fontSize:12,width:70,textAlign:'right'}}
                            value={editForm.minStock||0} onChange={e => setEdit('minStock', e.target.value)}/>
                        </td>
                        <td style={{textAlign:'right'}}>
                          <input type="number" min="0" step="0.01" className="input-base" style={{fontSize:12,width:90,textAlign:'right'}}
                            value={editForm.costUnit||0} onChange={e => setEdit('costUnit', e.target.value)}/>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={() => guardarInsumo(ins.id)} disabled={saving}
                              style={{background:color,border:'none',color:'#fff',padding:'3px 10px',borderRadius:6,cursor:'pointer',fontSize:12}}>
                              {saving?'…':'✓'}
                            </button>
                            <button onClick={() => setEditId(null)}
                              style={{background:'none',border:'1px solid #334155',color:'#64748b',padding:'3px 8px',borderRadius:6,cursor:'pointer',fontSize:12}}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{fontWeight:500}}>{ins.name}</td>
                        <td><span className="badge-blue">{ins.unit}</span></td>
                        <td style={{textAlign:'right',fontWeight:600,
                          color: Number(ins.stock) <= Number(ins.minStock) ? '#f87171' : '#10b981'}}>
                          {Number(ins.stock).toFixed(2)}
                        </td>
                        <td style={{textAlign:'right',color:'#64748b'}}>{Number(ins.minStock).toFixed(2)}</td>
                        <td style={{textAlign:'right',color}}>{fmt(ins.costUnit)}</td>
                        <td>
                          <button onClick={() => startEdit(ins)}
                            style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientesTabCompleta({ cid, color, qc }: any) {

  const [showNew,    setShowNew]    = useState(false);
  const [editCli,    setEditCli]    = useState<any>(null);
  const [detalle,    setDetalle]    = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [busqueda,   setBusqueda]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const initForm = { name:'', rfc:'', email:'', phone:'', contact:'', address:'', creditLimit:0, notes:'' };
  const [form, setForm] = useState(initForm);
  const set = (k:string, v:any) => setForm(f => ({...f, [k]:v}));

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxcCliente = [] } = useQuery({
    queryKey: ['cxc-cliente', cid, detalle?.id],
    queryFn:  () => api.get(`/companies/${cid}/cxc?clientId=${detalle.id}`).then(r => r.data),
    enabled:  !!cid && !!detalle,
  });

  const cliFiltrados = (clientes as any[]).filter(c =>
    !busqueda || c.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rfc?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardar = async () => {
    if (!form.name) { setError('El nombre es obligatorio'); return; }
    setError(''); setSaving(true);
    try {
      if (editCli) {
        await api.put(`/companies/${cid}/clients/${editCli.id}`, form);
        setEditCli(null);
      } else {
        await api.post(`/companies/${cid}/clients`, form);
        setShowNew(false);
      }
      setForm(initForm);
      qc.invalidateQueries({ queryKey: ['clients', cid] });
    } catch(e:any) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const startEdit = (c:any) => {
    setEditCli(c);
    setForm({ name:c.name||'', rfc:c.rfc||'', email:c.email||'', phone:c.phone||'',
              contact:c.contact||'', address:c.address||'', creditLimit:c.creditLimit||0, notes:c.notes||'' });
    setShowNew(false); setDetalle(null);
  };

  const saldoTotal = (cxcCliente as any[]).filter((c:any)=>c.status!=='PAGADO')
    .reduce((t:number,c:any) => t + Number(c.balance||0), 0);

  return (
    <div style={{ maxWidth:1100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Clientes</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:13 }}>⬆ Importar</button>
            <button onClick={() => exportCSV('clientes', clientes as any[],
              [{key:'name',label:'Nombre'},{key:'rfc',label:'RFC'},{key:'phone',label:'Teléfono'},
               {key:'email',label:'Email'},{key:'creditLimit',label:'Límite crédito'},{key:'contact',label:'Contacto'}])}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>⬇ Exportar</button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => { setShowNew(!showNew); setEditCli(null); setForm(initForm); setError(''); setDetalle(null); }}>
              {showNew ? 'Cancelar' : '+ Nuevo cliente'}
            </button>
          </div>
        </div>

        <input className="input-base" style={{ maxWidth:300, fontSize:13, marginBottom:16 }}
          placeholder="Buscar nombre o RFC…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>

        {(showNew || editCli) && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>
              {editCli ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre / Razón social *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>RFC</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.rfc}
                  onChange={e => set('rfc', e.target.value.toUpperCase())}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.phone}
                  onChange={e => set('phone', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Contacto</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.contact}
                  onChange={e => set('contact', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Límite de crédito</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.creditLimit||''}
                  onChange={e => set('creditLimit', +e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Dirección</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.address}
                  onChange={e => set('address', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setShowNew(false); setEditCli(null); setForm(initForm); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving || !form.name}>
                {saving ? 'Guardando…' : editCli ? 'Actualizar' : 'Crear cliente'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: detalle ? '1fr 1fr' : '1fr', gap:16 }}>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Nombre</th><th>RFC</th><th>Teléfono</th>
                <th style={{textAlign:'right'}}>Crédito</th><th></th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && cliFiltrados.length===0 && (
                  <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin clientes</td></tr>
                )}
                {cliFiltrados.map((c:any) => (
                  <tr key={c.id}
                    style={{ background: detalle?.id===c.id ? color+'11':'transparent', cursor:'pointer' }}
                    onClick={() => setDetalle(detalle?.id===c.id ? null : c)}>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{c.rfc||'—'}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{c.phone||'—'}</td>
                    <td style={{ textAlign:'right', fontSize:12, color: c.creditLimit>0?color:'#475569' }}>
                      {c.creditLimit>0 ? fmt(c.creditLimit) : '—'}
                    </td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); startEdit(c); }}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detalle && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px', color }}>{detalle.name}</h3>
                    {detalle.rfc && <code style={{ fontSize:11, color:'#64748b' }}>{detalle.rfc}</code>}
                  </div>
                  <button onClick={() => setDetalle(null)}
                    style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>✕</button>
                </div>
                {[
                  ['Contacto',detalle.contact],['Teléfono',detalle.phone],
                  ['Email',detalle.email],['Dirección',detalle.address],
                  ['Crédito',detalle.creditLimit>0?fmt(detalle.creditLimit):'Sin crédito'],
                  ['Notas',detalle.notes],
                ].filter(([,v])=>v).map(([label,value]) => (
                  <div key={label as string} style={{ display:'flex', justifyContent:'space-between',
                    marginBottom:6, paddingBottom:6, borderBottom:'1px solid #1e293b' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:500 }}>{value}</span>
                  </div>
                ))}
                {saldoTotal > 0 && (
                  <div style={{ background:color+'11', borderRadius:6, padding:'8px 10px', marginTop:8 }}>
                    <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>Saldo pendiente CxC</p>
                    <p style={{ fontSize:18, fontWeight:700, color, margin:0 }}>{fmt(saldoTotal)}</p>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #334155' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#64748b', margin:0,
                    textTransform:'uppercase', letterSpacing:1 }}>Historial CxC</p>
                </div>
                <table className="table-base">
                  <thead><tr>
                    <th>Fecha</th><th style={{textAlign:'right'}}>Original</th>
                    <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {(cxcCliente as any[]).length===0 && (
                      <tr><td colSpan={4} style={{textAlign:'center',padding:20,color:'#64748b',fontSize:12}}>Sin cuentas registradas</td></tr>
                    )}
                    {(cxcCliente as any[]).slice(0,8).map((c:any) => (
                      <tr key={c.id}>
                        <td style={{fontSize:11}}>{fmtDate(c.date)}</td>
                        <td style={{textAlign:'right',fontSize:12}}>{fmt(c.originalAmount)}</td>
                        <td style={{textAlign:'right',fontSize:12,fontWeight:700,
                          color:c.status==='PAGADO'?'#10b981':color}}>{fmt(c.balance)}</td>
                        <td><span className={c.status==='PAGADO'?'badge-green':'badge-amber'}>
                          {c.status==='PAGADO'?'Pagado':'Pendiente'}
                        </span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      {showImport && (
        <ImportCSV title="Clientes" color={color}
          columns={[
            { key:'nombre',   label:'Nombre',         required:true },
            { key:'rfc',      label:'RFC'                           },
            { key:'telefono', label:'Teléfono'                      },
            { key:'email',    label:'Email'                         },
            { key:'contacto', label:'Contacto'                      },
            { key:'credito',  label:'Límite crédito', type:'number' },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/clientes`, { rows });
            qc.invalidateQueries({ queryKey: ['clients', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
      </div>
  );
}


export default function CatalogoPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();
  const [vista, setVista] = useState<Vista>('productos');

  const TABS: { id: Vista; label: string }[] = [
    { id: 'productos', label: 'Productos' },
    { id: 'insumos',   label: 'Insumos' },
    { id: 'clientes',     label: 'Clientes' },
    { id: 'proveedores', label: 'Proveedores' },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setVista(t.id)}
              style={{ padding:'10px 20px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: vista===t.id ? `2px solid ${color}` : '2px solid transparent',
                color: vista===t.id ? color : '#64748b', cursor:'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {vista === 'productos' && <ProductosTab cid={cid!} color={color} qc={qc}/>}
        {vista === 'insumos'   && <InsumosTab   cid={cid!} color={color} qc={qc}/>}
        {vista === 'clientes'     && <ClientesTabCompleta cid={cid!} color={color} qc={qc}/>}
        {vista === 'proveedores' && <ProveedoresTab cid={cid!} color={color} qc={qc}/>}
      </div>
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB PRODUCTOS
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
//  TAB INSUMOS
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
//  SECCIÓN OC (sin cambios)
// ══════════════════════════════════════════════════════════════
function OCSection({ cid, clientId, color, ordenes, qc }: any) {
  const [showNew,   setShowNew]   = useState(false);
  const [surtidoOC, setSurtidoOC] = useState<string|null>(null);
  const [form, setForm] = useState({ numero:'', fecha:new Date().toISOString().slice(0,10), notes:'' });
  const [lineas, setLineas] = useState<any[]>([]);
  const [surtLineas, setSurtLineas] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: productos = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  const agregarLinea = () => setLineas(l => [...l, { productId:'', cantidad:1, precioUnitario:0 }]);

  const setLinea = (idx: number, k: string, v: any) => {
    setLineas(l => l.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [k]: v };
      if (k === 'productId') {
        const prod = (productos as any[]).find((p:any) => p.id === v);
        if (prod) updated.precioUnitario = prod.priceMostrador || 0;
      }
      return updated;
    }));
  };

  const montoTotal = lineas.reduce((t, l) => t + (Number(l.cantidad) * Number(l.precioUnitario)), 0);

  const crearOC = async () => {
    if (!form.numero || lineas.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/clients/${clientId}/ordenes`, {
        ...form,
        lineas: lineas.map(l => ({ productId: l.productId, cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) })),
      });
      setShowNew(false);
      setForm({ numero:'', fecha:new Date().toISOString().slice(0,10), notes:'' });
      setLineas([]);
      qc.invalidateQueries({ queryKey: ['client-detail'] });
    } finally { setSaving(false); }
  };

  const registrarSurtido = async (ordenId: string) => {
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/ordenes/${ordenId}/surtidos`, {
        fecha: new Date().toISOString().slice(0,10),
        lineas: surtLineas.filter(l => l.cantidad > 0),
        notes: '',
      });
      setSurtidoOC(null);
      setSurtLineas([]);
      qc.invalidateQueries({ queryKey: ['client-detail'] });
    } finally { setSaving(false); }
  };

  const STATUS_COLOR: Record<string,string> = { PENDIENTE:'#f59e0b', SURTIDO_PARCIAL:'#3b82f6', SURTIDO_COMPLETO:'#10b981' };
  const STATUS_LABEL: Record<string,string> = { PENDIENTE:'Pendiente', SURTIDO_PARCIAL:'Surtido parcial', SURTIDO_COMPLETO:'Surtido completo' };

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <p style={{fontSize:14,fontWeight:600,margin:0}}>Órdenes de compra</p>
        <button className="btn-primary" style={{background:color,fontSize:12}} onClick={()=>setShowNew(!showNew)}>+ Nueva OC</button>
      </div>

      {showNew && (
        <div style={{background:'#0f172a',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:2}}>Número OC *</label>
              <input className="input-base" style={{fontSize:12}} value={form.numero} onChange={e=>set('numero',e.target.value)} placeholder="OC-001"/>
            </div>
            <div>
              <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:2}}>Fecha</label>
              <input type="date" className="input-base" style={{fontSize:12}} value={form.fecha} onChange={e=>set('fecha',e.target.value)}/>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <label style={{fontSize:11,color:'#64748b'}}>Productos</label>
              <button onClick={agregarLinea}
                style={{background:'none',border:'1px solid #334155',color:'#94a3b8',padding:'2px 8px',borderRadius:6,cursor:'pointer',fontSize:11}}>
                + Agregar
              </button>
            </div>
            {lineas.map((l, idx) => (
              <div key={idx} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center'}}>
                <select className="input-base" style={{fontSize:11}} value={l.productId}
                  onChange={e=>setLinea(idx,'productId',e.target.value)}>
                  <option value="">— Producto —</option>
                  {(productos as any[]).filter((p:any)=>p.isActive).map((p:any)=>(
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input type="number" min="1" placeholder="Cant." className="input-base" style={{fontSize:11}}
                  value={l.cantidad} onChange={e=>setLinea(idx,'cantidad',+e.target.value)}/>
                <input type="number" min="0" placeholder="Precio" className="input-base" style={{fontSize:11}}
                  value={l.precioUnitario} onChange={e=>setLinea(idx,'precioUnitario',+e.target.value)}/>
                <button onClick={()=>setLineas(ls=>ls.filter((_,i)=>i!==idx))}
                  style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:16}}>✕</button>
              </div>
            ))}
          </div>
          {lineas.length > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,padding:'8px 0',borderTop:'1px solid #334155'}}>
              <span style={{fontSize:13,color:'#64748b'}}>Total OC</span>
              <span style={{fontSize:15,fontWeight:700,color}}>{fmt(montoTotal)}</span>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button className="btn-secondary" style={{fontSize:12}} onClick={()=>{setShowNew(false);setLineas([])}}>Cancelar</button>
            <button className="btn-primary" style={{background:color,fontSize:12}} onClick={crearOC}
              disabled={saving||!form.numero||lineas.length===0}>
              {saving?'Guardando…':'Crear OC'}
            </button>
          </div>
        </div>
      )}

      {ordenes.length===0 && <p style={{color:'#64748b',fontSize:13,textAlign:'center',padding:16}}>Sin órdenes de compra</p>}

      {ordenes.map((oc:any) => (
        <div key={oc.id} style={{background:'#0f172a',borderRadius:8,padding:12,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <p style={{fontSize:13,fontWeight:600,margin:'0 0 2px',color:'#f1f5f9'}}>OC #{oc.numero}</p>
              <p style={{fontSize:11,color:'#64748b',margin:0}}>{fmtDate(oc.fecha)}</p>
            </div>
            <span style={{fontSize:11,padding:'3px 8px',borderRadius:99,
              background:(STATUS_COLOR[oc.status]||'#64748b')+'22',color:STATUS_COLOR[oc.status]||'#64748b'}}>
              {STATUS_LABEL[oc.status]||oc.status}
            </span>
          </div>

          {oc.lineas?.length > 0 && (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginBottom:8}}>
              <thead>
                <tr style={{color:'#64748b'}}>
                  <th style={{textAlign:'left',paddingBottom:4}}>Producto</th>
                  <th style={{textAlign:'right',paddingBottom:4}}>Cant.</th>
                  <th style={{textAlign:'right',paddingBottom:4}}>Surtido</th>
                  <th style={{textAlign:'right',paddingBottom:4}}>Precio</th>
                  <th style={{textAlign:'right',paddingBottom:4}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {oc.lineas.map((l:any) => (
                  <tr key={l.id} style={{color:'#94a3b8'}}>
                    <td style={{paddingBottom:2}}>{l.product?.name||l.productId}</td>
                    <td style={{textAlign:'right'}}>{l.cantidad}</td>
                    <td style={{textAlign:'right',color:l.cantidadSurtida>=l.cantidad?'#10b981':'#f59e0b'}}>{l.cantidadSurtida}</td>
                    <td style={{textAlign:'right'}}>{fmt(l.precioUnitario)}</td>
                    <td style={{textAlign:'right'}}>{fmt(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:8}}>
            <div><p style={{fontSize:10,color:'#64748b',margin:'0 0 1px'}}>Total OC</p><p style={{fontSize:13,fontWeight:600,color:'#f1f5f9',margin:0}}>{fmt(oc.montoTotal)}</p></div>
            <div><p style={{fontSize:10,color:'#64748b',margin:'0 0 1px'}}>Surtido</p><p style={{fontSize:13,fontWeight:600,color:'#10b981',margin:0}}>{fmt(oc.montoSurtido)}</p></div>
            <div><p style={{fontSize:10,color:'#64748b',margin:'0 0 1px'}}>Saldo</p><p style={{fontSize:13,fontWeight:600,color,margin:0}}>{fmt(oc.saldo)}</p></div>
          </div>

          {oc.status !== 'CANCELADA' && oc.status !== 'SURTIDO_COMPLETO' && (
            <>
              <div style={{background:'#0f172a',borderRadius:6,padding:'6px 10px',marginBottom:8,border:'1px solid #334155'}}>
                <p style={{fontSize:10,color:'#64748b',margin:0}}>
                  🛒 Para surtir esta OC, selecciona al cliente en el <strong style={{color:'#f59e0b'}}>POS</strong> y elige la OC
                </p>
              </div>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={async()=>{
                  if(window.confirm('¿Cerrar OC con lo surtido hasta ahora? El saldo pendiente quedará cancelado.')){
                    await api.put(`/companies/${cid}/ordenes/${oc.id}/cerrar`,{});
                    qc.invalidateQueries({queryKey:['client-detail']});
                  }
                }} style={{flex:1,padding:'6px',borderRadius:6,fontSize:11,border:'1px solid #10b981',background:'none',color:'#10b981',cursor:'pointer'}}>
                  ✓ Cerrar OC
                </button>
                <button onClick={async()=>{
                  const motivo = window.prompt('Motivo de cancelación:');
                  if(motivo !== null){
                    await api.put(`/companies/${cid}/ordenes/${oc.id}/cancelar`,{motivo});
                    qc.invalidateQueries({queryKey:['client-detail']});
                  }
                }} style={{flex:1,padding:'6px',borderRadius:6,fontSize:11,border:'1px solid #f87171',background:'none',color:'#f87171',cursor:'pointer'}}>
                  ✕ Cancelar OC
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB PROVEEDORES
// ══════════════════════════════════════════════════════════════
function ProveedoresTab({ cid, color, qc }: any) {
  const [showNew, setShowNew] = useState(false);
  const [editProv, setEditProv] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  const initForm = { name:'', email:'', phone:'', rfc:'', notes:'' };
  const [form, setForm] = useState(initForm);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  const filtrados = (proveedores as any[]).filter(p =>
    !busqueda || p.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const crear = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/companies/${cid}/suppliers`, form);
      qc.invalidateQueries({ queryKey: ['suppliers', cid] });
      setShowNew(false); setForm(initForm);
    } catch(e: any) { setError(e.response?.data?.message || 'Error al crear'); }
    finally { setSaving(false); }
  };

  const guardar = async () => {
    if (!editProv?.name?.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/companies/${cid}/suppliers/${editProv.id}`, editProv);
      qc.invalidateQueries({ queryKey: ['suppliers', cid] });
      setEditProv(null);
    } catch(e: any) { setError(e.response?.data?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const toggle = async (p: any) => {
    await api.put(`/companies/${cid}/suppliers/${p.id}`, { isActive: !p.isActive });
    qc.invalidateQueries({ queryKey: ['suppliers', cid] });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <input className="input-base" style={{ width:260, fontSize:13 }}
          placeholder="Buscar proveedor…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}/>
        <div style={{ display:'flex', gap:8 }}>
          <ImportExportBar
            color={color}
            onExport={() => exportCSV('proveedores', proveedores as any[], [
              { key:'name',  label:'Nombre' },
              { key:'email', label:'Email' },
              { key:'phone', label:'Teléfono' },
              { key:'notes', label:'Notas' },
            ])}
            importColumns={[
              { key:'name',  label:'Nombre',    required:true, example:'Ganadería Norteña SA' },
              { key:'email', label:'Email',      example:'ventas@ganaderia.com' },
              { key:'phone', label:'Teléfono',   example:'686-123-4567' },
              { key:'notes', label:'Notas',      example:'Proveedor de res y cerdo' },
            ]}
            templateName="proveedores"
          />
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { setShowNew(s => !s); setEditProv(null); setError(''); }}>
            {showNew ? 'Cancelar' : '+ Nuevo proveedor'}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ fontSize:12, color:'#f87171', background:'rgba(248,113,113,0.1)',
          padding:'8px 12px', borderRadius:7, marginBottom:12 }}>⚠ {error}</p>
      )}

      {/* Formulario nuevo */}
      {showNew && (
        <div className="card" style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo proveedor</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Ganadería Norteña SA"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
              <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="ventas@proveedor.com"/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="686-123-4567"/>
            </div>
            <div style={{ gridColumn:'span 3' }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                onChange={e => set('notes', e.target.value)} placeholder="Productos que provee, condiciones, etc."/>
            </div>
          </div>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={crear} disabled={saving || !form.name}>
            {saving ? 'Guardando…' : 'Crear proveedor'}
          </button>
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <p style={{ color:'#64748b', padding:32, textAlign:'center' }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'#334155' }}>
          <p style={{ fontSize:32, margin:'0 0 10px' }}>🏭</p>
          <p style={{ fontSize:14, color:'#64748b' }}>
            {busqueda ? 'Sin resultados' : 'Sin proveedores registrados'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Teléfono</th>
                <th>Notas</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p: any) => (
                <tr key={p.id}>
                  {editProv?.id === p.id ? (
                    <>
                      <td><input className="input-base" style={{ fontSize:12 }} value={editProv.name}
                        onChange={e => setEditProv((x:any) => ({ ...x, name:e.target.value }))}/></td>
                      <td><input className="input-base" style={{ fontSize:12 }} value={editProv.email||''}
                        onChange={e => setEditProv((x:any) => ({ ...x, email:e.target.value }))}/></td>
                      <td><input className="input-base" style={{ fontSize:12 }} value={editProv.phone||''}
                        onChange={e => setEditProv((x:any) => ({ ...x, phone:e.target.value }))}/></td>
                      <td><input className="input-base" style={{ fontSize:12 }} value={editProv.notes||''}
                        onChange={e => setEditProv((x:any) => ({ ...x, notes:e.target.value }))}/></td>
                      <td colSpan={2}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn-primary" style={{ background:color, fontSize:11, padding:'4px 10px' }}
                            onClick={guardar} disabled={saving}>
                            {saving ? '…' : '💾 Guardar'}
                          </button>
                          <button style={{ fontSize:11, padding:'4px 10px', borderRadius:6,
                            border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}
                            onClick={() => setEditProv(null)}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight:600 }}>{p.name}</td>
                      <td style={{ fontSize:12, color:'#64748b' }}>{p.email || '—'}</td>
                      <td style={{ fontSize:12 }}>{p.phone || '—'}</td>
                      <td style={{ fontSize:12, color:'#475569', maxWidth:180,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.notes || '—'}
                      </td>
                      <td>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, fontWeight:600,
                          background: p.isActive ? '#10b98122' : '#f8717122',
                          color: p.isActive ? '#10b981' : '#f87171' }}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button style={{ fontSize:11, padding:'3px 9px', borderRadius:5,
                            border:`1px solid ${color}`, background:'none', color, cursor:'pointer' }}
                            onClick={() => { setEditProv({...p}); setShowNew(false); }}>
                            ✎
                          </button>
                          <button style={{ fontSize:11, padding:'3px 9px', borderRadius:5,
                            border:`1px solid ${p.isActive ? '#f59e0b' : '#10b981'}`,
                            background:'none', color: p.isActive ? '#f59e0b' : '#10b981', cursor:'pointer' }}
                            onClick={() => toggle(p)}>
                            {p.isActive ? '⏸' : '▶'}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

