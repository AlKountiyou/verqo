import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload, AuthTokens } from '../interfaces/jwt-payload.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Omit<User, 'password'>; message: string }> {
    const { email, password, firstName, lastName, role } = registerDto;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Hash du mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Générer un token de vérification email
    const emailVerificationToken = randomBytes(32).toString('hex');

    // Créer l'utilisateur
    const user = await this.databaseService.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || UserRole.CLIENT,
        emailVerificationToken,
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: 'Utilisateur créé avec succès. Veuillez vérifier votre email.',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }

    return null;
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      }),
    ]);

    // Stocker le refresh token en base
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Vérifier que le refresh token existe en base
      const storedToken = await this.databaseService.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token invalide ou expiré');
      }

      // Supprimer l'ancien refresh token
      await this.databaseService.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Générer de nouveaux tokens
      return this.generateTokens(storedToken.user);
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    // Supprimer le refresh token de la base
    await this.databaseService.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Déconnexion réussie' };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 jours

    await this.databaseService.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: expirationDate,
      },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.databaseService.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de vérification invalide');
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async disconnectGitHub(userId: string): Promise<{ message: string }> {
    // Révoquer le token côté GitHub si possible
    try {
      const user = await this.databaseService.user.findUnique({
        where: { id: userId },
        select: { githubAccessToken: true },
      });
      const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
      if (user?.githubAccessToken && clientId && clientSecret) {
        await fetch(`https://api.github.com/applications/${clientId}/token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: JSON.stringify({ access_token: user.githubAccessToken }),
        });
      }
    } catch {
      // Ignore revocation errors to not block local disconnect
    }

    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        githubId: null,
        githubUsername: null,
        githubAccessToken: null,
        githubAvatarUrl: null,
        githubConnectedAt: null,
      },
    });

    return { message: 'Compte GitHub déconnecté avec succès' };
  }

  async linkGitHubAccount(params: {
    userId: string;
    githubId: string;
    githubUsername?: string;
    githubAvatarUrl?: string;
    accessToken?: string;
  }): Promise<void> {
    const { userId, githubId, githubUsername, githubAvatarUrl, accessToken } = params;
    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        githubId,
        githubUsername,
        githubAvatarUrl,
        githubAccessToken: accessToken ?? undefined,
        githubConnectedAt: new Date(),
      },
    });
  }
}
