import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const BG = new URL('../../login-bg.png', import.meta.url).href;

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useERPStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user, data.accessToken);
      navigate('/dashboard');
    } catch {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 380,
          padding: '32px 28px',
          borderRadius: 20,
          backdropFilter: 'blur(18px)',
          background: 'rgba(0,0,0,0.45)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          color: '#fff',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 25 }}>
          GRUPO WORKAHOLIC
        </h2>

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

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={link}>¿Olvidaste tu contraseña?</span>
          </div>

          <button type="submit" style={button}>
            INGRESAR
          </button>

          <div style={{ textAlign: 'center', marginTop: 15 }}>
            <span style={link}>Soporte técnico</span>
          </div>
        </form>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  marginBottom: 12,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  outline: 'none',
};

const button: React.CSSProperties = {
  width: '100%',
  marginTop: 15,
  padding: '12px',
  borderRadius: 10,
  border: 'none',
  background: '#caa36b',
  color: '#000',
  fontWeight: 700,
  cursor: 'pointer',
};

const link: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  cursor: 'pointer',
};
