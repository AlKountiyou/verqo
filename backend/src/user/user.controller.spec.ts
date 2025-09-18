import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('UserController', () => {
  let app: INestApplication;
  let userService: UserService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.CLIENT,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerificationToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  };

  const mockAdminUser = {
    ...mockUser,
    id: '2',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    findAll: jest.fn(),
    findByIdWithoutPassword: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleUserStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
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
      req.user = mockAdminUser;
      next();
    });
    
    await app.init();

    userService = module.get<UserService>(UserService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should return all users for admin/dev', async () => {
      const expectedUsers = [mockUser, mockAdminUser];
      mockUserService.findAll.mockResolvedValue(expectedUsers);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilisateurs récupérés avec succès');
      expect(response.body.data.users).toHaveLength(2);

      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      mockUserService.findByIdWithoutPassword.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/1')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilisateur récupéré avec succès');
      expect(response.body.data.user.email).toBe(mockUser.email);

      expect(mockUserService.findByIdWithoutPassword).toHaveBeenCalledWith('1');
    });

    it('should return error when user not found', async () => {
      mockUserService.findByIdWithoutPassword.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/users/999')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user successfully', async () => {
      const updateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const updatedUser = {
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserService.update.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .put('/users/1')
        .send(updateUserDto)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilisateur mis à jour avec succès');
      expect(response.body.data.user.firstName).toBe('Jane');
      expect(response.body.data.user.lastName).toBe('Smith');

      expect(mockUserService.update).toHaveBeenCalledWith('1', updateUserDto, mockAdminUser);
    });

    it('should return validation error for invalid email', async () => {
      const updateUserDto = {
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .put('/users/1')
        .send(updateUserDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user successfully', async () => {
      const expectedResult = {
        message: 'Utilisateur supprimé avec succès',
      };

      mockUserService.delete.mockResolvedValue(expectedResult);

      const response = await request(app.getHttpServer())
        .delete('/users/1')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: expectedResult,
        message: 'Utilisateur supprimé avec succès',
      });

      expect(mockUserService.delete).toHaveBeenCalledWith('1', mockAdminUser);
    });
  });

  describe('PATCH /users/:id/toggle-status', () => {
    it('should toggle user status successfully', async () => {
      const toggledUser = {
        ...mockUser,
        isActive: false,
      };

      mockUserService.toggleUserStatus.mockResolvedValue(toggledUser);

      const response = await request(app.getHttpServer())
        .patch('/users/1/toggle-status')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Statut de l\'utilisateur modifié avec succès');
      expect(response.body.data.user.isActive).toBe(false);

      expect(mockUserService.toggleUserStatus).toHaveBeenCalledWith('1', mockAdminUser);
    });
  });
});
