import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import { GitHubService } from '../services/github.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GitHubAuthGuard } from '../guards/github-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubService: GitHubService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: 'Inscription réussie',
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @CurrentUser() user: User) {
    const tokens = await this.authService.login(loginDto);
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
        },
        tokens,
      },
      message: 'Connexion réussie',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );
    return {
      success: true,
      data: { tokens },
      message: 'Tokens rafraîchis avec succès',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.logout(refreshTokenDto.refreshToken);
    return {
      success: true,
      data: result,
      message: 'Déconnexion réussie',
    };
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return {
      success: true,
      data: result,
      message: 'Email vérifié avec succès',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: { user: userWithoutPassword },
      message: 'Profil récupéré avec succès',
    };
  }

  // GitHub OAuth Routes
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  async githubLogin() {
    // Redirige vers GitHub pour l'authentification
  }

  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const { user, githubProfile } = req.user as any;

    if (!user) {
      // L'utilisateur n'existe pas, rediriger vers le frontend avec les infos GitHub
      const params = new URLSearchParams({
        github_id: githubProfile.id,
        github_username: githubProfile.username,
        github_email: githubProfile.email,
        github_avatar: githubProfile.avatarUrl || '',
        github_name: githubProfile.displayName || '',
        action: 'link_account',
      });

      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/github-callback?${params}`,
      );
    }

    // S'assurer que le user a bien ses champs GitHub à jour
    try {
      console.log('user', user);
      await this.authService.linkGitHubAccount({
        userId: user.id,
        githubId: githubProfile.id,
        githubUsername: githubProfile.username,
        githubAvatarUrl: githubProfile.avatarUrl,
        accessToken: githubProfile.accessToken,
      });
    } catch {
      // Si une erreur survient, rediriger vers le frontend avec les infos GitHub
    }

    // Générer les tokens JWT pour l'utilisateur connecté
    const tokens = await this.authService.generateTokens(user);

    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      action: 'login_success',
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/github-callback?${params}`,
    );
  }

  @Get('github/repositories')
  @UseGuards(JwtAuthGuard)
  async getUserRepositories(@CurrentUser() user: User) {
    try {
      if (!user.githubAccessToken) {
        return {
          success: false,
          message: 'Compte GitHub non connecté',
          data: { connected: false },
        };
      }

      const repositories = await this.githubService.getUserRepositories(
        user.id,
      );

      return {
        success: true,
        data: {
          connected: true,
          repositories,
          githubUsername: user.githubUsername,
        },
        message: 'Repositories récupérés avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors de la récupération des repositories: ${error.message}`,
        data: { connected: false },
      };
    }
  }

  @Post('github/disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnectGitHub(@CurrentUser() user: User) {
    try {
      await this.authService.disconnectGitHub(user.id);

      return {
        success: true,
        message: 'Compte GitHub déconnecté avec succès',
        data: { connected: false },
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors de la déconnexion: ${error.message}`,
      };
    }
  }

  @Post('github/link')
  @UseGuards(JwtAuthGuard)
  async linkGitHub(@CurrentUser() user: User, @Body() body: any) {
    try {
      const { githubId, githubUsername, githubAvatarUrl, accessToken } = body || {};
      if (!githubId || !githubUsername || !accessToken) {
        return {
          success: false,
          message: 'Paramètres GitHub manquants',
        };
      }

      await this.authService.linkGitHubAccount({
        userId: user.id,
        githubId,
        githubUsername,
        githubAvatarUrl,
        accessToken,
      });

      return {
        success: true,
        message: 'Compte GitHub lié avec succès',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors du lien GitHub: ${error.message}`,
      };
    }
  }
}
