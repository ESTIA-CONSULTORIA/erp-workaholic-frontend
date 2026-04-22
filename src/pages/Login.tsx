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
      setError(Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage || 'Correo o contraseña incorrectos');
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
  left: '37.15%',
  width: '25.45%',
  height: '4.15%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#f8fafc',
  fontSize: '1rem',
  paddingLeft: '2.8%',
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
        padding: 12,
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1320 }}>
  <div
    style={{
      position: 'relative',
      width: 'min(94vw, calc(90vh * 1.7777778), 1320px)',
      aspectRatio: '2048 / 1152',
      backgroundImage: `url(${LOGIN_BG})`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      borderRadius: 18,
      margin: '0 auto',
    }}
  >
          <form onSubmit={handleLogin} style={{ position: 'absolute', inset: 0 }}>
            <label htmlFor="login-email" style={hiddenLabel}>Usuario</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              style={{ ...inputStyle, top: '37.25%' }}
            />

            <label htmlFor="login-password" style={hiddenLabel}>Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ ...inputStyle, top: '47.95%' }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                position: 'absolute',
                left: '39.55%',
                top: '64.55%',
                width: '20.55%',
                height: '5.35%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="Ingresar"
            />

            <button
              type="button"
              style={{
                position: 'absolute',
                left: '43.45%',
                top: '57.55%',
                width: '13.15%',
                height: '2.5%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="¿Olvidaste tu contraseña?"
            />

            <button
              type="button"
              style={{
                position: 'absolute',
                left: '42.6%',
                top: '78.1%',
                width: '14.4%',
                height: '2.7%',
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
                eft: '36.7%',
                top: '60.4%',
                width: '26.2%',
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
                left: '46.2%',
                top: '66.35%',
                color: '#e5d2be',
                fontWeight: 700,
                fontSize: '0.9rem',
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
