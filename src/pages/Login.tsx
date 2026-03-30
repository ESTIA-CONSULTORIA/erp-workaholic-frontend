import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useERPStore(s => s.setAuth);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    } catch {
      setError('Correo o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#0f172a', padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:16, background:'#3b82f6',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:20, fontWeight:700,
          }}>GW</div>
        </div>

        <h1 style={{ textAlign:'center', fontSize:24, fontWeight:700, margin:'0 0 4px' }}>
          Grupo Workaholic
        </h1>
        <p style={{ textAlign:'center', color:'#64748b', fontSize:14, marginBottom:32 }}>
          Sistema de gestión financiera
        </p>

        <form onSubmit={handleLogin} className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>
              Correo electrónico
            </label>
            <input type="email" className="input-base"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@grupoworkaholic.com" required autoFocus/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>
              Contraseña
            </label>
            <input type="password" className="input-base"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required/>
          </div>
          {error && (
            <p style={{ color:'#f87171', fontSize:14, background:'rgba(248,113,113,0.1)',
              borderRadius:8, padding:'8px 12px', margin:0 }}>{error}</p>
          )}
          <button type="submit" className="btn-primary"
            disabled={loading}
            style={{ background:'#3b82f6', marginTop:4 }}>
            {loading ? 'Entrando…' : 'Entrar al sistema'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:12, color:'#475569', marginTop:24 }}>
          Grupo Workaholic · ERP v1.0
        </p>
      </div>
    </div>
  );
}
