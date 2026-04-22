import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';
import { getActiveTheme, loginThemes } from '../config/loginTheme';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useERPStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = loginThemes[getActiveTheme()];
  const year = useMemo(() => new Date().getFullYear(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user, data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(${theme.overlay}, ${theme.overlay}), url(${theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: 30,
        }}
      >
        <div style={{ color: '#fff' }}>
          <img src={theme.estiaLogo} style={{ width: theme.estiaLogoWidth, marginBottom: 20 }} />

          <h1 style={{ fontSize: 48, margin: 0 }}>{theme.title}</h1>
          <p style={{ opacity: 0.7 }}>{theme.subtitle}</p>

          <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
            {theme.brandLogos.map((l) => (
              <img key={l.name} src={l.src} style={{ width: l.width }} />
            ))}
          </div>
        </div>

        <div
          style={{
            background: theme.panelBg,
            padding: 30,
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
          }}
        >
          <form onSubmit={handleLogin}>
            <input
              placeholder="Usuario"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />

            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={link}>¿Olvidaste tu contraseña?</span>
            </div>

            {error && <div style={{ color: '#fca5a5', textAlign: 'center' }}>{error}</div>}

            <button style={button}>
              {loading ? 'Entrando…' : 'INGRESAR'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 15 }}>
              <span style={link}>Soporte técnico</span>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 15, fontSize: 12, opacity: 0.6 }}>
            ERP v1.0 · {year}
          </div>
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 12,
  marginBottom: 12,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
};

const button: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: 'none',
  background: '#caa36b',
  fontWeight: 700,
  cursor: 'pointer',
};

const link: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  cursor: 'pointer',
};
