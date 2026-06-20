/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Request interface with user from JWT
 */
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Get all audit logs
   * Access: Admins only
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.auditLogService.findAll(req.user.role);
  }

  /**
   * Get audit logs for a specific entity
   * Access: Admins only
   */
  @Get('entity')
  findByEntity(
    @Query('entity') entity: string,
    @Request() req: RequestWithUser,
  ) {
    return this.auditLogService.findByEntity(entity, req.user.role);
  }
}
