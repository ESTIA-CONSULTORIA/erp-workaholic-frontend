import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const LOGIN_BG = '/login-bg.png';

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
    left: '26.6%',
    width: '52.3%',
    height: '4.8%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f8fafc',
    fontSize: '1rem',
    paddingLeft: '3.2%',
    paddingRight: '1.2%',
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
        padding: 18,
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1460 }}>
        <div
          style={{
            position: 'relative',
            width: 'min(96vw, 1460px)',
            aspectRatio: '1906 / 1025',
            backgroundImage: `url(${LOGIN_BG})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            borderRadius: 24,
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
              style={{ ...inputStyle, top: '51.3%' }}
            />

            <label htmlFor="login-password" style={hiddenLabel}>Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ ...inputStyle, top: '63.8%' }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                position: 'absolute',
                left: '31.3%',
                top: '79.2%',
                width: '38.2%',
                height: '6.8%',
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
                left: '38.6%',
                top: '72.6%',
                width: '22.8%',
                height: '3.4%',
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
                left: '40.2%',
                top: '89.4%',
                width: '19.5%',
                height: '3.5%',
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
                left: '27.5%',
                top: '70.2%',
                width: '50%',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(127,29,29,0.62)',
                color: '#fecaca',
                fontSize: '0.88rem',
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
                left: '43%',
                top: '82.2%',
                color: '#140d06',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}
            >
              Entrando…
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 10, color: '#64748b', fontSize: 12.5 }}>
          Grupo Workaholic · ERP v1.0 · {currentYear}
        </div>
      </div>
    </div>
  );
}
