import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../lib/api';
import ImportCSV from '../components/ImportCSV';

export default function ClientesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,    setShowNew]    = useState(false);
  const [editCli,    setEditCli]    = useState<any>(null);
  const [detalle,    setDetalle]    = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [busqueda,   setBusqueda]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const initForm = { name:'', rfc:'', email:'', phone:'', contact:'', address:'', creditLimit:0, notes:'' };
  const [form, setForm] = useState(initForm);
  const set = (k:string, v:any) => setForm(f => ({...f, [k]:v}));

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxcCliente = [] } = useQuery({
    queryKey: ['cxc-cliente', cid, detalle?.id],
    queryFn:  () => api.get(`/companies/${cid}/cxc?clientId=${detalle.id}`).then(r => r.data),
    enabled:  !!cid && !!detalle,
  });

  const cliFiltrados = (clientes as any[]).filter(c =>
    !busqueda || c.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rfc?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardar = async () => {
    if (!form.name) { setError('El nombre es obligatorio'); return; }
    setError(''); setSaving(true);
    try {
      if (editCli) {
        await api.put(`/companies/${cid}/clients/${editCli.id}`, form);
        setEditCli(null);
      } else {
        await api.post(`/companies/${cid}/clients`, form);
        setShowNew(false);
      }
      setForm(initForm);
      qc.invalidateQueries({ queryKey: ['clients', cid] });
    } catch(e:any) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const startEdit = (c:any) => {
    setEditCli(c);
    setForm({ name:c.name||'', rfc:c.rfc||'', email:c.email||'', phone:c.phone||'',
              contact:c.contact||'', address:c.address||'', creditLimit:c.creditLimit||0, notes:c.notes||'' });
    setShowNew(false); setDetalle(null);
  };

  const saldoTotal = (cxcCliente as any[]).filter((c:any)=>c.status!=='PAGADO')
    .reduce((t:number,c:any) => t + Number(c.balance||0), 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Clientes</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:13 }}>⬆ Importar</button>
            <button onClick={() => exportCSV('clientes', clientes as any[],
              [{key:'name',label:'Nombre'},{key:'rfc',label:'RFC'},{key:'phone',label:'Teléfono'},
               {key:'email',label:'Email'},{key:'creditLimit',label:'Límite crédito'},{key:'contact',label:'Contacto'}])}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>⬇ Exportar</button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => { setShowNew(!showNew); setEditCli(null); setForm(initForm); setError(''); setDetalle(null); }}>
              {showNew ? 'Cancelar' : '+ Nuevo cliente'}
            </button>
          </div>
        </div>

        <input className="input-base" style={{ maxWidth:300, fontSize:13, marginBottom:16 }}
          placeholder="Buscar nombre o RFC…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>

        {(showNew || editCli) && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>
              {editCli ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre / Razón social *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>RFC</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.rfc}
                  onChange={e => set('rfc', e.target.value.toUpperCase())}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.phone}
                  onChange={e => set('phone', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Contacto</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.contact}
                  onChange={e => set('contact', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Límite de crédito</label>
                <input type="number" min="0" className="input-base" style={{ fontSize:13 }} value={form.creditLimit||''}
                  onChange={e => set('creditLimit', +e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Dirección</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.address}
                  onChange={e => set('address', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setShowNew(false); setEditCli(null); setForm(initForm); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving || !form.name}>
                {saving ? 'Guardando…' : editCli ? 'Actualizar' : 'Crear cliente'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: detalle ? '1fr 1fr' : '1fr', gap:16 }}>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Nombre</th><th>RFC</th><th>Teléfono</th>
                <th style={{textAlign:'right'}}>Crédito</th><th></th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && cliFiltrados.length===0 && (
                  <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin clientes</td></tr>
                )}
                {cliFiltrados.map((c:any) => (
                  <tr key={c.id}
                    style={{ background: detalle?.id===c.id ? color+'11':'transparent', cursor:'pointer' }}
                    onClick={() => setDetalle(detalle?.id===c.id ? null : c)}>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{c.rfc||'—'}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{c.phone||'—'}</td>
                    <td style={{ textAlign:'right', fontSize:12, color: c.creditLimit>0?color:'#475569' }}>
                      {c.creditLimit>0 ? fmt(c.creditLimit) : '—'}
                    </td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); startEdit(c); }}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  ['Contacto',detalle.contact],['Teléfono',detalle.phone],
                  ['Email',detalle.email],['Dirección',detalle.address],
                  ['Crédito',detalle.creditLimit>0?fmt(detalle.creditLimit):'Sin crédito'],
                  ['Notas',detalle.notes],
                ].filter(([,v])=>v).map(([label,value]) => (
                  <div key={label as string} style={{ display:'flex', justifyContent:'space-between',
                    marginBottom:6, paddingBottom:6, borderBottom:'1px solid #1e293b' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:500 }}>{value}</span>
                  </div>
                ))}
                {saldoTotal > 0 && (
                  <div style={{ background:color+'11', borderRadius:6, padding:'8px 10px', marginTop:8 }}>
                    <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>Saldo pendiente CxC</p>
                    <p style={{ fontSize:18, fontWeight:700, color, margin:0 }}>{fmt(saldoTotal)}</p>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #334155' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#64748b', margin:0,
                    textTransform:'uppercase', letterSpacing:1 }}>Historial CxC</p>
                </div>
                <table className="table-base">
                  <thead><tr>
                    <th>Fecha</th><th style={{textAlign:'right'}}>Original</th>
                    <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {(cxcCliente as any[]).length===0 && (
                      <tr><td colSpan={4} style={{textAlign:'center',padding:20,color:'#64748b',fontSize:12}}>Sin cuentas registradas</td></tr>
                    )}
                    {(cxcCliente as any[]).slice(0,8).map((c:any) => (
                      <tr key={c.id}>
                        <td style={{fontSize:11}}>{fmtDate(c.date)}</td>
                        <td style={{textAlign:'right',fontSize:12}}>{fmt(c.originalAmount)}</td>
                        <td style={{textAlign:'right',fontSize:12,fontWeight:700,
                          color:c.status==='PAGADO'?'#10b981':color}}>{fmt(c.balance)}</td>
                        <td><span className={c.status==='PAGADO'?'badge-green':'badge-amber'}>
                          {c.status==='PAGADO'?'Pagado':'Pendiente'}
                        </span></td>
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
        <ImportCSV title="Clientes" color={color}
          columns={[
            { key:'nombre',   label:'Nombre',         required:true },
            { key:'rfc',      label:'RFC'                           },
            { key:'telefono', label:'Teléfono'                      },
            { key:'email',    label:'Email'                         },
            { key:'contacto', label:'Contacto'                      },
            { key:'credito',  label:'Límite crédito', type:'number' },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/clientes`, { rows });
            qc.invalidateQueries({ queryKey: ['clients', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}
