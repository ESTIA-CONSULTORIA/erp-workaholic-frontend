import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api } from '../../lib/api';

const TIPO: Record<string,string> = { RES:'Res', CER:'Cerdo' };
const SABOR: Record<string,string> = { NAT:'Natural', CHI:'Chile', BBQ:'BBQ' };
const PRES: Record<string,string> = { '100G':'100g','250G':'250g','500G':'500g','1KG':'1kg' };

export default function ProduccionPage() {
  const { activeCompany } = useERPStore();
  const cid = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

  const { data: pt = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled: !!cid,
  });

  const alertas = pt.filter((p:any) => p.lowStock);

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:16 }}>Inventario PT — Machete</h1>
        {alertas.length > 0 && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 16px', marginBottom:16 }}>
            <p style={{ color:'#f87171', fontSize:13, margin:0 }}>⚠ {alertas.length} producto(s) bajo mínimo: {alertas.slice(0,5).map((p:any)=>p.sku).join(', ')}</p>
          </div>
        )}
        {['RES','CER'].map(tipo => (
          <div key={tipo} className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
            <div style={{ padding:'10px 20px', borderBottom:'1px solid #334155', background:color+'11' }}>
              <p style={{ fontSize:12, fontWeight:700, color, margin:0, textTransform:'uppercase' }}>{TIPO[tipo]}</p>
            </div>
            <table className="table-base">
              <thead><tr><th>SKU</th><th>Sabor</th><th>Presentación</th><th style={{textAlign:'right'}}>Stock</th><th>Estado</th></tr></thead>
              <tbody>
                {pt.filter((p:any)=>p.meatType===tipo).map((p:any) => (
                  <tr key={p.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                    <td>{SABOR[p.flavor]||p.flavor}</td>
                    <td>{PRES[p.presentation]||p.presentation}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:p.lowStock?'#f87171':'#10b981'}}>{p.stock} pzas</td>
                    <td><span className={p.lowStock?'badge-red':'badge-green'}>{p.lowStock?'⚠ Bajo mínimo':'✓ OK'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
