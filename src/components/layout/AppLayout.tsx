import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useERPStore } from '../../store/erp.store';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const NAV = [
  { to:'/dashboard', icon:'▦', label:'Dashboard', roles:['admin','administrador','gerente','contador','rh','cajero','director'] },
  { to:'/corte-caja', icon:'🏧', label:'Corte de Caja', roles:['admin','administrador','gerente','contador','cajero'] },
  { to:'/gastos', icon:'◎', label:'Gastos', roles:['admin','administrador','gerente','contador','cajero'] },
  { to:'/conciliacion', icon:'⊜', label:'Conciliación', roles:['admin','administrador','gerente','contador','director'] },
  { to:'/cxc', icon:'◷', label:'CxC / CxP', roles:['admin','administrador','gerente','contador','director'] },
  { to:'/reportes', icon:'∑', label:'Est. Financieros', roles:['admin','administrador','gerente','contador','director'] },
  { to:'/documentos', icon:'⊞', label:'Documentos', roles:['admin','administrador','gerente','contador','cajero'] },
  { to:'/consolidado', icon:'◈', label:'Consolidado', roles:['admin','administrador','gerente','contador','director'] },
  { to:'/rh', icon:'👥', label:'Empleados', roles:['admin','administrador','gerente','rh'] },
  { to:'/rh/nomina', icon:'💰', label:'Nómina', roles:['admin','administrador','gerente','rh','contador'] },
  { to:'/pos',             icon:'🏪', label:'POS',            companies:['MACHETE'] },
  { to:'/produccion',      icon:'⚙',  label:'Inventarios',    companies:['MACHETE'] },
  { to:'/catalogo',        icon:'≋',  label:'Catálogo',       companies:['MACHETE'] },
  { to:'/machete-reportes',icon:'📊',  label:'Rpt. Ventas',    companies:['MACHETE'] },
  { to:'/admin', icon:'⊛', label:'Admin', roles:['admin','administrador'] },
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, activeCompany, activePeriod, setActiveCompany, setActivePeriod, logout } = useERPStore();
  const [collapsed, setCollapsed] = useState(false);
  const color    = activeCompany?.color || '#3b82f6';
  const periodos = getUltimos12();

  if (!user || !activeCompany) return null;

  const visibleNav = NAV.filter((item: any) => {
    if (item.roles     && !item.roles.includes(activeCompany.roleCode))     return false;
    if (item.companies && !item.companies.includes(activeCompany.companyCode)) return false;
    return true;
  });

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        display:'flex', flexDirection:'column',
        background:'#1e293b', borderRight:'1px solid #334155',
        transition:'width 0.2s', flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:16, borderBottom:'1px solid #334155', minHeight:60 }}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:color, display:'flex', alignItems:'center',
            justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0,
          }}>GW</div>
          {!collapsed && <span style={{ fontSize:14, fontWeight:600 }}>Grupo Workaholic</span>}
        </div>

        {/* Selectores */}
        {!collapsed && (
          <div style={{ padding:12, borderBottom:'1px solid #334155', display:'flex', flexDirection:'column', gap:8 }}>
            <select
              value={activeCompany.companyId}
              onChange={e => {
                const c = user.companies.find(c => c.companyId === e.target.value);
                if (c) { setActiveCompany(c); navigate('/dashboard'); }
              }}
              className="input-base"
              style={{ fontSize:12, borderColor: color + '66' }}>
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

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', paddingTop:8, paddingBottom:8 }}>
          {visibleNav.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 12px', margin:'0 8px', borderRadius:8,
              textDecoration:'none', cursor:'pointer', fontSize:14, fontWeight:500,
              background: isActive ? color + '22' : 'transparent',
              color:      isActive ? color        : '#94a3b8',
              borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
              transition:'all 0.15s',
            })}>
              <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Usuario */}
        <div style={{ padding:12, borderTop:'1px solid #334155' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', background:'#334155',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, flexShrink:0,
            }}>
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

        {/* Toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ padding:8, background:'none', border:'none', borderTop:'1px solid #334155',
            color:'#64748b', cursor:'pointer', fontSize:12 }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Top bar */}
        <header style={{
          height:60, borderBottom:`1px solid ${color}44`,
          display:'flex', alignItems:'center', padding:'0 24px', gap:12, flexShrink:0,
        }}>
          <span style={{
            padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:700,
            background:color, color:'#fff',
          }}>{activeCompany.companyName}</span>
          <span style={{
            padding:'4px 12px', borderRadius:99, fontSize:12,
            background:'#334155', color:'#94a3b8',
          }}>{periodos.find(p => p.key === activePeriod)?.label || activePeriod}</span>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflowY:'auto', padding:24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
