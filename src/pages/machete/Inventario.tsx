import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function InventarioPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

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

  const grupos = (insumos as any[]).reduce((acc: any, ins: any) => {
    const g = ins.group || 'GENERAL';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ins);
    return acc;
  }, {});

  const GRUPO_LABELS: Record<string,string> = {
    CARNES_FRESCAS:    'Carnes Frescas',
    CARNES_SECAS:      'Carnes Secas',
    ESPECIAS:          'Especias',
    EMPAQUE_BOLSAS:    'Empaque — Bolsas',
    EMPAQUE_ETIQUETAS: 'Empaque — Etiquetas',
    EMPAQUE_CAJAS:     'Empaque — Cajas y Frascos',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Inventario</h1>

        <h2 style={{ fontSize:16, fontWeight:600, marginBottom:12, color }}>Producto terminado</h2>
        <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
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
                const stock = Number(Number(p.stock || 0);
                const min   = Number(Number(p.minStock || 5);
                const bajo  = stock <= min;
                return (
                  <tr key={p.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{p.sku}</code></td>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:bajo?'#f87171':color}}>{stock} pzas</td>
                    <td style={{textAlign:'right',color:'#64748b'}}>{min} pzas</td>
                    <td>
                      <span className={bajo ? 'badge-red' : 'badge-green'}>
                        {bajo ? 'Stock bajo' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize:16, fontWeight:600, marginBottom:12, color }}>Insumos</h2>
        {Object.entries(grupos).map(([grupo, items]: any) => (
          <div key={grupo} style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 8px' }}>
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
    </AppLayout>
  );
}
