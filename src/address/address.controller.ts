import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
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

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * Create a new address
   * Access: Authenticated users
   */
  @Post()
  create(@Body() dto: CreateAddressDto, @Request() req: RequestWithUser) {
    return this.addressService.create(dto, req.user.id);
  }

  /**
   * Get all addresses for the authenticated user
   * Access: Authenticated users
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.addressService.findAll(req.user.id);
  }

  /**
   * Get a single address by ID
   * Access: Authenticated users (own address)
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.addressService.findOne(id, req.user.id);
  }

  /**
   * Update an address
   * Access: Authenticated users (own address)
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @Request() req: RequestWithUser,
  ) {
    return this.addressService.update(id, dto, req.user.id);
  }

  /**
   * Delete an address
   * Access: Authenticated users (own address)
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.addressService.remove(id, req.user.id);
  }
}
