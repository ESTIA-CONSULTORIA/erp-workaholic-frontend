import AppLayout from '../components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt } from '../lib/api';

const DENOMINACIONES = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

function puedeVerDiferencia(arqueo: any, role: string): boolean {
  const isPrivileged = ['ADMIN', 'DIRECTOR', 'GERENTE'].includes((role || '').toUpperCase());
  if (isPrivileged) return true;
  const visibleAt = new Date(arqueo.differenceVisibleAt);
  return new Date() >= visibleAt;
}

function minutosRestantes(arqueo: any): number {
  const visibleAt = new Date(arqueo.differenceVisibleAt);
  const diff = visibleAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60000));
}

export default function ArqueoPage() {
  const { activeCompany, user } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const role  = (user as any)?.roleCode || (user as any)?.role || '';
  const qc    = useQueryClient();

  // ── Estado formulario ─────────────────────────────────────
  const [declarado, setDeclarado] = useState<Record<string, number>>({});
  const [notes,     setNotes]     = useState('');
  const [exito,     setExito]     = useState(false);
  const [error,     setError]     = useState('');

  // ── Estado detalle ────────────────────────────────────────
  const [detalle,   setDetalle]   = useState<any>(null);
  const [tick,      setTick]      = useState(0);

  // Reloj para actualizar minutosRestantes cada 30s
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // ── Historial ─────────────────────────────────────────────
  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['arqueos', cid],
    queryFn:  () => api.get(`/companies/${cid}/arqueo`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  // ── Sistema (saldos actuales) ─────────────────────────────
  const { data: flowData } = useQuery({
    queryKey: ['flow-balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid,
  });

  const totalDeclarado = DENOMINACIONES.reduce((t, d) => t + d * (declarado[`den_${d}`] || 0), 0);

  const sistemaCaja   = Number(flowData?.efectivo  || flowData?.EFECTIVO  || 0);
  const sistemaBancos = Number(flowData?.bancos    || flowData?.BANCOS    || 0);

  const sistemaJson = { caja: sistemaCaja, bancos: sistemaBancos };

  // ── Guardar arqueo ────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/arqueo`, {
      declared: {
        efectivo: totalDeclarado,
        denominaciones: declarado,
      },
      system:  sistemaJson,
      summary: {
        diferencia: totalDeclarado - sistemaCaja,
      },
      notes,
    }),
    onSuccess: () => {
      setDeclarado({});
      setNotes('');
      setExito(true);
      setTimeout(() => setExito(false), 3000);
      qc.invalidateQueries({ queryKey: ['arqueos', cid] });
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al guardar'),
  });

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Arqueo de caja</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Declara el efectivo físico en caja para comparar contra el sistema
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── FORMULARIO ───────────────────────────────── */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#f1f5f9' }}>
              Nuevo arqueo
            </h3>

            {/* Denominaciones */}
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Conteo de efectivo
            </p>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              {DENOMINACIONES.map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', width: 50, textAlign: 'right' }}>${d}</span>
                  <span style={{ fontSize: 11, color: '#475569' }}>×</span>
                  <input
                    type="number" min="0"
                    value={declarado[`den_${d}`] || ''}
                    onChange={e => setDeclarado(p => ({ ...p, [`den_${d}`]: +e.target.value }))}
                    style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #334155',
                      background: '#1e293b', color: '#f1f5f9', fontSize: 12, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 12, color, fontWeight: 600, marginLeft: 'auto' }}>
                    {fmt(d * (declarado[`den_${d}`] || 0))}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8,
                display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Total declarado</span>
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{fmt(totalDeclarado)}</span>
              </div>
            </div>

            {/* Referencia sistema */}
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Sistema registra
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Efectivo en caja</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(sistemaCaja)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Bancos</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(sistemaBancos)}</span>
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                Notas (opcional)
              </label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155',
                  background: '#0f172a', color: '#f1f5f9', fontSize: 12, resize: 'none', boxSizing: 'border-box' }}
                placeholder="Observaciones del arqueo..."
              />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</p>}

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || totalDeclarado === 0}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none',
                background: totalDeclarado === 0 ? '#334155' : color,
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saveMutation.isPending ? 'Guardando…' : 'Guardar arqueo'}
            </button>

            {exito && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                <p style={{ color: '#10b981', fontWeight: 700, margin: 0, fontSize: 13 }}>✔ Arqueo guardado con folio</p>
              </div>
            )}
          </div>

          {/* ── HISTORIAL ────────────────────────────────── */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#f1f5f9' }}>
              Historial de arqueos
            </h3>

            {isLoading ? (
              <p style={{ color: '#64748b', fontSize: 12 }}>Cargando...</p>
            ) : (historial as any[]).length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                Sin arqueos registrados
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                {(historial as any[]).map((a: any) => {
                  const declared   = typeof a.declaredJson === 'string' ? JSON.parse(a.declaredJson) : a.declaredJson;
                  const system     = typeof a.systemJson   === 'string' ? JSON.parse(a.systemJson)   : a.systemJson;
                  const puedeVer   = puedeVerDiferencia(a, role);
                  const minutos    = minutosRestantes(a);
                  const efDeclarado = Number(declared?.efectivo || 0);
                  const efSistema   = Number(system?.caja || 0);
                  const diferencia  = efDeclarado - efSistema;

                  return (
                    <div key={a.id}
                      onClick={() => setDetalle(a)}
                      style={{ background: '#0f172a', borderRadius: 10, padding: '12px 14px',
                        border: '1px solid #334155', cursor: 'pointer',
                        transition: 'border-color 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>
                            {a.folio}
                          </p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                            {new Date(a.createdAt).toLocaleString('es-MX', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color, margin: '0 0 2px' }}>
                            {fmt(efDeclarado)}
                          </p>
                          {puedeVer ? (
                            <p style={{ fontSize: 12, fontWeight: 700, margin: 0,
                              color: diferencia === 0 ? '#10b981' : diferencia > 0 ? '#3b82f6' : '#f87171' }}>
                              {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                            </p>
                          ) : (
                            <p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>
                              🔒 {minutos} min
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── MODAL DETALLE ────────────────────────────── */}
        {detalle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, width: 520,
              maxHeight: '85vh', overflowY: 'auto', border: '1px solid #334155' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#f1f5f9' }}>
                    {detalle.folio}
                  </h3>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                    {new Date(detalle.createdAt).toLocaleString('es-MX', {
                      weekday: 'long', day: '2-digit', month: 'long',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <button onClick={() => setDetalle(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>
                  ✕
                </button>
              </div>

              {(() => {
                const declared  = typeof detalle.declaredJson === 'string' ? JSON.parse(detalle.declaredJson) : detalle.declaredJson;
                const system    = typeof detalle.systemJson   === 'string' ? JSON.parse(detalle.systemJson)   : detalle.systemJson;
                const puedeVer  = puedeVerDiferencia(detalle, role);
                const minutos   = minutosRestantes(detalle);
                const efDec     = Number(declared?.efectivo || 0);
                const efSis     = Number(system?.caja || 0);
                const diferencia = efDec - efSis;
                const dens      = declared?.denominaciones || {};

                return (
                  <>
                    {/* Declarado */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Declarado por contador
                      </p>
                      {DENOMINACIONES.filter(d => (dens[`den_${d}`] || 0) > 0).map(d => (
                        <div key={d} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>${d} × {dens[`den_${d}`]}</span>
                          <span style={{ fontSize: 11, color: '#f1f5f9', fontWeight: 600 }}>
                            {fmt(d * dens[`den_${d}`])}
                          </span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8,
                        display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Total efectivo</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color }}>{fmt(efDec)}</span>
                      </div>
                    </div>

                    {/* Sistema */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Sistema registra
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Efectivo en caja</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(efSis)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Bancos</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(Number(system?.bancos || 0))}</span>
                      </div>
                    </div>

                    {/* Diferencia */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12,
                      border: `1px solid ${puedeVer ? (diferencia === 0 ? '#10b981' : '#f59e0b') : '#334155'}` }}>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Diferencia
                      </p>
                      {puedeVer ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Declarado − Sistema</span>
                          <span style={{ fontSize: 24, fontWeight: 800,
                            color: diferencia === 0 ? '#10b981' : diferencia > 0 ? '#3b82f6' : '#f87171' }}>
                            {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                          </span>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                          <p style={{ fontSize: 13, color: '#f59e0b', margin: '0 0 4px' }}>
                            🔒 Diferencia visible en {minutos} minuto{minutos !== 1 ? 's' : ''}
                          </p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                            Los directores y administradores la ven de inmediato
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notas */}
                    {detalle.notes && (
                      <div style={{ background: '#0f172a', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>Notas</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{detalle.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
