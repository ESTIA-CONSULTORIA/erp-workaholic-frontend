import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../lib/api';

const EMPRESA_COLORS: Record<string,string> = {
  MACHETE:'#B5451B', WORKAHOLIC:'#3b82f6', PALESTRA:'#10b981', LONCHE:'#f59e0b'
};

export default function IntercompanyPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew, setShowNew]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [periodo, setPeriodo]   = useState(new Date().toISOString().slice(0,7));

  const initForm = { toCompanyId:'', concept:'', amount:0, date: new Date().toISOString().slice(0,10), notes:'' };
  const [form, setForm] = useState(initForm);
  const set = (k:string, v:any) => setForm(f => ({...f,[k]:v}));

  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn:  () => api.get('/companies').then(r => r.data),
    enabled:  !!cid,
  });

  const { data: transacciones = [], isLoading } = useQuery({
    queryKey: ['intercompany', cid, periodo],
    queryFn:  () => api.get(`/companies/${cid}/intercompany?period=${periodo}`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/intercompany`, form),
    onSuccess: () => {
      setShowNew(false); setForm(initForm);
      qc.invalidateQueries({ queryKey: ['intercompany', cid] });
    },
  });

  const otras = (companies as any[]).filter((c:any) => c.id !== cid);
  const totalEnviado  = (transacciones as any[]).filter((t:any) => t.fromCompanyId===cid).reduce((s:number,t:any)=>s+Number(t.amount),0);
  const totalRecibido = (transacciones as any[]).filter((t:any) => t.toCompanyId===cid).reduce((s:number,t:any)=>s+Number(t.amount),0);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Intercompany</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => exportCSV('intercompany', transacciones as any[],
              [{key:'fecha',label:'Fecha'},{key:'concepto',label:'Concepto'},
               {key:'monto',label:'Monto'},{key:'tipo',label:'Tipo'}])}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
              ⬇ Exportar
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => { setShowNew(!showNew); setError(''); }}>
              {showNew ? 'Cancelar' : '+ Nueva transacción'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Enviado a otras empresas', value: totalEnviado,            col:'#f87171' },
            { label:'Recibido de otras empresas',value: totalRecibido,          col:'#10b981' },
            { label:'Saldo neto',               value: totalRecibido-totalEnviado, col: (totalRecibido-totalEnviado)>=0?'#10b981':'#f87171' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:0 }}>{fmt(Math.abs(k.value))}</p>
            </div>
          ))}
        </div>

        {/* Filtro mes */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
          <input type="month" className="input-base" style={{ fontSize:13, maxWidth:160 }}
            value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          <span style={{ fontSize:12, color:'#475569' }}>{(transacciones as any[]).length} transacciones</span>
        </div>

        {/* Formulario nueva transacción */}
        {showNew && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nueva transacción intercompany</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Empresa destino *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.toCompanyId}
                  onChange={e => set('toCompanyId', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {otras.map((c:any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }} value={form.date}
                  onChange={e => set('date', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Monto *</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={form.amount||''} onChange={e => set('amount', +e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Concepto *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.concept}
                  onChange={e => set('concept', e.target.value)} placeholder="Descripción de la transacción"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setShowNew(false); setError(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending||!form.toCompanyId||!form.concept||!form.amount}>
                {crearM.isPending ? 'Guardando…' : 'Registrar transacción'}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th><th>Tipo</th><th>Empresa</th><th>Concepto</th>
              <th style={{textAlign:'right'}}>Monto</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (transacciones as any[]).length===0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin transacciones en este período</td></tr>
              )}
              {(transacciones as any[]).map((t:any) => {
                const esEnvio = t.fromCompanyId === cid;
                const empresa = esEnvio ? t.toCompany : t.fromCompany;
                const empColor = empresa?.color || color;
                return (
                  <tr key={t.id}>
                    <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(t.date)}</td>
                    <td>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,
                        background:esEnvio?'#f8717122':'#10b98122',
                        color:esEnvio?'#f87171':'#10b981'}}>
                        {esEnvio ? '↑ Enviado' : '↓ Recibido'}
                      </span>
                    </td>
                    <td>
                      <span style={{fontSize:12,fontWeight:500,color:empColor}}>
                        {empresa?.name||'—'}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'#94a3b8',maxWidth:200,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.concept}</td>
                    <td style={{textAlign:'right',fontWeight:700,
                      color:esEnvio?'#f87171':'#10b981'}}>
                      {esEnvio?'-':'+'}${fmt(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
