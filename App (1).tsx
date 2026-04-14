import { Routes, Route, Navigate } from 'react-router-dom';
import { useERPStore } from './store/erp.store';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import POSPage from './pages/machete/POS';
import ProduccionPage from './pages/machete/Produccion';
import InventarioPage from './pages/machete/Inventario';
import CatalogoPage from './pages/machete/Catalogo';
import OrdenesCompraPage from './pages/machete/OrdenesCompra';
import MacheteReportesPage from './pages/machete/MacheteReportes';
import RHPage from './pages/rh/RH';
import ExpedientePage from './pages/rh/Expediente';
import NominaPage from './pages/rh/Nomina';
import { CortesPage, GastosPage, ConciliacionPage, CxCPage, CxPPage, ReportesPage, DocumentosPage, ConsolidadoPage, AdminPage } from './pages/AllPages';
import CorteCajaPage from './pages/CorteCaja';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useERPStore(s => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace/>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/*" element={<RequireAuth><Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="/dashboard" element={<DashboardPage/>}/>
        <Route path="/cortes" element={<CortesPage/>}/>
        <Route path="/corte-caja" element={<CorteCajaPage/>}/>
        <Route path="/gastos" element={<GastosPage/>}/>
        <Route path="/conciliacion" element={<ConciliacionPage/>}/>
        <Route path="/cxc" element={<CxCPage/>}/>
        <Route path="/cxp" element={<CxPPage/>}/>
        <Route path="/reportes" element={<ReportesPage/>}/>
        <Route path="/documentos" element={<DocumentosPage/>}/>
        <Route path="/consolidado" element={<ConsolidadoPage/>}/>
        <Route path="/admin" element={<AdminPage/>}/>
        <Route path="/pos" element={<POSPage/>}/>
        <Route path="/produccion" element={<ProduccionPage/>}/>
        <Route path="/catalogo" element={<CatalogoPage/>}/>
        <Route path="/ordenes-compra" element={<OrdenesCompraPage/>}/>
        <Route path="/machete-reportes" element={<MacheteReportesPage/>}/>
        <Route path="/machete/produccion" element={<ProduccionPage/>}/>
        <Route path="/machete/inventario" element={<InventarioPage/>}/>
        <Route path="/rh" element={<RHPage/>}/>
        <Route path="/rh/empleados/:id" element={<ExpedientePage/>}/>
        <Route path="/rh/nomina" element={<NominaPage/>}/>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes></RequireAuth>}/>
    </Routes>
  );
}
