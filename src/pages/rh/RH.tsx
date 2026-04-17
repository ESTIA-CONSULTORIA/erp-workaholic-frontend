// src/pages/rh/RH.tsx
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../../lib/api';
import ImportCSV from '../../components/ImportCSV';
import { useNavigate } from 'react-router-dom';

export default function RHPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const navigate = useNavigate();
  const qc    = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVO');
  const [showNew,      setShowNew]      = useState(false);
  const [showImport,   setShowImport]   = useState(false);

  const { data: dash } = useQuery({
    queryKey: ['rh-dashboard', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/dashboard`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees', cid, filterStatus, search],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=${filterStatus}&search=${search}`).then(r => r.data),
    enabled:  !!cid,
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Recursos Humanos</h1>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:13 }}>
              ⬆ Importar CSV
            </button>
            <button className="btn-primary" style={{ background:color }}
              onClick={() => setShowNew(!showNew)}>+ Alta de empleado</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Activos',              value:dash?.activeEmployees||0,  color },
            { label:'De vacaciones',        value:dash?.onLeave||0,          color:'#3b82f6' },
            { label:'Vac. pendientes',      value:dash?.pendingVacations||0, color:'#f59e0b' },
            { label:'Contratos por vencer', value:dash?.expiringContracts?.length||0,
              color:dash?.expiringContracts?.length>0?'#f87171':'#10b981' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:22, fontWeight:700, color:k.color, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {(dash?.expiringContracts||[]).length > 0 && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 16px', marginBottom:16 }}>
            <p style={{ color:'#f87171', fontSize:13, fontWeight:600, margin:'0 0 4px' }}>⚠ Contratos por vencer:</p>
            {dash.expiringContracts.map((d:any) => (
              <p key={d.id} style={{ fontSize:12, color:'#fca5a5', margin:'2px 0' }}>
                • {d.employee.firstName} {d.employee.lastName} — vence {fmtDate(d.endDate)}
              </p>
            ))}
          </div>
        )}

        {/* Formulario alta */}
        {showNew && (
          <NuevoEmpleadoForm companyId={cid!} color={color}
            onSuccess={() => { setShowNew(false); refetch(); }}/>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <input className="input-base" style={{ maxWidth:260, fontSize:13 }}
            placeholder="Buscar nombre, puesto…"
            value={search} onChange={e => setSearch(e.target.value)}/>
          {['ACTIVO','BAJA','SUSPENDIDO'].map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              style={{ padding:'6px 14px', borderRadius:99, fontSize:12, cursor:'pointer', border:`1px solid ${filterStatus===st?color:'#334155'}`, background:filterStatus===st?color+'22':'transparent', color:filterStatus===st?color:'#64748b' }}>
              {st}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <button onClick={() => exportCSV('empleados', employees as any[],
            [{key:'employeeNumber',label:'#'},{key:'firstName',label:'Nombre'},
             {key:'lastName',label:'Apellido'},{key:'position',label:'Puesto'},
             {key:'department',label:'Área'},{key:'grossSalary',label:'Salario'},
             {key:'status',label:'Estado'}])}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ⬇ Exportar CSV
          </button>
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>#</th><th>Nombre</th><th>Puesto</th><th>Ingreso</th>
              <th style={{textAlign:'right'}}>Salario</th><th>Estado</th><th>Expediente</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && employees.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin empleados</td></tr>}
              {employees.map((e:any) => (
                <tr key={e.id}>
                  <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{e.employeeNumber}</code></td>
                  <td style={{fontWeight:500}}>{e.firstName} {e.lastName}</td>
                  <td>{e.position}</td>
                  <td>{fmtDate(e.startDate)}</td>
                  <td style={{textAlign:'right',fontWeight:600,color}}>${Number(e.grossSalary).toLocaleString('es-MX')}</td>
                  <td><span className={e.status==='ACTIVO'?'badge-green':e.status==='BAJA'?'badge-red':'badge-amber'}>{e.status}</span></td>
                  <td>
                    <button onClick={() => navigate(`/rh/empleados/${e.id}`)}
                      style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                      Ver expediente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
      {showImport && (
        <ImportCSV title="Empleados" color={color}
          columns={[
            { key:'nombre',       label:'Nombre',       required:true },
            { key:'apellido',     label:'Apellido paterno', required:true },
            { key:'apellido2',    label:'Apellido materno'              },
            { key:'puesto',       label:'Puesto',       required:true },
            { key:'area',         label:'Área'                         },
            { key:'salario',      label:'Salario bruto', type:'number' },
            { key:'ingreso',      label:'Fecha ingreso', type:'date'   },
            { key:'rfc',          label:'RFC'                           },
            { key:'curp',         label:'CURP'                          },
            { key:'nss',          label:'NSS'                           },
            { key:'email',        label:'Email'                         },
            { key:'telefono',     label:'Teléfono'                      },
            { key:'clabe',        label:'CLABE'                         },
            { key:'banco',        label:'Banco'                         },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/empleados`, { rows });
            refetch();
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}

function NuevoEmpleadoForm({ companyId, color, onSuccess }: any) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    firstName:'', lastName:'', secondLastName:'',
    rfc:'', curp:'', nss:'', phone:'', email:'',
    position:'', department:'', startDate:today,
    contractType:'INDEFINIDO', grossSalary:'', dailySalary:'',
    bankAccount:'', bankName:'',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const guardar = async () => {
    if (!form.firstName||!form.lastName||!form.position||!form.grossSalary) {
      setError('Nombre, puesto y salario son obligatorios'); return;
    }
    setError(''); setSaving(true);
    try {
      await api.post(`/companies/${companyId}/rh/employees`, {
        ...form,
        grossSalary: Number(form.grossSalary),
        dailySalary: Number(form.dailySalary)||Number(form.grossSalary)/30,
      });
      onSuccess();
    } catch(e:any) { setError(e.response?.data?.message||'Error'); }
    finally { setSaving(false); }
  };

  const campos = [
    ['Nombre *','firstName','text'], ['Apellido paterno *','lastName','text'],
    ['Apellido materno','secondLastName','text'], ['RFC','rfc','text'],
    ['CURP','curp','text'], ['NSS','nss','text'],
    ['Teléfono','phone','text'], ['Email','email','email'],
    ['Puesto *','position','text'], ['Área','department','text'],
  ];

  return (
    <div className="card" style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:16 }}>Alta de empleado</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {campos.map(([label,key,type]) => (
          <div key={key}>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{label}</label>
            <input className="input-base" type={type} value={(form as any)[key]}
              onChange={e => set(key,e.target.value)} style={{ fontSize:13 }}/>
          </div>
        ))}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha ingreso</label>
          <input type="date" className="input-base" value={form.startDate} onChange={e=>set('startDate',e.target.value)} style={{ fontSize:13 }}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Salario bruto *</label>
          <input type="number" min="0" className="input-base" value={form.grossSalary} onChange={e=>set('grossSalary',e.target.value)} style={{ fontSize:13, textAlign:'right' }}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Salario diario (IMSS)</label>
          <input type="number" min="0" className="input-base" value={form.dailySalary} onChange={e=>set('dailySalary',e.target.value)} style={{ fontSize:13, textAlign:'right' }}/>
        </div>
      </div>
      {error && <p style={{ color:'#f87171', fontSize:13, marginTop:8 }}>{error}</p>}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
        <button className="btn-secondary" onClick={onSuccess}>Cancelar</button>
        <button className="btn-primary" style={{ background:color }} onClick={guardar} disabled={saving}>
          {saving?'Guardando…':'Dar de alta'}
        </button>
      </div>
    </div>
  );
}
