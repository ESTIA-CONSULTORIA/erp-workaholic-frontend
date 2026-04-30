// ╔═══════════════════════════════════════════════════════════╗
// ║  ImportExportBar — Barra reutilizable para todos los      ║
// ║  módulos con listas de datos                              ║
// ║  Uso:                                                     ║
// ║  <ImportExportBar                                         ║
// ║    onExport={() => exportCSV(...)}                        ║
// ║    onImport={(rows) => createM.mutate(rows)}              ║
// ║    importColumns={[{key:'nombre',label:'Nombre'}, ...]}   ║
// ║    templateName="productos"                               ║
// ║  />                                                       ║
// ╚═══════════════════════════════════════════════════════════╝
import { useRef, useState } from 'react';

interface Column { key: string; label: string; required?: boolean; example?: string }

interface Props {
  onExport:      () => void;
  onImport?:     (rows: Record<string, string>[]) => void | Promise<void>;
  importColumns?: Column[];
  templateName?:  string;
  exportLabel?:   string;
  importLabel?:   string;
  color?:         string;
  loading?:       boolean;
}

export default function ImportExportBar({
  onExport, onImport, importColumns = [], templateName = 'datos',
  exportLabel = 'Exportar CSV', importLabel = 'Importar CSV',
  color = '#3b82f6', loading = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Record<string,string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // ── Descargar plantilla CSV ──────────────────────────────
  const downloadTemplate = () => {
    const header = importColumns.map(c => `"${c.label}"`).join(',');
    const example = importColumns.map(c => `"${c.example || ''}"`).join(',');
    const required = importColumns.map(c => `"${c.required ? 'Requerido' : 'Opcional'}"`).join(',');
    const csv = [header, example, required].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `plantilla_${templateName}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Leer CSV importado ───────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string)
          .replace(/^\uFEFF/, '') // BOM
          .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { setError('El archivo está vacío o solo tiene encabezado'); return; }

        // Parse header
        const header = parseCSVLine(lines[0]);
        const colMap = importColumns.reduce((acc, col) => {
          const idx = header.findIndex(h =>
            h.toLowerCase().trim() === col.label.toLowerCase().trim() ||
            h.toLowerCase().trim() === col.key.toLowerCase().trim()
          );
          if (idx >= 0) acc[col.key] = idx;
          return acc;
        }, {} as Record<string,number>);

        // Validate required columns
        const missing = importColumns
          .filter(c => c.required && colMap[c.key] === undefined)
          .map(c => c.label);
        if (missing.length > 0) {
          setError(`Columnas requeridas no encontradas: ${missing.join(', ')}`);
          return;
        }

        // Parse rows (skip header, skip empty and comment rows)
        const rows = lines.slice(1)
          .filter(l => !l.startsWith('"Requerido') && !l.startsWith('"Opcional') && l.trim())
          .map(line => {
            const vals = parseCSVLine(line);
            const row: Record<string,string> = {};
            importColumns.forEach(col => {
              if (colMap[col.key] !== undefined) {
                row[col.key] = vals[colMap[col.key]]?.trim() || '';
              }
            });
            return row;
          })
          .filter(row => Object.values(row).some(v => v)); // at least one value

        setPreview(rows.slice(0, 5));
        setShowPreview(true);

        // Auto-import after preview confirm
        if (onImport && rows.length > 0) {
          setImporting(true);
          Promise.resolve(onImport(rows))
            .then(() => {
              setShowPreview(false);
              setImporting(false);
              if (fileRef.current) fileRef.current.value = '';
            })
            .catch((err: any) => {
              setError(err?.message || 'Error al importar');
              setImporting(false);
            });
        }
      } catch (err: any) {
        setError('Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
      {/* Export */}
      <button onClick={onExport} disabled={loading}
        style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${color}`,
          background:'none', color, cursor:'pointer', fontSize:12, fontWeight:600,
          display:'flex', alignItems:'center', gap:5 }}>
        ⬇ {exportLabel}
      </button>

      {/* Import */}
      {onImport && (
        <>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
            onChange={handleFile}/>
          <button onClick={() => fileRef.current?.click()} disabled={importing || loading}
            style={{ padding:'6px 14px', borderRadius:7, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:12,
              display:'flex', alignItems:'center', gap:5 }}>
            ⬆ {importing ? 'Importando…' : importLabel}
          </button>
          {importColumns.length > 0 && (
            <button onClick={downloadTemplate}
              style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #1e293b',
                background:'none', color:'#475569', cursor:'pointer', fontSize:11 }}>
              📄 Plantilla
            </button>
          )}
        </>
      )}

      {error && (
        <span style={{ fontSize:11, color:'#f87171', background:'rgba(248,113,113,0.1)',
          padding:'4px 10px', borderRadius:6 }}>
          ⚠ {error}
          <button onClick={() => setError('')}
            style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', marginLeft:4 }}>✕</button>
        </span>
      )}

      {/* Preview modal */}
      {showPreview && preview.length > 0 && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:20, maxWidth:700,
            width:'90%', border:`1px solid ${color}44` }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 12px' }}>
              Vista previa — primeras {preview.length} filas
            </h3>
            <div style={{ overflowX:'auto', marginBottom:14 }}>
              <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#0f172a' }}>
                    {importColumns.map(c => (
                      <th key={c.key} style={{ padding:'6px 10px', textAlign:'left',
                        color:'#64748b', fontWeight:600, whiteSpace:'nowrap' }}>
                        {c.label}{c.required ? ' *' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #334155' }}>
                      {importColumns.map(c => (
                        <td key={c.key} style={{ padding:'5px 10px', color:'#94a3b8' }}>
                          {row[c.key] || <span style={{ color:'#334155' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 14px' }}>
              Importando en segundo plano…
            </p>
            <button onClick={() => setShowPreview(false)}
              style={{ padding:'8px 20px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV parser simple ──────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
