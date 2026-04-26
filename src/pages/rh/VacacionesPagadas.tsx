// Vista RH: Vacaciones pagadas que no han sido gozadas — control y alertas
import AppLayout from '../../components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

export default function VacacionesPagadasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const { data: vacaciones = [], isLoading } = useQuery({
    queryKey: ['vac-pagadas-sin-gozar', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/vacaciones-pagadas-sin-gozar`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  const gozarM = useMutation({
    mutationFn: (id: string) => api.put(`/companies/${cid}/rh/vacations/${id}/gozar-pagadas`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vac-pagadas-sin-gozar', cid] }),
  });

  const vencidas  = (vacaciones as any[]).filter((v:any) => v.vencida);
  const alertas   = (vacaciones as any[]).filter((v:any) => v.alerta && !v.vencida);
  const normales  = (vacaciones as any[]).filter((v:any) => !v.alerta && !v.vencida);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 4px' }}>
            Vacaciones Pagadas Sin Gozar
          </h1>
          <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
            Empleados que recibieron el pago de vacaciones pero aún no han tomado los días.
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total pendientes', value:(vacaciones as any[]).length, col:color },
            { label:'Con alerta (≤30 días)', value:alertas.length, col:'#f59e0b' },
            { label:'Vencidas', value:vencidas.length, col:'#f87171' },
          ].map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:9, padding:14,
              border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>{k.label}</p>
              <p style={{ fontSize:24, fontWeight:800, color:k.col, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Vencidas */}
        {vencidas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#f87171', margin:'0 0 8px',
              textTransform:'uppercase', letterSpacing:1 }}>
              🚨 Plazo vencido ({vencidas.length})
            </h2>
            <VacList items={vencidas} color='#f87171' onGozar={gozarM.mutate} gozarPending={gozarM.isPending}/>
          </div>
        )}

        {/* Con alerta */}
        {alertas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#f59e0b', margin:'0 0 8px',
              textTransform:'uppercase', letterSpacing:1 }}>
              ⚠ Por vencer en 30 días ({alertas.length})
            </h2>
            <VacList items={alertas} color='#f59e0b' onGozar={gozarM.mutate} gozarPending={gozarM.isPending}/>
          </div>
        )}

        {/* Normales */}
        {normales.length > 0 && (
          <div>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#64748b', margin:'0 0 8px',
              textTransform:'uppercase', letterSpacing:1 }}>
              Al corriente ({normales.length})
            </h2>
            <VacList items={normales} color={color} onGozar={gozarM.mutate} gozarPending={gozarM.isPending}/>
          </div>
        )}

        {!isLoading && (vacaciones as any[]).length === 0 && (
          <div style={{ textAlign:'center', padding:60, color:'#334155' }}>
            <p style={{ fontSize:40, margin:'0 0 12px' }}>✅</p>
            <p style={{ fontSize:15, fontWeight:600, color:'#64748b' }}>
              Todos los empleados han gozado sus vacaciones
            </p>
            <p style={{ fontSize:13, color:'#475569' }}>
              No hay vacaciones pagadas pendientes de gozar
            </p>
          </div>
        )}
        {isLoading && <p style={{ textAlign:'center', color:'#64748b', padding:40 }}>Cargando…</p>}
      </div>
    </AppLayout>
  );
}

function VacList({ items, color, onGozar, gozarPending }: any) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((v:any) => (
        <div key={v.id} style={{ background:'#1e293b', borderRadius:9, padding:'12px 16px',
          border:`1px solid ${color}33`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>
                {v.employee?.firstName} {v.employee?.lastName}
              </span>
              <span style={{ fontSize:11, color:'#64748b' }}>
                #{v.employee?.employeeNumber} · {v.employee?.position}
              </span>
            </div>
            <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b' }}>
              <span>📅 Pagado: {fmtDate(v.createdAt)}</span>
              <span>🏖 {v.days} días</span>
              {v.montoPrima && <span>💰 Prima: {fmt(v.montoPrima)}</span>}
              {v.plazoGozar && (
                <span style={{ color: v.vencida ? '#f87171' : v.alerta ? '#f59e0b' : '#64748b' }}>
                  ⏰ Plazo: {fmtDate(v.plazoGozar)}
                  {v.diasRestantes !== null && (
                    <span style={{ marginLeft:4, fontWeight:600 }}>
                      ({v.vencida ? `${Math.abs(v.diasRestantes)}d vencido` : `${v.diasRestantes}d restantes`})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => {
            if (window.confirm(`¿Registrar que ${v.employee?.firstName} ya gozó estos días?`))
              onGozar(v.id);
          }}
            disabled={gozarPending}
            style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${color}`,
              background:'none', color, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', marginLeft:12 }}>
            🏖 Registrar gozadas
          </button>
        </div>
      ))}
    </div>
  );
}
