import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function CatalogoPage() {
  const { activeCompany } = useERPStore();
  const cid = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

  const { data: products = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/products`).then(r => r.data),
    enabled: !!cid,
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Catálogo — Machete</h1>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>SKU</th><th>Tipo</th><th>Sabor</th><th>Presentación</th><th style={{textAlign:'right'}}>Mostrador</th><th style={{textAlign:'right'}}>Mayoreo</th><th style={{textAlign:'right'}}>Online</th><th style={{textAlign:'right'}}>ML</th></tr></thead>
            <tbody>
              {products.map((p:any) => (
                <tr key={p.id}>
                  <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                  <td>{p.meatType}</td><td>{p.flavor}</td><td>{p.presentation}</td>
                  <td style={{textAlign:'right',color}}>{p.priceMostrador?fmt(p.priceMostrador):'—'}</td>
                  <td style={{textAlign:'right',color:'#f59e0b'}}>{p.priceMayoreo?fmt(p.priceMayoreo):'—'}</td>
                  <td style={{textAlign:'right',color:'#10b981'}}>{p.priceOnline?fmt(p.priceOnline):'—'}</td>
                  <td style={{textAlign:'right',color:'#ef4444'}}>{p.priceML?fmt(p.priceML):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
