import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

export default function WorkaholicSoftPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0,10), totalVentas:'', totalEfectivo:'', totalTarjeta:'', totalOtros:'', numTransacciones:'' });
  const [csvFile, setCsvFile] = useState<File|null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));

  const { data: imports = [] } = useQuery({
    queryKey: ['workaholic-soft', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/soft-imports`).then(r=>r.data),
    enabled:  !!cid,
  });

  const importM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/soft-imports`, {
      fecha: form.fecha, totalVentas: Number(form.totalVentas),
      totalEfectivo: Number(form.totalEfectivo), totalTarjeta: Number(form.totalTarjeta),
      totalOtros: Number(form.totalOtros), numTransacciones: Number(form.numTransacciones),
      rawData: parsedRows.length > 0 ? parsedRows : null,
    }),
    onSuccess: () => {
      setForm({ fecha:new Date().toISOString().slice(0,10), totalVentas:'', totalEfectivo:'', totalTarjeta:'', totalOtros:'', numTransacciones:'' });
      setCsvFile(null); setParsedRows([]);
      qc.invalidateQueries({ queryKey: ['workaholic-soft', cid] });
    },
  });

  const handleCSV = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
      const row: any = {};
      headers.forEach((h,i) => row[h] = vals[i]);
      return row;
    });
    setParsedRows(rows);
    const total = rows.reduce((t,r) => t + Number(r['Total']||r['total']||r['Importe']||0), 0);
    if (total > 0) setForm(f => ({...f, totalVentas: total.toFixed(2), numTransacciones: String(rows.length) }));
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 6px' }}>A&B — Soft Restaurant</h1>
        <p style={{ fontSize:13, color:'#64748b', margin:'0 0 24px' }}>
          Importa el cierre diario de Soft Restaurant para consolidar en estados financieros.
          Próximamente disponible por API.
        </p>

        <div className="card" style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Importar cierre del día</h3>
          <div style={{ border:'2px dashed #334155', borderRadius:10, padding:20, textAlign:'center', marginBottom:14, cursor:'pointer' }}
            onClick={() => document.getElementById('wkh-csv')?.click()}>
            <input id="wkh-csv" type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])}/>
            {csvFile
              ? <p style={{ fontSize:13, color:'#10b981', margin:0 }}>✅ {csvFile.name} — {parsedRows.length} registros</p>
              : <>
                  <p style={{ fontSize:24, margin:'0 0 8px' }}>📄</p>
                  <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Clic para subir CSV de Soft Restaurant</p>
                </>
            }
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
            {[['Fecha *','fecha','date'],['Total ventas *','totalVentas','number'],['Total efectivo','totalEfectivo','number'],
              ['Total tarjeta','totalTarjeta','number'],['Otros métodos','totalOtros','number'],['No. transacciones','numTransacciones','number']].map(([l,k,t]) => (
              <div key={k}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                <input type={t} className="input-base" style={{ fontSize:12 }}
                  value={(form as any)[k]} onChange={e => set(k, e.target.value)}/>
              </div>
            ))}
          </div>
          {form.totalVentas && (
            <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 14px', marginBottom:12, display:'flex', gap:20, fontSize:12 }}>
              <span style={{ color:'#64748b' }}>Total: <strong style={{color}}>{fmt(Number(form.totalVentas))}</strong></span>
              <span style={{ color:'#64748b' }}>Efectivo: <strong style={{color:'#10b981'}}>{fmt(Number(form.totalEfectivo))}</strong></span>
              <span style={{ color:'#64748b' }}>Tarjeta: <strong style={{color:'#3b82f6'}}>{fmt(Number(form.totalTarjeta))}</strong></span>
            </div>
          )}
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => importM.mutate()} disabled={importM.isPending || !form.fecha || !form.totalVentas}>
            {importM.isPending ? 'Importando…' : '⬆ Importar y registrar en ER'}
          </button>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th><th style={{textAlign:'right'}}>Total ventas</th>
              <th style={{textAlign:'right'}}>Efectivo</th><th style={{textAlign:'right'}}>Tarjeta</th>
              <th style={{textAlign:'right'}}>Transacciones</th>
            </tr></thead>
            <tbody>
              {(imports as any[]).length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin importaciones</td></tr>}
              {(imports as any[]).map((imp:any) => (
                <tr key={imp.id}>
                  <td>{fmtDate(imp.fecha)}</td>
                  <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(imp.totalVentas)}</td>
                  <td style={{textAlign:'right',color:'#10b981'}}>{fmt(imp.totalEfectivo)}</td>
                  <td style={{textAlign:'right',color:'#3b82f6'}}>{fmt(imp.totalTarjeta)}</td>
                  <td style={{textAlign:'right',color:'#64748b'}}>{imp.numTransacciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
