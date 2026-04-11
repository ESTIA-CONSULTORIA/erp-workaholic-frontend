import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';

export default function ClientesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [clienteActivo, setClienteActivo] = useState<any>(null);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [showNuevaOC,      setShowNuevaOC]      = useState(false);
  const [clienteForm, setClienteForm] = useState({ name:'', email:'', phone:'', rfc:'', address:'', creditDays:30, creditLimit:0 });
  const [ocForm, setOcForm]           = useState({ numero:'', fecha: new Date().toISOString().slice(0,10), notes:'' });
  const [ocLineas, setOcLineas]       = useState<any[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error,  setError]            = useState('');

  const { data: clientes = [], refetch } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: ocs = [] } = useQuery({
    queryKey: ['ocs-cliente', cid, clienteActivo?.id],
    queryFn:  () => api.get(`/companies/${cid}/ordenes?clientId=${clienteActivo.id}`).then(r => r.data),
    enabled:  !!cid && !!clienteActivo,
  });

  const guardarCliente = async () => {
    if (!clienteForm.name) { setError('Nombre requerido'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/companies/${cid}/clients`, clienteForm);
      setShowNuevoCliente(false);
      setClienteForm({ name:'', email:'', phone:'', rfc:'', address:'', creditDays:30, creditLimit:0 });
      refetch();
    } catch(e:any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const guardarOC = async () => {
    if (!ocForm.numero) { setError('Número de OC requerido'); return; }
    if (ocLineas.filter(l => l.productId && l.cantidad > 0).length === 0) { setError('Agrega al menos una línea'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/companies/${cid}/clients/${clienteActivo.id}/ordenes`, {
        ...ocForm,
        lineas: ocLineas.filter(l => l.productId && l.cantidad > 0),
      });
      setShowNuevaOC(false);
      setOcForm({ numero:'', fecha: new Date().toISOString().slice(0,10), notes:'' });
      setOcLineas([]);
      qc.invalidateQueries({ queryKey: ['ocs-cliente', cid, clienteActivo?.id] });
    } catch(e:any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const montoOC = ocLineas.reduce((t, l) => {
    const prod = (productos as any[]).find(p => p.id === l.productId);
    const precio = Number(prod?.priceMostrador || 0);
    return t + (precio * (l.cantidad || 0));
  }, 0);

  const STATUS_COLOR: Record<string,string> = {
    PENDIENTE:'#f59e0b', SURTIDO_PARCIAL:'#3b82f6', SURTIDO_COMPLETO:'#10b981', CANCELADA:'#f87171'
  };

  const setC = (k: string, v: any) => setClienteForm(f => ({...f, [k]: v}));

  return (
    <AppLayout>
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 110px)' }}>

        {/* Lista de clientes */}
        <div style={{ width:280, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:16, fontWeight:700, margin:0 }}>Clientes</h2>
            <button className="btn-primary" style={{ background:color, fontSize:11, padding:'4px 10px' }}
              onClick={() => setShowNuevoCliente(true)}>
              + Nuevo
            </button>
          </div>

          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {(clientes as any[]).map((c:any) => (
              <button key={c.id} onClick={() => setClienteActivo(c)}
                style={{ padding:'10px 12px', borderRadius:8, textAlign:'left', cursor:'pointer',
                  border:`1px solid ${clienteActivo?.id===c.id ? color : '#334155'}`,
                  background: clienteActivo?.id===c.id ? color+'11' : '#1e293b' }}>
                <p style={{ fontSize:13, fontWeight:600, margin:'0 0 2px', color:'#f1f5f9' }}>{c.name}</p>
                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{c.phone || c.email || c.rfc || '—'}</p>
              </button>
            ))}
            {(clientes as any[]).length === 0 && (
              <p style={{ color:'#64748b', fontSize:13, textAlign:'center', paddingTop:32 }}>Sin clientes</p>
            )}
          </div>
        </div>

        {/* Detalle del cliente */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {!clienteActivo ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
              <p style={{ color:'#64748b', fontSize:14 }}>Selecciona un cliente</p>
            </div>
          ) : (
            <div>
              {/* Header cliente */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 4px' }}>{clienteActivo.name}</h1>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    {clienteActivo.phone && <span style={{ fontSize:12, color:'#64748b' }}>📞 {clienteActivo.phone}</span>}
                    {clienteActivo.email && <span style={{ fontSize:12, color:'#64748b' }}>✉ {clienteActivo.email}</span>}
                    {clienteActivo.rfc   && <span style={{ fontSize:12, color:'#64748b' }}>RFC: {clienteActivo.rfc}</span>}
                    <span style={{ fontSize:12, color:'#64748b' }}>Crédito: {clienteActivo.creditDays} días</span>
                  </div>
                </div>
                <button className="btn-primary" style={{ background:color, fontSize:12 }}
                  onClick={() => { setShowNuevaOC(true); setOcLineas([{ productId:'', cantidad:1 }]); setError(''); }}>
                  + Nueva OC
                </button>
              </div>

              {/* OC del cliente */}
              <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 10px' }}>
                Órdenes de Compra
              </p>
              <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Número</th><th>Fecha</th>
                      <th style={{textAlign:'right'}}>Total</th>
                      <th style={{textAlign:'right'}}>Surtido</th>
                      <th style={{textAlign:'right'}}>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ocs as any[]).length === 0 && (
                      <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin OC</td></tr>
                    )}
                    {(ocs as any[]).map((oc:any) => (
                      <tr key={oc.id}>
                        <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{oc.numero}</code></td>
                        <td>{fmtDate(oc.fecha)}</td>
                        <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(oc.montoTotal)}</td>
                        <td style={{textAlign:'right',color:'#10b981'}}>{fmt(oc.montoSurtido)}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:'#f59e0b'}}>{fmt(oc.saldo)}</td>
                        <td>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background: (STATUS_COLOR[oc.status]||'#64748b')+'22',
                            color: STATUS_COLOR[oc.status]||'#64748b' }}>
                            {oc.status?.replace('_',' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo cliente */}
      {showNuevoCliente && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:480, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px', color }}>Nuevo cliente</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              {[
                { label:'Nombre *', key:'name',       type:'text'   },
                { label:'RFC',      key:'rfc',        type:'text'   },
                { label:'Teléfono', key:'phone',      type:'text'   },
                { label:'Email',    key:'email',      type:'email'  },
                { label:'Días crédito', key:'creditDays', type:'number' },
                { label:'Límite crédito', key:'creditLimit', type:'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{f.label}</label>
                  <input type={f.type} className="input-base" style={{ fontSize:12 }}
                    value={(clienteForm as any)[f.key]||''}
                    onChange={e => setC(f.key, f.type==='number' ? +e.target.value : e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{ gridColumn:'1/-1', marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Dirección</label>
              <input className="input-base" style={{ fontSize:12, width:'100%' }}
                value={clienteForm.address} onChange={e => setC('address', e.target.value)}/>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:12, margin:'0 0 8px' }}>{error}</p>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-secondary" style={{ fontSize:12 }}
                onClick={() => { setShowNuevoCliente(false); setError(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:12 }}
                onClick={guardarCliente} disabled={saving}>
                {saving ? 'Guardando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva OC */}
      {showNuevaOC && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:600,
            maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px', color }}>Nueva OC — {clienteActivo?.name}</h3>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Número de OC *</label>
                <input className="input-base" style={{ fontSize:12 }} value={ocForm.numero}
                  onChange={e => setOcForm(f => ({...f, numero:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:12 }} value={ocForm.fecha}
                  onChange={e => setOcForm(f => ({...f, fecha:e.target.value}))}/>
              </div>
            </div>

            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
              Líneas de producto
            </p>
            {ocLineas.map((l, idx) => {
              const prod = (productos as any[]).find(p => p.id === l.productId);
              const precio = Number(prod?.priceMostrador || 0);
              return (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 80px 100px auto', gap:6, marginBottom:6, alignItems:'center' }}>
                  <select className="input-base" style={{ fontSize:11 }} value={l.productId}
                    onChange={e => setOcLineas(ls => ls.map((x,i) => i===idx ? {...x, productId:e.target.value} : x))}>
                    <option value="">— Producto —</option>
                    {(productos as any[]).filter((p:any) => p.isActive).map((p:any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" placeholder="Cant." className="input-base" style={{ fontSize:11 }}
                    value={l.cantidad||''}
                    onChange={e => setOcLineas(ls => ls.map((x,i) => i===idx ? {...x, cantidad:+e.target.value} : x))}/>
                  <span style={{ fontSize:12, color, textAlign:'right', fontWeight:600 }}>
                    {fmt(precio * (l.cantidad||0))}
                  </span>
                  <button onClick={() => setOcLineas(ls => ls.filter((_,i) => i!==idx))}
                    style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:16 }}>✕</button>
                </div>
              );
            })}
            <button onClick={() => setOcLineas(ls => [...ls, { productId:'', cantidad:1 }])}
              style={{ fontSize:11, background:'none', border:`1px dashed ${color}`, color, padding:'4px 12px',
                borderRadius:6, cursor:'pointer', marginBottom:12 }}>
              + Agregar línea
            </button>

            <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'#64748b' }}>Total OC</span>
              <span style={{ fontSize:16, fontWeight:700, color }}>{fmt(montoOC)}</span>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
              <input className="input-base" style={{ fontSize:12 }} value={ocForm.notes}
                onChange={e => setOcForm(f => ({...f, notes:e.target.value}))}/>
            </div>

            {error && <p style={{ color:'#f87171', fontSize:12, margin:'0 0 8px' }}>{error}</p>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-secondary" style={{ fontSize:12 }}
                onClick={() => { setShowNuevaOC(false); setError(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:12 }}
                onClick={guardarOC} disabled={saving}>
                {saving ? 'Guardando...' : 'Crear OC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
