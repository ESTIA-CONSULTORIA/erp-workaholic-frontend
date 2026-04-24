import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function SurtidoPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f97316';
  const qc    = useQueryClient();

  const [tipo,    setTipo]    = useState<'INICIAL'|'RESURTIDO'>('INICIAL');
  const [cantidades, setCant] = useState<Record<string,string>>({});
  const [turnoId, setTurnoId] = useState('');
  const [error,   setError]   = useState('');
  const [exito,   setExito]   = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['lonche-products', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/products`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['lonche-turnos', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/turnos`).then(r=>r.data),
    enabled:  !!cid,
  });

  const turnoActivo = (turnos as any[]).find(t => t.status === 'ABIERTO');

  const surtidoM = useMutation({
    mutationFn: () => {
      const tid = turnoActivo?.id || turnoId;
      if (!tid) throw new Error('No hay turno activo');
      const items = Object.entries(cantidades)
        .filter(([,v]) => Number(v) > 0)
        .map(([productId, qty]) => ({
          productId, qty: Number(qty),
          costUnit: Number((products as any[]).find((p:any)=>p.id===productId)?.cost || 0),
        }));
      if (items.length === 0) throw new Error('Agrega al menos un producto');
      return api.post(`/companies/${cid}/lonche/turnos/${tid}/surtido`, { items, type: tipo });
    },
    onSuccess: () => {
      setExito('Surtido registrado correctamente');
      setCant({});
      setTimeout(()=>setExito(''),3000);
      qc.invalidateQueries({ queryKey: ['lonche-turnos', cid] });
      qc.invalidateQueries({ queryKey: ['lonche-products', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const totalItems = Object.values(cantidades).reduce((t,v)=>t+Number(v||0),0);

  // Group by category
  const byCategory: Record<string,any[]> = {};
  (products as any[]).forEach((p:any) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Surtido de turno</h1>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {turnoActivo
              ? <span style={{fontSize:12,padding:'4px 12px',borderRadius:99,background:'#10b98122',color:'#10b981'}}>
                  ● Turno activo — {turnoActivo.cajeroName}
                </span>
              : <span style={{fontSize:12,padding:'4px 12px',borderRadius:99,background:'#f8717122',color:'#f87171'}}>
                  Sin turno abierto
                </span>
            }
            <div style={{ display:'flex', gap:4 }}>
              {(['INICIAL','RESURTIDO'] as const).map(t => (
                <button key={t} onClick={()=>setTipo(t)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${tipo===t?color:'#334155'}`,
                    background:tipo===t?color+'22':'transparent', color:tipo===t?color:'#64748b',
                    cursor:'pointer', fontSize:12, fontWeight:tipo===t?700:400 }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de surtido por categoría */}
        {Object.entries(byCategory).map(([cat, prods]) => (
          <div key={cat} className="card" style={{ marginBottom:12, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'8px 14px', background:'#334155' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:0, textTransform:'uppercase' }}>{cat}</p>
            </div>
            <table className="table-base">
              <thead><tr>
                <th>Producto</th><th style={{textAlign:'right'}}>Stock almacén</th>
                <th style={{textAlign:'right'}}>Precio</th><th style={{textAlign:'right'}}>Costo</th>
                <th style={{textAlign:'center',width:120}}>Cantidad a surtir</th>
              </tr></thead>
              <tbody>
                {prods.map((p:any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:500 }}>
                      {p.name}
                      {Number(p.cashbackPct)>0 && <span style={{fontSize:10,color:'#f59e0b',marginLeft:6}}>★ {p.cashbackPct}% cashback</span>}
                    </td>
                    <td style={{ textAlign:'right', color: Number(p.stock)<=0?'#f87171':'#f1f5f9', fontWeight:600 }}>
                      {Number(p.stock)}
                    </td>
                    <td style={{ textAlign:'right', color }}>{fmt(p.price)}</td>
                    <td style={{ textAlign:'right', color:'#64748b', fontSize:12 }}>{fmt(p.cost)}</td>
                    <td style={{ textAlign:'center' }}>
                      <input type="number" min="0"
                        value={cantidades[p.id] || ''}
                        onChange={e => setCant(c => ({...c,[p.id]:e.target.value}))}
                        style={{ width:80, padding:'5px 8px', borderRadius:7, border:`1px solid ${cantidades[p.id]&&Number(cantidades[p.id])>0?color:'#334155'}`,
                          background:'#0f172a', color:'#f1f5f9', fontSize:13, textAlign:'center' }}
                        placeholder="0"/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Footer */}
        <div style={{ position:'sticky', bottom:0, background:'#0a0f1a', padding:'12px 0', display:'flex', gap:12, alignItems:'center' }}>
          {error && <p style={{ fontSize:12, color:'#f87171', margin:0 }}>{error}</p>}
          {exito && <p style={{ fontSize:12, color:'#10b981', margin:0, fontWeight:600 }}>✅ {exito}</p>}
          <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:13, color:'#64748b' }}>
              {totalItems} piezas seleccionadas
            </span>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => surtidoM.mutate()}
              disabled={surtidoM.isPending || totalItems===0 || !turnoActivo}>
              {surtidoM.isPending ? 'Registrando…' : `Registrar ${tipo.toLowerCase()} (${totalItems} pzs)`}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
