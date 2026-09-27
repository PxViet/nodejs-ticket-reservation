import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

function mockRepo<T extends object>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((entity) => entity),
    update: jest.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: MockRepo<User>;
  let refreshTokenRepo: MockRepo<RefreshToken>;

  const jwtConfig = {
    privateKey: 'private',
    publicKey: 'public',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 7,
  };

  beforeEach(async () => {
    userRepo = mockRepo<User>();
    refreshTokenRepo = mockRepo<RefreshToken>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('access-token') },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(jwtConfig) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('rejects a duplicate email', async () => {
      userRepo.findOne!.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'taken@example.com',
          password: 'password123',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.EMAIL_ALREADY_REGISTERED,
      });
    });

    it('always creates the user with role=user, regardless of input', async () => {
      userRepo.findOne!.mockResolvedValue(null);
      userRepo.save!.mockImplementation(
        (entity: Partial<User>) =>
          Promise.resolve({ id: 'new-id', ...entity }) as Promise<User>,
      );
      refreshTokenRepo.save!.mockResolvedValue({});

      await service.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        // @ts-expect-error RegisterDto has no role field — this proves it
        // can never reach the service even if a caller bypasses the DTO type.
        role: UserRole.ADMIN,
      });

      const savedUser = (userRepo.save as jest.Mock).mock
        .calls[0][0] as Partial<User>;
      expect(savedUser.role).toBe(UserRole.USER);
    });
  });

  describe('login', () => {
    it('rejects an unknown email without revealing that it is unknown', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever1' }),
      ).rejects.toThrow(AppException);
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      userRepo.findOne!.mockResolvedValue({
        id: 'u1',
        passwordHash,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVALID_CREDENTIALS });
    });

    it('rejects a deactivated account even with the right password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      userRepo.findOne!.mockResolvedValue({
        id: 'u1',
        passwordHash,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'correct-password',
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.ACCOUNT_INACTIVE });
    });

    it('issues a token pair for valid, active credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      userRepo.findOne!.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: UserRole.USER,
        passwordHash,
        isActive: true,
      });
      refreshTokenRepo.save!.mockResolvedValue({});

      const result = await service.login({
        email: 'user@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toHaveLength(128); // 64 bytes, hex-encoded
      expect(result.expiresIn).toBe(900);
    });
  });

  describe('refresh', () => {
    // BR-32: a refresh token that is revoked or expired may never issue a
    // new access token.
    it('rejects a revoked refresh token', async () => {
      refreshTokenRepo.findOne!.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        user: { isActive: true },
      });

      await expect(service.refresh('some-token')).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_TOKEN_INVALID,
      });
    });

    it('rejects an expired refresh token', async () => {
      refreshTokenRepo.findOne!.mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: { isActive: true },
      });

      await expect(service.refresh('some-token')).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_TOKEN_INVALID,
      });
    });

    it('rejects an unknown refresh token', async () => {
      refreshTokenRepo.findOne!.mockResolvedValue(null);

      await expect(service.refresh('some-token')).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_TOKEN_INVALID,
      });
    });

    it('rotates a valid refresh token: revokes the old one, issues a new pair', async () => {
      const stored = {
        id: 'rt1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: {
          id: 'u1',
          email: 'user@example.com',
          role: UserRole.USER,
          isActive: true,
        },
      };
      refreshTokenRepo.findOne!.mockResolvedValue(stored);
      refreshTokenRepo.save!.mockResolvedValue({});

      const result = await service.refresh('some-token');

      expect(stored.revokedAt).not.toBeNull();
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('logout', () => {
    it('revokes only a non-revoked token matching the hash', async () => {
      refreshTokenRepo.update!.mockResolvedValue({});

      await service.logout('some-token');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: expect.any(String) }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });
});
