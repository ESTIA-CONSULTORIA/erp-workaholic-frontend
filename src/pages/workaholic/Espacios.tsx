import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const TIPOS = ['OFICINA','SALA_JUNTAS','SALA_CAPACITACION','COWORKING','LOCKER'];
const TYPE_ICON: Record<string,string> = { OFICINA:'🏢', SALA_JUNTAS:'👥', SALA_CAPACITACION:'📚', COWORKING:'💻', LOCKER:'🔒' };
const AMENIDADES = ['Proyector','Pantalla','Videoconferencia','Pizarrón','WiFi','Cafetera','A/C','Impresora','Locker','Recepcionista'];

export default function EspaciosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [editSpc, setEditSpc] = useState<any>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState({
    name:'', type:'SALA_JUNTAS', capacity:1, floor:'',
    pricePerHour:'', pricePerDay:'', pricePerMonth:'',
    amenities: [] as string[],
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));
  const toggleAmenidad = (a:string) => setForm(f=>({...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities,a]
  }));

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['workaholic-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r=>r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/spaces`, {
      ...form,
      pricePerHour:  form.pricePerHour  ? Number(form.pricePerHour)  : null,
      pricePerDay:   form.pricePerDay   ? Number(form.pricePerDay)   : null,
      pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : null,
    }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ name:'', type:'SALA_JUNTAS', capacity:1, floor:'', pricePerHour:'', pricePerDay:'', pricePerMonth:'', amenities:[] });
      qc.invalidateQueries({ queryKey: ['workaholic-spaces', cid] });
    },
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/workaholic/spaces/${editSpc.id}`, editSpc),
    onSuccess: () => { setEditSpc(null); qc.invalidateQueries({ queryKey: ['workaholic-spaces', cid] }); },
  });

  const filtered = (spaces as any[]).filter(s => !filtroTipo || s.type === filtroTipo);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Espacios</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Nuevo espacio'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Nuevo espacio</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['Nombre *','name','text'],['Piso/Ubicación','floor','text'],['Capacidad','capacity','number'],
                ['Precio/hora','pricePerHour','number'],['Precio/día','pricePerDay','number'],['Precio/mes','pricePerMonth','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:12 }}
                    value={(form as any)[k]} onChange={e => set(k, t==='number'?e.target.value:e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.type}
                  onChange={e => set('type', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px' }}>Amenidades</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {AMENIDADES.map(a => (
                <button key={a} onClick={() => toggleAmenidad(a)}
                  style={{ padding:'4px 10px', borderRadius:99, fontSize:11, cursor:'pointer',
                    border:`1px solid ${form.amenities.includes(a)?color:'#334155'}`,
                    background:form.amenities.includes(a)?color+'22':'transparent',
                    color:form.amenities.includes(a)?color:'#64748b' }}>
                  {a}
                </button>
              ))}
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()} disabled={crearM.isPending || !form.name}>
              {crearM.isPending ? 'Creando…' : 'Crear espacio'}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:6, marginBottom:12 }}>
          <button onClick={() => setFiltroTipo('')}
            style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
              border:`1px solid ${!filtroTipo?color:'#334155'}`, background:!filtroTipo?color+'22':'transparent', color:!filtroTipo?color:'#64748b' }}>
            Todos
          </button>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
                border:`1px solid ${filtroTipo===t?color:'#334155'}`, background:filtroTipo===t?color+'22':'transparent', color:filtroTipo===t?color:'#64748b' }}>
              {TYPE_ICON[t]} {t.replace(/_/g,' ')}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {isLoading && <p style={{ color:'#64748b' }}>Cargando…</p>}
          {filtered.map((s:any) => (
            <div key={s.id} style={{ background:'#1e293b', borderRadius:10, padding:16,
              border:'1px solid #334155', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <p style={{ fontSize:20, margin:'0 0 4px' }}>{TYPE_ICON[s.type]||'🏢'}</p>
                  <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:0 }}>{s.name}</p>
                  <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{s.type.replace(/_/g,' ')}{s.floor?` · ${s.floor}`:''}</p>
                </div>
                <span style={{ fontSize:11, color:'#64748b' }}>👤 {s.capacity}</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {s.pricePerHour && <span style={{ fontSize:11, color:color, fontWeight:600 }}>{fmt(s.pricePerHour)}/hr</span>}
                {s.pricePerDay  && <span style={{ fontSize:11, color:'#94a3b8' }}>{fmt(s.pricePerDay)}/día</span>}
                {s.pricePerMonth&& <span style={{ fontSize:11, color:'#94a3b8' }}>{fmt(s.pricePerMonth)}/mes</span>}
              </div>
              {s.amenities?.length > 0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {(s.amenities as string[]).slice(0,4).map((a:string) => (
                    <span key={a} style={{ fontSize:9, padding:'2px 6px', borderRadius:99, background:'#334155', color:'#94a3b8' }}>{a}</span>
                  ))}
                  {s.amenities.length > 4 && <span style={{ fontSize:9, color:'#475569' }}>+{s.amenities.length-4}</span>}
                </div>
              )}
              <button onClick={() => setEditSpc({...s})}
                style={{ padding:'5px', borderRadius:7, border:`1px solid #334155`, background:'none', color:'#60a5fa', cursor:'pointer', fontSize:11 }}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>

      {editSpc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:420, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 14px' }}>Editar espacio</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[['Nombre','name','text'],['Piso','floor','text'],['Capacidad','capacity','number'],
                ['Precio/hora','pricePerHour','number'],['Precio/día','pricePerDay','number'],['Precio/mes','pricePerMonth','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:12 }} value={editSpc[k]||''}
                    onChange={e => setEditSpc((s:any)=>({...s,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={() => setEditSpc(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex:1, background:color }} onClick={() => updateM.mutate()} disabled={updateM.isPending}>
                {updateM.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
