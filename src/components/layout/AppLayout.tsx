import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useERPStore } from '../../store/erp.store';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: null,
    items: [
      { to:'/dashboard', icon:'▦', label:'Dashboard', roles:['admin','administrador','gerente','contador','rh','cajero','director'] },
    ]
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: '🏪',
    items: [
      { to:'/pos',                icon:'🏪', label:'POS',          companies:['MACHETE'] },
      { to:'/corte-caja',         icon:'🏧', label:'Corte de Caja',roles:['admin','administrador','gerente','contador','cajero'] },
      { to:'/machete/inventario', icon:'📦', label:'Inventario',   companies:['MACHETE'] },
      { to:'/machete/compras',    icon:'🛒', label:'Compras',      companies:['MACHETE'] },
      { to:'/machete/produccion', icon:'⚙',  label:'Producción',   companies:['MACHETE'] },
      { to:'/catalogo',           icon:'≋',  label:'Catálogo',     companies:['MACHETE'] },
      { to:'/clientes',      icon:'👤', label:'Clientes',     roles:['admin','administrador','gerente','contador'] },
    ]
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '💼',
    items: [
      { to:'/gastos',          icon:'◎', label:'Gastos',        roles:['admin','administrador','gerente','contador','cajero'] },
      { to:'/bitacora',        icon:'📋', label:'Bitácora',     roles:['admin','administrador','director'] },
      { to:'/intercompany',    icon:'↔', label:'Intercompany', roles:['admin','administrador','gerente','contador','director'] },
      { to:'/conciliacion',    icon:'⊜', label:'Arqueo',  roles:['admin','administrador','gerente','contador','director'] },
      { to:'/cxc',             icon:'◷', label:'CxC',           roles:['admin','administrador','gerente','contador','director'] },
      { to:'/cxp',             icon:'◶', label:'CxP',           roles:['admin','administrador','gerente','contador','director'] },
      { to:'/ordenes-compra',  icon:'📋', label:'OC',            companies:['MACHETE'] },
      { to:'/documentos',      icon:'⊞', label:'Documentos',    roles:['admin','administrador','gerente','contador','cajero'] },
    ]
  },
  {
    id: 'estados',
    label: 'Estados Financieros',
    icon: '∑',
    items: [
      { to:'/reportes',    icon:'∑', label:'Est. Resultados',  roles:['admin','administrador','gerente','contador','director'] },
      { to:'/consolidado', icon:'◈', label:'Consolidado',      roles:['admin','administrador','gerente','contador','director'] },
    ]
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: '📊',
    items: [
      { to:'/reportes/ventas',  icon:'📈', label:'Ventas',           companies:['MACHETE'] },
      { to:'/reportes/cxc',     icon:'💰', label:'CxC Multicliente',  companies:['MACHETE'] },
      { to:'/reportes/cxp',     icon:'📋', label:'CxP',               companies:['MACHETE'] },
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    icon: '👥',
    items: [
      { to:'/mi-perfil', icon:'👤', label:'Mi Perfil',  roles:['cajero','rh','admin','administrador','gerente','contador','director'] },
      { to:'/rh',        icon:'👥', label:'Empleados', roles:['admin','administrador','gerente','rh'] },
      { to:'/rh/nomina', icon:'💰', label:'Nómina',    roles:['admin','administrador','gerente','rh','contador'] },
    ]
  },
  {
    id: 'admin',
    label: null,
    items: [
      { to:'/admin', icon:'⊛', label:'Admin', roles:['admin','administrador'] },
    ]
  },
];

function getUltimos12() {
  const result = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    result.push({ key, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return result;
}

export default function AppLayout({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  const navigate = useNavigate();
  const { user, activeCompany, activePeriod, setActiveCompany, setActivePeriod, logout } = useERPStore();
  const [collapsed,  setCollapsed]  = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string,boolean>>({
    operaciones: true, finanzas: true, estados: false, reportes: false, rh: false,
  });

  const color    = activeCompany?.color || '#3b82f6';
  const periodos = getUltimos12();

  if (!user || !activeCompany) return null;

  const toggleGroup = (id: string) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const filterItem = (item: any) => {
    if (item.roles     && !item.roles.includes(activeCompany.roleCode))        return false;
    if (item.companies && !item.companies.includes(activeCompany.companyCode)) return false;
    return true;
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <aside style={{
        width: collapsed ? 56 : 220,
        display:'flex', flexDirection:'column',
        background:'#1e293b', borderRight:'1px solid #334155',
        transition:'width 0.2s', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:16, borderBottom:'1px solid #334155', minHeight:60 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:color,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>GW</div>
          {!collapsed && <span style={{ fontSize:14, fontWeight:600 }}>Grupo Workaholic</span>}
        </div>

        {!collapsed && (
          <div style={{ padding:12, borderBottom:'1px solid #334155', display:'flex', flexDirection:'column', gap:8 }}>
            <select value={activeCompany.companyId}
              onChange={e => {
                const c = user.companies.find(c => c.companyId === e.target.value);
                if (c) { setActiveCompany(c); navigate('/dashboard'); }
              }}
              className="input-base" style={{ fontSize:12, borderColor: color + '66' }}>
              {user.companies.map(c => (
                <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
              ))}
            </select>
            <select value={activePeriod} onChange={e => setActivePeriod(e.target.value)}
              className="input-base" style={{ fontSize:12 }}>
              {periodos.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        )}

        <nav style={{ flex:1, overflowY:'auto', paddingTop:8, paddingBottom:8 }}>
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(filterItem);
            if (visibleItems.length === 0) return null;

            if (!group.label) {
              return (
                <div key={group.id}>
                  {visibleItems.map(item => (
                    <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                      display:'flex', alignItems:'center', gap:12,
                      padding:'9px 12px', margin:'0 8px', borderRadius:8,
                      textDecoration:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                      background: isActive ? color + '22' : 'transparent',
                      color:      isActive ? color        : '#94a3b8',
                      borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                      transition:'all 0.15s',
                    })}>
                      <span style={{ fontSize:15, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                      {!collapsed && <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              );
            }

            const isOpen = openGroups[group.id] !== false;

            return (
              <div key={group.id} style={{ marginBottom:2 }}>
                {!collapsed && (
                  <button onClick={() => toggleGroup(group.id)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
                      padding:'6px 12px', margin:'2px 0', background:'none', border:'none',
                      cursor:'pointer', textAlign:'left' }}>
                    <span style={{ fontSize:12 }}>{group.icon}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                      letterSpacing:0.8, flex:1 }}>{group.label}</span>
                    <span style={{ fontSize:10, color:'#475569', transition:'transform 0.2s',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </button>
                )}
                {(isOpen || collapsed) && visibleItems.map(item => (
                  <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:12,
                    padding:'8px 12px',
                    margin: collapsed ? '0 8px' : '0 8px 0 16px',
                    borderRadius:8,
                    textDecoration:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                    background: isActive ? color + '22' : 'transparent',
                    color:      isActive ? color        : '#94a3b8',
                    borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                    transition:'all 0.15s',
                  })}>
                    <span style={{ fontSize:14, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                    {!collapsed && <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div style={{ padding:12, borderTop:'1px solid #334155' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#334155',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, flexShrink:0 }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</p>
                <p style={{ fontSize:11, color:'#64748b', margin:0, textTransform:'capitalize' }}>{activeCompany.roleCode}</p>
              </div>
            )}
            <button onClick={logout} title="Cerrar sesión"
              style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:16, flexShrink:0 }}>
              ⏻
            </button>
          </div>
        </div>

        <button onClick={() => setCollapsed(!collapsed)}
          style={{ padding:8, background:'none', border:'none', borderTop:'1px solid #334155',
            color:'#64748b', cursor:'pointer', fontSize:12 }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <header style={{ height:60, borderBottom:`1px solid ${color}44`,
          display:'flex', alignItems:'center', padding:'0 24px', gap:12, flexShrink:0 }}>
          <span style={{ padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:700,
            background:color, color:'#fff' }}>{activeCompany.companyName}</span>
          <span style={{ padding:'4px 12px', borderRadius:99, fontSize:12,
            background:'#334155', color:'#94a3b8' }}>
            {periodos.find(p => p.key === activePeriod)?.label || activePeriod}
          </span>
        </header>
        <main style={{ flex:1, overflowY: noPadding ? 'hidden' : 'auto', padding: noPadding ? 0 : 24, display: noPadding ? 'flex' : 'block', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
