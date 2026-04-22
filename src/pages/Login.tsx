import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

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
      setError(
        Array.isArray(backendMessage)
          ? backendMessage.join(', ')
          : backendMessage || 'Correo o contraseña incorrectos'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        backgroundImage:
          "linear-gradient(rgba(5,8,12,0.18), rgba(5,8,12,0.30)), url('/assets/login/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '1fr 430px',
          gap: 32,
          alignItems: 'center',
          maxWidth: 1380,
          margin: '0 auto',
          padding: '28px 40px',
        }}
      >
        <div />

        <div
          style={{
            width: '100%',
            maxWidth: 430,
            justifySelf: 'end',
            background: 'rgba(7, 10, 14, 0.76)',
            border: '1px solid rgba(202,163,107,0.16)',
            borderRadius: 24,
            padding: 32,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.36)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: '#e7c693',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              Bienvenido a
            </div>

            <div
              style={{
                color: '#fff',
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              GRUPO
            </div>
            <div
              style={{
                color: '#fff',
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              WORKAHOLIC
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Usuario</label>
              <input
                type="email"
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                style={input}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Contraseña</label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={input}
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <button type="button" style={linkBtn}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 12,
                  color: '#fecaca',
                  background: 'rgba(127,29,29,0.55)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={button}>
              {loading ? 'Entrando…' : 'INGRESAR'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" style={secondaryLinkBtn}>
                Soporte técnico
              </button>
            </div>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            ERP v1.0 · {currentYear}
          </div>
        </div>
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  display: 'block',
  color: '#e7c693',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: 15,
};

const button: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: 'none',
  background: '#caa36b',
  color: '#111',
  fontWeight: 800,
  cursor: 'pointer',
};

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#d7dee8',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 14,
};

const secondaryLinkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontSize: 14,
};
