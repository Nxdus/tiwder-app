import {
  Controller,
  Get,
  Post,
  Inject,
  Injectable,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
  Header,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { DatabaseService } from './database/database.service.js';
import { users, sessions, oauthTransactions } from './database/schema.js';

const random = () => randomBytes(32).toString('base64url');
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const frontend = () =>
  process.env.FRONTEND_URL || 'http://localhost:3000';
const redirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI || frontend() + '/api/auth/google/callback';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});
const cookie = (req: Request, name: string) =>
  req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + '='))
    ?.slice(name.length + 1) ?? '';
const sessionKey = 'tiwder_session',
  flowKey = 'tiwder_oauth';
const scopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
const google = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    throw new Error('Google OAuth is not configured');
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(),
  );
};
const publicUser = {
  id: users.id,
  role: users.role,
  email: users.email,
  name: users.name,
  avatarUrl: users.avatarUrl,
  onboarded: users.onboarded,
};
export type Identity = Pick<
  typeof users.$inferSelect,
  'id' | 'role' | 'email' | 'name' | 'avatarUrl' | 'onboarded'
>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  async session(req: Request) {
    const token = cookie(req, sessionKey);
    if (!token) return { user: null };
    const [row] = await this.database.db
      .select({ user: publicUser, csrfToken: sessions.csrf })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, digest(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      );
    return row ?? { user: null };
  }
  async require(req: Request, incomplete = false): Promise<Identity> {
    const session = await this.session(req);
    if (!session.user) throw new UnauthorizedException();
    if (
      req.method !== 'GET' &&
      (req.get('origin') !== frontend() ||
        req.get('x-csrf-token') !== session.csrfToken)
    )
      throw new ForbiddenException('Invalid origin or CSRF token');
    if (!incomplete && !session.user.onboarded)
      throw new ForbiddenException('Complete onboarding first');
    return session.user;
  }
  async start(res: Response) {
    const client = google(),
      state = random(),
      browser = random(),
      nonce = random();
    const { codeVerifier, codeChallenge } =
      await client.generateCodeVerifierAsync();
    const db = this.database.db;
    await db
      .delete(oauthTransactions)
      .where(lt(oauthTransactions.expiresAt, new Date()));
    await db.insert(oauthTransactions).values({
      state,
      browserHash: digest(browser),
      verifier: codeVerifier,
      nonce,
      expiresAt: new Date(Date.now() + 600_000),
    });
    res.cookie(flowKey, browser, { ...cookieOptions(), maxAge: 600_000 });
    const url = new URL(
      client.generateAuthUrl({
        state,
        scope: scopes,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
        access_type: 'online',
      }),
    );
    url.searchParams.set('nonce', nonce);
    return url.toString();
  }
  async finish(req: Request, res: Response) {
    const { code, state } = req.query,
      browser = cookie(req, flowKey);
    if (typeof state !== 'string' || !browser)
      throw new Error('Invalid OAuth state');
    const db = this.database.db;
    const [flow] = await db
      .delete(oauthTransactions)
      .where(
        and(
          eq(oauthTransactions.state, state),
          eq(oauthTransactions.browserHash, digest(browser)),
          gt(oauthTransactions.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!flow || typeof code !== 'string')
      throw new Error('Invalid OAuth transaction');
    const client = google();
    const { tokens } = await client.getToken({
      code,
      codeVerifier: flow.verifier,
      redirect_uri: redirectUri(),
    });
    const granted = tokens.scope?.split(/\s+/) ?? [];
    if (
      !tokens.id_token ||
      !scopes.every(
        (s) =>
          granted.includes(s) ||
          granted.includes(
            s.replace('https://www.googleapis.com/auth/userinfo.', ''),
          ),
      )
    )
      throw new Error('Missing Google scopes');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (
      !p ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(p.iss) ||
      p.aud !== process.env.GOOGLE_CLIENT_ID ||
      !('nonce' in p) ||
      p.nonce !== flow.nonce ||
      p.email_verified !== true ||
      !p.email ||
      !p.sub
    )
      throw new Error('Invalid Google identity');
    const token = random(),
      maxAge = 7 * 24 * 60 * 60 * 1000;
    const account = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(users)
        .values({
          googleSub: p.sub,
          email: p.email!,
          name: p.name || p.email!,
          avatarUrl: p.picture || null,
        })
        .onConflictDoUpdate({
          target: users.googleSub,
          set: { email: p.email!, avatarUrl: p.picture || null },
        })
        .returning(publicUser);
      await tx
        .delete(sessions)
        .where(eq(sessions.tokenHash, digest(cookie(req, sessionKey))));
      await tx.insert(sessions).values({
        tokenHash: digest(token),
        csrf: random(),
        userId: account.id,
        expiresAt: new Date(Date.now() + maxAge),
      });
      return account;
    });
    res.cookie(sessionKey, token, { ...cookieOptions(), maxAge });
    return account.onboarded
      ? account.role === 'tutor'
        ? '/tutor/swiped'
        : '/'
      : '/onboarding';
  }
  async logout(req: Request, res: Response) {
    await this.require(req, true);
    await this.database.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, digest(cookie(req, sessionKey))));
    res.clearCookie(sessionKey, cookieOptions());
  }
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get('session') @Header('Cache-Control', 'no-store') session(
    @Req() req: Request,
  ) {
    return this.auth.session(req);
  }
  @Get('google') async google(@Res() res: Response) {
    res.set('Cache-Control', 'no-store');
    try {
      res.redirect(await this.auth.start(res));
    } catch {
      res.redirect(frontend() + '/login?error=oauth_failed');
    }
  }
  @Get('google/callback') async callback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.set('Cache-Control', 'no-store');
    let path = '/login?error=oauth_failed';
    try {
      path = await this.auth.finish(req, res);
    } catch {
      /* OAuth details never enter redirects or logs. */
    }
    res.clearCookie(flowKey, cookieOptions()).redirect(frontend() + path);
  }
  @Post('logout') async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req, res);
    res.sendStatus(204);
  }
}
