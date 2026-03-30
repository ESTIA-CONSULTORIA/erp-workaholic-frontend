import { Routes, Route, Navigate } from 'react-router-dom';
import { useERPStore } from './store/erp.store';

// Pages
import LoginPage     from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CortesPage    from './pages/Cortes';
import GastosPage    from './pages/Gastos';
import ConciliacionPage from './pages/Conciliacion';
import CxCPage       from './pages/CxC';
import ReportesPage  from './pages/Reportes';
import DocumentosPage from './pages/Documentos';
import ConsolidadoPage from './pages/Consolidado';
import AdminPage     from './pages/Admin';

// Machete
import POSPage       from './pages/machete/POS';
import ProduccionPage from './pages/machete/Produccion';
import CatalogoPage  from './pages/machete/Catalogo';
import MacheteReportesPage from './pages/machete/MacheteReportes';

// RH
import RHPage        from './pages/rh/RH';
import ExpedientePage from './pages/rh/Expediente';
import NominaPage    from './pages/rh/Nomina';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useERPStore(s => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace/>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>

      <Route path="/*" element={
        <RequireAuth>
          <Routes>
            <Route path="/"               element={<Navigate to="/dashboard" replace/>}/>
            <Route path="/dashboard"      element={<DashboardPage/>}/>
            <Route path="/cortes"         element={<CortesPage/>}/>
            <Route path="/gastos"         element={<GastosPage/>}/>
            <Route path="/conciliacion"   element={<ConciliacionPage/>}/>
            <Route path="/cxc"            element={<CxCPage/>}/>
            <Route path="/reportes"       element={<ReportesPage/>}/>
            <Route path="/documentos"     element={<DocumentosPage/>}/>
            <Route path="/consolidado"    element={<ConsolidadoPage/>}/>
            <Route path="/admin"          element={<AdminPage/>}/>
            {/* Machete */}
            <Route path="/pos"            element={<POSPage/>}/>
            <Route path="/produccion"     element={<ProduccionPage/>}/>
            <Route path="/catalogo"       element={<CatalogoPage/>}/>
            <Route path="/machete-reportes" element={<MacheteReportesPage/>}/>
            {/* RH */}
            <Route path="/rh"             element={<RHPage/>}/>
            <Route path="/rh/empleados/:id" element={<ExpedientePage/>}/>
            <Route path="/rh/nomina"      element={<NominaPage/>}/>
            <Route path="*"               element={<Navigate to="/dashboard" replace/>}/>
          </Routes>
        </RequireAuth>
      }/>
    </Routes>
  );
}
