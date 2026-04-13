import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

type Vista = 'productos' | 'insumos' | 'clientes';

const MEAT_TYPES  = ['RES','CER'];
const FLAVORS     = ['NAT','CHI','BBQ','MIX'];
const UNITS       = ['kg','lt','pza','g','ml','bolsa','caja'];
const GROUPS      = ['CARNE','CONDIMENTO','EMPAQUE','LIMPIEZA','GENERAL'];

export default function CatalogoPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();
  const [vista, setVista] = useState<Vista>('productos');

  const TABS: { id: Vista; label: string }[] = [
    { id: 'productos', label: 'Productos' },
    { id: 'insumos',   label: 'Insumos' },
    { id: 'clientes',  label: 'Clientes / OC' },
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
        {vista === 'clientes'  && <ClientesTab  cid={cid!} color={color} qc={qc}/>}
      </div>
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB PRODUCTOS
// ══════════════════════════════════════════════════════════════
function ProductosTab({ cid, color, qc }: any) {
  const [showNew,    setShowNew]    = useState(false);
  const [editId,     setEditId]     = useState<string|null>(null);
  const [editPrices, setEditPrices] = useState<any>({});
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({
    sku:'', name:'', meatType:'RES', flavor:'NAT',
    presentation:'250G', gramsWeight:'', minStock:'5',
    priceMostrador:'', priceMayoreo:'', priceOnline:'', priceML:'',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: products = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/products`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearProducto = async () => {
    if (!form.sku || !form.name) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/machete/products`, form);
      qc.invalidateQueries({ queryKey: ['products', cid] });
      setShowNew(false);
      setForm({ sku:'', name:'', meatType:'RES', flavor:'NAT', presentation:'250G', gramsWeight:'', minStock:'5',
        priceMostrador:'', priceMayoreo:'', priceOnline:'', priceML:'' });
    } finally { setSaving(false); }
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setEditPrices({ priceMostrador: p.priceMostrador, priceMayoreo: p.priceMayoreo,
      priceOnline: p.priceOnline, priceML: p.priceML });
  };

  const guardarPrecios = async (id: string) => {
    setSaving(true);
    try {
      await api.put(`/companies/${cid}/machete/products/${id}`, editPrices);
      qc.invalidateQueries({ queryKey: ['products', cid] });
      setEditId(null);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
          {(products as any[]).length} productos registrados
        </p>
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
                onChange={e => set('sku', e.target.value)} placeholder="RES-NAT-250G"/>
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
                {MEAT_TYPES.map(m => <option key={m} value={m}>{m === 'RES' ? 'Res' : 'Cerdo'}</option>)}
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
    onChange={e => set('presentation', e.target.value)} placeholder="30G, 250G, 1KG..."/>
</div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Gramos</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.gramsWeight}
                onChange={e => set('gramsWeight', e.target.value)} placeholder="250"/>
            </div>
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
            Precios por canal
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { key:'priceMostrador', label:'Tienda',       col:color },
              { key:'priceMayoreo',   label:'Mayoreo',      col:'#f59e0b' },
              { key:'priceOnline',    label:'Distribuidor', col:'#8b5cf6' },
              { key:'priceML',        label:'Online',       col:'#10b981' },
            ].map(({ key, label, col }) => (
              <div key={key}>
                <label style={{ fontSize:11, color:col, display:'block', marginBottom:3 }}>{label}</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)} placeholder="0.00"/>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Stock mínimo</label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.minStock}
                onChange={e => set('minStock', e.target.value)}/>
            </div>
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
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th><th>Producto</th><th>Stock</th>
              <th style={{textAlign:'right'}}>Tienda</th>
              <th style={{textAlign:'right'}}>Mayoreo</th>
              <th style={{textAlign:'right'}}>Distribuidor</th>
              <th style={{textAlign:'right'}}>Online</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {(products as any[]).length === 0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin productos registrados</td></tr>
            )}
            {(products as any[]).map((p: any) => (
              <tr key={p.id}>
                <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                <td style={{fontWeight:500,fontSize:13}}>{p.name}</td>
                <td>
                  <span style={{ fontSize:12, color: (p.currentStock?.stock||0) <= (p.currentStock?.minStock||5) ? '#f87171' : '#10b981', fontWeight:600 }}>
                    {p.currentStock?.stock || 0} pzas
                  </span>
                </td>
                {editId === p.id ? (
                  <>
                    {['priceMostrador','priceMayoreo','priceOnline','priceML'].map(k => (
                      <td key={k} style={{textAlign:'right'}}>
                        <input type="number" min="0" step="0.01"
                          style={{ width:80, padding:'2px 6px', borderRadius:6, border:'1px solid #334155',
                            background:'#0f172a', color:'#f1f5f9', fontSize:12, textAlign:'right' }}
                          value={editPrices[k] || ''}
                          onChange={e => setEditPrices((prev:any) => ({...prev,[k]:e.target.value}))}/>
                      </td>
                    ))}
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={() => guardarPrecios(p.id)} disabled={saving}
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
                    <td style={{textAlign:'right',color}}>{p.priceMostrador>0?fmt(p.priceMostrador):'—'}</td>
                    <td style={{textAlign:'right',color:'#f59e0b'}}>{p.priceMayoreo>0?fmt(p.priceMayoreo):'—'}</td>
                    <td style={{textAlign:'right',color:'#8b5cf6'}}>{p.priceOnline>0?fmt(p.priceOnline):'—'}</td>
                    <td style={{textAlign:'right',color:'#10b981'}}>{p.priceML>0?fmt(p.priceML):'—'}</td>
                    <td>
                      <button onClick={() => startEdit(p)}
                        style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                        Editar precios
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
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB INSUMOS
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
//  TAB CLIENTES (existente sin cambios)
// ══════════════════════════════════════════════════════════════
function ClientesTab({ cid, color, qc }: any) {
  const [showNew,    setShowNew]    = useState(false);
  const [selected,   setSelected]   = useState<any>(null);
  const [form, setForm] = useState({ name:'', rfc:'', phone:'', email:'', address:'', creditLimit:0, creditDays:30 });
  const [saving, setSaving] = useState(false);
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: detalle } = useQuery({
    queryKey: ['client-detail', selected?.id],
    queryFn:  () => api.get(`/companies/${cid}/clients/${selected.id}`).then(r => r.data),
    enabled:  !!selected,
  });

  const guardar = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/clients`, form);
      setShowNew(false);
      setForm({ name:'', rfc:'', phone:'', email:'', address:'', creditLimit:0, creditDays:30 });
      qc.invalidateQueries({ queryKey: ['clients', cid] });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap:16 }}>
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <p style={{fontSize:14,fontWeight:600,margin:0}}>Clientes</p>
          <button className="btn-primary" style={{background:color,fontSize:12}}
            onClick={() => setShowNew(!showNew)}>+ Nuevo</button>
        </div>

        {showNew && (
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                ['Nombre *','name','text'],['RFC','rfc','text'],
                ['Teléfono','phone','text'],['Email','email','email'],
                ['Dirección','address','text'],
              ].map(([label,key,type]) => (
                <div key={key as string}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:2}}>{label}</label>
                  <input className="input-base" type={type as string} style={{fontSize:12}}
                    value={(form as any)[key as string]}
                    onChange={e => set(key as string, e.target.value)}/>
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:2}}>Límite crédito</label>
                  <input type="number" min="0" className="input-base" style={{fontSize:12}}
                    value={form.creditLimit} onChange={e=>set('creditLimit',+e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:2}}>Días crédito</label>
                  <input type="number" min="0" className="input-base" style={{fontSize:12}}
                    value={form.creditDays} onChange={e=>set('creditDays',+e.target.value)}/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button className="btn-secondary" style={{fontSize:12}} onClick={()=>setShowNew(false)}>Cancelar</button>
                <button className="btn-primary" style={{background:color,fontSize:12}} onClick={guardar} disabled={saving||!form.name}>
                  {saving?'Guardando…':'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {(clientes as any[]).map((c:any) => (
            <button key={c.id} onClick={() => setSelected(selected?.id===c.id?null:c)}
              style={{ textAlign:'left', padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
                borderLeft:`3px solid ${selected?.id===c.id?color:'#334155'}`,
                background: selected?.id===c.id?color+'11':'#1e293b' }}>
              <p style={{fontSize:13,fontWeight:500,margin:'0 0 2px',color:'#f1f5f9'}}>{c.name}</p>
              <p style={{fontSize:11,color:'#64748b',margin:0}}>{c.rfc||'Sin RFC'} · {c._count?.ordenesCompra||0} OC</p>
            </button>
          ))}
          {(clientes as any[]).length===0 && (
            <p style={{color:'#64748b',fontSize:13,textAlign:'center',padding:32}}>Sin clientes registrados</p>
          )}
        </div>
      </div>

      {selected && detalle && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 4px'}}>{detalle.name}</h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>{detalle.rfc} · {detalle.phone} · {detalle.email}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
              <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                <p style={{fontSize:11,color:'#64748b',margin:'0 0 2px'}}>Límite de crédito</p>
                <p style={{fontSize:16,fontWeight:700,color,margin:0}}>{fmt(detalle.creditLimit)}</p>
              </div>
              <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                <p style={{fontSize:11,color:'#64748b',margin:'0 0 2px'}}>Días de crédito</p>
                <p style={{fontSize:16,fontWeight:700,color:'#94a3b8',margin:0}}>{detalle.creditDays} días</p>
              </div>
            </div>
          </div>
          <OCSection cid={cid} clientId={selected.id} color={color} ordenes={detalle.ordenesCompra||[]} qc={qc}/>
        </div>
      )}
    </div>
  );
}

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
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              <button onClick={async()=>{
                if(window.confirm('¿Cerrar OC con lo surtido hasta ahora?')){
                  await api.put(`/companies/${cid}/ordenes/${oc.id}/cerrar`,{});
                  qc.invalidateQueries({queryKey:['client-detail']});
                }
              }} style={{flex:1,padding:'4px',borderRadius:6,fontSize:11,border:'1px solid #10b981',background:'none',color:'#10b981',cursor:'pointer'}}>
                ✓ Cerrar OC
              </button>
              <button onClick={async()=>{
                const motivo = window.prompt('Motivo de cancelación:');
                if(motivo !== null){
                  await api.put(`/companies/${cid}/ordenes/${oc.id}/cancelar`,{motivo});
                  qc.invalidateQueries({queryKey:['client-detail']});
                }
              }} style={{flex:1,padding:'4px',borderRadius:6,fontSize:11,border:'1px solid #f87171',background:'none',color:'#f87171',cursor:'pointer'}}>
                ✕ Cancelar OC
              </button>
            </div>
          )}

          {oc.status !== 'SURTIDO_COMPLETO' && (
            <>
              {surtidoOC === oc.id ? (
                <div>
                  <p style={{fontSize:11,color:'#64748b',margin:'0 0 6px'}}>Selecciona cantidades a surtir:</p>
                  {oc.lineas?.map((l:any) => {
                    const pendiente = l.cantidad - l.cantidadSurtida;
                    if (pendiente <= 0) return null;
                    const surtVal = surtLineas.find((s:any)=>s.lineaId===l.id)?.cantidad||0;
                    return (
                      <div key={l.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8,marginBottom:6,alignItems:'center'}}>
                        <span style={{fontSize:11,color:'#94a3b8'}}>{l.product?.name} (pendiente: {pendiente})</span>
                        <input type="number" min="0" max={pendiente} className="input-base" style={{fontSize:11}}
                          value={surtVal||''}
                          onChange={e => {
                            const val = Math.min(+e.target.value, pendiente);
                            setSurtLineas(sl => {
                              const exists = sl.findIndex((s:any)=>s.lineaId===l.id);
                              if (exists>=0) return sl.map((s:any,i:number)=>i===exists?{...s,cantidad:val}:s);
                              return [...sl, { lineaId:l.id, cantidad:val }];
                            });
                          }}/>
                      </div>
                    );
                  })}
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
                    <button className="btn-secondary" style={{fontSize:12}} onClick={()=>{setSurtidoOC(null);setSurtLineas([])}}>Cancelar</button>
                    <button className="btn-primary" style={{background:color,fontSize:12}} onClick={()=>registrarSurtido(oc.id)} disabled={saving}>
                      {saving?'…':'Registrar surtido'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>{setSurtidoOC(oc.id);setSurtLineas([])}}
                  style={{background:'none',border:`1px solid ${color}`,color,padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12,width:'100%'}}>
                  + Registrar surtido
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
