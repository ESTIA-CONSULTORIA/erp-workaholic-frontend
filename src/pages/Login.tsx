import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const LOGIN_BG = new URL('../../login-bg.png', import.meta.url).href;

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

  const hiddenLabel: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    left: '38.8%',
    width: '22.4%',
    height: '3.55%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f8fafc',
    fontSize: '0.96rem',
    paddingLeft: '2.7%',
    paddingRight: '1.1%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050608',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1280 }}>
        <div
          style={{
            position: 'relative',
            width: 'min(92vw, calc(88vh * 1.7777778), 1280px)',
            aspectRatio: '2048 / 1152',
            backgroundImage: `url(${LOGIN_BG})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            borderRadius: 18,
            margin: '0 auto',
          }}
        >
          <form onSubmit={handleLogin} style={{ position: 'absolute', inset: 0 }}>
            
            {/* Usuario */}
            <label htmlFor="login-email" style={hiddenLabel}>Usuario</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              style={{ ...inputStyle, top: '33.6%' }}
            />

            {/* Contraseña */}
            <label htmlFor="login-password" style={hiddenLabel}>Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ ...inputStyle, top: '44.2%' }}
            />

            {/* Olvidaste */}
            <button
              type="button"
              style={{
                position: 'absolute',
                left: '43.8%',
                top: '55.9%',
                width: '11.8%',
                height: '2.15%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="¿Olvidaste tu contraseña?"
            />

            {/* Ingresar */}
            <button
              type="submit"
              disabled={loading}
              style={{
                position: 'absolute',
                left: '40.3%',
                top: '61.8%',
                width: '18.1%',
                height: '4.55%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="Ingresar"
            />

            {/* Soporte */}
            <button
              type="button"
              style={{
                position: 'absolute',
                left: '42.65%',
                top: '72.4%',
                width: '13.2%',
                height: '2.25%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="Soporte técnico"
            />

          </form>

          {error && (
            <div
              style={{
                position: 'absolute',
                left: '38.2%',
                top: '57.2%',
                width: '22.5%',
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(127,29,29,0.68)',
                color: '#fecaca',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div
              style={{
                position: 'absolute',
                left: '46.15%',
                top: '63%',
                color: '#e5d2be',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              Entrando…
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 8, color: '#64748b', fontSize: 12.5 }}>
          Grupo Workaholic · ERP v1.0 · {currentYear}
        </div>
      </div>
    </div>
  );
}
