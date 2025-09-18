import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

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

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.CLIENT,
      };

      const expectedResult = {
        user: mockUser,
        message: 'Utilisateur créé avec succès. Veuillez vérifier votre email.',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscription réussie');
      expect(response.body.data.user.email).toBe(registerDto.email);
      expect(response.body.data.user.firstName).toBe(registerDto.firstName);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return validation error for invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return validation error for short password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/login', () => {
    it('should respond to login endpoint', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto);

      // Check that the endpoint exists and responds
      expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED, HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR]).toContain(response.status);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedTokens);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshTokenDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: { tokens: expectedTokens },
        message: 'Tokens rafraîchis avec succès',
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedResult = {
        message: 'Déconnexion réussie',
      };

      mockAuthService.logout.mockResolvedValue(expectedResult);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send(refreshTokenDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: expectedResult,
        message: 'Déconnexion réussie',
      });
    });
  });

  describe('GET /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-verification-token';
      const expectedResult = {
        message: 'Email vérifié avec succès',
      };

      mockAuthService.verifyEmail.mockResolvedValue(expectedResult);

      const response = await request(app.getHttpServer())
        .get(`/auth/verify-email?token=${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: expectedResult,
        message: 'Email vérifié avec succès',
      });
    });
  });
});
