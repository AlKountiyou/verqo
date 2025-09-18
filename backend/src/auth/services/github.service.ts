import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class GitHubService {
  constructor(private databaseService: DatabaseService) {}

  private async getAccessToken(userId: string): Promise<string> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });
    if (!user?.githubAccessToken) {
      throw new Error('Utilisateur non connecté à GitHub');
    }
    return user.githubAccessToken;
  }

  async getUserRepositories(userId: string): Promise<any[]> {
    const token = await this.getAccessToken(userId);
    const url = 'https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all';
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'verqo-app',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }
      const data: any[] = await res.json();
      return data.map((repo: any) => ({
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
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des repositories: ${error.message}`);
    }
  }

  async getRepositoryDetails(userId: string, owner: string, repo: string): Promise<any> {
    const token = await this.getAccessToken(userId);
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'verqo-app',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }
      const data: any = await res.json();
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
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération du repository: ${error.message}`);
    }
  }

  async getRepositoryContents(userId: string, owner: string, repo: string, path = ''): Promise<any[]> {
    const token = await this.getAccessToken(userId);
    const encodedPath = encodeURIComponent(path);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'verqo-app',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }
      const data: any = await res.json();
      return Array.isArray(data) ? data : [data];
    } catch (error: any) {
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
