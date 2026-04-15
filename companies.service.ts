import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { branches: true },
    });
  }

  async getFinancialRubrics(companyId: string) {
    const schema = await this.prisma.financialSchema.findFirst({
      where: { companyId, isActive: true },
      include: {
        sections: {
          include: {
            groups: {
              include: {
                rubrics: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!schema) return [];
    // Aplanar en lista agrupada para el selector
    const result: any[] = [];
    for (const section of schema.sections) {
      for (const group of section.groups) {
        for (const rubric of group.rubrics) {
          result.push({
            id:        rubric.id,
            code:      rubric.code,
            name:      rubric.name,
            groupName: group.name,
            sectionName: section.name,
            label:     `${section.name} → ${group.name} → ${rubric.name}`,
          });
        }
      }
    }
    return result;
  }

  // ── Usuarios ──────────────────────────────────────────────
  getUsers(companyId: string) {
    return this.prisma.userCompanyRole.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        role: true,
      },
    });
  }

  async createUser(companyId: string, data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Buscar o crear rol
    let role = await this.prisma.role.findUnique({ where: { code: data.roleCode } });
    if (!role) {
      role = await this.prisma.role.create({
        data: { code: data.roleCode, name: data.roleCode, description: data.roleCode },
      });
    }

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        name:         data.name,
        email:        data.email,
        passwordHash,
        isActive:     true,
      },
    });

    // Asignar a todas las empresas seleccionadas
    const companyIds: string[] = data.companyIds || [companyId];
    for (const cid of companyIds) {
      await this.prisma.userCompanyRole.create({
        data: { userId: user.id, companyId: cid, roleId: role.id },
      });
    }

    return user;
  }

  async updateUser(userId: string, data: any) {
    const updateData: any = {
      name: data.name,
    };

    if (data.password && data.password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Actualizar datos del usuario
    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  updateData,
    });

    // Actualizar rol si viene
    if (data.roleCode) {
      let role = await this.prisma.role.findUnique({ where: { code: data.roleCode } });
      if (!role) {
        role = await this.prisma.role.create({
          data: { code: data.roleCode, name: data.roleCode, description: data.roleCode },
        });
      }
      // Actualizar en todas las empresas del usuario
      const userRoles = await this.prisma.userCompanyRole.findMany({ where: { userId } });
      for (const ur of userRoles) {
        await this.prisma.userCompanyRole.update({
          where: { id: ur.id },
          data:  { roleId: role.id },
        });
      }
    }

    return user;
  }

  async toggleUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');
    return this.prisma.user.update({
      where: { id: userId },
      data:  { isActive: !user.isActive },
    });
  }

  // ── Clientes ──────────────────────────────────────────────
  getClients(companyId: string) {
    return this.prisma.client.findMany({
      where: { companyId, isActive: true },
      include: { _count: { select: { ordenesCompra: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createClient(companyId: string, data: any) {
    return this.prisma.client.create({
      data: {
        companyId,
        name:        data.name,
        rfc:         data.rfc         || null,
        phone:       data.phone       || null,
        email:       data.email       || null,
        address:     data.address     || null,
        creditLimit: data.creditLimit || 0,
        creditDays:  data.creditDays  || 0,
        isActive:    true,
      },
    });
  }

  updateClient(clientId: string, data: any) {
    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        name:        data.name,
        rfc:         data.rfc         || null,
        phone:       data.phone       || null,
        email:       data.email       || null,
        address:     data.address     || null,
        creditLimit: data.creditLimit || 0,
        creditDays:  data.creditDays  || 0,
      },
    });
  }

  getClientDetail(clientId: string) {
    return this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        ordenesCompra: {
          include: {
            lineas:   { include: { product: true } },
            surtidos: true,
          },
          orderBy: { fecha: 'desc' },
        },
        receivables: {
          where:   { status: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDO'] } },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  // ── Órdenes de compra ─────────────────────────────────────
  async getOrdenes(companyId: string, clientId?: string, status?: string) {
    const where: any = { companyId };
    if (clientId) where.clientId = clientId;
    if (status === 'ACTIVAS') {
      where.status = { in: ['PENDIENTE', 'SURTIDO_PARCIAL'] };
    } else if (status) {
      where.status = status;
    }
    return this.prisma.ordenCompra.findMany({
      where,
      include: {
        client:   { select: { id: true, name: true } },
        lineas:   { include: { product: true } },
        surtidos: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async createOrdenCompra(companyId: string, clientId: string, data: any) {
    const montoTotal = data.lineas
      ? data.lineas.reduce((t: number, l: any) => t + (l.cantidad * l.precioUnitario), 0)
      : Number(data.montoTotal || 0);

    const oc = await this.prisma.ordenCompra.create({
      data: {
        companyId,
        clientId,
        numero:     data.numero,
        fecha:      new Date(data.fecha),
        montoTotal,
        saldo:      montoTotal,
        status:     'PENDIENTE',
        notes:      data.notes || null,
        lineas: data.lineas ? {
          create: data.lineas.map((l: any) => ({
            productId:      l.productId,
            cantidad:       l.cantidad,
            precioUnitario: l.precioUnitario,
            total:          l.cantidad * l.precioUnitario,
          })),
        } : undefined,
      },
      include: { lineas: { include: { product: true } } },
    });

    // Crear Receivable — la OC es una preventa, el ingreso se registra al crearla
    if (montoTotal > 0) {
      try {
        const fecha = new Date(data.fecha);
        fecha.setHours(0, 0, 0, 0);
        const dueDate = new Date(fecha);
        dueDate.setDate(dueDate.getDate() + 30);

        await this.prisma.receivable.create({
          data: {
            companyId,
            clientId,
            date:           fecha,
            dueDate,
            originalAmount: montoTotal,
            paidAmount:     0,
            balance:        montoTotal,
            currency:       'MXN',
            status:         'PENDIENTE',
            notes:          `OC #${data.numero}`,
          },
        });
      } catch (e: any) {
        console.error('ERROR CXC OC:', e.message);
      }
    }

    return oc;
  }

  async registrarSurtido(ordenId: string, data: any) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenId },
      include: { lineas: true },
    });
    if (!orden) throw new Error('OC no encontrada');
    if (orden.status === 'CANCELADA') throw new Error('No se puede surtir una OC cancelada');

    let montoSurtido = 0;

    if (data.lineas && data.lineas.length > 0) {
      for (const ls of data.lineas) {
        const linea = orden.lineas.find((l: any) => l.id === ls.lineaId);
        if (!linea) continue;
        const nuevaCantSurtida = Number(linea.cantidadSurtida) + Number(ls.cantidad);
        await this.prisma.lineaOC.update({
          where: { id: ls.lineaId },
          data:  { cantidadSurtida: nuevaCantSurtida },
        });
        montoSurtido += Number(ls.cantidad) * Number(linea.precioUnitario);
      }
    } else {
      montoSurtido = Number(data.monto || 0);
    }

    const nuevoMontoSurtido = Number(orden.montoSurtido) + montoSurtido;
    const nuevoSaldo        = Number(orden.montoTotal)   - nuevoMontoSurtido;
    const nuevoStatus       = nuevoSaldo <= 0 ? 'SURTIDO_COMPLETO' : 'SURTIDO_PARCIAL';

    return this.prisma.$transaction([
      this.prisma.surtidoOC.create({
        data: {
          ordenCompraId: ordenId,
          fecha:         new Date(data.fecha),
          monto:         montoSurtido,
          notes:         data.notes || null,
        },
      }),
      this.prisma.ordenCompra.update({
        where: { id: ordenId },
        data:  { montoSurtido: nuevoMontoSurtido, saldo: nuevoSaldo, status: nuevoStatus },
      }),
    ]);
  }

  async cancelarOC(ordenId: string, motivo: string) {
    return this.prisma.ordenCompra.update({
      where: { id: ordenId },
      data:  { status: 'CANCELADA', notes: motivo },
    });
  }

  async cerrarOCParcial(ordenId: string) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id: ordenId } });
    if (!orden) throw new Error('OC no encontrada');
    return this.prisma.ordenCompra.update({
      where: { id: ordenId },
      data:  { status: 'SURTIDO_COMPLETO' },
    });
  }
}
