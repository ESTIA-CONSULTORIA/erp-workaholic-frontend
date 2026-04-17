import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmtDate, exportCSV } from '../lib/api';
import ImportCSV from '../components/ImportCSV';

export default function ProveedoresPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,  setShowNew]  = useState(false);
  const [editProv, setEditProv] = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const initForm = { name:'', email:'', phone:'', notes:'' };
  const [form, setForm] = useState(initForm);
  const set = (k:string, v:any) => setForm(f => ({...f, [k]:v}));

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

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
    setForm({ name:p.name||'', email:p.email||'', phone:p.phone||'', notes:p.notes||'' });
    setShowNew(false);
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Proveedores</h1>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:13 }}>
              ⬆ Importar CSV
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => { setShowNew(!showNew); setEditProv(null); setForm(initForm); setError(''); }}>
              {showNew ? 'Cancelar' : '+ Nuevo proveedor'}
            </button>
          </div>
        </div>

        {/* Formulario nuevo/editar */}
        {(showNew || editProv) && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>
              {editProv ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Nombre del proveedor"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="correo@proveedor.com"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="664 000 0000"/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
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

        {/* Lista */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Teléfono</th><th>Notas</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (proveedores as any[]).length===0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin proveedores registrados</td></tr>
              )}
              {(proveedores as any[]).map((p:any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight:500 }}>{p.name}</td>
                  <td style={{ color:'#64748b', fontSize:12 }}>{p.email||'—'}</td>
                  <td style={{ color:'#64748b', fontSize:12 }}>{p.phone||'—'}</td>
                  <td style={{ color:'#64748b', fontSize:12, maxWidth:160, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.notes||'—'}</td>
                  <td>
                    <button onClick={() => startEdit(p)}
                      style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showImport && (
        <ImportCSV title="Proveedores" color={color}
          columns={[
            { key:'nombre',    label:'Nombre',    required:true },
            { key:'rfc',       label:'RFC'                      },
            { key:'telefono',  label:'Teléfono'                 },
            { key:'email',     label:'Email'                    },
            { key:'contacto',  label:'Contacto'                 },
            { key:'direccion', label:'Dirección'                },
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
