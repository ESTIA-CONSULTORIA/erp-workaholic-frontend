import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/auth.guards';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private svc: CompaniesService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  // ── Usuarios ──────────────────────────────────────────────
  @Get(':id/users')
  getUsers(@Param('id') id: string) {
    return this.svc.getUsers(id);
  }

  @Post(':id/users')
  createUser(@Param('id') companyId: string, @Body() body: any) {
    return this.svc.createUser(companyId, body);
  }

  @Put(':id/users/:userId')
  updateUser(@Param('userId') userId: string, @Body() body: any) {
    return this.svc.updateUser(userId, body);
  }

  @Put(':id/users/:userId/toggle')
  toggleUser(@Param('userId') userId: string) {
    return this.svc.toggleUser(userId);
  }

  // ── Rubros financieros ───────────────────────────────────
  @Get(':id/financial-rubrics')
  getFinancialRubrics(@Param('id') id: string) {
    return this.svc.getFinancialRubrics(id);
  }

  // ── Clientes ──────────────────────────────────────────────
  @Get(':id/clients')
  getClients(@Param('id') id: string) {
    return this.svc.getClients(id);
  }

  @Post(':id/clients')
  createClient(@Param('id') id: string, @Body() body: any) {
    return this.svc.createClient(id, body);
  }

  @Put(':id/clients/:clientId')
  updateClient(@Param('clientId') clientId: string, @Body() body: any) {
    return this.svc.updateClient(clientId, body);
  }

  @Get(':id/clients/:clientId')
  getClientDetail(@Param('clientId') clientId: string) {
    return this.svc.getClientDetail(clientId);
  }

  // ── Órdenes de compra ─────────────────────────────────────
  @Get(':id/ordenes')
  getOrdenes(
    @Param('id') companyId: string,
    @Query('clientId') clientId?: string,
    @Query('status')   status?: string,
  ) {
    return this.svc.getOrdenes(companyId, clientId, status);
  }

  @Post(':id/clients/:clientId/ordenes')
  createOrden(@Param('id') cid: string, @Param('clientId') clientId: string, @Body() body: any) {
    return this.svc.createOrdenCompra(cid, clientId, body);
  }

  @Post(':id/ordenes/:ordenId/surtidos')
  registrarSurtido(@Param('ordenId') ordenId: string, @Body() body: any) {
    return this.svc.registrarSurtido(ordenId, body);
  }

  @Put(':id/ordenes/:ordenId/cancelar')
  cancelarOC(@Param('ordenId') ordenId: string, @Body() body: any) {
    return this.svc.cancelarOC(ordenId, body.motivo || '');
  }

  @Put(':id/ordenes/:ordenId/cerrar')
  cerrarOC(@Param('ordenId') ordenId: string) {
    return this.svc.cerrarOCParcial(ordenId);
  }
}
