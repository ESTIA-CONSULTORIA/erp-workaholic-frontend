import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const CATS = ['DESAYUNO','LUNCH','SNACK','BEBIDA','DULCE','OTRO'];

export default function LoncheCatalogo() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f97316';
  const qc    = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [editP,   setEditP]   = useState<any>(null);
  const [form, setForm] = useState({ sku:'', name:'', category:'LUNCH', price:'', cost:'', stock:'0', cashbackPct:'0' });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['lonche-products', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/products`).then(r=>r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/lonche/products`, { ...form, price:Number(form.price), cost:Number(form.cost), stock:Number(form.stock), cashbackPct:Number(form.cashbackPct) }),
    onSuccess: () => { setShowNew(false); setForm({sku:'',name:'',category:'LUNCH',price:'',cost:'',stock:'0',cashbackPct:'0'}); qc.invalidateQueries({queryKey:['lonche-products',cid]}); },
    onError: (e:any) => alert(e.response?.data?.message||'Error'),
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/lonche/products/${editP.id}`, { ...editP, price:Number(editP.price), cost:Number(editP.cost), cashbackPct:Number(editP.cashbackPct) }),
    onSuccess: () => { setEditP(null); qc.invalidateQueries({queryKey:['lonche-products',cid]}); },
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Catálogo de Productos</h1>
          <button className="btn-primary" style={{background:color,fontSize:13}} onClick={()=>setShowNew(s=>!s)}>
            {showNew?'✕ Cancelar':'+ Nuevo producto'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Nuevo producto</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['SKU *','sku','text'],['Nombre *','name','text'],['Precio venta *','price','number'],['Costo','cost','number'],['Stock inicial','stock','number'],['Cashback %','cashbackPct','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:12}} value={(form as any)[k]} onChange={e=>set(k,e.target.value)}
                    placeholder={k==='cashbackPct'?'0 = sin cashback':''}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Categoría</label>
                <select className="input-base" style={{fontSize:12}} value={form.category} onChange={e=>set('category',e.target.value)}>
                  {CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {Number(form.cashbackPct) > 0 && (
              <div style={{background:'rgba(245,158,11,0.1)',border:'1px solid #f59e0b44',borderRadius:8,padding:'8px 12px',marginBottom:10}}>
                <p style={{fontSize:12,color:'#f59e0b',margin:0}}>★ Este producto dará {form.cashbackPct}% cashback = {fmt(Number(form.price)*Number(form.cashbackPct)/100)} por unidad</p>
              </div>
            )}
            <button className="btn-primary" style={{background:color,fontSize:13}} onClick={()=>crearM.mutate()} disabled={crearM.isPending||!form.name||!form.price||!form.sku}>
              {crearM.isPending?'Creando…':'Crear producto'}
            </button>
          </div>
        )}

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>SKU</th><th>Nombre</th><th>Cat.</th><th style={{textAlign:'right'}}>Costo</th><th style={{textAlign:'right'}}>Precio</th><th style={{textAlign:'right'}}>Stock</th><th>Cashback</th><th></th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {(products as any[]).map((p:any) => (
                <tr key={p.id}>
                  <td><code style={{fontSize:11,background:'#334155',padding:'2px 5px',borderRadius:3}}>{p.sku}</code></td>
                  <td style={{fontWeight:500}}>{p.name}</td>
                  <td style={{fontSize:11}}>{p.category}</td>
                  <td style={{textAlign:'right',color:'#64748b',fontSize:12}}>{fmt(p.cost)}</td>
                  <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(p.price)}</td>
                  <td style={{textAlign:'right',fontWeight:600,color:Number(p.stock)<=0?'#f87171':Number(p.stock)<=5?'#f59e0b':'#f1f5f9'}}>{Number(p.stock)}</td>
                  <td>{Number(p.cashbackPct)>0?<span style={{fontSize:11,color:'#f59e0b',fontWeight:600}}>★ {p.cashbackPct}%</span>:<span style={{color:'#334155',fontSize:11}}>—</span>}</td>
                  <td><button onClick={()=>setEditP({...p})} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editP && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:460,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 14px'}}>Editar producto</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['Nombre','name','text'],['Precio','price','number'],['Costo','cost','number'],['Cashback %','cashbackPct','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:12}} value={editP[k]||''} onChange={e=>setEditP((p:any)=>({...p,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>setEditP(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}} onClick={()=>updateM.mutate()} disabled={updateM.isPending}>
                {updateM.isPending?'Guardando…':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
