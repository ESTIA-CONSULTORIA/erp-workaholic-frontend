import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

export default function SoftRestaurantPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';
  const qc    = useQueryClient();

  const [form, setForm] = useState({
    fecha:             new Date().toISOString().slice(0,10),
    totalVentas:       '',
    totalEfectivo:     '',
    totalTarjeta:      '',
    totalOtros:        '',
    numTransacciones:  '',
  });
  const [csvFile, setCsvFile] = useState<File|null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  const { data: imports = [] } = useQuery({
    queryKey: ['soft-imports', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/soft-imports`).then(r => r.data),
    enabled:  !!cid,
  });

  const importM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/soft-imports`, {
      fecha:            form.fecha,
      totalVentas:      Number(form.totalVentas),
      totalEfectivo:    Number(form.totalEfectivo),
      totalTarjeta:     Number(form.totalTarjeta),
      totalOtros:       Number(form.totalOtros),
      numTransacciones: Number(form.numTransacciones),
      rawData:          parsedData || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soft-imports', cid] });
      setForm({ fecha:new Date().toISOString().slice(0,10), totalVentas:'', totalEfectivo:'', totalTarjeta:'', totalOtros:'', numTransacciones:'' });
      setParsedData(null);
      setCsvFile(null);
    },
  });

  const handleCSV = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows: any[] = [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/"/g,''));
      const row: any = {};
      headers.forEach((h, idx) => row[h] = vals[idx]);
      rows.push(row);
    }
    setParsedData(rows);
    // Try to auto-fill totals
    const total = rows.reduce((t,r) => t + Number(r['Total']||r['total']||r['Importe']||0), 0);
    if (total > 0) setForm(f => ({...f, totalVentas: total.toFixed(2)}));
    setForm(f => ({...f, numTransacciones: String(rows.length)}));
  };

  const set = (k:string, v:string) => setForm(f => ({...f,[k]:v}));

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 8px' }}>Soft Restaurant</h1>
        <p style={{ fontSize:13, color:'#64748b', margin:'0 0 24px' }}>
          Importa el reporte de cierre diario de Soft Restaurant para que aparezca en los estados financieros.
        </p>

        {/* Form importar */}
        <div className="card" style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Importar cierre del día</h3>

          {/* CSV upload */}
          <div style={{ border:'2px dashed #334155', borderRadius:10, padding:20, textAlign:'center', marginBottom:16, cursor:'pointer' }}
            onClick={() => document.getElementById('soft-csv')?.click()}>
            <input id="soft-csv" type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])}/>
            {csvFile
              ? <p style={{ fontSize:13, color:'#10b981', margin:0 }}>✅ {csvFile.name} — {parsedData?.length} filas</p>
              : <>
                  <p style={{ fontSize:24, margin:'0 0 8px' }}>📄</p>
                  <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Arrastra o haz clic para subir CSV de Soft Restaurant</p>
                </>
            }
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              ['Fecha *', 'fecha', 'date'],
              ['Total ventas *', 'totalVentas', 'number'],
              ['Total efectivo', 'totalEfectivo', 'number'],
              ['Total tarjeta', 'totalTarjeta', 'number'],
              ['Otros métodos', 'totalOtros', 'number'],
              ['No. transacciones', 'numTransacciones', 'number'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{label}</label>
                <input type={type} className="input-base" style={{ fontSize:13 }}
                  value={(form as any)[key]} onChange={e => set(key, e.target.value)}/>
              </div>
            ))}
          </div>

          {form.totalVentas && (
            <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 14px', marginBottom:12,
              display:'flex', gap:24, fontSize:12 }}>
              <span style={{ color:'#64748b' }}>Total: <strong style={{color}}>{fmt(Number(form.totalVentas))}</strong></span>
              <span style={{ color:'#64748b' }}>Efectivo: <strong style={{color:'#10b981'}}>{fmt(Number(form.totalEfectivo))}</strong></span>
              <span style={{ color:'#64748b' }}>Tarjeta: <strong style={{color:'#3b82f6'}}>{fmt(Number(form.totalTarjeta))}</strong></span>
            </div>
          )}

          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => importM.mutate()}
            disabled={importM.isPending || !form.fecha || !form.totalVentas}>
            {importM.isPending ? 'Importando…' : '⬆ Importar y registrar en ER'}
          </button>
        </div>

        {/* Historial */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th>
              <th style={{textAlign:'right'}}>Total ventas</th>
              <th style={{textAlign:'right'}}>Efectivo</th>
              <th style={{textAlign:'right'}}>Tarjeta</th>
              <th style={{textAlign:'right'}}>Transacciones</th>
            </tr></thead>
            <tbody>
              {(imports as any[]).length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin importaciones</td></tr>
              )}
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
