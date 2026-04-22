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
    left: '38.2%',
    width: '22.9%',
    height: '4.8%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f8fafc',
    fontSize: '1rem',
    paddingLeft: '3%',
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
        padding: 12,
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1500 }}>
        <div
          style={{
            position: 'relative',
            width: 'min(96vw, 1500px)',
            aspectRatio: '1365 / 768',
            backgroundImage: 'url(/assets/login/background.jpg)',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
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
              style={{ ...inputStyle, top: '35.9%' }}
            />

            <label htmlFor="login-password" style={hiddenLabel}>Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ ...inputStyle, top: '49%' }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                position: 'absolute',
                left: '40.6%',
                top: '66.9%',
                width: '18%',
                height: '5.8%',
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
                left: '43.2%',
                top: '58.5%',
                width: '13.5%',
                height: '2.9%',
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
                left: '42.8%',
                top: '78.5%',
                width: '14.2%',
                height: '2.9%',
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
                left: '36.8%',
                top: '61.5%',
                width: '26%',
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
                left: '46.3%',
                top: '68.7%',
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
