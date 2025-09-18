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

    // Récupérer l'email principal si disponible (peut être privé/inexistant)
    const email =
      emails?.find((item: any) => item?.primary)?.value || emails?.[0]?.value || null;

    // 1) Chercher d'abord par githubId (cas utilisateur déjà lié)
    let user = await this.databaseService.user.findFirst({
      where: { githubId: id.toString() },
    });

    // 2) Sinon, tenter par email si disponible
    if (!user && email) {
      user = await this.databaseService.user.findUnique({ where: { email } });
    }

    // Si utilisateur trouvé, mettre à jour les infos GitHub et retourner
    if (user) {
      user = await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          githubId: id.toString(),
          githubUsername: username,
          githubAccessToken: accessToken,
          githubAvatarUrl: photos?.[0]?.value,
          githubConnectedAt: new Date(),
          firstName: user.firstName || displayName?.split(' ')[0] || user.firstName,
          lastName:
            user.lastName || (displayName ? displayName.split(' ').slice(1).join(' ') : user.lastName),
        },
      });
    }

    // Ne pas créer d'utilisateur ici: laisser le frontend gérer le lien/inscription
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
