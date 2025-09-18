import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';
import { UserRole, ProjectStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('ProjectController', () => {
  let app: INestApplication;
  let projectService: ProjectService;

  const mockUser = {
    id: '1',
    email: 'client@example.com',
    firstName: 'Client',
    lastName: 'Test',
    role: UserRole.CLIENT,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerificationToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  };

  const mockProject = {
    id: '1',
    name: 'Test Project',
    description: 'A test project',
    githubUrl: 'https://github.com/test/project',
    stagingUrl: 'https://staging.test.com',
    status: ProjectStatus.ACTIVE,
    ownerId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: mockUser,
    developers: [],
  };

  const mockProjectService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignDeveloper: jest.fn(),
    removeDeveloper: jest.fn(),
    getDevelopersByProject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    // Mock request.user for CurrentUser decorator
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
    
    await app.init();

    projectService = module.get<ProjectService>(ProjectService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const createProjectDto = {
        name: 'New Project',
        description: 'A new project',
        githubUrl: 'https://github.com/test/new',
      };

      mockProjectService.create.mockResolvedValue(mockProject);

      const response = await request(app.getHttpServer())
        .post('/projects')
        .send(createProjectDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projet créé avec succès');
      expect(response.body.data.project.name).toBe(mockProject.name);

      expect(mockProjectService.create).toHaveBeenCalledWith(createProjectDto, mockUser.id);
    });

    it('should return validation error for invalid data', async () => {
      const createProjectDto = {
        name: 'ab', // Too short
        githubUrl: 'invalid-url',
      };

      await request(app.getHttpServer())
        .post('/projects')
        .send(createProjectDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /projects', () => {
    it('should return all projects for current user', async () => {
      const expectedProjects = [mockProject];
      mockProjectService.findAll.mockResolvedValue(expectedProjects);

      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projets récupérés avec succès');
      expect(response.body.data.projects).toHaveLength(1);

      expect(mockProjectService.findAll).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return a project by id', async () => {
      mockProjectService.findOne.mockResolvedValue(mockProject);

      const response = await request(app.getHttpServer())
        .get('/projects/1')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projet récupéré avec succès');
      expect(response.body.data.project.name).toBe(mockProject.name);

      expect(mockProjectService.findOne).toHaveBeenCalledWith('1', mockUser);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update a project', async () => {
      const updateProjectDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const updatedProject = {
        ...mockProject,
        name: 'Updated Project',
        description: 'Updated description',
      };

      mockProjectService.update.mockResolvedValue(updatedProject);

      const response = await request(app.getHttpServer())
        .put('/projects/1')
        .send(updateProjectDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projet mis à jour avec succès');
      expect(response.body.data.project.name).toBe('Updated Project');

      expect(mockProjectService.update).toHaveBeenCalledWith('1', updateProjectDto, mockUser);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete a project', async () => {
      const expectedResult = {
        message: 'Projet supprimé avec succès',
      };

      mockProjectService.remove.mockResolvedValue(expectedResult);

      const response = await request(app.getHttpServer())
        .delete('/projects/1')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projet supprimé avec succès');

      expect(mockProjectService.remove).toHaveBeenCalledWith('1', mockUser);
    });
  });

  describe('POST /projects/:id/developers', () => {
    it('should assign a developer to project', async () => {
      const assignDeveloperDto = {
        userId: 'dev-user-id',
      };

      const projectWithDeveloper = {
        ...mockProject,
        developers: [
          {
            id: 'assignment-id',
            assignedAt: new Date(),
            user: {
              id: 'dev-user-id',
              email: 'dev@example.com',
              role: UserRole.DEV,
            },
          },
        ],
      };

      mockProjectService.assignDeveloper.mockResolvedValue(projectWithDeveloper);

      const response = await request(app.getHttpServer())
        .post('/projects/1/developers')
        .send(assignDeveloperDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Développeur assigné avec succès');

      expect(mockProjectService.assignDeveloper).toHaveBeenCalledWith('1', 'dev-user-id', mockUser);
    });
  });

  describe('DELETE /projects/:id/developers/:userId', () => {
    it('should remove a developer from project', async () => {
      mockProjectService.removeDeveloper.mockResolvedValue(mockProject);

      const response = await request(app.getHttpServer())
        .delete('/projects/1/developers/dev-user-id')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Développeur retiré avec succès');

      expect(mockProjectService.removeDeveloper).toHaveBeenCalledWith('1', 'dev-user-id', mockUser);
    });
  });

  describe('GET /projects/:id/developers', () => {
    it('should return developers of a project', async () => {
      const expectedDevelopers = [
        {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: UserRole.DEV,
        },
      ];

      mockProjectService.getDevelopersByProject.mockResolvedValue(expectedDevelopers);

      const response = await request(app.getHttpServer())
        .get('/projects/1/developers')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Développeurs du projet récupérés avec succès');
      expect(response.body.data.developers).toHaveLength(1);

      expect(mockProjectService.getDevelopersByProject).toHaveBeenCalledWith('1', mockUser);
    });
  });

  describe('PATCH /projects/:id/urls', () => {
    it('should update project URLs', async () => {
      const updateDto = {
        githubUrl: 'https://github.com/updated/repo',
        stagingUrl: 'https://new-staging.test.com',
      };

      const updatedProject = {
        ...mockProject,
        githubUrl: 'https://github.com/updated/repo',
        stagingUrl: 'https://new-staging.test.com',
      };

      mockProjectService.update.mockResolvedValue(updatedProject);

      const response = await request(app.getHttpServer())
        .patch('/projects/1/urls')
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('URLs du projet mises à jour avec succès');

      expect(mockProjectService.update).toHaveBeenCalledWith('1', updateDto, mockUser);
    });
  });
});
