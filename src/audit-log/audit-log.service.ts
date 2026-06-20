/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLog, Role } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all audit logs
   * Security: Admins only
   */
  async findAll(requestingUserRole: Role): Promise<{
    message: string;
    status: string;
    data: AuditLog[];
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can view audit logs');
    }

    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        logs.length > 0
          ? 'Audit logs retrieved successfully'
          : 'No audit logs found',
      status: 'success',
      data: logs,
    };
  }

  /**
   * Get audit logs for a specific entity
   * Security: Admins only
   */
  async findByEntity(
    entity: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: AuditLog[];
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can view audit logs');
    }

    const logs = await this.prisma.auditLog.findMany({
      where: { entity },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        logs.length > 0
          ? 'Audit logs retrieved successfully'
          : 'No audit logs found',
      status: 'success',
      data: logs,
    };
  }

  /**
   * Create an audit log entry
   * This is called internally by other services
   */
  async createLog(
    userId: string | null,
    entity: string,
    entityId: string | null,
    action: string,
    oldValue: string | null,
    newValue: string | null,
    ipAddress: string | null,
  ): Promise<AuditLog> {
    return await this.prisma.auditLog.create({
      data: {
        userId,
        entity,
        entityId,
        action,
        oldValue,
        newValue,
        ipAddress,
      },
    });
  }
}
