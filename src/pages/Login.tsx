import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';
import { activeLoginTheme, loginThemes } from '../config/loginTheme';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useERPStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const theme = loginThemes[activeLoginTheme];

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
        backgroundImage: `linear-gradient(rgba(5,8,12,0.54), rgba(5,8,12,0.66)), url(${theme.backgroundImage})`,
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
          maxWidth: 1240,
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 28,
          alignItems: 'stretch',
        }}
      >
        <section
          style={{
            minHeight: 680,
            borderRadius: 28,
            padding: 40,
            background: 'rgba(0,0,0,0.16)',
            backdropFilter: 'blur(2px)',
            color: theme.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <img
              src={theme.estiaLogo}
              alt="Estia Consultoría"
              style={{
                width: theme.estiaLogoWidth,
                height: 'auto',
                display: 'block',
                marginBottom: 18,
              }}
            />

            {theme.showSeasonBadge && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.panelBorder}`,
                  color: theme.textPrimary,
                  fontSize: 13,
                  marginBottom: 18,
                }}
              >
                <span>{theme.decorativeEmoji}</span>
                <span>{theme.seasonBadgeText}</span>
              </div>
            )}

            <h1
              style={{
                margin: 0,
                fontSize: 56,
                lineHeight: 1,
                color: theme.textPrimary,
              }}
            >
              {theme.title}
            </h1>

            <p
              style={{
                marginTop: 16,
                maxWidth: 620,
                fontSize: 17,
                lineHeight: 1.7,
                color: theme.textSecondary,
              }}
            >
              Plataforma central para operación, finanzas, RH, inventarios,
              membresías, reportes y control multiempresa.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
              marginTop: 24,
            }}
          >
            {theme.brandLogos.map((logo) => (
              <div
                key={logo.name}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${theme.panelBorder}`,
                  borderRadius: 18,
                  padding: '12px 18px',
                  minWidth: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  style={{
                    width: logo.width ?? 120,
                    height: logo.height ?? 'auto',
                    objectFit: 'contain',
                    maxWidth: '100%',
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            borderRadius: 28,
            padding: 34,
            background: theme.panelBg,
            border: `1px solid ${theme.panelBorder}`,
            backdropFilter: 'blur(18px)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.32)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: theme.accent,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              Bienvenido a
            </div>

            <div
              style={{
                color: theme.textPrimary,
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              GRUPO
            </div>
            <div
              style={{
                color: theme.textPrimary,
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              WORKAHOLIC
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  color: theme.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                placeholder="Ingresa tu usuario"
                style={{
                  width: '100%',
                  borderRadius: 14,
                  border: `1px solid ${theme.panelBorder}`,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '14px 16px',
                  color: theme.textPrimary,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  color: theme.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Ingresa tu contraseña"
                style={{
                  width: '100%',
                  borderRadius: 14,
                  border: `1px solid ${theme.panelBorder}`,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '14px 16px',
                  color: theme.textPrimary,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.accent,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 14,
                }}
              >
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 16,
                padding: '15px 18px',
                background: theme.accent,
                color: theme.buttonText,
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: `0 12px 28px ${theme.accentSoft}`,
              }}
            >
              {loading ? 'Entrando…' : 'INGRESAR'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Soporte técnico
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
