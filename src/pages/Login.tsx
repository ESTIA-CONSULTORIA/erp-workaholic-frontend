import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const BG = new URL('../../login-bg.png', import.meta.url).href;

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useERPStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        backgroundImage: `linear-gradient(rgba(5,8,12,0.28), rgba(5,8,12,0.42)), url(${BG})`,
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
          maxWidth: 1180,
          display: 'grid',
          gridTemplateColumns: '1.1fr 420px',
          gap: 28,
          alignItems: 'center',
        }}
      >
        <section style={{ color: '#fff', padding: 24 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(202,163,107,0.14)',
              border: '1px solid rgba(202,163,107,0.22)',
              color: '#e7c693',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            Acceso multiempresa
          </div>

          <h1 style={{ margin: 0, fontSize: 54, lineHeight: 1 }}>
            Grupo Workaholic
          </h1>

          <p style={{ marginTop: 16, maxWidth: 620, fontSize: 17, lineHeight: 1.7, color: '#d7dee8' }}>
            Plataforma central para operación, finanzas, RH, inventarios,
            membresías, reportes y control multiempresa.
          </p>
        </section>

        <section
          style={{
            background: 'rgba(7, 10, 14, 0.72)',
            border: '1px solid rgba(202,163,107,0.18)',
            padding: 30,
            borderRadius: 22,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
          }}
        >
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Usuario</label>
              <input
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
            ERP v1.0 · {year}
          </div>
        </section>
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
