import { Routes, Route, Navigate } from 'react-router-dom';
import { useERPStore } from './store/erp.store';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import POSPage from './pages/machete/POS';
import ProduccionPage from './pages/machete/Produccion';
import InventarioPage from './pages/machete/Inventario';
import CatalogoPage from './pages/machete/Catalogo';
import OrdenesCompraPage from './pages/machete/OrdenesCompra';
import ComprasPage from './pages/machete/Compras';
import ProveedoresPage from './pages/Proveedores';
import ClientesPage from './pages/Clientes';
import IntercompanyPage from './pages/Intercompany';
import IntercompanyPage from './pages/Intercompany';
import MacheteReportesPage, { VentasReportePage, CxCReportePage, CxPReportePage } from './pages/machete/MacheteReportes';
import RHPage from './pages/rh/RH';
import PalestraDashboardPage from './pages/palestra/PalestraDashboard';
import MembresiasPage from './pages/palestra/Membresias';
import PalestraPOSPage from './pages/palestra/POS';
import ServiciosPage from './pages/palestra/Servicios';
import SoftRestaurantPage from './pages/palestra/SoftRestaurant';
import ComisionesPage from './pages/palestra/Comisiones';
import MiPerfilPage from './pages/rh/MiPerfil';
import ExpedientePage from './pages/rh/Expediente';
import NominaPage from './pages/rh/Nomina';
import { CortesPage, GastosPage, ConciliacionPage, CxCPage, CxPPage, ReportesPage, DocumentosPage, ConsolidadoPage, AdminPage, BitacoraPage } from './pages/AllPages';
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
        <Route path="/cortes" element={<Navigate to="/corte-caja" replace/>}/>
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
        <Route path="/produccion" element={<Navigate to="/machete/produccion" replace/>}/>
        <Route path="/catalogo" element={<CatalogoPage/>}/>
        <Route path="/ordenes-compra" element={<OrdenesCompraPage/>}/>
        <Route path="/machete/compras" element={<ComprasPage/>}/>
        <Route path="/proveedores" element={<Navigate to="/catalogo" replace/>}/>
        <Route path="/clientes" element={<Navigate to="/catalogo" replace/>}/>
        <Route path="/intercompany" element={<IntercompanyPage/>}/>
        <Route path="/bitacora" element={<BitacoraPage/>}/>
        <Route path="/machete-reportes" element={<Navigate to="/reportes" replace/>}/>
        <Route path="/reportes/ventas" element={<VentasReportePage/>}/>
        <Route path="/reportes/cxc"    element={<CxCReportePage/>}/>
        <Route path="/reportes/cxp"    element={<CxPReportePage/>}/>
        <Route path="/machete/produccion" element={<ProduccionPage/>}/>
        <Route path="/machete/inventario" element={<InventarioPage/>}/>
        <Route path="/palestra" element={<PalestraDashboardPage/>}/>
        <Route path="/palestra/pos" element={<PalestraPOSPage/>}/>
        <Route path="/palestra/membresias" element={<MembresiasPage/>}/>
        <Route path="/palestra/servicios" element={<ServiciosPage/>}/>
        <Route path="/palestra/soft-restaurant" element={<SoftRestaurantPage/>}/>
        <Route path="/palestra/comisiones" element={<ComisionesPage/>}/>
        <Route path="/rh" element={<RHPage/>}/>
        <Route path="/mi-perfil" element={<MiPerfilPage/>}/>
        <Route path="/rh/empleados/:id" element={<ExpedientePage/>}/>
        <Route path="/rh/nomina" element={<NominaPage/>}/>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes></RequireAuth>}/>
    </Routes>
  );
}
