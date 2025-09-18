import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Injectable()
export class GitHubAuthGuard extends AuthGuard('github') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse<Response>();
    // Si l'utilisateur a annulé/erreur OAuth, rediriger proprement vers le frontend
    if (err || !user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/login?github=cancelled`);
      return null;
    }
    return user;
  }
}
