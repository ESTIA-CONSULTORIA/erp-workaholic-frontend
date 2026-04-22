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
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(4,7,12,0.26), rgba(4,7,12,0.38)), url(${BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Velo general */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at left center, rgba(0,0,0,0.08), transparent 34%), radial-gradient(circle at right center, rgba(0,0,0,0.10), transparent 34%)',
          pointerEvents: 'none',
        }}
      />

      {/* Máscara para tapar el login viejo que viene dentro de la imagen */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '44%',
          transform: 'translate(-50%, -50%)',
          width: 'min(29vw, 420px)',
          height: 'min(58vh, 560px)',
          borderRadius: 26,
          background: 'rgba(6, 9, 14, 0.48)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 22px 50px rgba(0,0,0,0.38)',
          border: '1px solid rgba(202,163,107,0.12)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenido real */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '1.05fr 440px',
          gap: 40,
          alignItems: 'center',
          maxWidth: 1380,
          margin: '0 auto',
          padding: '24px 40px',
        }}
      >
        <section
          style={{
            color: '#fff',
            maxWidth: 700,
            alignSelf: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 999,
              background: 'rgba(202,163,107,0.14)',
              border: '1px solid rgba(202,163,107,0.24)',
              color: '#e8c894',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 22,
              backdropFilter: 'blur(8px)',
            }}
          >
            Acceso multiempresa
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(44px, 5vw, 78px)',
              lineHeight: 0.98,
              letterSpacing: -1.5,
              textShadow: '0 10px 28px rgba(0,0,0,0.26)',
            }}
          >
            Grupo Workaholic
          </h1>

          <p
            style={{
              marginTop: 20,
              maxWidth: 620,
              fontSize: 'clamp(16px, 1.2vw, 20px)',
              lineHeight: 1.7,
              color: '#d6dee8',
              textShadow: '0 4px 12px rgba(0,0,0,0.22)',
            }}
          >
            Plataforma central para operación, finanzas, RH, inventarios,
            membresías, reportes y control multiempresa.
          </p>
        </section>

        <section
          style={{
            justifySelf: 'end',
            width: '100%',
            maxWidth: 440,
            background: 'rgba(5, 8, 12, 0.80)',
            border: '1px solid rgba(202,163,107,0.18)',
            borderRadius: 26,
            padding: 34,
            backdropFilter: 'blur(18px)',
            boxShadow: '0 22px 60px rgba(0,0,0,0.36)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: '#e7c693',
                fontWeight: 700,
                letterSpacing: 2.2,
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
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: 1,
              }}
            >
              GRUPO
            </div>
            <div
              style={{
                color: '#fff',
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: 1,
              }}
            >
              WORKAHOLIC
            </div>
          </div>

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

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <button type="button" style={linkBtn}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 14,
                  borderRadius: 12,
                  padding: '10px 12px',
                  background: 'rgba(127,29,29,0.58)',
                  color: '#fecaca',
                  fontSize: 14,
                  textAlign: 'center',
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
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: 15,
};

const button: React.CSSProperties = {
  width: '100%',
  padding: '15px 16px',
  borderRadius: 14,
  border: 'none',
  background: '#caa36b',
  color: '#111',
  fontWeight: 800,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 12px 26px rgba(202,163,107,0.22)',
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
