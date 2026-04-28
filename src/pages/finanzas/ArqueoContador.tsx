import type { Dispatch, SetStateAction, CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useERPStore } from '../../store/erp.store';
import { fmt } from '../../lib/api';

type Denoms = Record<string, number>;

const DENOMINACIONES_MXN = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];
const DENOMINACIONES_USD = [100, 50, 20, 10, 5, 1];

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function totalDenominaciones(values: Denoms, denoms: number[]) {
  return denoms.reduce((total, denom) => total + denom * n(values[String(denom)]), 0);
}

export default function ArqueoContadorPage() {
  const { activeCompany, user } = useERPStore();
  const color = activeCompany?.color || '#3b82f6';

  const [mxn, setMxn] = useState<Denoms>({});
  const [usd, setUsd] = useState<Denoms>({});
  const [tc, setTc] = useState('17.00');
  const [declarado, setDeclarado] = useState({
    banorte: '',
    banregio: '',
    mercadoPago: '',
    cheques: '',
    vales: '',
    transferenciasPendientes: '',
    notas: '',
  });
  const [sistema, setSistema] = useState({
    efectivoMxn: '0',
    efectivoUsd: '0',
    banorte: '0',
    banregio: '0',
    mercadoPago: '0',
    cheques: '0',
    vales: '0',
    transferenciasPendientes: '0',
  });
  const [enviadoAt, setEnviadoAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const totalMxnFisico = useMemo(() => totalDenominaciones(mxn, DENOMINACIONES_MXN), [mxn]);
  const totalUsdFisico = useMemo(() => totalDenominaciones(usd, DENOMINACIONES_USD), [usd]);
  const totalUsdMxn = totalUsdFisico * n(tc);

  const totalDeclarado = totalMxnFisico + totalUsdMxn + n(declarado.banorte) + n(declarado.banregio) + n(declarado.mercadoPago) + n(declarado.cheques) + n(declarado.vales) + n(declarado.transferenciasPendientes);
  const totalSistema = n(sistema.efectivoMxn) + n(sistema.efectivoUsd) * n(tc) + n(sistema.banorte) + n(sistema.banregio) + n(sistema.mercadoPago) + n(sistema.cheques) + n(sistema.vales) + n(sistema.transferenciasPendientes);

  const diferencia = totalDeclarado - totalSistema;
  const diferenciaVisible = enviadoAt !== null && now - enviadoAt >= 5 * 60 * 1000;
  const segundosRestantes = enviadoAt ? Math.max(0, Math.ceil((5 * 60 * 1000 - (now - enviadoAt)) / 1000)) : 0;
  const estatusTexto = diferencia === 0 ? 'CUADRADO' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
  const estatusColor = diferencia === 0 ? '#10b981' : diferencia > 0 ? '#f59e0b' : '#f87171';

  const setDenom = (setter: Dispatch<SetStateAction<Denoms>>, denom: number, value: string) => {
    setter((prev) => ({ ...prev, [String(denom)]: n(value) }));
  };

  const enviar = async () => {
  if (!activeCompany?.companyId) {
    alert('No hay empresa activa');
    return;
  }

  try {
    const payload = {
      declared: {
        efectivoMxn: totalMxnFisico,
        efectivoUsd: totalUsdFisico,
        tipoCambio: Number(tc),
        banorte: Number(declarado.banorte || 0),
        banregio: Number(declarado.banregio || 0),
        mercadoPago: Number(declarado.mercadoPago || 0),
        cheques: Number(declarado.cheques || 0),
        vales: Number(declarado.vales || 0),
        transferenciasPendientes: Number(declarado.transferenciasPendientes || 0),
      },
      system: {
        efectivoMxn: Number(sistema.efectivoMxn),
        efectivoUsd: Number(sistema.efectivoUsd),
        banorte: Number(sistema.banorte),
        banregio: Number(sistema.banregio),
        mercadoPago: Number(sistema.mercadoPago),
        cheques: Number(sistema.cheques),
        vales: Number(sistema.vales),
        transferenciasPendientes: Number(sistema.transferenciasPendientes),
      },
      summary: {
        totalDeclarado,
        totalSistema,
        diferencia,
      },
      notes: declarado.notas || null,
    };

    const res = await api.post(
      `/companies/${activeCompany.companyId}/arqueo`,
      payload
    );

    console.log('FOLIO:', res.data?.folio);

    setEnviadoAt(Date.now());
    setNow(Date.now());

    const interval = setInterval(() => setNow(Date.now()), 1000);
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);

  } catch (err) {
    console.error(err);
    alert('Error al guardar arqueo');
  }
};

  return (
    <AppLayout>
      <div style={{ maxWidth: 1240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Arqueo del Contador</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Declaración del contador contra realidad del sistema.
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
            <div>Empresa: {activeCompany?.companyName || activeCompany?.companyCode || '—'}</div>
            <div>Usuario: {user?.name || user?.username || '—'}</div>
          </div>
        </div>

        {enviadoAt && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: '1px solid #10b98166', background: 'rgba(16,185,129,.12)', color: '#34d399', fontSize: 13 }}>
            Arqueo enviado. {diferenciaVisible ? 'La diferencia y el estatus ya están disponibles.' : `Diferencia y estatus bloqueados: ${segundosRestantes}s restantes.`}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <section className="card" style={{ padding: 16 }}>
            <h3 style={sectionTitle}>1. Declaración del contador</h3>
            <p style={sectionHelp}>Lo que el contador declara tener físicamente o bajo su control.</p>

            <h4 style={subTitle}>Efectivo MXN</h4>
            <DenomGrid denoms={DENOMINACIONES_MXN} values={mxn} onChange={(denom, value) => setDenom(setMxn, denom, value)} />

            <h4 style={subTitle}>Efectivo USD</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, alignItems: 'end' }}>
              <DenomGrid denoms={DENOMINACIONES_USD} values={usd} onChange={(denom, value) => setDenom(setUsd, denom, value)} compact />
              <Field label="TC" value={tc} onChange={setTc} />
            </div>

            <h4 style={subTitle}>Bancos / plataformas / otros</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <Field label="Banorte" value={declarado.banorte} onChange={(v) => setDeclarado((s) => ({ ...s, banorte: v }))} />
              <Field label="Banregio" value={declarado.banregio} onChange={(v) => setDeclarado((s) => ({ ...s, banregio: v }))} />
              <Field label="Mercado Pago" value={declarado.mercadoPago} onChange={(v) => setDeclarado((s) => ({ ...s, mercadoPago: v }))} />
              <Field label="Cheques" value={declarado.cheques} onChange={(v) => setDeclarado((s) => ({ ...s, cheques: v }))} />
              <Field label="Vales / comprobantes" value={declarado.vales} onChange={(v) => setDeclarado((s) => ({ ...s, vales: v }))} />
              <Field label="Transferencias pendientes" value={declarado.transferenciasPendientes} onChange={(v) => setDeclarado((s) => ({ ...s, transferenciasPendientes: v }))} />
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Notas del contador</label>
              <textarea className="input-base" value={declarado.notas} onChange={(e) => setDeclarado((s) => ({ ...s, notas: e.target.value }))} style={{ minHeight: 68, fontSize: 13 }} />
            </div>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <h3 style={sectionTitle}>2. Realidad del sistema</h3>
            <p style={sectionHelp}>Temporalmente editable para probar la lógica. Después se alimentará del núcleo financiero.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <Field label="Sistema: efectivo MXN" value={sistema.efectivoMxn} onChange={(v) => setSistema((s) => ({ ...s, efectivoMxn: v }))} />
              <Field label="Sistema: efectivo USD" value={sistema.efectivoUsd} onChange={(v) => setSistema((s) => ({ ...s, efectivoUsd: v }))} />
              <Field label="Sistema: Banorte" value={sistema.banorte} onChange={(v) => setSistema((s) => ({ ...s, banorte: v }))} />
              <Field label="Sistema: Banregio" value={sistema.banregio} onChange={(v) => setSistema((s) => ({ ...s, banregio: v }))} />
              <Field label="Sistema: Mercado Pago" value={sistema.mercadoPago} onChange={(v) => setSistema((s) => ({ ...s, mercadoPago: v }))} />
              <Field label="Sistema: cheques" value={sistema.cheques} onChange={(v) => setSistema((s) => ({ ...s, cheques: v }))} />
              <Field label="Sistema: vales" value={sistema.vales} onChange={(v) => setSistema((s) => ({ ...s, vales: v }))} />
              <Field label="Sistema: transferencias pendientes" value={sistema.transferenciasPendientes} onChange={(v) => setSistema((s) => ({ ...s, transferenciasPendientes: v }))} />
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 style={sectionTitle}>3. Comparativo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                <Metric title="Declarado" value={fmt(totalDeclarado)} color={color} />
                <Metric title="Sistema" value={fmt(totalSistema)} />
                <Metric title="Diferencia" value={diferenciaVisible ? fmt(diferencia) : 'Bloqueada'} color={diferenciaVisible ? estatusColor : '#64748b'} />
              </div>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                  Estatus: <strong style={{ color: diferenciaVisible ? estatusColor : '#64748b' }}>
                    {diferenciaVisible ? estatusTexto : 'BLOQUEADO'}
                  </strong>
                </p>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn-primary" onClick={enviar} style={{ background: color, fontSize: 13, padding: '10px 18px' }}>
            Enviar arqueo
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function DenomGrid({ denoms, values, onChange, compact = false }: { denoms: number[]; values: Denoms; onChange: (denom: number, value: string) => void; compact?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: 8 }}>
      {denoms.map((denom) => (
        <label key={denom}>
          <span style={labelStyle}>{denom >= 1 ? `$${denom}` : '¢50'}</span>
          <input className="input-base" type="number" min="0" value={values[String(denom)] || ''} onChange={(e) => onChange(denom, e.target.value)} style={{ fontSize: 12 }} placeholder="0" />
        </label>
      ))}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input className="input-base" type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontSize: 13 }} placeholder="0.00" />
    </label>
  );
}

function Metric({ title, value, color = '#f1f5f9' }: { title: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, margin: '0 0 4px' };
const sectionHelp: CSSProperties = { fontSize: 12, color: '#64748b', margin: '0 0 12px' };
const subTitle: CSSProperties = { fontSize: 12, fontWeight: 800, margin: '14px 0 8px', color: '#cbd5e1', textTransform: 'uppercase' };
const labelStyle: CSSProperties = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 };
