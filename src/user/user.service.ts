/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   * Security: Only admins can create users with different roles
   */
  async create(
    dto: CreateUserDto,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only admins can create users with roles other than USER
    if (
      dto.role &&
      dto.role !== Role.USER &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Only administrators can create admin users',
      );
    }

    // Hash password if provided (for email/password auth)
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: hashedPassword,
        provider: dto.provider || 'EMAIL',
        providerId: dto.providerId,
        avatar: dto.avatar,
        role: dto.role || Role.USER,
        status: dto.status || UserStatus.ACTIVE,
      },
    });

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...userWithoutPassword } = user;

    return {
      message: 'User created successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Get all users
   * Security: Admins only
   */
  async findAll(
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>[];
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can view all users');
    }

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Remove passwords from response
    const usersWithoutPassword = users.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = u;
      return rest;
    });

    return {
      message:
        users.length > 0 ? 'Users retrieved successfully' : 'No users found',
      status: 'success',
      data: usersWithoutPassword,
    };
  }

  /**
   * Get a single user by ID
   * Security: Users can view their own profile, admins can view any
   */
  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Users can only view their own profile unless they're admin
    if (requestingUserRole !== Role.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User retrieved successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Update a user
   * Security: Users can update their own profile, admins can update any
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Users can only update their own profile unless they're admin
    if (requestingUserRole !== Role.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (dto.role && requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can change user roles');
    }

    // Only admins can change status
    if (dto.status && requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can change user status',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check if it's already taken
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // If password is being changed, hash it
    const updateData: {
      email?: string;
      password?: string;
      role?: Role;
      status?: UserStatus;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    } = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.avatar) updateData.avatar = dto.avatar;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) updateData.role = dto.role;
    if (dto.status) updateData.status = dto.status;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...userWithoutPassword } = user;

    return {
      message: 'User updated successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Delete a user (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting themselves
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'User deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
