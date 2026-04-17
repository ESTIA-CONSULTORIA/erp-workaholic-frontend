import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmtDate, exportCSV } from '../lib/api';

const ACTION_COLOR: Record<string,string> = {
  CREATE:'#10b981', UPDATE:'#3b82f6', DELETE:'#f87171',
  LOGIN:'#8b5cf6', EXPORT:'#f59e0b'
};

const ENTITY_LABELS: Record<string,string> = {
  expense:'Gasto', sale:'Venta', purchase:'Compra',
  employee:'Empleado', cxc:'CxC', cxp:'CxP',
  supplier:'Proveedor', client:'Cliente', user:'Usuario',
  corte:'Corte de caja', intercompany:'Intercompany',
};

export default function BitacoraPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const [filtroEntity, setFiltroEntity] = useState('');
  const [busqueda,     setBusqueda]     = useState('');
  const [limite,       setLimite]       = useState(100);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit', cid, filtroEntity, limite],
    queryFn:  () => api.get(`/companies/${cid}/audit?entity=${filtroEntity}&limit=${limite}`).then(r => r.data),
    enabled:  !!cid,
  });

  const logsFiltrados = (logs as any[]).filter(l =>
    !busqueda ||
    l.user?.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    l.entity?.toLowerCase().includes(busqueda.toLowerCase()) ||
    l.action?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Bitácora de auditoría</h1>
          <button onClick={() => exportCSV('bitacora', logsFiltrados,
            [{key:'createdAt',label:'Fecha'},{key:'action',label:'Acción'},
             {key:'entity',label:'Entidad'},{key:'entityId',label:'ID'},
             {key:'user.name',label:'Usuario'}])}
            style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
            ⬇ Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input-base" style={{ maxWidth:240, fontSize:13 }}
            placeholder="Buscar usuario, entidad…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          <select className="input-base" style={{ fontSize:13, maxWidth:160 }}
            value={filtroEntity} onChange={e => setFiltroEntity(e.target.value)}>
            <option value="">Todas las entidades</option>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select className="input-base" style={{ fontSize:13, maxWidth:120 }}
            value={limite} onChange={e => setLimite(+e.target.value)}>
            <option value={50}>Últimas 50</option>
            <option value={100}>Últimas 100</option>
            <option value={250}>Últimas 250</option>
            <option value={500}>Últimas 500</option>
          </select>
          <span style={{ fontSize:12, color:'#475569', marginLeft:'auto' }}>
            {logsFiltrados.length} registros
          </span>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha y hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>ID</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && logsFiltrados.length===0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin registros de auditoría</td></tr>
              )}
              {logsFiltrados.map((l:any) => (
                <tr key={l.id}>
                  <td style={{ fontSize:11, whiteSpace:'nowrap', color:'#64748b' }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleString('es-MX',{
                      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
                    }) : '—'}
                  </td>
                  <td style={{ fontSize:12, fontWeight:500 }}>{l.user?.name || '—'}</td>
                  <td>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background:(ACTION_COLOR[l.action]||'#64748b')+'22',
                      color:ACTION_COLOR[l.action]||'#64748b' }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'#94a3b8' }}>
                    {ENTITY_LABELS[l.entity] || l.entity}
                  </td>
                  <td style={{ fontSize:10, color:'#475569', fontFamily:'monospace' }}>
                    {l.entityId ? l.entityId.slice(-8) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
