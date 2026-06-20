/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  NotFoundException,
  //   ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '@prisma/client';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new address
   * Security: Authenticated users
   */
  async create(
    dto: CreateAddressDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Address;
  }> {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        country: dto.country,
        division: dto.division,
        district: dto.district,
        area: dto.area,
        addressLine: dto.addressLine,
        postalCode: dto.postalCode,
        isDefault: dto.isDefault ?? false,
      },
    });

    return {
      message: 'Address created successfully',
      status: 'success',
      data: address,
    };
  }

  /**
   * Get all addresses for a user
   * Security: Authenticated users (own addresses)
   */
  async findAll(userId: string): Promise<{
    message: string;
    status: string;
    data: Address[];
  }> {
    const addresses = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        addresses.length > 0
          ? 'Addresses retrieved successfully'
          : 'No addresses found',
      status: 'success',
      data: addresses,
    };
  }

  /**
   * Get a single address by ID
   * Security: Authenticated users (own address)
   */
  async findOne(
    id: string,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Address;
  }> {
    const address = await this.prisma.address.findUnique({
      where: { id, userId, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return {
      message: 'Address retrieved successfully',
      status: 'success',
      data: address,
    };
  }

  /**
   * Update an address
   * Security: Authenticated users (own address)
   */
  async update(
    id: string,
    dto: UpdateAddressDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Address;
  }> {
    const existingAddress = await this.prisma.address.findUnique({
      where: { id, userId, deletedAt: null },
    });

    if (!existingAddress) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        country: dto.country,
        division: dto.division,
        district: dto.district,
        area: dto.area,
        addressLine: dto.addressLine,
        postalCode: dto.postalCode,
        isDefault: dto.isDefault,
      },
    });

    return {
      message: 'Address updated successfully',
      status: 'success',
      data: address,
    };
  }

  /**
   * Delete an address (soft delete)
   * Security: Authenticated users (own address)
   */
  async remove(
    id: string,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    const address = await this.prisma.address.findUnique({
      where: { id, userId, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Soft delete
    await this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Address deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
