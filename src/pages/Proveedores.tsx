import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../lib/api';
import ImportCSV from '../components/ImportCSV';

const CONDICIONES = ['Contado','7 días','15 días','30 días','45 días','60 días'];

export default function ProveedoresPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,    setShowNew]    = useState(false);
  const [editProv,   setEditProv]   = useState<any>(null);
  const [detalle,    setDetalle]    = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [busqueda,   setBusqueda]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const initForm = {
    name:'', rfc:'', email:'', phone:'', contact:'', address:'',
    paymentTerms:'Contado', creditLimit:0, notes:''
  };
  const [form, setForm] = useState(initForm);
  const set = (k:string, v:any) => setForm(f => ({...f, [k]:v}));

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  // Historial de compras por proveedor
  const { data: comprasProv = [] } = useQuery({
    queryKey: ['compras-prov', cid, detalle?.id],
    queryFn:  () => api.get(`/companies/${cid}/machete/compras`).then(r =>
      r.data.filter((c:any) => c.supplierId === detalle.id)
    ),
    enabled:  !!cid && !!detalle,
  });

  const provFiltrados = (proveedores as any[]).filter(p =>
    !busqueda || p.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rfc?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardar = async () => {
    if (!form.name) { setError('El nombre es obligatorio'); return; }
    setError(''); setSaving(true);
    try {
      if (editProv) {
        await api.put(`/companies/${cid}/suppliers/${editProv.id}`, form);
        setEditProv(null);
      } else {
        await api.post(`/companies/${cid}/suppliers`, form);
        setShowNew(false);
      }
      setForm(initForm);
      qc.invalidateQueries({ queryKey: ['suppliers', cid] });
    } catch(e:any) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const startEdit = (p:any) => {
    setEditProv(p);
    setForm({
      name: p.name||'', rfc: p.rfc||'', email: p.email||'',
      phone: p.phone||'', contact: p.contact||'', address: p.address||'',
      paymentTerms: p.paymentTerms||'Contado', creditLimit: p.creditLimit||0, notes: p.notes||''
    });
    setShowNew(false);
    setDetalle(null);
  };

  const totalComprado = (comprasProv as any[]).reduce((t:number,c:any) => t + Number(c.total||0), 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Proveedores</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:13 }}>
              ⬆ Importar
            </button>
            <button onClick={() => exportCSV('proveedores', proveedores as any[],
              [{key:'name',label:'Nombre'},{key:'rfc',label:'RFC'},{key:'phone',label:'Teléfono'},
               {key:'email',label:'Email'},{key:'paymentTerms',label:'Condiciones'},{key:'contact',label:'Contacto'}])}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
              ⬇ Exportar
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => { setShowNew(!showNew); setEditProv(null); setForm(initForm); setError(''); setDetalle(null); }}>
              {showNew ? 'Cancelar' : '+ Nuevo proveedor'}
            </button>
          </div>
        </div>

        {/* Buscador */}
        <input className="input-base" style={{ maxWidth:300, fontSize:13, marginBottom:16 }}
          placeholder="Buscar nombre o RFC…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>

        {/* Formulario */}
        {(showNew || editProv) && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>
              {editProv ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Razón social o nombre"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>RFC</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.rfc}
                  onChange={e => set('rfc', e.target.value.toUpperCase())} placeholder="RFC123456XXX"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="664 000 0000"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="correo@proveedor.com"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Contacto</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.contact}
                  onChange={e => set('contact', e.target.value)} placeholder="Nombre del contacto"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Condiciones de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentTerms}
                  onChange={e => set('paymentTerms', e.target.value)}>
                  {CONDICIONES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Límite de crédito</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.creditLimit||''}
                  onChange={e => set('creditLimit', +e.target.value)} placeholder="0"/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Dirección</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.address}
                  onChange={e => set('address', e.target.value)} placeholder="Dirección completa"/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)} placeholder="Observaciones"/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setShowNew(false); setEditProv(null); setForm(initForm); }}>
                Cancelar
              </button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving || !form.name}>
                {saving ? 'Guardando…' : editProv ? 'Actualizar' : 'Crear proveedor'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: detalle ? '1fr 1fr' : '1fr', gap:16 }}>
          {/* Lista */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Nombre</th><th>RFC</th><th>Condiciones</th><th>Teléfono</th><th></th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && provFiltrados.length===0 && (
                  <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin proveedores</td></tr>
                )}
                {provFiltrados.map((p:any) => (
                  <tr key={p.id}
                    style={{ background: detalle?.id===p.id ? color+'11' : 'transparent', cursor:'pointer' }}
                    onClick={() => setDetalle(detalle?.id===p.id ? null : p)}>
                    <td style={{ fontWeight:500 }}>{p.name}</td>
                    <td style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{p.rfc||'—'}</td>
                    <td style={{ fontSize:12, color:'#94a3b8' }}>{p.paymentTerms||'Contado'}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{p.phone||'—'}</td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); startEdit(p); }}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalle lateral */}
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
                  ['Contacto',    detalle.contact],
                  ['Teléfono',    detalle.phone],
                  ['Email',       detalle.email],
                  ['Dirección',   detalle.address],
                  ['Condiciones', detalle.paymentTerms||'Contado'],
                  ['Crédito',     detalle.creditLimit > 0 ? fmt(detalle.creditLimit) : 'Sin crédito'],
                  ['Notas',       detalle.notes],
                ].filter(([,v]) => v).map(([label, value]) => (
                  <div key={label as string} style={{ display:'flex', justifyContent:'space-between',
                    marginBottom:6, paddingBottom:6, borderBottom:'1px solid #1e293b' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:500, maxWidth:180, textAlign:'right' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Historial de compras */}
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #334155',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#64748b', margin:0,
                    textTransform:'uppercase', letterSpacing:1 }}>
                    Historial de compras
                  </p>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{fmt(totalComprado)}</span>
                </div>
                <table className="table-base">
                  <thead><tr>
                    <th>Fecha</th><th>Concepto</th>
                    <th style={{textAlign:'right'}}>Total</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {(comprasProv as any[]).length===0 && (
                      <tr><td colSpan={4} style={{textAlign:'center',padding:20,color:'#64748b',fontSize:12}}>Sin compras registradas</td></tr>
                    )}
                    {(comprasProv as any[]).slice(0,8).map((c:any) => (
                      <tr key={c.id}>
                        <td style={{fontSize:11}}>{c.date ? new Date(c.date).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'}) : '—'}</td>
                        <td style={{fontSize:11,color:'#94a3b8',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {c.concept?.match(/COM-\d{6}-\d{4}/)?.[0] || c.concept}
                        </td>
                        <td style={{textAlign:'right',fontSize:12,fontWeight:600,color}}>{fmt(c.total)}</td>
                        <td>
                          <span style={{fontSize:10,padding:'1px 6px',borderRadius:99,
                            background: c.paymentStatus==='CANCELADO'?'#f8717122':c.paymentStatus==='PAGADO'?'#10b98122':'#f59e0b22',
                            color: c.paymentStatus==='CANCELADO'?'#f87171':c.paymentStatus==='PAGADO'?'#10b981':'#f59e0b'}}>
                            {c.paymentStatus}
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

      {showImport && (
        <ImportCSV title="Proveedores" color={color}
          columns={[
            { key:'nombre',    label:'Nombre',       required:true },
            { key:'rfc',       label:'RFC'                         },
            { key:'telefono',  label:'Teléfono'                    },
            { key:'email',     label:'Email'                       },
            { key:'contacto',  label:'Contacto'                    },
            { key:'direccion', label:'Dirección'                   },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/proveedores`, { rows });
            qc.invalidateQueries({ queryKey: ['suppliers', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}
