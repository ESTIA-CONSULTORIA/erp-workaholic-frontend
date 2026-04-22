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
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

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
          "linear-gradient(rgba(5,8,12,0.25), rgba(5,8,12,0.45)), url('/assets/login/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(7, 10, 14, 0.78)',
            border: '1px solid rgba(202,163,107,0.18)',
            borderRadius: 24,
            padding: 32,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.45)',
          }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: '#e7c693',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontSize: 12,
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              Bienvenido a
            </div>

            <div
              style={{
                color: '#ffffff',
                fontSize: 34,
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              GRUPO WORKAHOLIC
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Usuario</label>
              <input
                type="email"
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              marginTop: 18,
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

/* ===== STYLES ===== */

const label: React.CSSProperties = {
  display: 'block',
  color: '#e7c693',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  outline: 'none',
  fontSize: 15,
  boxSizing: 'border-box',
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
