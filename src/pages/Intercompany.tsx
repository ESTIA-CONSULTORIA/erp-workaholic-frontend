// ╔═══════════════════════════════════════════════════════════════╗
// ║  INTERCOMPANY — Transferencias entre empresas del grupo      ║
// ║  Flujo: Emisor crea → Receptor valida/rechaza → FlowMovement ║
// ║  Folio ICT-XXXX visible en ambas empresas                    ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDIENTE: { label: 'Pendiente validación', color: '#f59e0b', icon: '⏳' },
  APROBADO:  { label: 'Aprobado',             color: '#10b981', icon: '✅' },
  RECHAZADO: { label: 'Rechazado',            color: '#f87171', icon: '❌' },
};

export default function IntercompanyPage() {
  const { activeCompany, user } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [periodo,   setPeriodo]   = useState(new Date().toISOString().slice(0, 7));
  const [showNew,   setShowNew]   = useState(false);
  const [detalle,   setDetalle]   = useState<any>(null);
  const [motivoRec, setMotivoRec] = useState('');
  const [form, setForm] = useState({
    toCompanyId: '', amount: '', concept: '', date: new Date().toISOString().slice(0, 10),
    notes: '', fromCashAccountId: '', toCashAccountId: '',
  });

  // ── Queries ────────────────────────────────────────────────────
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['intercompany', cid, periodo],
    queryFn:  () => api.get(`/companies/${cid}/intercompany?period=${periodo}`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 30000, // poll cada 30s para ver nuevas transferencias
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn:  () => api.get('/companies').then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cuentasOrigen = [] } = useQuery({
    queryKey: ['cash-accounts', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/accounts`).then(r => r.data).catch(() => []),
    enabled:  !!cid,
  });

  const { data: cuentasDestino = [] } = useQuery({
    queryKey: ['cash-accounts', form.toCompanyId],
    queryFn:  () => api.get(`/companies/${form.toCompanyId}/flow/accounts`).then(r => r.data).catch(() => []),
    enabled:  !!form.toCompanyId,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const createM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/intercompany`, form),
    onSuccess: () => {
      setShowNew(false);
      setForm({ toCompanyId:'', amount:'', concept:'', date:new Date().toISOString().slice(0,10), notes:'', fromCashAccountId:'', toCashAccountId:'' });
      qc.invalidateQueries({ queryKey: ['intercompany', cid] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error al crear transferencia'),
  });

  const approveM = useMutation({
    mutationFn: ({ id, approved, motivo }: any) =>
      api.put(`/companies/${cid}/intercompany/${id}/approve`, { approved, motivo }),
    onSuccess: () => {
      setDetalle(null);
      setMotivoRec('');
      qc.invalidateQueries({ queryKey: ['intercompany', cid] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  // ── Clasificar transfers ───────────────────────────────────────
  const list       = transfers as any[];
  const pendientes = list.filter(t => t.status === 'PENDIENTE' && t.toCompanyId === cid);
  const historial  = list.filter(t => t.status !== 'PENDIENTE' || t.toCompanyId !== cid || list.length < 5);
  const otrasEmpresas = (empresas as any[]).filter((e: any) => e.id !== cid);

  return (
    <AppLayout>
      <div style={{ maxWidth: 1000 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 3px' }}>
              Transferencias Intercompany
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Movimientos entre empresas del grupo · Folio de control ICT-XXXX
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #334155',
                background: '#0f172a', color: '#f1f5f9', fontSize: 13 }} />
            <button onClick={() => setShowNew(true)}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              + Nueva transferencia
            </button>
          </div>
        </div>

        {/* ── Alerta pendientes para validar ── */}
        {pendientes.length > 0 && (
          <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: '0 0 10px' }}>
              ⚠ {pendientes.length} transferencia{pendientes.length > 1 ? 's' : ''} pendiente{pendientes.length > 1 ? 's' : ''} de validar
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendientes.map((t: any) => (
                <div key={t.id} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <code style={{ fontSize: 12, background: '#334155', padding: '2px 7px',
                        borderRadius: 4, color: '#f59e0b', fontWeight: 700 }}>
                        {t.folio || '—'}
                      </code>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                        {t.fromCompany?.name} → Nosotros
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                        {fmt(t.amount)} {t.currency}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                      {t.concept} · {fmtDate(t.date)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setDetalle(t)}
                      style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${color}`,
                        background: 'none', color, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Ver detalle
                    </button>
                    <button onClick={() => approveM.mutate({ id: t.id, approved: true })}
                      disabled={approveM.isPending}
                      style={{ padding: '6px 14px', borderRadius: 7, border: 'none',
                        background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      ✓ Validar
                    </button>
                    <button onClick={() => setDetalle({ ...t, _rechazar: true })}
                      style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #f87171',
                        background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabla historial ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Dirección</th>
                <th>Empresa</th>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Cargando…
                </td></tr>
              )}
              {!isLoading && list.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔄</p>
                  <p>Sin transferencias en este período</p>
                </td></tr>
              )}
              {list.map((t: any) => {
                const esEmisor   = t.fromCompanyId === cid;
                const empresa    = esEmisor ? t.toCompany : t.fromCompany;
                const st         = STATUS_CONFIG[t.status] || STATUS_CONFIG['PENDIENTE'];
                return (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setDetalle(t)}>
                    <td>
                      <code style={{ fontSize: 11, background: '#334155', padding: '2px 7px',
                        borderRadius: 4, color: '#f1f5f9', fontWeight: 700 }}>
                        {t.folio || '—'}
                      </code>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {fmtDate(t.date)}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                        background: esEmisor ? '#f8717122' : '#10b98122',
                        color: esEmisor ? '#f87171' : '#10b981' }}>
                        {esEmisor ? '↑ Enviado' : '↓ Recibido'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 500 }}>{empresa?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 180,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.concept}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700,
                      color: esEmisor ? '#f87171' : '#10b981' }}>
                      {esEmisor ? '-' : '+'}{fmt(t.amount)}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                        background: st.color + '22', color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td>
                      {t.status === 'PENDIENTE' && !esEmisor && (
                        <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                          ← Acción requerida
                        </span>
                      )}
                      {t.status === 'RECHAZADO' && t.rejectedReason && (
                        <span style={{ fontSize: 10, color: '#f87171' }} title={t.rejectedReason}>
                          Motivo ▸
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal detalle / validar ── */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28,
            width: 500, border: `1px solid ${color}44` }}>
            {/* Folio grande */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <code style={{ fontSize: 22, fontWeight: 800, color, background: color + '22',
                  padding: '4px 14px', borderRadius: 8, display: 'block', marginBottom: 6 }}>
                  {detalle.folio || '—'}
                </code>
                <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Folio de control · {fmtDate(detalle.date)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#10b981', margin: 0 }}>
                  {fmt(detalle.amount)} {detalle.currency}
                </p>
                {(() => { const st = STATUS_CONFIG[detalle.status] || STATUS_CONFIG['PENDIENTE'];
                  return <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.icon} {st.label}</span>; })()}
              </div>
            </div>

            {/* Detalle campos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['De', detalle.fromCompany?.name],
                ['Para', detalle.toCompany?.name],
                ['Concepto', detalle.concept],
                ['Fecha', fmtDate(detalle.date)],
                ...(detalle.notes ? [['Notas', detalle.notes]] : []),
                ...(detalle.rejectedReason ? [['Motivo rechazo', detalle.rejectedReason]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ gridColumn: k === 'Concepto' || k === 'Notas' || k === 'Motivo rechazo' ? 'span 2' : 'auto' }}>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</p>
                  <p style={{ fontSize: 13, color: '#f1f5f9', margin: 0, fontWeight: 500 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Rechazar con motivo */}
            {(detalle._rechazar || (detalle.status === 'PENDIENTE' && detalle.toCompanyId === cid)) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Motivo de rechazo (requerido si rechazas)
                </label>
                <input value={motivoRec} onChange={e => setMotivoRec(e.target.value)}
                  placeholder="Ej: Monto incorrecto, concepto no autorizado…"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #334155',
                    background: '#0f172a', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDetalle(null); setMotivoRec(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155',
                  background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                Cerrar
              </button>
              {detalle.status === 'PENDIENTE' && detalle.toCompanyId === cid && (
                <>
                  <button onClick={() => approveM.mutate({ id: detalle.id, approved: false, motivo: motivoRec })}
                    disabled={approveM.isPending || !motivoRec.trim()}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #f87171',
                      background: 'none', color: motivoRec.trim() ? '#f87171' : '#334155',
                      cursor: motivoRec.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
                    {approveM.isPending ? '…' : '✕ Rechazar'}
                  </button>
                  <button onClick={() => approveM.mutate({ id: detalle.id, approved: true })}
                    disabled={approveM.isPending}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {approveM.isPending ? 'Validando…' : '✓ Validar entrada'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva transferencia ── */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28,
            width: 480, border: `1px solid ${color}44` }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color }}>
              Nueva transferencia intercompany
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>
              Se generará un folio ICT-XXXX. La empresa receptora debe validar para registrar el movimiento.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Empresa destino *</label>
                <select className="input-base" style={{ fontSize: 13 }}
                  value={form.toCompanyId} onChange={e => setForm(f => ({ ...f, toCompanyId: e.target.value }))}>
                  <option value="">— Seleccionar empresa —</option>
                  {otrasEmpresas.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Monto *</label>
                  <input type="number" className="input-base" style={{ fontSize: 14, fontWeight: 700 }}
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Fecha *</label>
                  <input type="date" className="input-base" style={{ fontSize: 13 }}
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Concepto *</label>
                <input className="input-base" style={{ fontSize: 13 }}
                  placeholder="Ej: Préstamo operativo marzo 2025"
                  value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} />
              </div>
              {(cuentasOrigen as any[]).length > 0 && (
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>
                    Cuenta de origen (opcional)
                  </label>
                  <select className="input-base" style={{ fontSize: 12 }}
                    value={form.fromCashAccountId} onChange={e => setForm(f => ({ ...f, fromCashAccountId: e.target.value }))}>
                    <option value="">— Cuenta por defecto —</option>
                    {(cuentasOrigen as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} · {fmt(c.balance)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Notas (opcional)</label>
                <input className="input-base" style={{ fontSize: 12 }}
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNew(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155',
                  background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => createM.mutate()}
                disabled={createM.isPending || !form.toCompanyId || !form.amount || !form.concept}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                  background: form.toCompanyId && form.amount && form.concept ? color : '#334155',
                  color: '#fff', cursor: form.toCompanyId && form.amount && form.concept ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700 }}>
                {createM.isPending ? 'Enviando…' : '📤 Enviar transferencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
