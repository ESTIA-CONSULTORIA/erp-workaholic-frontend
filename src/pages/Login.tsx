import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Headphones, Lock, Mail, ShieldCheck, Trophy } from 'lucide-react';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const GOLD = '#d6a56d';
const GOLD_BORDER = 'rgba(214,165,109,0.22)';
const PANEL_BG = 'linear-gradient(180deg, rgba(10,12,16,0.94), rgba(8,10,14,0.88))';

const BRANDS = [
  { name: 'PALESTRA', subtitle: 'Club Deportivo', accent: '#84cc16' },
  { name: 'MACHETE', subtitle: 'Carne seca y operación', accent: '#d6a56d' },
  { name: 'WORKAHOLIC', subtitle: 'Coworking y corporativo', accent: '#f8fafc' },
];

const FEATURES = [
  {
    title: 'Palestra',
    text: 'Membresías, reservaciones, clases, comisiones y operación del club.',
    icon: Trophy,
  },
  {
    title: 'Machete',
    text: 'Compras, inventario, producción, ventas y control operativo.',
    icon: ShieldCheck,
  },
  {
    title: 'Workaholic',
    text: 'Administración, finanzas, RH, reportes y control multiempresa.',
    icon: Building2,
  },
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

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(214,165,109,0.18), transparent 26%), radial-gradient(circle at bottom right, rgba(214,165,109,0.12), transparent 24%), linear-gradient(135deg, #050608 0%, #0a0c10 42%, #10141c 100%)',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(214,165,109,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(214,165,109,0.06) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 90%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                border: `1px solid ${GOLD_BORDER}`,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(180deg, rgba(214,165,109,0.16), rgba(214,165,109,0.05))',
                boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                color: GOLD,
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              ES
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.4 }}>ESTIA</div>
              <div style={{ fontSize: 12, color: GOLD, letterSpacing: 3, textTransform: 'uppercase' }}>Consultoría</div>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 14,
              border: `1px solid ${GOLD_BORDER}`,
              background: 'rgba(7,9,12,0.48)',
              color: '#d6a56d',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Acceso multiempresa
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.08fr) minmax(360px, 0.92fr)',
            gap: 28,
            alignItems: 'stretch',
          }}
        >
          <section
            style={{
              minHeight: 690,
              borderRadius: 30,
              border: `1px solid ${GOLD_BORDER}`,
              background: 'linear-gradient(145deg, rgba(10,12,15,0.84), rgba(10,12,15,0.58))',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.46)',
              padding: '42px 38px 34px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(214,165,109,0.12)',
                  color: '#e8c28c',
                  border: `1px solid ${GOLD_BORDER}`,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}
              >
                <ShieldCheck size={14} /> ERP centralizado
              </div>

              <h1 style={{ fontSize: 58, lineHeight: 1.02, margin: '22px 0 14px', letterSpacing: -1.8 }}>
                Grupo <span style={{ color: GOLD }}>Workaholic</span>
              </h1>

              <p style={{ fontSize: 17, lineHeight: 1.72, color: '#cbd5e1', maxWidth: 650, margin: 0 }}>
                Controla operación, finanzas, RH, inventarios, membresías y reportes desde una sola plataforma,
                con acceso por empresa y permisos por perfil.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 28 }}>
              {FEATURES.map(({ title, text, icon: Icon }) => (
                <div
                  key={title}
                  style={{
                    borderRadius: 22,
                    padding: '20px 18px',
                    border: `1px solid ${GOLD_BORDER}`,
                    background: 'linear-gradient(180deg, rgba(18,22,29,0.9), rgba(10,12,16,0.72))',
                    minHeight: 172,
                    boxShadow: '0 10px 26px rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(214,165,109,0.12)',
                      color: GOLD,
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#94a3b8' }}>{text}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 28,
                display: 'grid',
                gridTemplateColumns: '1.35fr 1fr',
                gap: 18,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: 24,
                  border: `1px solid ${GOLD_BORDER}`,
                  background: 'linear-gradient(180deg, rgba(11,14,19,0.95), rgba(11,14,19,0.72))',
                }}
              >
                <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 10 }}>
                  Cobertura operativa
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {['Cortes de caja y POS', 'Compras, CxC, CxP y conciliación', 'Nómina, expedientes y permisos', 'Membresías, canchas y clases'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: 14.5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: '0 0 12px rgba(214,165,109,0.6)' }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: 24,
                  border: `1px solid ${GOLD_BORDER}`,
                  background: 'linear-gradient(180deg, rgba(11,14,19,0.9), rgba(11,14,19,0.62))',
                }}
              >
                <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12 }}>
                  Empresas
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {BRANDS.map((brand) => (
                    <div
                      key={brand.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(214,165,109,0.08)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{brand.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{brand.subtitle}</div>
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.accent, boxShadow: `0 0 18px ${brand.accent}` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            style={{
              minHeight: 690,
              borderRadius: 30,
              border: `1px solid ${GOLD_BORDER}`,
              background: PANEL_BG,
              backdropFilter: 'blur(18px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              padding: '34px 32px 26px',
              position: 'relative',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: GOLD, fontSize: 14, fontWeight: 700, letterSpacing: 2.1, textTransform: 'uppercase', marginBottom: 10 }}>
                Bienvenido a
              </div>
              <div style={{ fontSize: 48, lineHeight: 0.98, fontWeight: 800, letterSpacing: 2.3 }}>GRUPO</div>
              <div style={{ fontSize: 48, lineHeight: 0.98, fontWeight: 800, letterSpacing: 2.3 }}>WORKAHOLIC</div>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: GOLD, marginBottom: 8, fontWeight: 600 }}>Usuario</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: GOLD }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${GOLD_BORDER}`,
                      borderRadius: 16,
                      padding: '14px 16px 14px 44px',
                      fontSize: 15,
                      color: '#f8fafc',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: GOLD, marginBottom: 8, fontWeight: 600 }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: GOLD }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${GOLD_BORDER}`,
                      borderRadius: 16,
                      padding: '14px 16px 14px 44px',
                      fontSize: 15,
                      color: '#f8fafc',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: -2 }}>
                <button type="button" style={{ background: 'none', border: 'none', color: GOLD, textDecoration: 'underline', fontSize: 14, cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && (
                <div
                  style={{
                    borderRadius: 14,
                    padding: '12px 14px',
                    color: '#fecaca',
                    background: 'rgba(127,29,29,0.38)',
                    border: '1px solid rgba(248,113,113,0.28)',
                    fontSize: 13.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 2,
                  border: 'none',
                  borderRadius: 18,
                  padding: '16px 20px',
                  background: 'linear-gradient(180deg, #e4bb80 0%, #c8924d 100%)',
                  color: '#140d06',
                  fontSize: 17,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 18px 36px rgba(201,146,77,0.28)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  {loading ? 'Entrando…' : 'INGRESAR'}
                  <ArrowRight size={18} />
                </span>
              </button>
            </form>

            <div
              style={{
                marginTop: 26,
                paddingTop: 22,
                borderTop: '1px solid rgba(214,165,109,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: GOLD, fontWeight: 600 }}>
                <Headphones size={18} /> Soporte técnico
              </div>
              <div style={{ fontSize: 12.5, color: '#94a3b8' }}>admin@grupoworkaholic.com</div>
            </div>
          </section>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, color: '#64748b', fontSize: 12.5 }}>
          Grupo Workaholic · ERP v1.0 · {currentYear}
        </div>
      </div>
    </div>
  );
}
