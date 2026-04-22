import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CircleHelp, Headphones, Lock, Mail, ShieldCheck, Trophy } from 'lucide-react';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const gold = '#d6a56d';
const border = 'rgba(214,165,109,0.22)';
const brands = [
  { name: 'PALESTRA', subtitle: 'CLUB DEPORTIVO', accent: '#84cc16' },
  { name: 'MACHETE', subtitle: 'CARNE SECA Y OPERACIÓN', accent: '#d6a56d' },
  { name: 'WORKAHOLIC', subtitle: 'COWORKING Y CORPORATIVO', accent: '#f8fafc' },
];
const features = [
  { title: 'Palestra', text: 'Membresías, reservaciones, clases, comisiones y operación deportiva.', icon: Trophy },
  { title: 'Machete', text: 'Compras, inventario, producción, ventas y control operativo.', icon: ShieldCheck },
  { title: 'Workaholic', text: 'Administración, finanzas, RH, reportes y control multiempresa.', icon: Building2 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useERPStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user, data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message;
      setError(Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage || 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.025)',
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: '14px 16px 14px 44px',
    fontSize: 15,
    color: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at top left, rgba(214,165,109,0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(214,165,109,0.10), transparent 24%), linear-gradient(135deg, #040506 0%, #0a0c10 38%, #11161e 100%)', color: '#f8fafc' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(214,165,109,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(214,165,109,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 88%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '26px 32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, rgba(214,165,109,0.18), rgba(214,165,109,0.05))', border: `1px solid ${border}`, boxShadow: '0 14px 36px rgba(0,0,0,0.34)', color: gold, fontWeight: 800 }}>ES</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.4 }}>ESTIA</div>
              <div style={{ fontSize: 12, color: gold, letterSpacing: 3, textTransform: 'uppercase' }}>Consultoría</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: 'rgba(8,10,14,0.54)', border: `1px solid ${border}`, color: gold, fontSize: 13, fontWeight: 600 }}>
            <CircleHelp size={16} /> Acceso multiempresa
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.12fr) minmax(360px, 0.88fr)', gap: 28, alignItems: 'stretch' }}>
          <section style={{ minHeight: 700, borderRadius: 30, border: `1px solid ${border}`, background: 'linear-gradient(145deg, rgba(9,11,14,0.90), rgba(9,11,14,0.64))', boxShadow: '0 28px 90px rgba(0,0,0,0.48)', padding: '42px 38px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(214,165,109,0.16)', color: '#edc993', border: `1px solid ${border}`, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                <ShieldCheck size={14} /> ERP centralizado
              </div>
              <h1 style={{ fontSize: 60, lineHeight: 1.01, margin: '22px 0 14px', letterSpacing: -2 }}>Grupo <span style={{ color: gold }}>Workaholic</span></h1>
              <p style={{ margin: 0, maxWidth: 640, color: '#cbd5e1', fontSize: 17, lineHeight: 1.72 }}>Controla operación, finanzas, RH, inventarios, membresías y reportes desde una sola plataforma, con acceso por empresa y permisos por perfil.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 26 }}>
              {features.map(({ title, text, icon: Icon }) => (
                <div key={title} style={{ borderRadius: 22, padding: '20px 18px', minHeight: 172, background: 'linear-gradient(180deg, rgba(18,22,29,0.90), rgba(10,12,16,0.72))', border: `1px solid ${border}`, boxShadow: '0 10px 26px rgba(0,0,0,0.22)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(214,165,109,0.16)', color: gold, marginBottom: 18 }}><Icon size={20} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.62, color: '#94a3b8' }}>{text}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 18 }}>
              <div style={{ borderRadius: 24, padding: 24, border: `1px solid ${border}`, background: 'linear-gradient(180deg, rgba(11,14,19,0.96), rgba(11,14,19,0.74))' }}>
                <div style={{ color: gold, fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Cobertura operativa</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {['Cortes de caja y POS', 'Compras, CxC, CxP y conciliación', 'Nómina, expedientes y permisos', 'Membresías, canchas y clases'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: 14.5 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: gold, boxShadow: '0 0 12px rgba(214,165,109,0.55)' }} />{item}</div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: 24, padding: 24, border: `1px solid ${border}`, background: 'linear-gradient(180deg, rgba(11,14,19,0.92), rgba(11,14,19,0.66))' }}>
                <div style={{ color: gold, fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Empresas</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {brands.map((brand) => (
                    <div key={brand.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(214,165,109,0.10)' }}>
                      <div><div style={{ fontWeight: 700 }}>{brand.name}</div><div style={{ fontSize: 11.5, color: '#94a3b8', letterSpacing: 0.5 }}>{brand.subtitle}</div></div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.accent, boxShadow: `0 0 18px ${brand.accent}` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={{ minHeight: 700, borderRadius: 30, border: `1px solid ${border}`, background: `linear-gradient(180deg, ${PANEL_DARK}, rgba(7,9,12,0.82))`, boxShadow: '0 28px 90px rgba(0,0,0,0.52)', padding: '36px 32px 26px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top center, rgba(214,165,109,0.13), transparent 28%), linear-gradient(135deg, transparent 0%, rgba(214,165,109,0.05) 52%, transparent 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: gold, fontSize: 14, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 10 }}>Bienvenido a</div>
                <div style={{ fontSize: 52, lineHeight: 0.97, fontWeight: 800, letterSpacing: 2.5 }}>GRUPO</div>
                <div style={{ fontSize: 52, lineHeight: 0.97, fontWeight: 800, letterSpacing: 2.5 }}>WORKAHOLIC</div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: gold, marginBottom: 8, fontWeight: 600 }}>Usuario</label>
                  <div style={{ position: 'relative' }}><Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: gold }} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ingresa tu usuario" required autoFocus style={inputStyle} /></div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: gold, marginBottom: 8, fontWeight: 600 }}>Contraseña</label>
                  <div style={{ position: 'relative' }}><Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: gold }} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required style={inputStyle} /></div>
                </div>
                <div style={{ textAlign: 'center', marginTop: -2 }}><button type="button" style={{ background: 'none', border: 'none', color: gold, textDecoration: 'underline', fontSize: 14, cursor: 'pointer' }}>¿Olvidaste tu contraseña?</button></div>
                {error && <div style={{ borderRadius: 14, padding: '12px 14px', color: '#fecaca', background: 'rgba(127,29,29,0.38)', border: '1px solid rgba(248,113,113,0.28)', fontSize: 13.5 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ marginTop: 2, border: 'none', borderRadius: 18, padding: '16px 20px', background: 'linear-gradient(180deg, #e4bb80 0%, #c8924d 100%)', color: '#140d06', fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 18px 36px rgba(201,146,77,0.28)' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{loading ? 'Entrando…' : 'INGRESAR'}<ArrowRight size={18} /></span></button>
              </form>

              <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid rgba(214,165,109,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: gold, fontWeight: 600 }}><Headphones size={18} />Soporte técnico</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>admin@grupoworkaholic.com</div>
              </div>
            </div>
          </section>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, color: '#64748b', fontSize: 12.5 }}>Grupo Workaholic · ERP v1.0 · {currentYear}</div>
      </div>
    </div>
  );
}
