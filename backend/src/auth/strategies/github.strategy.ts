import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email', 'repo'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;

    // Récupérer l'email principal
    const email =
      emails?.find((email: any) => email.primary)?.value || emails?.[0]?.value;

    if (!email) {
      throw new Error("Email GitHub requis pour l'authentification");
    }

    // Chercher l'utilisateur existant par email ou GitHub ID
    let user = await this.databaseService.user.findFirst({
      where: {
        OR: [{ email }, { githubId: id.toString() }],
      },
    });

    if (user) {
      // Mettre à jour les infos GitHub si l'utilisateur existe
      user = await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          githubId: id.toString(),
          githubUsername: username,
          githubAccessToken: accessToken,
          githubAvatarUrl: photos?.[0]?.value,
          githubConnectedAt: new Date(),
          // Mettre à jour le nom si pas défini
          firstName: user.firstName || displayName?.split(' ')[0],
          lastName: user.lastName || displayName?.split(' ').slice(1).join(' '),
        },
      });
    }

    return {
      user,
      githubProfile: {
        id: id.toString(),
        username,
        displayName,
        email,
        avatarUrl: photos?.[0]?.value,
        accessToken,
      },
    };
  }
}
