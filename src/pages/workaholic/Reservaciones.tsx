// ╔═══════════════════════════════════════════════════════════════╗
// ║  RESERVACIONES — Workaholic                                  ║
// ║  Vista calendario semanal + mensual + lista                  ║
// ║  Crear, editar, cancelar directamente desde el calendario    ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

type Vista = 'semana' | 'mes' | 'lista';

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDIENTE:  { label: 'Pendiente',  color: '#f59e0b' },
  CONFIRMADA: { label: 'Confirmada', color: '#3b82f6' },
  EN_CURSO:   { label: 'En curso',   color: '#8b5cf6' },
  COMPLETADA: { label: 'Completada', color: '#10b981' },
  CANCELADA:  { label: 'Cancelada',  color: '#f87171' },
};

const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2,'0')}:00`); // 07:00 – 21:00

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  return d;
}
function fmtISO(date: Date) {
  return date.toISOString().slice(0, 10);
}
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function ReservacionesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [vista,       setVista]       = useState<Vista>('semana');
  const [hoy]                         = useState(new Date());
  const [semanaBase,  setSemanaBase]  = useState(() => startOfWeek(new Date()));
  const [mesBase,     setMesBase]     = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [filtroSp,    setFiltroSp]    = useState('');
  const [modal,       setModal]       = useState<any>(null); // reserva seleccionada o nueva
  const [showForm,    setShowForm]    = useState(false);
  const [form, setForm] = useState({
    spaceId: '', membershipId: '', clientName: '', clientEmail: '',
    clientPhone: '', date: fmtISO(new Date()), startTime: '09:00',
    endTime: '10:00', paymentMethod: 'EFECTIVO', notes: '', fromMembership: false,
  });

  // Calcular rango de fechas a consultar
  const dateRange = useMemo(() => {
    if (vista === 'semana') {
      return { from: fmtISO(semanaBase), to: fmtISO(addDays(semanaBase, 6)) };
    }
    const y = mesBase.getFullYear(), m = mesBase.getMonth();
    return {
      from: fmtISO(new Date(y, m, 1)),
      to:   fmtISO(new Date(y, m + 1, 0)),
    };
  }, [vista, semanaBase, mesBase]);

  // ── Queries ────────────────────────────────────────────────────
  const { data: spaces = [] } = useQuery({
    queryKey: ['wk-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['wk-memberships-activas', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['wk-reservas', cid, dateRange],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/reservations?from=${dateRange.from}&to=${dateRange.to}`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 30000,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const createM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/reservations`, {
      ...form,
      hours: calcHours(form.startTime, form.endTime),
    }),
    onSuccess: () => {
      setShowForm(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['wk-reservas', cid] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error al crear reservación'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/companies/${cid}/workaholic/reservations/${id}`, data),
    onSuccess: () => {
      setModal(null);
      qc.invalidateQueries({ queryKey: ['wk-reservas', cid] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────
  const calcHours = (start: string, end: string) => {
    const diff = (timeToMinutes(end) - timeToMinutes(start)) / 60;
    return Math.max(0.5, diff);
  };

  const resetForm = () => setForm({
    spaceId: '', membershipId: '', clientName: '', clientEmail: '',
    clientPhone: '', date: fmtISO(new Date()), startTime: '09:00',
    endTime: '10:00', paymentMethod: 'EFECTIVO', notes: '', fromMembership: false,
  });

  const filteredSpaces = filtroSp
    ? (spaces as any[]).filter((s: any) => s.id === filtroSp)
    : (spaces as any[]);

  const reservasPorDiaEspacio = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    for (const r of reservas as any[]) {
      const fecha = r.date?.slice(0, 10) || '';
      if (!map[fecha]) map[fecha] = {};
      if (!map[fecha][r.spaceId]) map[fecha][r.spaceId] = [];
      map[fecha][r.spaceId].push(r);
    }
    return map;
  }, [reservas]);

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i));
  const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // ── Colores por espacio ────────────────────────────────────────
  const SPACE_COLORS = ['#6366f1','#10b981','#f59e0b','#f87171','#06b6d4','#8b5cf6','#ec4899'];
  const spaceColor = (spaceId: string) => {
    const idx = (spaces as any[]).findIndex((s: any) => s.id === spaceId);
    return SPACE_COLORS[idx % SPACE_COLORS.length] || color;
  };

  // ── Reserva card pequeña ───────────────────────────────────────
  const ReservaCard = ({ r, compact = false }: any) => {
    const st = STATUS_CFG[r.status] || STATUS_CFG['CONFIRMADA'];
    const sc = spaceColor(r.spaceId);
    return (
      <div onClick={() => setModal(r)}
        style={{ background: sc + '20', borderLeft: `3px solid ${sc}`, borderRadius: 5,
          padding: compact ? '2px 5px' : '5px 8px', cursor: 'pointer',
          marginBottom: 2, overflow: 'hidden' }}>
        {!compact && (
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 1px' }}>
            {r.startTime} – {r.endTime}
          </p>
        )}
        <p style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: sc,
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.clientName}
        </p>
        {!compact && (
          <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>
            {r.space?.name || '—'} · <span style={{ color: st.color }}>{st.label}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Reservaciones</h1>
            {/* Nav flechas */}
            <button onClick={() => vista === 'semana'
              ? setSemanaBase(b => addDays(b, -7))
              : setMesBase(b => new Date(b.getFullYear(), b.getMonth() - 1, 1))}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #334155',
                background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>◀</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', minWidth: 140, textAlign: 'center' }}>
              {vista === 'semana'
                ? `${fmtDate(semanaBase)} – ${fmtDate(addDays(semanaBase, 6))}`
                : mesBase.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()
              }
            </span>
            <button onClick={() => vista === 'semana'
              ? setSemanaBase(b => addDays(b, 7))
              : setMesBase(b => new Date(b.getFullYear(), b.getMonth() + 1, 1))}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #334155',
                background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>▶</button>
            <button onClick={() => {
              setSemanaBase(startOfWeek(new Date()));
              setMesBase(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            }}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}`,
                background: 'none', color, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Hoy
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Filtro espacio */}
            <select value={filtroSp} onChange={e => setFiltroSp(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #334155',
                background: '#0f172a', color: '#f1f5f9', fontSize: 12 }}>
              <option value="">Todos los espacios</option>
              {(spaces as any[]).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {/* Selector vista */}
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: 7, padding: 2, gap: 2 }}>
              {(['semana', 'mes', 'lista'] as Vista[]).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  style={{ padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: vista === v ? color : 'transparent',
                    color: vista === v ? '#fff' : '#64748b' }}>
                  {v === 'semana' ? '7D' : v === 'mes' ? 'Mes' : 'Lista'}
                </button>
              ))}
            </div>
            <button onClick={() => { resetForm(); setShowForm(true); }}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none',
                background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              + Nueva reservación
            </button>
          </div>
        </div>

        {/* ── Leyenda espacios ── */}
        {(filteredSpaces as any[]).length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {(filteredSpaces as any[]).map((s: any) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: spaceColor(s.id) }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{s.name}</span>
                {s.capacity && <span style={{ fontSize: 10, color: '#334155' }}>({s.capacity}p)</span>}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* VISTA SEMANAL                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {vista === 'semana' && (
          <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', borderRadius: 10,
            border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1e293b' }}>
                  <th style={{ width: 56, padding: '8px 4px', borderBottom: '1px solid #334155',
                    fontSize: 10, color: '#475569', textAlign: 'center' }}>HORA</th>
                  {diasSemana.map((dia, i) => {
                    const isToday = fmtISO(dia) === fmtISO(hoy);
                    return (
                      <th key={i} style={{ padding: '8px 4px', borderBottom: '1px solid #334155',
                        borderLeft: '1px solid #334155', fontSize: 11, textAlign: 'center',
                        background: isToday ? color + '18' : 'transparent' }}>
                        <div style={{ fontWeight: 700, color: isToday ? color : '#94a3b8' }}>
                          {DIAS_LABELS[i]}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800,
                          color: isToday ? color : '#f1f5f9' }}>
                          {dia.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HORAS.map(hora => (
                  <tr key={hora} style={{ height: 52 }}>
                    <td style={{ fontSize: 10, color: '#334155', textAlign: 'center',
                      verticalAlign: 'top', paddingTop: 4, borderBottom: '1px solid #1e293b' }}>
                      {hora}
                    </td>
                    {diasSemana.map((dia, di) => {
                      const fechaStr = fmtISO(dia);
                      const isToday  = fechaStr === fmtISO(hoy);
                      const reservasAqui = (reservas as any[]).filter(r => {
                        if (r.date?.slice(0, 10) !== fechaStr) return false;
                        if (filtroSp && r.spaceId !== filtroSp) return false;
                        const start = timeToMinutes(r.startTime);
                        const horaMins = timeToMinutes(hora);
                        return start >= horaMins && start < horaMins + 60;
                      });
                      return (
                        <td key={di}
                          onClick={() => {
                            resetForm();
                            setForm(f => ({ ...f, date: fechaStr, startTime: hora,
                              endTime: `${String(Number(hora.split(':')[0]) + 1).padStart(2,'0')}:00` }));
                            setShowForm(true);
                          }}
                          style={{ verticalAlign: 'top', padding: '2px 3px', cursor: 'pointer',
                            borderLeft: '1px solid #1e293b', borderBottom: '1px solid #1e293b',
                            background: isToday ? color + '08' : 'transparent',
                            transition: 'background 0.1s' }}>
                          {reservasAqui.map((r: any) => (
                            <div key={r.id} onClick={e => { e.stopPropagation(); setModal(r); }}>
                              <ReservaCard r={r} compact={false} />
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* VISTA MENSUAL                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {vista === 'mes' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Cabecera días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 1 }}>
              {DIAS_LABELS.map(d => (
                <div key={d} style={{ padding: '6px 0', textAlign: 'center', fontSize: 11,
                  fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Grid días */}
            {(() => {
              const y = mesBase.getFullYear(), m = mesBase.getMonth();
              const firstDay = new Date(y, m, 1);
              const lastDay  = new Date(y, m + 1, 0);
              const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
              const totalCells  = startOffset + lastDay.getDate();
              const rows        = Math.ceil(totalCells / 7);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                  {Array.from({ length: rows * 7 }, (_, i) => {
                    const dayNum = i - startOffset + 1;
                    if (dayNum < 1 || dayNum > lastDay.getDate()) {
                      return <div key={i} style={{ background: '#0a0f1a', minHeight: 90 }} />;
                    }
                    const fecha    = new Date(y, m, dayNum);
                    const fechaStr = fmtISO(fecha);
                    const isToday  = fechaStr === fmtISO(hoy);
                    const reservasHoy = (reservas as any[]).filter(r =>
                      r.date?.slice(0, 10) === fechaStr && (!filtroSp || r.spaceId === filtroSp)
                    );
                    return (
                      <div key={i}
                        onClick={() => { resetForm(); setForm(f => ({ ...f, date: fechaStr })); setShowForm(true); }}
                        style={{ background: isToday ? color + '15' : '#0f172a',
                          border: `1px solid ${isToday ? color + '44' : '#1e293b'}`,
                          minHeight: 90, padding: 4, cursor: 'pointer', borderRadius: 4,
                          transition: 'background 0.1s' }}>
                        <p style={{ fontSize: 13, fontWeight: isToday ? 800 : 500,
                          color: isToday ? color : '#64748b', margin: '0 0 3px', textAlign: 'right' }}>
                          {dayNum}
                        </p>
                        {reservasHoy.slice(0, 3).map((r: any) => (
                          <div key={r.id} onClick={e => { e.stopPropagation(); setModal(r); }}>
                            <ReservaCard r={r} compact={true} />
                          </div>
                        ))}
                        {reservasHoy.length > 3 && (
                          <p style={{ fontSize: 9, color: '#475569', margin: '2px 0 0', textAlign: 'center' }}>
                            +{reservasHoy.length - 3} más
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* VISTA LISTA                                               */}
        {/* ══════════════════════════════════════════════════════════ */}
        {vista === 'lista' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Hora</th><th>Espacio</th>
                    <th>Cliente</th><th>Membresía</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Cargando…</td></tr>
                  )}
                  {!isLoading && (reservas as any[]).length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      Sin reservaciones en este período
                    </td></tr>
                  )}
                  {(reservas as any[])
                    .filter(r => !filtroSp || r.spaceId === filtroSp)
                    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                    .map((r: any) => {
                      const st = STATUS_CFG[r.status] || STATUS_CFG['CONFIRMADA'];
                      const sc = spaceColor(r.spaceId);
                      return (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setModal(r)}>
                          <td style={{ fontSize: 12 }}>{fmtDate(r.date)}</td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {r.startTime} – {r.endTime}
                            <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>
                              ({Number(r.hours).toFixed(1)}h)
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: sc }} />
                              <span style={{ fontSize: 12 }}>{r.space?.name}</span>
                            </div>
                          </td>
                          <td>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{r.clientName}</p>
                            {r.clientCompany && (
                              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{r.clientCompany}</p>
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: r.fromMembership ? '#10b981' : '#475569' }}>
                            {r.fromMembership ? '✓ Membresía' : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color }}>
                            {r.fromMembership ? <span style={{ color: '#10b981' }}>Incluido</span> : fmt(r.total)}
                          </td>
                          <td>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99,
                              fontWeight: 600, background: st.color + '22', color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                          <td>
                            {r.status === 'CONFIRMADA' && (
                              <button onClick={e => { e.stopPropagation(); updateM.mutate({ id: r.id, data: { status: 'EN_CURSO' } }); }}
                                style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid #8b5cf6`,
                                  background: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: 10 }}>
                                Iniciar
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
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — Detalle / acciones de reservación                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28,
            width: 460, border: `1px solid ${spaceColor(modal.spaceId)}44` }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: spaceColor(modal.spaceId) }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                    {modal.space?.name}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                  {fmtDate(modal.date)} · {modal.startTime} – {modal.endTime} ({Number(modal.hours).toFixed(1)}h)
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {modal.fromMembership
                  ? <p style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: 0 }}>✓ Incluido en membresía</p>
                  : <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0 }}>{fmt(modal.total)}</p>
                }
                <span style={{ fontSize: 11, fontWeight: 600,
                  color: (STATUS_CFG[modal.status] || STATUS_CFG['CONFIRMADA']).color }}>
                  {(STATUS_CFG[modal.status] || STATUS_CFG['CONFIRMADA']).label}
                </span>
              </div>
            </div>

            {/* Datos cliente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                ['Cliente',  modal.clientName],
                ['Empresa',  modal.clientCompany],
                ['Email',    modal.clientEmail],
                ['Teléfono', modal.clientPhone],
                ...(modal.notes ? [['Notas', modal.notes]] : []),
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ gridColumn: k === 'Notas' ? 'span 2' : 'auto' }}>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', textTransform: 'uppercase' }}>{k}</p>
                  <p style={{ fontSize: 13, color: '#f1f5f9', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {modal.status === 'PENDIENTE' && (
                <button onClick={() => updateM.mutate({ id: modal.id, data: { status: 'CONFIRMADA' } })}
                  style={{ padding: '6px 12px', borderRadius: 7, border: 'none',
                    background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ✓ Confirmar
                </button>
              )}
              {modal.status === 'CONFIRMADA' && (
                <button onClick={() => updateM.mutate({ id: modal.id, data: { status: 'EN_CURSO' } })}
                  style={{ padding: '6px 12px', borderRadius: 7, border: 'none',
                    background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ▶ Iniciar
                </button>
              )}
              {modal.status === 'EN_CURSO' && (
                <button onClick={() => updateM.mutate({ id: modal.id, data: { status: 'COMPLETADA' } })}
                  style={{ padding: '6px 12px', borderRadius: 7, border: 'none',
                    background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ✅ Completar
                </button>
              )}
              {['PENDIENTE','CONFIRMADA'].includes(modal.status) && (
                <button onClick={() => {
                  if (window.confirm('¿Cancelar esta reservación?'))
                    updateM.mutate({ id: modal.id, data: { status: 'CANCELADA' } });
                }}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #f87171',
                    background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                  ✕ Cancelar
                </button>
              )}
            </div>

            <button onClick={() => setModal(null)}
              style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #334155',
                background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — Nueva reservación                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28,
            width: 520, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${color}44` }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color }}>Nueva reservación</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>
              Al hacer clic en un espacio del calendario se pre-rellena la fecha y hora.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {/* Espacio */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Espacio *</label>
                <select className="input-base" style={{ fontSize: 13 }}
                  value={form.spaceId} onChange={e => setForm(f => ({ ...f, spaceId: e.target.value }))}>
                  <option value="">— Seleccionar espacio —</option>
                  {(spaces as any[]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type}) — cap. {s.capacity}</option>
                  ))}
                </select>
              </div>
              {/* Fecha y horas */}
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize: 13 }}
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Inicio</label>
                  <input type="time" className="input-base" style={{ fontSize: 13 }}
                    value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Fin</label>
                  <input type="time" className="input-base" style={{ fontSize: 13 }}
                    value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              {/* Cliente */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Nombre del cliente *</label>
                <input className="input-base" style={{ fontSize: 13 }} placeholder="Nombre completo"
                  value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Empresa (opcional)</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="Empresa"
                  value={(form as any).clientCompany || ''} onChange={e => setForm(f => ({ ...f, clientCompany: e.target.value } as any))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="55 1234 5678"
                  value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} />
              </div>
              {/* Membresía */}
              {(memberships as any[]).length > 0 && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>
                    Descontar de membresía (opcional)
                  </label>
                  <select className="input-base" style={{ fontSize: 12 }}
                    value={form.membershipId}
                    onChange={e => setForm(f => ({ ...f, membershipId: e.target.value, fromMembership: !!e.target.value }))}>
                    <option value="">— Sin membresía / cobro directo —</option>
                    {(memberships as any[]).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.clientName} — {Number(m.remainingHours || 0).toFixed(1)}h disponibles
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Método pago (solo si no es membresía) */}
              {!form.fromMembership && (
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Método de pago</label>
                  <select className="input-base" style={{ fontSize: 12 }}
                    value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO'].map(m => (
                      <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Duración calculada */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ background: color + '18', border: `1px solid ${color}44`,
                  borderRadius: 8, padding: '8px 12px', width: '100%' }}>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>Duración calculada</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0 }}>
                    {calcHours(form.startTime, form.endTime).toFixed(1)} horas
                  </p>
                </div>
              </div>
              {/* Notas */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Notas</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="Observaciones…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155',
                  background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => createM.mutate()}
                disabled={createM.isPending || !form.spaceId || !form.clientName}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                  background: form.spaceId && form.clientName ? color : '#334155',
                  color: '#fff', cursor: form.spaceId && form.clientName ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700 }}>
                {createM.isPending ? 'Guardando…' : '📅 Crear reservación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
