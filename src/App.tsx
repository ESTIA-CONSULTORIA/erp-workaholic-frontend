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
import IntercompanyPage from './pages/Intercompany';
import { VentasReportePage, CxCReportePage, CxPReportePage } from './pages/machete/MacheteReportes';
import RHPage from './pages/rh/RH';
import PalestraDashboardPage from './pages/palestra/PalestraDashboard';
import MembresiasPage from './pages/palestra/Membresias';
import PalestraPOSPage from './pages/palestra/POS';
import ServiciosPage from './pages/palestra/Servicios';
import SoftRestaurantPage from './pages/palestra/SoftRestaurant';
import ComisionesPage from './pages/palestra/Comisiones';
import PalestraProductosPage from './pages/palestra/Productos';
import MiPerfilPage from './pages/rh/MiPerfil';
import AprobacionesPage from './pages/Aprobaciones';
import IncidenciasPage from './pages/rh/Incidencias';
import BajasPage from './pages/rh/Bajas';
import WorkaholicDashboard from './pages/workaholic/Dashboard';
import EspaciosPage from './pages/workaholic/Espacios';
import ReservacionesPage from './pages/workaholic/Reservaciones';
import WorkaholicMembresiasPage from './pages/workaholic/Membresias';
import WorkaholicPOSPage from './pages/workaholic/POS';
import WorkaholicSoftPage from './pages/workaholic/SoftRestaurant';
import IncapacidadesPage from './pages/rh/Incapacidades';
import ExpedientePage from './pages/rh/Expediente';
import NominaPage from './pages/rh/Nomina';
import { GastosPage, ConciliacionPage, CxCPage, ReportesPage, DocumentosPage, ConsolidadoPage, AdminPage, BitacoraPage } from './pages/AllPages';
import CorteCajaPage from './pages/CorteCaja';
import PermisosPage from './pages/Admin/Permisos';
import CxPPage from './pages/finanzas/CxP';
import LoncheDashboard from './pages/lonche/Dashboard';
import LonchePOS from './pages/lonche/POS';
import SurtidoPage from './pages/lonche/Surtido';
import AlumnosPage from './pages/lonche/Alumnos';
import LoncheCatalogo from './pages/lonche/Catalogo';
import LoncheReportes from './pages/lonche/Reportes';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useERPStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cortes" element={<CortesPage />} />
              <Route path="/corte-caja" element={<CorteCajaPage />} />
              <Route path="/gastos" element={<GastosPage />} />
              <Route path="/conciliacion" element={<ConciliacionPage />} />
              <Route path="/cxc" element={<CxCPage />} />
              <Route path="/cxp" element={<CxPPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              <Route path="/consolidado" element={<ConsolidadoPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/permisos" element={<PermisosPage />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/catalogo" element={<CatalogoPage />} />
              <Route path="/ordenes-compra" element={<OrdenesCompraPage />} />
              <Route path="/machete/compras" element={<ComprasPage />} />
              <Route path="/intercompany" element={<IntercompanyPage />} />
              <Route path="/bitacora" element={<BitacoraPage />} />
              <Route path="/reportes/ventas" element={<VentasReportePage />} />
              <Route path="/reportes/cxc" element={<CxCReportePage />} />
              <Route path="/reportes/cxp" element={<CxPReportePage />} />
              <Route path="/machete/produccion" element={<ProduccionPage />} />
              <Route path="/machete/inventario" element={<InventarioPage />} />
              <Route path="/palestra" element={<PalestraDashboardPage />} />
              <Route path="/palestra/pos" element={<PalestraPOSPage />} />
              <Route path="/palestra/membresias" element={<MembresiasPage />} />
              <Route path="/palestra/servicios" element={<ServiciosPage />} />
              <Route path="/palestra/soft-restaurant" element={<SoftRestaurantPage />} />
              <Route path="/palestra/comisiones" element={<ComisionesPage />} />
              <Route path="/palestra/productos" element={<PalestraProductosPage />} />
              <Route path="/rh" element={<RHPage />} />
              <Route path="/mi-perfil" element={<MiPerfilPage />} />
              <Route path="/rh/empleados/:id" element={<ExpedientePage />} />
              <Route path="/rh/nomina" element={<NominaPage />} />
              <Route path="/workaholic" element={<WorkaholicDashboard />} />
              <Route path="/workaholic/pos" element={<WorkaholicPOSPage />} />
              <Route path="/workaholic/espacios" element={<EspaciosPage />} />
              <Route path="/workaholic/reservaciones" element={<ReservacionesPage />} />
              <Route path="/workaholic/membresias" element={<WorkaholicMembresiasPage />} />
              <Route path="/workaholic/soft-restaurant" element={<WorkaholicSoftPage />} />
                            <Route path="/lonche" element={<LoncheDashboard />} />
              <Route path="/lonche/pos" element={<LonchePOS />} />
              <Route path="/lonche/surtido" element={<SurtidoPage />} />
              <Route path="/lonche/alumnos" element={<AlumnosPage />} />
              <Route path="/lonche/catalogo" element={<LoncheCatalogo />} />
              <Route path="/lonche/reportes" element={<LoncheReportes />} />
              <Route path="/aprobaciones" element={<AprobacionesPage />} />
              <Route path="/rh/incidencias" element={<IncidenciasPage />} />
              <Route path="/rh/bajas" element={<BajasPage />} />
              <Route path="/rh/incapacidades" element={<IncapacidadesPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
