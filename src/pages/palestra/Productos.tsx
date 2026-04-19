import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const CATEGORIAS = ['ROPA','ACCESORIOS','SUPLEMENTOS','GENERAL'];

export default function PalestraProductosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';
  const qc    = useQueryClient();

  const [showNew,  setShowNew]  = useState(false);
  const [editProd, setEditProd] = useState<any>(null);
  const [adjModal, setAdjModal] = useState<any>(null);
  const [adjQty,   setAdjQty]   = useState('');
  const [filtro,   setFiltro]   = useState('');

  const [form, setForm] = useState({
    sku:'', name:'', category:'GENERAL', description:'', price:'', cost:'', stock:'', minStock:'2',
  });
  const set = (k:string, v:any) => setForm(f => ({...f,[k]:v}));

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['palestra-products', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/products`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/products`, {
      ...form, price:Number(form.price), cost:Number(form.cost), stock:Number(form.stock), minStock:Number(form.minStock),
    }),
    onSuccess: () => { setShowNew(false); setForm({sku:'',name:'',category:'GENERAL',description:'',price:'',cost:'',stock:'',minStock:'2'}); qc.invalidateQueries({ queryKey:['palestra-products',cid] }); },
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/palestra/products/${editProd.id}`, {
      ...editProd, price:Number(editProd.price), cost:Number(editProd.cost), minStock:Number(editProd.minStock),
    }),
    onSuccess: () => { setEditProd(null); qc.invalidateQueries({ queryKey:['palestra-products',cid] }); },
  });

  const adjM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/palestra/products/${adjModal.id}/stock`, { qty: Number(adjQty) }),
    onSuccess: () => { setAdjModal(null); setAdjQty(''); qc.invalidateQueries({ queryKey:['palestra-products',cid] }); },
  });

  const filtered = (products as any[]).filter(p => !filtro || p.category === filtro);
  const lowStock  = (products as any[]).filter(p => Number(p.stock) <= Number(p.minStock));

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Productos — Inventario</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }} onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Nuevo producto'}
          </button>
        </div>

        {lowStock.length > 0 && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#f87171', margin:'0 0 4px' }}>⚠ {lowStock.length} producto(s) con stock bajo</p>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{lowStock.map((p:any)=>p.name).join(', ')}</p>
          </div>
        )}

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nuevo producto</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['SKU *','sku','text'],['Nombre *','name','text'],['Descripción','description','text'],
                ['Precio venta *','price','number'],['Costo *','cost','number'],
                ['Stock inicial','stock','number'],['Stock mínimo','minStock','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11,color:'#64748b',display:'block',marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:13 }} value={(form as any)[k]} onChange={e => set(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11,color:'#64748b',display:'block',marginBottom:3 }}>Categoría</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.category} onChange={e => set('category',e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()} disabled={crearM.isPending || !form.name || !form.price || !form.sku}>
              {crearM.isPending ? 'Creando…' : 'Crear producto'}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:6, marginBottom:12 }}>
          <button onClick={() => setFiltro('')}
            style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer', border:`1px solid ${!filtro?color:'#334155'}`, background:!filtro?color+'22':'transparent', color:!filtro?color:'#64748b' }}>
            Todos
          </button>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setFiltro(c)}
              style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer', border:`1px solid ${filtro===c?color:'#334155'}`, background:filtro===c?color+'22':'transparent', color:filtro===c?color:'#64748b' }}>
              {c}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th style={{textAlign:'right'}}>Costo</th><th style={{textAlign:'right'}}>Precio</th><th style={{textAlign:'right'}}>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {filtered.map((p:any) => {
                const stockBajo = Number(p.stock) <= Number(p.minStock);
                return (
                  <tr key={p.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 5px',borderRadius:3}}>{p.sku}</code></td>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td style={{fontSize:12,color:'#64748b'}}>{p.category}</td>
                    <td style={{textAlign:'right',color:'#64748b',fontSize:12}}>{fmt(p.cost)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(p.price)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:p.stock<=0?'#f87171':stockBajo?'#f59e0b':'#10b981'}}>
                      {Number(p.stock).toFixed(0)}
                    </td>
                    <td>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:p.isActive?'#10b98122':'#f8717122',color:p.isActive?'#10b981':'#f87171'}}>
                        {p.isActive?'Activo':'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={() => setEditProd({...p})} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>Editar</button>
                        <button onClick={() => { setAdjModal(p); setAdjQty(''); }} style={{background:'none',border:'none',color:'#f59e0b',cursor:'pointer',fontSize:12}}>Ajustar stock</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editProd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:460,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>Editar producto</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[['Nombre','name','text'],['Precio','price','number'],['Costo','cost','number'],['Stock mínimo','minStock','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:13}} value={editProd[k]||''} onChange={e => setEditProd((p:any)=>({...p,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={() => setEditProd(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}} onClick={() => updateM.mutate()} disabled={updateM.isPending}>
                {updateM.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:360,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>Ajustar stock</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>{adjModal.name} — Stock actual: <strong style={{color}}>{adjModal.stock}</strong></p>
            <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Cantidad (positivo = entrada, negativo = salida)</label>
            <input type="number" className="input-base" style={{fontSize:13,marginBottom:16}}
              placeholder="Ej: 10 o -5" value={adjQty} onChange={e => setAdjQty(e.target.value)}/>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={() => setAdjModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}} onClick={() => adjM.mutate()} disabled={adjM.isPending || !adjQty}>
                {adjM.isPending ? 'Guardando…' : 'Ajustar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
