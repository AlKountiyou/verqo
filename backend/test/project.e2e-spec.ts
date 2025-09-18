import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { UserRole, ProjectStatus } from '@prisma/client';

describe('Project (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let clientAccessToken: string;
  let devAccessToken: string;
  let adminAccessToken: string;
  let clientUser: any;
  let devUser: any;
  let adminUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    
    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await databaseService.projectDeveloper.deleteMany();
    await databaseService.project.deleteMany();
    await databaseService.refreshToken.deleteMany();
    await databaseService.user.deleteMany();

    // Create test users
    const clientRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'client@test.com',
        password: 'password123',
        firstName: 'Client',
        lastName: 'Test',
        role: UserRole.CLIENT,
      });

    const devRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'dev@test.com',
        password: 'password123',
        firstName: 'Dev',
        lastName: 'Test',
        role: UserRole.DEV,
      });

    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Test',
        role: UserRole.ADMIN,
      });

    // Set users as admin to bypass email verification for testing
    await databaseService.user.updateMany({
      data: { emailVerified: true, isActive: true },
    });

    // Update the admin user role
    await databaseService.user.update({
      where: { email: 'admin@test.com' },
      data: { role: UserRole.ADMIN },
    });

    // Login users to get tokens
    const clientLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'client@test.com',
        password: 'password123',
      });

    const devLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'dev@test.com',
        password: 'password123',
      });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      });

    clientAccessToken = clientLoginResponse.body.data.tokens.accessToken;
    devAccessToken = devLoginResponse.body.data.tokens.accessToken;
    adminAccessToken = adminLoginResponse.body.data.tokens.accessToken;

    clientUser = clientLoginResponse.body.data.user;
    devUser = devLoginResponse.body.data.user;
    adminUser = adminLoginResponse.body.data.user;
  });

  afterAll(async () => {
    // Clean up and close
    await databaseService.projectDeveloper.deleteMany();
    await databaseService.project.deleteMany();
    await databaseService.refreshToken.deleteMany();
    await databaseService.user.deleteMany();
    await databaseService.$disconnect();
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a new project as client', async () => {
      const createProjectDto = {
        name: 'Test Project',
        description: 'A test project for e2e testing',
        githubUrl: 'https://github.com/test/project',
        stagingUrl: 'https://staging.test.com',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(createProjectDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(createProjectDto.name);
      expect(response.body.data.project.owner.email).toBe(clientUser.email);
      expect(response.body.data.project.status).toBe(ProjectStatus.ACTIVE);

      // Verify project was created in database
      const project = await databaseService.project.findFirst({
        where: { name: createProjectDto.name },
      });
      expect(project).toBeTruthy();
    });

    it('should not allow developers to create projects', async () => {
      const createProjectDto = {
        name: 'Dev Project',
        description: 'Should not be allowed',
      };

      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${devAccessToken}`)
        .send(createProjectDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return validation error for invalid data', async () => {
      const createProjectDto = {
        name: 'ab', // Too short
        githubUrl: 'invalid-url',
      };

      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(createProjectDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /projects', () => {
    beforeEach(async () => {
      // Create a test project
      await databaseService.project.create({
        data: {
          name: 'Client Project',
          description: 'A project owned by client',
          ownerId: clientUser.id,
        },
      });
    });

    it('should return projects for client owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].name).toBe('Client Project');
    });

    it('should return empty array for developer with no assigned projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${devAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(0);
    });

    it('should return all projects for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
    });
  });

  describe('GET /projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await databaseService.project.create({
        data: {
          name: 'Test Project',
          description: 'Test description',
          ownerId: clientUser.id,
        },
      });
      projectId = project.id;
    });

    it('should return project for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.id).toBe(projectId);
      expect(response.body.data.project.name).toBe('Test Project');
    });

    it('should not allow non-owner dev to access project', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${devAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow admin to access any project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.id).toBe(projectId);
    });
  });

  describe('PUT /projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await databaseService.project.create({
        data: {
          name: 'Test Project',
          description: 'Test description',
          ownerId: clientUser.id,
        },
      });
      projectId = project.id;
    });

    it('should update project for owner', async () => {
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated description',
        githubUrl: 'https://github.com/updated/repo',
      };

      const response = await request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe('Updated Project');
      expect(response.body.data.project.githubUrl).toBe('https://github.com/updated/repo');
    });

    it('should not allow non-owner to update project', async () => {
      const updateDto = {
        name: 'Hacked Project',
      };

      await request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${devAccessToken}`)
        .send(updateDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('POST /projects/:id/developers', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await databaseService.project.create({
        data: {
          name: 'Test Project',
          ownerId: clientUser.id,
        },
      });
      projectId = project.id;
    });

    it('should assign developer to project', async () => {
      const assignDto = {
        userId: devUser.id,
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/developers`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(assignDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.developers).toHaveLength(1);
      expect(response.body.data.project.developers[0].user.id).toBe(devUser.id);

      // Verify assignment in database
      const assignment = await databaseService.projectDeveloper.findFirst({
        where: { projectId, userId: devUser.id },
      });
      expect(assignment).toBeTruthy();
    });

    it('should not allow non-client to assign developers', async () => {
      const assignDto = {
        userId: devUser.id,
      };

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/developers`)
        .set('Authorization', `Bearer ${devAccessToken}`)
        .send(assignDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return error when assigning non-developer', async () => {
      const anotherClient = await databaseService.user.create({
        data: {
          email: 'client2@test.com',
          password: 'hashedPassword',
          role: UserRole.CLIENT,
        },
      });

      const assignDto = {
        userId: anotherClient.id,
      };

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/developers`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(assignDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /projects/:id/developers/:userId', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await databaseService.project.create({
        data: {
          name: 'Test Project',
          ownerId: clientUser.id,
        },
      });
      projectId = project.id;

      // Assign developer to project
      await databaseService.projectDeveloper.create({
        data: {
          projectId: project.id,
          userId: devUser.id,
        },
      });
    });

    it('should remove developer from project', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${projectId}/developers/${devUser.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.developers).toHaveLength(0);

      // Verify removal in database
      const assignment = await databaseService.projectDeveloper.findFirst({
        where: { projectId, userId: devUser.id },
      });
      expect(assignment).toBeNull();
    });
  });

  describe('PATCH /projects/:id/urls', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await databaseService.project.create({
        data: {
          name: 'Test Project',
          ownerId: clientUser.id,
        },
      });
      projectId = project.id;
    });

    it('should update project URLs', async () => {
      const updateDto = {
        githubUrl: 'https://github.com/new/repo',
        stagingUrl: 'https://new-staging.test.com',
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/urls`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.githubUrl).toBe('https://github.com/new/repo');
      expect(response.body.data.project.stagingUrl).toBe('https://new-staging.test.com');
    });
  });
});
