import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const TYPE_ICON: Record<string,string> = {
  APROBACION_PENDIENTE:'⏳', APROBADO:'✅', RECHAZADO:'❌',
  NOMINA:'💰', ARQUEO:'🏧', BAJA:'👋', DOCUMENTO:'📄',
};

export default function NotificationBell() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  const { data: count = 0 } = useQuery({
    queryKey: ['notif-count', cid],
    queryFn:  () => api.get(`/companies/${cid}/notifications/count`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 30000,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifs', cid],
    queryFn:  () => api.get(`/companies/${cid}/notifications`).then(r => r.data),
    enabled:  !!cid && open,
  });

  const readM = useMutation({
    mutationFn: (id: string) => api.put(`/companies/${cid}/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count', cid] });
      qc.invalidateQueries({ queryKey: ['notifs', cid] });
    },
  });

  const readAllM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/notifications/read-all`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-count', cid] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: any) => {
    if (!n.read) readM.mutate(n.id);
    if (n.actionUrl) { navigate(n.actionUrl); setOpen(false); }
  };

  const cnt = Number(count);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'relative', background:'none', border:'none',
          cursor:'pointer', padding:'6px', borderRadius:8,
          color:'#64748b', fontSize:18, lineHeight:1 }}>
        🔔
        {cnt > 0 && (
          <span style={{ position:'absolute', top:2, right:2,
            background:'#f87171', color:'#fff', fontSize:9, fontWeight:700,
            borderRadius:99, padding:'1px 4px', minWidth:14,
            textAlign:'center', lineHeight:'14px' }}>
            {cnt > 99 ? '99+' : cnt}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute', right:0, top:'100%', marginTop:4,
          width:340, maxHeight:440, background:'#1e293b', borderRadius:10,
          border:'1px solid #334155', boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
          zIndex:9999, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #334155',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>
              Notificaciones {cnt > 0 && <span style={{color:'#f87171'}}>({cnt})</span>}
            </span>
            {cnt > 0 && (
              <button onClick={() => readAllM.mutate()}
                style={{ background:'none', border:'none', color, cursor:'pointer', fontSize:11 }}>
                Marcar todas leídas
              </button>
            )}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {(notifs as any[]).length === 0 ? (
              <p style={{ textAlign:'center', color:'#475569', padding:'32px 16px', fontSize:12 }}>
                Sin notificaciones
              </p>
            ) : (notifs as any[]).map((n: any) => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{ padding:'10px 14px', borderBottom:'1px solid #1e293b',
                  cursor: n.actionUrl ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : color + '11',
                  transition:'background 0.15s' }}
                onMouseEnter={e => { if(n.actionUrl)(e.currentTarget as HTMLElement).style.background='#334155'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read?'transparent':color+'11'; }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>
                    {TYPE_ICON[n.type] || '📬'}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:n.read?400:700,
                      color:n.read?'#94a3b8':'#f1f5f9', margin:'0 0 2px',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize:11, color:'#64748b', margin:0,
                      overflow:'hidden', display:'-webkit-box',
                      WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                      {n.body}
                    </p>
                    <p style={{ fontSize:10, color:'#475569', margin:'4px 0 0' }}>
                      {new Date(n.createdAt).toLocaleDateString('es-MX',
                        {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width:7, height:7, borderRadius:'50%',
                      background:color, flexShrink:0, marginTop:4 }}/>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
