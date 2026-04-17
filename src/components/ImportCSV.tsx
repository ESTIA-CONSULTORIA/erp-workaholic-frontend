import { useState, useRef } from 'react';
import { exportCSV } from '../lib/api';

interface Column { key: string; label: string; required?: boolean; type?: 'string'|'number'|'date'; }

interface Props {
  title:      string;
  columns:    Column[];
  onImport:   (rows: Record<string,any>[]) => Promise<{ ok: number; errors: string[] }>;
  onClose:    () => void;
  color?:     string;
}

export default function ImportCSV({ title, columns, onImport, onClose, color='#3b82f6' }: Props) {
  const [step,     setStep]     = useState<'upload'|'preview'|'done'>('upload');
  const [rows,     setRows]     = useState<Record<string,any>[]>([]);
  const [errors,   setErrors]   = useState<string[]>([]);
  const [result,   setResult]   = useState<{ ok:number; errors:string[] }|null>(null);
  const [loading,  setLoading]  = useState(false);
  const [parseErr, setParseErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    exportCSV(`plantilla_${title.toLowerCase().replace(/\s+/g,'_')}`,
      [Object.fromEntries(columns.map(c => [c.key, c.type==='number' ? '0' : c.type==='date' ? 'YYYY-MM-DD' : 'texto']))],
      columns
    );
  };

  const parseCSV = (text: string): Record<string,any>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('El archivo está vacío o solo tiene encabezado');
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim());
    return lines.slice(1).map((line, i) => {
      const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
      const row: Record<string,any> = { _line: i+2 };
      headers.forEach((h,j) => {
        row[h] = (vals[j]||'').replace(/^"|"$/g,'').trim();
      });
      return row;
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseErr('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);

        // Validate required columns
        const firstRow = parsed[0];
        const missing = columns.filter(c => c.required && !(c.key in firstRow) && !(c.label in firstRow));
        if (missing.length > 0) {
          setParseErr(`Columnas requeridas faltantes: ${missing.map(c=>c.label).join(', ')}`);
          return;
        }

        // Normalize keys (match by label or key)
        const normalized = parsed.map(row => {
          const out: Record<string,any> = {};
          columns.forEach(col => {
            const val = row[col.key] ?? row[col.label] ?? '';
            if (col.type === 'number') out[col.key] = Number(val) || 0;
            else out[col.key] = val;
          });
          return out;
        });

        // Validate required fields
        const rowErrors: string[] = [];
        normalized.forEach((row, i) => {
          columns.filter(c => c.required).forEach(col => {
            if (!row[col.key] && row[col.key] !== 0) {
              rowErrors.push(`Fila ${i+2}: campo "${col.label}" es requerido`);
            }
          });
        });

        setRows(normalized);
        setErrors(rowErrors);
        setStep('preview');
      } catch(err: any) {
        setParseErr(err.message || 'Error al leer el archivo');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      setStep('done');
    } catch(err: any) {
      setResult({ ok:0, errors:[err.response?.data?.message || err.message || 'Error al importar'] });
      setStep('done');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'#0f172a', borderRadius:12, border:'1px solid #334155',
        width:'90vw', maxWidth:700, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>Importar {title}</h3>
          <button onClick={onClose}
            style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div>
              <div style={{ background:'#1e293b', borderRadius:8, padding:16, marginBottom:16 }}>
                <p style={{ fontSize:13, color:'#94a3b8', margin:'0 0 12px' }}>
                  El archivo CSV debe tener las siguientes columnas:
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {columns.map(c => (
                    <span key={c.key} style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background: c.required ? color+'33' : '#334155',
                      color: c.required ? color : '#94a3b8',
                      border: `1px solid ${c.required ? color+'44' : '#475569'}` }}>
                      {c.label}{c.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize:11, color:'#475569', margin:'8px 0 0' }}>* campos requeridos</p>
              </div>

              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <button onClick={downloadTemplate}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                    background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                  ⬇ Descargar plantilla CSV
                </button>
                <label style={{ flex:2, padding:'10px', borderRadius:8, textAlign:'center',
                  border:`2px dashed ${color}44`, background:color+'11', color, cursor:'pointer',
                  fontSize:13, fontWeight:600 }}>
                  📂 Seleccionar archivo CSV
                  <input ref={fileRef} type="file" accept=".csv,.txt"
                    style={{ display:'none' }} onChange={handleFile}/>
                </label>
              </div>

              {parseErr && (
                <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
                  borderRadius:8, padding:'8px 12px', fontSize:13, color:'#f87171' }}>
                  {parseErr}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>
                  <strong style={{ color:'#f1f5f9' }}>{rows.length}</strong> filas encontradas
                  {errors.length > 0 && <span style={{ color:'#f87171' }}> · {errors.length} errores</span>}
                </p>
                <button onClick={() => setStep('upload')}
                  style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
                  ← Cambiar archivo
                </button>
              </div>

              {errors.length > 0 && (
                <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
                  borderRadius:8, padding:'8px 12px', marginBottom:12, maxHeight:100, overflowY:'auto' }}>
                  {errors.slice(0,5).map((e,i) => (
                    <p key={i} style={{ fontSize:12, color:'#f87171', margin:'2px 0' }}>• {e}</p>
                  ))}
                  {errors.length > 5 && <p style={{ fontSize:11, color:'#f87171', margin:'4px 0 0' }}>...y {errors.length-5} más</p>}
                </div>
              )}

              <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid #334155' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#1e293b' }}>
                      {columns.map(c => (
                        <th key={c.key} style={{ padding:'8px 10px', textAlign:'left',
                          color:'#64748b', fontWeight:600, fontSize:11, whiteSpace:'nowrap',
                          borderBottom:'1px solid #334155' }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0,8).map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #1e293b' }}>
                        {columns.map(c => (
                          <td key={c.key} style={{ padding:'7px 10px', color:'#94a3b8', whiteSpace:'nowrap',
                            maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>
                            {String(row[c.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 8 && (
                <p style={{ fontSize:11, color:'#475569', textAlign:'center', marginTop:6 }}>
                  Mostrando 8 de {rows.length} filas
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && result && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              {result.ok > 0 && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:40, margin:'0 0 8px' }}>✅</p>
                  <p style={{ fontSize:18, fontWeight:700, color:'#10b981', margin:'0 0 4px' }}>
                    {result.ok} registros importados
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
                  borderRadius:8, padding:12, textAlign:'left', marginTop:12 }}>
                  <p style={{ fontSize:13, color:'#f87171', fontWeight:600, margin:'0 0 6px' }}>
                    {result.errors.length} errores:
                  </p>
                  {result.errors.slice(0,5).map((e,i) => (
                    <p key={i} style={{ fontSize:12, color:'#fca5a5', margin:'2px 0' }}>• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #334155', display:'flex', gap:8 }}>
          {step === 'preview' && (
            <>
              <button onClick={onClose}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={handleImport} disabled={loading || rows.length === 0}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background: rows.length === 0 ? '#334155' : color,
                  color:'#fff', cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize:13, fontWeight:700 }}>
                {loading ? 'Importando…' : `Importar ${rows.length} registros`}
              </button>
            </>
          )}
          {(step === 'upload' || step === 'done') && (
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8,
              border:`1px solid ${color}`, background:color+'22', color, cursor:'pointer', fontSize:13 }}>
              {step === 'done' ? 'Cerrar' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
