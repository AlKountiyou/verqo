import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class GitHubService {
  constructor(private databaseService: DatabaseService) {}

  async getOctokit(userId: string): Promise<any> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      throw new Error('Utilisateur non connecté à GitHub');
    }

    const { Octokit } = await import('@octokit/rest');
    return new Octokit({
      auth: user.githubAccessToken,
    });
  }

  async getUserRepositories(userId: string): Promise<any[]> {
    const octokit = await this.getOctokit(userId);
    
    try {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        private: repo.private,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des repositories: ${error.message}`);
    }
  }

  async getRepositoryDetails(userId: string, owner: string, repo: string): Promise<any> {
    const octokit = await this.getOctokit(userId);
    
    try {
      const { data } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        htmlUrl: data.html_url,
        cloneUrl: data.clone_url,
        sshUrl: data.ssh_url,
        private: data.private,
        language: data.language,
        defaultBranch: data.default_branch,
        hasIssues: data.has_issues,
        hasProjects: data.has_projects,
        hasWiki: data.has_wiki,
        permissions: data.permissions,
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du repository: ${error.message}`);
    }
  }

  async getRepositoryContents(userId: string, owner: string, repo: string, path = ''): Promise<any[]> {
    const octokit = await this.getOctokit(userId);
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du contenu: ${error.message}`);
    }
  }

  async checkRepositoryAccess(userId: string, repoUrl: string): Promise<boolean> {
    try {
      // Extraire owner/repo de l'URL GitHub
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return false;
      }

      const [, owner, repo] = match;
      await this.getRepositoryDetails(userId, owner, repo.replace('.git', ''));
      return true;
    } catch (error) {
      return false;
    }
  }

  extractOwnerAndRepo(githubUrl: string): { owner: string; repo: string } | null {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', ''),
    };
  }
}
