import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import ImportCSV from '../../components/ImportCSV';
import { api, exportCSV, fmt, fmtDate } from '../../lib/api';
import { useERPStore } from '../../store/erp.store';

type Payable = {
  id: string;
  date: string;
  dueDate?: string | null;
  concept: string;
  currency?: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  notes?: string | null;
  supplier?: { id: string; name: string } | null;
  payments?: any[];
};

export default function CxPPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const qc = useQueryClient();

  const [busqueda, setBusqueda] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [status, setStatus] = useState('');

  const qcInner = useQueryClient();
  const cancelM = useMutation({
    mutationFn: ({ id, motivo }: { id:string; motivo:string }) =>
      api.put(`/companies/${cid}/cxp/${id}/cancel`, { motivo }),
    onSuccess: () => qcInner.invalidateQueries({ queryKey: ['cxp-gestion', cid] }),
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const { data: cxp = [], isLoading } = useQuery({
    queryKey: ['cxp', cid, activePeriod, status],
    queryFn: () =>
      api
        .get(`/companies/${cid}/cxp`, {
          params: {
            period: activePeriod,
            status: status || undefined,
          },
        })
        .then((r) => r.data),
    enabled: !!cid,
  });

  const rows = Array.isArray(cxp) ? (cxp as Payable[]) : [];

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((p) => {
      if (!q) return true;
      return (
        p.concept?.toLowerCase().includes(q) ||
        p.supplier?.name?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    });
  }, [rows, busqueda]);

  const totalPendiente = filtradas.reduce((t, p) => t + Number(p.balance || 0), 0);
  const totalOriginal = filtradas.reduce((t, p) => t + Number(p.originalAmount || 0), 0);
  const vencidas = filtradas.filter(
    (p) => p.status !== 'PAGADO' && p.dueDate && new Date(p.dueDate) < new Date()
  ).length;

  const handleExport = () => {
    exportCSV(
      'cxp',
      filtradas.map((p) => ({
        fecha: p.date,
        vencimiento: p.dueDate || '',
        proveedor: p.supplier?.name || '',
        concepto: p.concept || '',
        moneda: p.currency || 'MXN',
        original: Number(p.originalAmount || 0),
        pagado: Number(p.paidAmount || 0),
        saldo: Number(p.balance || 0),
        estatus: p.status || '',
        notas: p.notes || '',
      })),
      [
        { key: 'fecha', label: 'Fecha' },
        { key: 'vencimiento', label: 'Vencimiento' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'moneda', label: 'Moneda' },
        { key: 'original', label: 'Monto original' },
        { key: 'pagado', label: 'Pagado' },
        { key: 'saldo', label: 'Saldo' },
        { key: 'estatus', label: 'Estatus' },
        { key: 'notas', label: 'Notas' },
      ]
    );
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1180 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Cuentas por Pagar</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              {filtradas.length} registros · Pendiente:{' '}
              <span style={{ color, fontWeight: 700 }}>{fmt(totalPendiente)}</span>
              {' · '}Vencidas: <span style={{ color: vencidas ? '#f87171' : '#94a3b8' }}>{vencidas}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              style={buttonOutline(color)}
            >
              ⬆ Importar CSV
            </button>
            <button type="button" onClick={handleExport} style={buttonMuted}>
              ⬇ Exportar CSV
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 220px 1fr 1fr', gap: 10 }}>
            <input
              className="input-base"
              placeholder="Buscar proveedor, concepto, estatus o notas…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ fontSize: 13 }}
            />
            <select
              className="input-base"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">Todos los estatus</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGADO">Pagado</option>
            </select>
            <div style={metricBox}>
              <span>Total original</span>
              <strong>{fmt(totalOriginal)}</strong>
            </div>
            <div style={metricBox}>
              <span>Saldo pendiente</span>
              <strong style={{ color }}>{fmt(totalPendiente)}</strong>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-base" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vence</th>
                  <th>Proveedor</th>
                  <th>Concepto</th>
                  <th>Moneda</th>
                  <th style={{ textAlign: 'right' }}>Original</th>
                  <th style={{ textAlign: 'right' }}>Pagado</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                      Cargando…
                    </td>
                  </tr>
                )}
                {!isLoading && filtradas.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                      Sin cuentas por pagar
                    </td>
                  </tr>
                )}
                {filtradas.map((p) => {
                  const overdue = p.status !== 'PAGADO' && p.dueDate && new Date(p.dueDate) < new Date();
                  return (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: overdue ? '#f87171' : undefined }}>
                        {p.dueDate ? fmtDate(p.dueDate) : '—'}
                      </td>
                      <td>{p.supplier?.name || '—'}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.concept}
                      </td>
                      <td>{p.currency || 'MXN'}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(Number(p.originalAmount || 0))}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(Number(p.paidAmount || 0))}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color }}>
                        {fmt(Number(p.balance || 0))}
                      </td>
                      <td>
                        <span className={p.status === 'PAGADO' ? 'badge-green' : p.status === 'PARCIAL' ? 'badge-amber' : p.status === 'CANCELADA' ? 'badge-gray' : 'badge-red'}>
                          {p.status || 'PENDIENTE'}
                        </span>
                      </td>
                      <td>
                        {p.status !== 'CANCELADA' && p.status !== 'PAGADO' && (
                          <button
                            onClick={() => {
                              const motivo = window.prompt('Motivo de cancelación:');
                              if (motivo !== null) cancelM.mutate({ id: p.id, motivo });
                            }}
                            style={{ background:'none', border:'none', color:'#f87171',
                              cursor:'pointer', fontSize:12, whiteSpace:'nowrap' }}>
                            ✕ Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showImport && (
        <ImportCSV
          title="CxP"
          color={color}
          columns={[
            { key: 'fecha', label: 'Fecha', required: true, type: 'date' },
            { key: 'vencimiento', label: 'Vencimiento', type: 'date' },
            { key: 'proveedor', label: 'Proveedor', required: true },
            { key: 'concepto', label: 'Concepto', required: true },
            { key: 'monto', label: 'Monto', required: true, type: 'number' },
            { key: 'pagado', label: 'Pagado', type: 'number' },
            { key: 'moneda', label: 'Moneda' },
            { key: 'estatus', label: 'Estatus' },
            { key: 'factura', label: 'Factura' },
            { key: 'notas', label: 'Notas' },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/cxp`, { rows });
            qc.invalidateQueries({ queryKey: ['cxp', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}

const buttonMuted: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #334155',
  background: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
};

function buttonOutline(color: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${color}`,
    background: `${color}18`,
    color,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  };
}

const metricBox: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 10,
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontSize: 11,
  color: '#64748b',
};
