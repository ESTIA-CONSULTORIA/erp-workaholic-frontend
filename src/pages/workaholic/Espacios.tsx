import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const TIPOS = ['OFICINA','SALA_JUNTAS','SALA_CAPACITACION','COWORKING','LOCKER'];
const TIPO_ICON: Record<string,string> = {
  OFICINA:'🏢', SALA_JUNTAS:'🤝', SALA_CAPACITACION:'🎓', COWORKING:'💻', LOCKER:'🔒',
};

export default function EspaciosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [editSp,  setEditSp]  = useState<any>(null);
  const [form, setForm] = useState({
    name:'', type:'SALA_JUNTAS', capacity:'1', floor:'',
    pricePerHour:'', pricePerDay:'', pricePerMonth:'',
    amenities:[] as string[],
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const AMENITIES_OPT = ['Proyector','Pantalla','Videoconferencia','Pizarrón','TV','WiFi dedicado','Impresora','Teléfono','Catering','Estacionamiento'];

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['wk-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r=>r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/spaces`, {
      ...form, capacity:Number(form.capacity),
      pricePerHour: form.pricePerHour?Number(form.pricePerHour):null,
      pricePerDay:  form.pricePerDay?Number(form.pricePerDay):null,
      pricePerMonth:form.pricePerMonth?Number(form.pricePerMonth):null,
      amenities: form.amenities.length?form.amenities:null,
    }),
    onSuccess: () => { setShowNew(false); setForm({name:'',type:'SALA_JUNTAS',capacity:'1',floor:'',pricePerHour:'',pricePerDay:'',pricePerMonth:'',amenities:[]}); qc.invalidateQueries({queryKey:['wk-spaces',cid]}); },
    onError: (e:any) => alert(e.response?.data?.message||'Error'),
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/workaholic/spaces/${editSp.id}`, editSp),
    onSuccess: () => { setEditSp(null); qc.invalidateQueries({queryKey:['wk-spaces',cid]}); },
  });

  const toggleAmenity = (a:string) => {
    setForm(f => ({
      ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities,a],
    }));
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Espacios</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew?'✕ Cancelar':'+ Nuevo espacio'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nuevo espacio</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['Nombre *','name','text'],['Piso/Ubicación','floor','text'],['Capacidad (personas)','capacity','number'],['Precio/hora','pricePerHour','number'],['Precio/día','pricePerDay','number'],['Precio/mes','pricePerMonth','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:12 }} value={(form as any)[k]}
                    onChange={e => set(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.type}
                  onChange={e => set('type',e.target.value)}>
                  {TIPOS.map(t=><option key={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>Amenidades</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {AMENITIES_OPT.map(a => (
                  <button key={a} onClick={() => toggleAmenity(a)}
                    style={{ padding:'4px 10px', borderRadius:99, fontSize:11, cursor:'pointer',
                      border:`1px solid ${form.amenities.includes(a)?color:'#334155'}`,
                      background:form.amenities.includes(a)?color+'22':'transparent',
                      color:form.amenities.includes(a)?color:'#64748b' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()} disabled={crearM.isPending||!form.name}>
              {crearM.isPending?'Creando…':'Crear espacio'}
            </button>
          </div>
        )}

        {/* Grid de espacios */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {isLoading && <p style={{color:'#64748b',gridColumn:'span 3',textAlign:'center',padding:32}}>Cargando…</p>}
          {(spaces as any[]).map((s:any) => (
            <div key={s.id} style={{ background:'#1e293b', borderRadius:10, padding:16,
              border:'1px solid #334155', cursor:'pointer' }}
              onClick={() => setEditSp({...s})}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:22 }}>{TIPO_ICON[s.type]||'🏢'}</span>
                <span style={{ fontSize:10, color:'#64748b', background:'#334155', padding:'2px 8px', borderRadius:99 }}>
                  {s.type.replace(/_/g,' ')}
                </span>
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>{s.name}</p>
              {s.floor && <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>{s.floor}</p>}
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>👥 {s.capacity} persona{s.capacity!==1?'s':''}</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {s.pricePerHour && <span style={{fontSize:11,color,fontWeight:600}}>{fmt(s.pricePerHour)}/h</span>}
                {s.pricePerDay && <span style={{fontSize:11,color:'#f59e0b',fontWeight:600}}>{fmt(s.pricePerDay)}/día</span>}
                {s.pricePerMonth && <span style={{fontSize:11,color:'#10b981',fontWeight:600}}>{fmt(s.pricePerMonth)}/mes</span>}
              </div>
              {s.amenities?.length > 0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:8 }}>
                  {(s.amenities as string[]).slice(0,4).map(a => (
                    <span key={a} style={{fontSize:9,padding:'1px 6px',borderRadius:99,background:'#334155',color:'#94a3b8'}}>{a}</span>
                  ))}
                  {s.amenities.length > 4 && <span style={{fontSize:9,color:'#475569'}}>+{s.amenities.length-4}</span>}
                </div>
              )}
            </div>
          ))}
          {!isLoading && (spaces as any[]).length===0 && (
            <div style={{gridColumn:'span 3',textAlign:'center',padding:40,color:'#334155'}}>
              <p style={{fontSize:32,margin:'0 0 8px'}}>🏢</p>
              <p style={{fontSize:13}}>Sin espacios registrados. Crea el primero.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal editar espacio */}
      {editSp && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:480,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>Editar espacio</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['Nombre','name','text'],['Piso','floor','text'],['Capacidad','capacity','number'],['Precio/hora','pricePerHour','number'],['Precio/día','pricePerDay','number'],['Precio/mes','pricePerMonth','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:12}} value={editSp[k]||''}
                    onChange={e => setEditSp((s:any)=>({...s,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={() => setEditSp(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}} onClick={() => updateM.mutate()} disabled={updateM.isPending}>
                {updateM.isPending?'Guardando…':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
