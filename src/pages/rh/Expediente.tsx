import AppLayout from '../../components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';
import { useState } from 'react';

export default function ExpedientePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const [tab, setTab] = useState('datos');

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees/${id}`).then(r => r.data),
    enabled:  !!cid && !!id,
  });

  if (isLoading) return <AppLayout><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,color:'#64748b'}}>Cargando…</div></AppLayout>;
  if (!emp) return <AppLayout><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,color:'#64748b'}}>No encontrado</div></AppLayout>;

  const fullName = `${emp.firstName} ${emp.lastName} ${emp.secondLastName||''}`.trim();
  const TABS = ['datos','documentos','vacaciones','eventos','nómina'];

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <button onClick={() => navigate('/rh')} style={{ background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:13,marginBottom:12,padding:0 }}>← Volver</button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 6px' }}>{fullName}</h1>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <code style={{ fontSize:11, background:'#334155', padding:'2px 8px', borderRadius:4 }}>{emp.employeeNumber}</code>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{emp.position}</span>
              <span className={emp.status==='ACTIVO'?'badge-green':emp.status==='BAJA'?'badge-red':'badge-amber'}>{emp.status}</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>Salario mensual</p>
            <p style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{fmt(emp.grossSalary)}</p>
            <p style={{ fontSize:11, color:'#64748b', margin:0 }}>Ingreso: {fmtDate(emp.startDate)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:24, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'10px 16px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===t?`2px solid ${color}`:'2px solid transparent',
                color: tab===t?color:'#64748b', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {tab==='datos' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { title:'Datos personales', items:[
                ['RFC',emp.rfc||'—'],['CURP',emp.curp||'—'],['NSS',emp.nss||'—'],
                ['Teléfono',emp.phone||'—'],['Email',emp.email||'—'],
              ]},
              { title:'Datos laborales', items:[
                ['Puesto',emp.position],['Área',emp.department||'—'],
                ['Contrato',emp.contractType],['Salario diario',fmt(emp.dailySalary)],
                ['CLABE',emp.bankAccount||'—'],['Banco',emp.bankName||'—'],
              ]},
            ].map(card => (
              <div key={card.title} className="card">
                <p style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>{card.title}</p>
                {card.items.map(([label,value]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'#64748b' }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:500 }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab==='documentos' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr><th>Tipo</th><th>Título</th><th>Firmado</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>
                {(emp.documents||[]).length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin documentos</td></tr>}
                {(emp.documents||[]).map((d:any) => (
                  <tr key={d.id}>
                    <td><span style={{ fontSize:11, background:'#334155', padding:'2px 6px', borderRadius:4 }}>{d.type}</span></td>
                    <td style={{fontWeight:500}}>{d.title}</td>
                    <td>{d.signedAt?fmtDate(d.signedAt):'—'}</td>
                    <td>{d.endDate?fmtDate(d.endDate):'—'}</td>
                    <td><span className={d.status==='VIGENTE'?'badge-green':d.status==='VENCIDO'?'badge-red':'badge-gray'}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==='vacaciones' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th style={{textAlign:'right'}}>Días</th><th>Estado</th></tr></thead>
              <tbody>
                {(emp.vacations||[]).length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin solicitudes</td></tr>}
                {(emp.vacations||[]).map((v:any) => (
                  <tr key={v.id}>
                    <td>{v.type}</td>
                    <td>{fmtDate(v.startDate)}</td>
                    <td>{fmtDate(v.endDate)}</td>
                    <td style={{textAlign:'right',fontWeight:600}}>{v.days}</td>
                    <td><span className={v.status==='APROBADO'?'badge-green':v.status==='RECHAZADO'?'badge-red':'badge-amber'}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==='eventos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(emp.hrEvents||[]).length===0 && <p style={{ color:'#64748b', textAlign:'center', padding:32 }}>Sin eventos registrados</p>}
            {(emp.hrEvents||[]).map((ev:any) => (
              <div key={ev.id} className="card" style={{ borderLeft:`3px solid ${color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{ev.type.replace(/_/g,' ')}</span>
                  <span style={{ fontSize:12, color:'#64748b' }}>{fmtDate(ev.date)}</span>
                </div>
                <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{ev.description}</p>
                {ev.resolution && <p style={{ fontSize:12, color:'#60a5fa', margin:'4px 0 0' }}>Resolución: {ev.resolution}</p>}
              </div>
            ))}
          </div>
        )}

        {tab==='nómina' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr><th>Período</th><th style={{textAlign:'right'}}>Percepciones</th><th style={{textAlign:'right'}}>Deducciones</th><th style={{textAlign:'right'}}>Neto</th></tr></thead>
              <tbody>
                {(emp.payrollLines||[]).length===0 && <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin registros</td></tr>}
                {(emp.payrollLines||[]).map((l:any) => (
                  <tr key={l.id}>
                    <td>{l.period?.periodLabel}</td>
                    <td style={{textAlign:'right',color:'#10b981'}}>{fmt(l.totalPerceptions)}</td>
                    <td style={{textAlign:'right',color:'#f87171'}}>{fmt(l.totalDeductions)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(l.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
