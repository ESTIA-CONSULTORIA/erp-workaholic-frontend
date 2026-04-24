import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

export default function AlumnosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f97316';
  const qc    = useQueryClient();

  const [search,     setSearch]     = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const [selected,   setSelected]   = useState<any>(null);
  const [recarModal, setRecarModal] = useState<any>(null);
  const [recarForm,  setRecarForm]  = useState({ amount:'', paymentMethod:'EFECTIVO', reference:'' });
  const [form, setForm] = useState({
    code:'', name:'', grade:'', tutorName:'', tutorEmail:'', tutorPhone:'', dailyLimit:'',
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['lonche-students', cid, search],
    queryFn:  () => api.get(`/companies/${cid}/lonche/students${search?`?search=${search}`:''}`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['lonche-transactions', cid, selected?.id],
    queryFn:  () => api.get(`/companies/${cid}/lonche/students/${selected.id}/transactions`).then(r=>r.data),
    enabled:  !!cid && !!selected?.id,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/lonche/students`, { ...form, dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null }),
    onSuccess: () => { setShowNew(false); setForm({code:'',name:'',grade:'',tutorName:'',tutorEmail:'',tutorPhone:'',dailyLimit:''}); qc.invalidateQueries({queryKey:['lonche-students',cid]}); },
    onError: (e:any) => alert(e.response?.data?.message||'Error'),
  });

  const recarM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/lonche/students/${recarModal.id}/recargar`, {
      amount: Number(recarForm.amount), paymentMethod: recarForm.paymentMethod, reference: recarForm.reference,
    }),
    onSuccess: () => {
      setRecarModal(null); setRecarForm({amount:'',paymentMethod:'EFECTIVO',reference:''});
      qc.invalidateQueries({queryKey:['lonche-students',cid]});
      qc.invalidateQueries({queryKey:['lonche-transactions',cid]});
    },
    onError: (e:any) => alert(e.response?.data?.message||'Error'),
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Alumnos y Prepago</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={()=>setShowNew(s=>!s)}>
            {showNew?'✕ Cancelar':'+ Nuevo alumno'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nuevo alumno</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['Código QR/Barras *','code','text'],['Nombre del alumno *','name','text'],['Grado/Grupo','grade','text'],['Tutor','tutorName','text'],['Email tutor','tutorEmail','email'],['Teléfono tutor','tutorPhone','text'],['Tope diario ($)','dailyLimit','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:12}} value={(form as any)[k]}
                    onChange={e=>set(k,e.target.value)}/>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{background:color,fontSize:13}}
              onClick={()=>crearM.mutate()} disabled={crearM.isPending||!form.code||!form.name}>
              {crearM.isPending?'Creando…':'Crear alumno'}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input className="input-base" style={{flex:1,fontSize:12}}
            placeholder="🔍 Buscar por nombre, código o grado..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* Lista */}
          <div className="card" style={{ padding:0, overflow:'hidden', height:'fit-content' }}>
            <table className="table-base">
              <thead><tr><th>Alumno</th><th>Grado</th><th style={{textAlign:'right'}}>Saldo</th><th>Acciones</th></tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>}
                {(students as any[]).map((s:any) => (
                  <tr key={s.id} style={{ cursor:'pointer', background:selected?.id===s.id?color+'11':'transparent' }}
                    onClick={()=>setSelected(s)}>
                    <td style={{ fontWeight:500 }}>
                      <p style={{margin:0}}>{s.name}</p>
                      <code style={{fontSize:10,color:'#64748b'}}>{s.code}</code>
                    </td>
                    <td style={{fontSize:12}}>{s.grade||'—'}</td>
                    <td style={{textAlign:'right'}}>
                      <p style={{margin:0,fontWeight:700,color,fontSize:13}}>{fmt(s.balance)}</p>
                      {Number(s.cashback)>0 && <p style={{margin:0,fontSize:10,color:'#f59e0b'}}>★ {fmt(s.cashback)} cashback</p>}
                    </td>
                    <td>
                      <button onClick={e=>{e.stopPropagation();setRecarModal(s);setRecarForm({amount:'',paymentMethod:'EFECTIVO',reference:''}); }}
                        style={{background:'none',border:'none',color:'#10b981',cursor:'pointer',fontSize:12,fontWeight:600}}>
                        + Recargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalle / transacciones */}
          {selected && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <div>
                  <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 2px',color}}>{selected.name}</h3>
                  <p style={{fontSize:12,color:'#64748b',margin:0}}>
                    {selected.grade} · {selected.tutorName}
                    {selected.dailyLimit && <span style={{color:'#f59e0b',marginLeft:6}}>Tope: {fmt(selected.dailyLimit)}/día</span>}
                  </p>
                </div>
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:18}}>✕</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <div style={{flex:1,background:'#0f172a',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                  <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>Saldo prepago</p>
                  <p style={{fontSize:20,fontWeight:800,color,margin:0}}>{fmt(selected.balance)}</p>
                </div>
                <div style={{flex:1,background:'#0f172a',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                  <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>Cashback</p>
                  <p style={{fontSize:20,fontWeight:800,color:'#f59e0b',margin:0}}>★ {fmt(selected.cashback)}</p>
                </div>
              </div>
              <p style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase',margin:'0 0 8px'}}>Últimas transacciones</p>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {(transactions as any[]).map((t:any) => (
                  <div key={t.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0',
                    borderBottom:'1px solid #1e293b', fontSize:12 }}>
                    <div>
                      <span style={{ color: t.type==='RECARGA'||t.type==='CASHBACK'?'#10b981':'#f87171', fontWeight:600 }}>
                        {t.type==='RECARGA'?'⬆':t.type==='CASHBACK'?'★':'⬇'} {t.type}
                      </span>
                      <p style={{fontSize:10,color:'#475569',margin:0}}>{fmtDate(t.createdAt)}</p>
                    </div>
                    <span style={{ fontWeight:700, color:t.amount>0?'#10b981':'#f87171' }}>
                      {t.amount>0?'+':''}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setRecarModal(selected)} style={{width:'100%',marginTop:12,padding:'8px',borderRadius:8,border:'none',background:color,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
                + Recargar saldo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal recarga */}
      {recarModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:360,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>Recargar saldo</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>{recarModal.name} · Saldo actual: {fmt(recarModal.balance)}</p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              {[['Monto a recargar *','amount','number'],['Referencia','reference','text']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:13}} value={(recarForm as any)[k]}
                    onChange={e=>setRecarForm(f=>({...f,[k]:e.target.value}))} placeholder={k==='amount'?'$0.00':''}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Método</label>
                <select className="input-base" style={{fontSize:13}} value={recarForm.paymentMethod}
                  onChange={e=>setRecarForm(f=>({...f,paymentMethod:e.target.value}))}>
                  {['EFECTIVO','TRANSFERENCIA','EN_LINEA'].map(m=><option key={m}>{m.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>setRecarModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}}
                onClick={()=>recarM.mutate()} disabled={recarM.isPending||!recarForm.amount}>
                {recarM.isPending?'Recargando…':`Recargar ${fmt(Number(recarForm.amount))}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
