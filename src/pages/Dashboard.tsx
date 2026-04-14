import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CorteCajaService {
  constructor(private prisma: PrismaService) {}

  async getCortes(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) where.status = status;
    return this.prisma.corteCaja.findMany({
      where,
      include: {
        cajero:    { select: { id: true, name: true } },
        validador: { select: { id: true, name: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async getVentasDelDia(companyId: string, fecha: string) {
    const start = new Date(fecha);
    start.setHours(0,0,0,0);
    const end = new Date(fecha);
    end.setHours(23,59,59,999);

    const ventas = await this.prisma.sale.findMany({
      where: { companyId, date: { gte: start, lte: end } },
    });

    const resumen = {
      totalVentas:   0,
      totalEfectivo: 0,
      totalTarjeta:  0,
      totalTransfer: 0,
      totalCredito:  0,
      totalDelivery: 0,
      porMetodo:     {} as Record<string,number>,
    };

    for (const v of ventas) {
      const total = Number(v.total);
      resumen.totalVentas += total;
      const metodo = v.paymentMethod?.toLowerCase() || 'efectivo';
      resumen.porMetodo[metodo] = (resumen.porMetodo[metodo] || 0) + total;

      if (metodo === 'efectivo')       resumen.totalEfectivo += total;
      else if (metodo === 'tarjeta')   resumen.totalTarjeta  += total;
      else if (metodo === 'transferencia') resumen.totalTransfer += total;
      else if (metodo === 'credito')   resumen.totalCredito  += total;
      else if (['rappi','ubereats','didi','pedidosya'].includes(metodo)) resumen.totalDelivery += total;
    }

    return resumen;
  }

  async crearCorte(companyId: string, cajeroId: string, data: any) {
    const fecha = new Date(data.fecha);
    fecha.setHours(0, 0, 0, 0);

    // Calcular diferencias
    const efectivoEsperado = data.totalEfectivo || 0;
    const efectivoContado  = data.efectivoContado || 0;
    const terminalEsperada = (data.totalTarjeta || 0) + (data.totalTransfer || 0);
    const terminalReportada = data.totalTerminal || 0;

    const diferenciaEfectivo  = efectivoContado  - efectivoEsperado;
    const diferenciaTerminal   = terminalReportada - terminalEsperada;
    const diferencia = diferenciaEfectivo + diferenciaTerminal;

    return this.prisma.corteCaja.create({
      data: {
        companyId,
        cajeroId,
        fecha,
        status:                'PENDIENTE',
        totalVentas:           data.totalVentas     || 0,
        totalEfectivo:         data.totalEfectivo   || 0,
        totalTarjeta:          data.totalTarjeta    || 0,
        totalTransfer:         data.totalTransfer   || 0,
        totalCredito:          data.totalCredito    || 0,
        totalDelivery:         data.totalDelivery   || 0,
        totalTerminal:         terminalReportada,
        efectivoContado:       efectivoContado,
        diferenciEfectivo:     diferenciaEfectivo,
        diferenciaTerminal,
        diferencia,
        notasCajero:           data.notasCajero     || null,
        detalleVentas:         data.detalleVentas   || null,
        desgloseDenominaciones: data.desgloseDenominaciones || null,
        desgloseTerminales:    data.desgloseTerminales     || null,
        desgloseDelivery:      data.desgloseDelivery       || null,
      },
      include: { cajero: { select: { id: true, name: true } } },
    });
  }

  async validarCorte(corteId: string, validadorId: string, data: any) {
    const corte = await this.prisma.corteCaja.findUnique({ where: { id: corteId } });
    if (!corte) throw new Error('Corte no encontrado');

    const efectivoFinal = data.efectivoReal !== undefined ? Number(data.efectivoReal) : Number(corte.efectivoContado);
    const diferencia = efectivoFinal - Number(corte.totalEfectivo);

    const updatedCorte = await this.prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        status:         'VALIDADO',
        efectivoReal:   efectivoFinal,
        diferencia,
        notasValidador: data.notasValidador || null,
        validadoPor:    validadorId,
        validadoAt:     new Date(),
      },
    });

    // Generar flujo bancario
    const branch = await this.prisma.branch.findFirst({ where: { companyId: corte.companyId } });
    const cajaCuenta = await this.prisma.cashAccount.findFirst({
      where: { companyId: corte.companyId, type: 'EFECTIVO', isActive: true },
    });

    if (cajaCuenta && efectivoFinal > 0 && branch) {
      await this.prisma.flowMovement.create({
        data: {
          companyId:     corte.companyId,
          branchId:      branch.id,
          cashAccountId: cajaCuenta.id,
          date:          corte.fecha,
          type:          'ENTRADA',
          originType:    'CORTE',
          originId:      corteId,
          amount:        efectivoFinal,
          currency:      'MXN',
          exchangeRate:  1,
          amountMxn:     efectivoFinal,
          notes:         `Corte de caja ${corte.fecha.toISOString().slice(0,10)}`,
        },
      });
    }

    return updatedCorte;
  }

  async responderCorte(corteId: string, cajeroId: string, respuesta: string) {
    const corte = await this.prisma.corteCaja.findUnique({ where: { id: corteId } });
    if (!corte) throw new Error("Corte no encontrado");
    const notasActualizadas = corte.notasCajero
      ? `${corte.notasCajero} | RESPUESTA: ${respuesta}`
      : `RESPUESTA: ${respuesta}`;
    return this.prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        status:      "PENDIENTE",
        notasCajero: notasActualizadas,
      },
    });
  }

  async rechazarCorte(corteId: string, validadorId: string, notas: string) {
    return this.prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        status:         'RECHAZADO',
        notasValidador: notas,
        validadoPor:    validadorId,
        validadoAt:     new Date(),
      },
    });
  }
}
