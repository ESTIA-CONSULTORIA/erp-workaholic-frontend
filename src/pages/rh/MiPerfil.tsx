// src/pages/rh/MiPerfil.tsx — Portal del Empleado
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS_SOLICITUD = [
  { id: 'VACACIONES',       label: 'Vacaciones',       icon: '🏖', goce: true  },
  { id: 'PERMISO_CON_GOCE', label: 'Permiso con goce', icon: '📅', goce: true  },
  { id: 'PERMISO_SIN_GOCE', label: 'Permiso sin goce', icon: '📋', goce: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDIENTE:     { label: 'Pendiente aprobación jefe', color: '#f59e0b', icon: '⏳' },
  APROBADO_JEFE: { label: 'Aprobado por jefe, pend. RH', color: '#3b82f6', icon: '✓' },
  APROBADO:      { label: 'Aprobado',                  color: '#10b981', icon: '✅' },
  RECHAZADO:     { label: 'Rechazado',                 color: '#f87171', icon: '✕' },
  CANCELADO:     { label: 'Cancelado',                 color: '#64748b', icon: '—' },
};

export default function MiPerfilPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showForm, setShowForm]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [form, setForm] = useState({
    type: 'VACACIONES', startDate: '', endDate: '', notes: '',
  });

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['mi-perfil', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/me`).then(r => r.data),
    enabled:  !!cid,
  });

  const balance = perfil?.vacationBalance;
  const solicitudes: any[] = perfil?.vacations || [];

  const enviarSolicitud = async () => {
    if (!form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/rh/me/vacations`, form);
      setShowForm(false);
      setForm({ type: 'VACACIONES', startDate: '', endDate: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['mi-perfil', cid] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al enviar solicitud');
    } finally { setSaving(false); }
  };

  if (isLoading) return <AppLayout><p style={{ color:'#64748b', padding:24 }}>Cargando…</p></AppLayout>;

  if (!perfil) return (
    <AppLayout>
      <div style={{ maxWidth:600, margin:'60px auto', textAlign:'center' }}>
        <p style={{ fontSize:48, margin:'0 0 16px' }}>👤</p>
        <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 8px' }}>Sin expediente vinculado</h2>
        <p style={{ color:'#64748b', fontSize:14 }}>
          Tu usuario aún no está vinculado a un expediente de empleado.<br/>
          Contacta a tu administrador de RH para que lo configure.
        </p>
      </div>
    </AppLayout>
  );

  const diasNaturales = form.startDate && form.endDate
    ? Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (24*60*60*1000)) + 1
    : 0;

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:color+'33',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
              👤
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 2px' }}>
                {perfil.firstName} {perfil.lastName}
              </h1>
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                {perfil.position} {perfil.department ? `· ${perfil.department}` : ''}
              </p>
              <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>
                #{perfil.employeeNumber} · Ingreso: {fmtDate(perfil.startDate)}
              </p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ padding:'10px 20px', borderRadius:10, border:'none', background:color,
              color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', gap:6, alignItems:'center' }}>
            + Nueva solicitud
          </button>
        </div>

        {/* KPIs vacaciones */}
        {balance && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Antigüedad',     value:`${balance.years} año${balance.years!==1?'s':''}`, col:'#94a3b8', icon:'📅' },
              { label:'Días LFT',       value:`${balance.entitled} días`, col:color, icon:'🏖', sub: balance.workDays===6?'Jornada 6 días':'Jornada 5 días' },
              { label:'Días usados',    value:`${balance.used} días`,     col:'#f59e0b', icon:'✓' },
              { label:'Días disponibles',value:`${balance.balance} días`, col: balance.balance>0?'#10b981':'#f87171', icon:'⭐' },
            ].map(k => (
              <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px',
                border:`1px solid #334155`, borderLeft:`4px solid ${k.col}` }}>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:16 }}>{k.icon}</span>
                  <p style={{ fontSize:10, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:1 }}>{k.label}</p>
                </div>
                <p style={{ fontSize:20, fontWeight:800, color:k.col, margin:'0 0 2px' }}>{k.value}</p>
                {k.sub && <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Barra de progreso vacaciones */}
        {balance && balance.entitled > 0 && (
          <div style={{ background:'#1e293b', borderRadius:10, padding:'12px 16px', marginBottom:24, border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#64748b' }}>Vacaciones usadas este período</span>
              <span style={{ fontSize:12, fontWeight:600, color }}>
                {balance.used} / {balance.entitled} días
              </span>
            </div>
            <div style={{ height:8, background:'#334155', borderRadius:4 }}>
              <div style={{ height:'100%', borderRadius:4, background:color,
                width:`${Math.min(100, (balance.used/balance.entitled)*100)}%`,
                transition:'width 0.5s' }}/>
            </div>
            {balance.primaVacacional > 0 && (
              <p style={{ fontSize:11, color:'#f59e0b', margin:'6px 0 0' }}>
                Prima vacacional estimada: {fmt(balance.primaVacacional)} (25% salario diario × {balance.entitled} días)
              </p>
            )}
          </div>
        )}

        {/* Modal nueva solicitud */}
        {showForm && (
          <div style={{ background:'#1e293b', borderRadius:12, padding:20, marginBottom:20, border:`1px solid ${color}33` }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px', color }}>Nueva solicitud de ausencia</h3>

            {/* Tipo */}
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {TIPOS_SOLICITUD.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  style={{ flex:1, padding:'10px', borderRadius:9, cursor:'pointer', textAlign:'center',
                    border:`2px solid ${form.type===t.id?color:'#334155'}`,
                    background: form.type===t.id?color+'22':'#0f172a' }}>
                  <p style={{ fontSize:20, margin:'0 0 4px' }}>{t.icon}</p>
                  <p style={{ fontSize:11, fontWeight:600, color:form.type===t.id?color:'#64748b', margin:'0 0 2px' }}>{t.label}</p>
                  <p style={{ fontSize:10, color: t.goce?'#10b981':'#f87171', margin:0 }}>
                    {t.goce?'Con goce':'Sin goce'}
                  </p>
                </button>
              ))}
            </div>

            {/* Fechas */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha inicio *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.startDate} min={new Date().toISOString().slice(0,10)}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha fin *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.endDate} min={form.startDate || new Date().toISOString().slice(0,10)}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}/>
              </div>
            </div>

            {/* Días calculados */}
            {diasNaturales > 0 && (
              <div style={{ padding:'8px 12px', borderRadius:8, background:'#0f172a',
                border:'1px solid #334155', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'#94a3b8' }}>
                  📅 {diasNaturales} días naturales solicitados
                  {balance && ` · Tienes ${balance.balance} días disponibles`}
                </span>
                {balance && form.type === 'VACACIONES' && diasNaturales > balance.balance && (
                  <p style={{ fontSize:11, color:'#f87171', margin:'4px 0 0' }}>
                    ⚠ Excedes tu saldo disponible de vacaciones
                  </p>
                )}
              </div>
            )}

            {/* Notas */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Motivo / Notas</label>
              <input className="input-base" style={{ fontSize:13 }} placeholder="Describe el motivo (opcional)"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>
            </div>

            {/* Flujo de aprobación */}
            <div style={{ background:'#0f172a', borderRadius:8, padding:'10px 14px', marginBottom:14,
              border:'1px solid #334155' }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px', fontWeight:600 }}>
                Flujo de aprobación:
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {[
                  { label:'Tú solicitas', icon:'👤', done:true },
                  { label:'Jefe aprueba', icon:'👔', done:false },
                  { label:'RH confirma',  icon:'🏢', done:false },
                  { label:'Aprobado',     icon:'✅', done:false },
                ].map((step, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ textAlign:'center' }}>
                      <span style={{ fontSize:16 }}>{step.icon}</span>
                      <p style={{ fontSize:9, color: step.done?color:'#475569', margin:'2px 0 0' }}>{step.label}</p>
                    </div>
                    {i < 3 && <span style={{ color:'#334155', fontSize:16 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => { setShowForm(false); setForm({ type:'VACACIONES', startDate:'', endDate:'', notes:'' }); }}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={enviarSolicitud}
                disabled={saving || !form.startDate || !form.endDate}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:color,
                  color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, opacity: saving?0.7:1 }}>
                {saving ? 'Enviando…' : '📤 Enviar solicitud'}
              </button>
            </div>
          </div>
        )}

        {/* Historial de solicitudes */}
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, margin:'0 0 12px' }}>Mis solicitudes</h2>
          {solicitudes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#334155', background:'#1e293b', borderRadius:12 }}>
              <p style={{ fontSize:32, margin:'0 0 8px' }}>📋</p>
              <p style={{ fontSize:13 }}>No tienes solicitudes registradas</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {solicitudes.map((s: any) => {
                const st = STATUS_CONFIG[s.status] || { label:s.status, color:'#64748b', icon:'?' };
                return (
                  <div key={s.id} style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px',
                    border:`1px solid #334155`, borderLeft:`4px solid ${st.color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#f1f5f9' }}>
                            {TIPOS_SOLICITUD.find(t => t.id===s.type)?.label || s.type}
                          </span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background: st.color+'22', color: st.color, fontWeight:600 }}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                        <p style={{ fontSize:12, color:'#64748b', margin:'0 0 2px' }}>
                          📅 {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                          <span style={{ marginLeft:8, color:'#94a3b8' }}>
                            ({s.businessDays || s.days} días{s.businessDays ? ' hábiles' : ''})
                          </span>
                        </p>
                        {s.notes && <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>"{s.notes}"</p>}
                        {s.rejectedReason && (
                          <p style={{ fontSize:11, color:'#f87171', margin:'4px 0 0' }}>
                            Motivo de rechazo: {s.rejectedReason}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        {s.primaVacacional > 0 && s.status === 'APROBADO' && (
                          <p style={{ fontSize:11, color:'#f59e0b', margin:0 }}>
                            Prima: {fmt(s.primaVacacional)}
                          </p>
                        )}
                        <p style={{ fontSize:10, color:'#475569', margin:'4px 0 0' }}>
                          Solicitado: {fmtDate(s.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Progreso visual */}
                    <div style={{ display:'flex', gap:4, marginTop:10 }}>
                      {[
                        { label:'Enviada',       done: true },
                        { label:'Jefe',          done: ['APROBADO_JEFE','APROBADO'].includes(s.status) },
                        { label:'RH',            done: s.status === 'APROBADO' },
                      ].map((step, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
                          <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
                            background: step.done ? '#10b981' : s.status==='RECHAZADO' ? '#f87171' : '#334155',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:9, color:'#fff', fontWeight:700 }}>
                            {step.done ? '✓' : i+1}
                          </div>
                          <span style={{ fontSize:10, color: step.done?'#10b981':'#475569' }}>{step.label}</span>
                          {i < 2 && <div style={{ flex:1, height:1, background: step.done?'#10b98155':'#334155' }}/>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
