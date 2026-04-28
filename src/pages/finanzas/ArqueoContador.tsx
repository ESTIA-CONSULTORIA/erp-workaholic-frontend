import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

type Denoms = Record<string, number>;
type ArqueoRow = { id: string; folio: string; createdAt: string; status: string; summaryJson?: any };

const MXN = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];
const USD = [100, 50, 20, 10, 5, 1];

function n(v: unknown) { const x = Number(v || 0); return Number.isFinite(x) ? x : 0; }
function sumDenoms(values: Denoms, denoms: number[]) { return denoms.reduce((t, d) => t + d * n(values[String(d)]), 0); }

export default function ArqueoContadorPage() {
  const { activeCompany, user } = useERPStore();
  const color = activeCompany?.color || '#3b82f6';
  const companyId = activeCompany?.companyId;

  const [mxn, setMxn] = useState<Denoms>({});
  const [usd, setUsd] = useState<Denoms>({});
  const [tc, setTc] = useState('17.00');
  const [declarado, setDeclarado] = useState({ banorte: '', banregio: '', mercadoPago: '', cheques: '', vales: '', transferenciasPendientes: '', notas: '' });
  const sistema = { efectivoMxn: 0, efectivoUsd: 0, banorte: 0, banregio: 0, mercadoPago: 0, cheques: 0, vales: 0, transferenciasPendientes: 0 };

  const [enviadoAt, setEnviadoAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [folio, setFolio] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<ArqueoRow[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const totalMxnFisico = useMemo(() => sumDenoms(mxn, MXN), [mxn]);
  const totalUsdFisico = useMemo(() => sumDenoms(usd, USD), [usd]);
  const totalUsdMxn = totalUsdFisico * n(tc);
  const totalDeclarado = totalMxnFisico + totalUsdMxn + n(declarado.banorte) + n(declarado.banregio) + n(declarado.mercadoPago) + n(declarado.cheques) + n(declarado.vales) + n(declarado.transferenciasPendientes);
  const totalSistema = n(sistema.efectivoMxn) + n(sistema.efectivoUsd) * n(tc) + n(sistema.banorte) + n(sistema.banregio) + n(sistema.mercadoPago) + n(sistema.cheques) + n(sistema.vales) + n(sistema.transferenciasPendientes);
  const diferencia = totalDeclarado - totalSistema;
  const diferenciaVisible = enviadoAt !== null && now - enviadoAt >= 5 * 60 * 1000;
  const segundosRestantes = enviadoAt ? Math.max(0, Math.ceil((5 * 60 * 1000 - (now - enviadoAt)) / 1000)) : 0;
  const estatusTexto = diferencia === 0 ? 'CUADRADO' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
  const estatusColor = diferencia === 0 ? '#10b981' : diferencia > 0 ? '#f59e0b' : '#f87171';

  const loadHistorial = async () => {
    if (!companyId) return;
    try { setLoadingHistorial(true); const res = await api.get(`/companies/${companyId}/arqueo`); setHistorial(Array.isArray(res.data) ? res.data : []); }
    catch (err) { console.error(err); }
    finally { setLoadingHistorial(false); }
  };

  useEffect(() => { loadHistorial(); }, [companyId]);

  const setDenom = (setter: React.Dispatch<React.SetStateAction<Denoms>>, denom: number, value: string) => setter((p) => ({ ...p, [String(denom)]: n(value) }));

  const enviar = async () => {
    if (!companyId) { setError('No hay empresa activa.'); return; }
    setSaving(true); setError(null);
    const payload = {
      declared: { efectivoMxnDenominaciones: mxn, efectivoUsdDenominaciones: usd, tipoCambio: n(tc), efectivoMxnTotal: totalMxnFisico, efectivoUsdTotal: totalUsdFisico, efectivoUsdMxn: totalUsdMxn, banorte: n(declarado.banorte), banregio: n(declarado.banregio), mercadoPago: n(declarado.mercadoPago), cheques: n(declarado.cheques), vales: n(declarado.vales), transferenciasPendientes: n(declarado.transferenciasPendientes), totalDeclarado },
      system: { ...sistema, efectivoUsdMxn: n(sistema.efectivoUsd) * n(tc), totalSistema },
      summary: { totalDeclarado, totalSistema, diferencia, estatus: estatusTexto, diferenciaVisibleAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
      notes: declarado.notas || null,
    };
    try {
      const res = await api.post(`/companies/${companyId}/arqueo`, payload);
      setFolio(res.data?.folio || 'ARQ-SIN-FOLIO'); setEnviadoAt(Date.now()); setNow(Date.now());
      const interval = window.setInterval(() => setNow(Date.now()), 1000);
      window.setTimeout(() => window.clearInterval(interval), 5 * 60 * 1000 + 1500);
      await loadHistorial();
    } catch (err: any) { console.error(err); setError(err.response?.data?.message || err.message || 'Error al guardar el arqueo.'); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div><h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Arqueo del Contador</h1><p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Declaración del contador contra realidad del sistema.</p></div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}><div>Empresa: {activeCompany?.companyName || activeCompany?.companyCode || '—'}</div><div>Usuario: {user?.name || user?.username || '—'}</div></div>
        </div>
        {error && <Alert color="#f87171" text={error} />}
        {enviadoAt && <Alert color="#34d399" text={`Arqueo guardado correctamente${folio ? ` · Folio ${folio}` : ''}. ${diferenciaVisible ? 'La diferencia y el estatus ya están disponibles.' : `Diferencia y estatus bloqueados: ${segundosRestantes}s restantes.`}`} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <section className="card" style={{ padding: 16 }}>
            <h3 style={sectionTitle}>1. Declaración del contador</h3><p style={sectionHelp}>Lo que el contador declara tener físicamente o bajo su control.</p>
            <h4 style={subTitle}>Efectivo MXN</h4><DenomGrid denoms={MXN} values={mxn} onChange={(d, v) => setDenom(setMxn, d, v)} />
            <h4 style={subTitle}>Efectivo USD</h4><div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, alignItems: 'end' }}><DenomGrid denoms={USD} values={usd} onChange={(d, v) => setDenom(setUsd, d, v)} compact /><Field label="TC" value={tc} onChange={setTc} /></div>
            <h4 style={subTitle}>Bancos / plataformas / otros</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {(['banorte','banregio','mercadoPago','cheques','vales','transferenciasPendientes'] as const).map((k) => <Field key={k} label={labels[k]} value={declarado[k]} onChange={(v) => setDeclarado((s) => ({ ...s, [k]: v }))} />)}
            </div>
            <div style={{ marginTop: 10 }}><label style={labelStyle}>Notas del contador</label><textarea className="input-base" value={declarado.notas} onChange={(e) => setDeclarado((s) => ({ ...s, notas: e.target.value }))} style={{ minHeight: 68, fontSize: 13 }} /></div>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <h3 style={sectionTitle}>2. Realidad del sistema</h3><p style={sectionHelp}>Solo lectura. Estos datos deberán alimentarse del núcleo financiero.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <ReadOnlyField label="Sistema: efectivo MXN" value={fmt(sistema.efectivoMxn)} /><ReadOnlyField label="Sistema: efectivo USD" value={`${sistema.efectivoUsd} USD`} /><ReadOnlyField label="Sistema: Banorte" value={fmt(sistema.banorte)} /><ReadOnlyField label="Sistema: Banregio" value={fmt(sistema.banregio)} /><ReadOnlyField label="Sistema: Mercado Pago" value={fmt(sistema.mercadoPago)} /><ReadOnlyField label="Sistema: cheques" value={fmt(sistema.cheques)} /><ReadOnlyField label="Sistema: vales" value={fmt(sistema.vales)} /><ReadOnlyField label="Sistema: transferencias pendientes" value={fmt(sistema.transferenciasPendientes)} />
            </div>
            <div style={{ marginTop: 16 }}><h3 style={sectionTitle}>3. Comparativo</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}><Metric title="Declarado" value={fmt(totalDeclarado)} color={color} /><Metric title="Sistema" value={fmt(totalSistema)} /><Metric title="Diferencia" value={diferenciaVisible ? fmt(diferencia) : 'Bloqueada'} color={diferenciaVisible ? estatusColor : '#64748b'} /></div><div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' }}><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Estatus: <strong style={{ color: diferenciaVisible ? estatusColor : '#64748b' }}>{diferenciaVisible ? estatusTexto : 'BLOQUEADO'}</strong></p></div></div>
          </section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button className="btn-primary" disabled={saving} onClick={enviar} style={{ background: color, fontSize: 13, padding: '10px 18px', opacity: saving ? 0.65 : 1 }}>{saving ? 'Guardando...' : 'Enviar arqueo'}</button></div>

        <section className="card" style={{ padding: 16, marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div><h3 style={sectionTitle}>Histórico de arqueos</h3><p style={sectionHelp}>Últimos arqueos guardados.</p></div><button className="btn-secondary" onClick={loadHistorial} disabled={loadingHistorial}>{loadingHistorial ? 'Cargando...' : 'Actualizar'}</button></div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #334155' }}><th style={th}>Folio</th><th style={th}>Fecha</th><th style={th}>Estatus</th><th style={th}>Declarado</th><th style={th}>Sistema</th><th style={th}>Diferencia</th></tr></thead><tbody>{historial.length === 0 ? <tr><td colSpan={6} style={{ padding: 14, color: '#64748b', textAlign: 'center' }}>Sin arqueos registrados.</td></tr> : historial.map((r) => { const s = r.summaryJson || {}; return <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={td}>{r.folio}</td><td style={td}>{new Date(r.createdAt).toLocaleString('es-MX')}</td><td style={td}>{s.estatus || r.status || '—'}</td><td style={td}>{fmt(s.totalDeclarado || 0)}</td><td style={td}>{fmt(s.totalSistema || 0)}</td><td style={td}>{fmt(s.diferencia || 0)}</td></tr>; })}</tbody></table></div>
        </section>
      </div>
    </AppLayout>
  );
}

function Alert({ color, text }: { color: string; text: string }) { return <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: `1px solid ${color}66`, background: `${color}1f`, color, fontSize: 13 }}>{text}</div>; }
function DenomGrid({ denoms, values, onChange, compact = false }: { denoms: number[]; values: Denoms; onChange: (denom: number, value: string) => void; compact?: boolean }) { return <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: 8 }}>{denoms.map((denom) => <label key={denom}><span style={labelStyle}>{denom >= 1 ? `$${denom}` : '¢50'}</span><input className="input-base" type="number" min="0" value={values[String(denom)] || ''} onChange={(e) => onChange(denom, e.target.value)} style={{ fontSize: 12 }} placeholder="0" /></label>)}</div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label><span style={labelStyle}>{label}</span><input className="input-base" type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontSize: 13 }} placeholder="0.00" /></label>; }
function ReadOnlyField({ label, value }: { label: string; value: number | string }) { return <label><span style={labelStyle}>{label}</span><input className="input-base" value={value} disabled readOnly style={{ fontSize: 13, opacity: 0.75, cursor: 'not-allowed' }} /></label>; }
function Metric({ title, value, color = '#f1f5f9' }: { title: string; value: string; color?: string }) { return <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12 }}><p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b' }}>{title}</p><p style={{ margin: 0, fontSize: 16, fontWeight: 800, color }}>{value}</p></div>; }

const labels = { banorte: 'Banorte', banregio: 'Banregio', mercadoPago: 'Mercado Pago', cheques: 'Cheques', vales: 'Vales / comprobantes', transferenciasPendientes: 'Transferencias pendientes' };
const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, margin: '0 0 4px' };
const sectionHelp: CSSProperties = { fontSize: 12, color: '#64748b', margin: '0 0 12px' };
const subTitle: CSSProperties = { fontSize: 12, fontWeight: 800, margin: '14px 0 8px', color: '#cbd5e1', textTransform: 'uppercase' };
const labelStyle: CSSProperties = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 };
const th: CSSProperties = { padding: '8px 10px', fontWeight: 700 };
const td: CSSProperties = { padding: '9px 10px', color: '#cbd5e1' };
