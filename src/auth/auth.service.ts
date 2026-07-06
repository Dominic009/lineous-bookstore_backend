/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { User, Provider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async adminLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user with USER role
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'USER',
        provider: 'EMAIL',
        status: 'ACTIVE',
      },
    });

    // Return success message without leaking sensitive data
    return {
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  // OAuth login methods
  async validateOAuthUser(
    email: string,
    provider: Provider,
    providerId: string,
    firstName?: string,
    lastName?: string,
    avatar?: string,
  ): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Create new user via OAuth
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          avatar,
          provider,
          providerId,
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
    } else {
      // Update existing user with OAuth info if needed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          providerId,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(avatar && { avatar }),
          emailVerified: true,
        },
      });
    }

    return user;
  }

  async generateToken(user: User) {
    const payload = {
      sub: user.id,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async socialLogin(
    email: string,
    provider: Provider,
    providerId: string,
    firstName?: string,
    lastName?: string,
    avatar?: string,
  ) {
    const user = await this.validateOAuthUser(
      email,
      provider,
      providerId,
      firstName,
      lastName,
      avatar,
    );

    return this.generateToken(user);
  }
}
