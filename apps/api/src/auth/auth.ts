import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Controller,
  Post,
  Body,
  ForbiddenException,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { Database } from "../database/database";
import { config } from "../config";
import { verifyPassword, hashPassword } from "./password";
import { Throttle } from "@nestjs/throttler";
const dummyHash = hashPassword("local-auth-timing-placeholder");
export interface Actor {
  id: string;
}
export const loginSchema = z
  .object({ email: z.email(), password: z.string().min(1).max(200) })
  .strict();
const secret = new TextEncoder().encode(config.JWT_SECRET);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Database) private db: Database) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    let subject: string;
    try {
      const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) throw new Error();
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
        issuer: "faenalert-local",
        audience: "faenalert-api",
      });
      subject = z.uuid().parse(payload.sub);
    } catch {
      throw new UnauthorizedException("Sesión inválida o vencida");
    }
    let user;
    try {
      user = await this.db.pool.query(
        "SELECT id FROM users WHERE id=$1 AND active=true",
        [subject],
      );
    } catch {
      throw new ServiceUnavailableException(
        "Base de datos temporalmente no disponible",
      );
    }
    if (!user.rowCount)
      throw new UnauthorizedException("Sesión inválida o vencida");
    request.actor = { id: user.rows[0].id };
    return true;
  }
}
@Controller("auth")
export class AuthController {
  constructor(@Inject(Database) private db: Database) {}
  @Post("login")
  @Throttle({
    default: { limit: config.NODE_ENV === "test" ? 600 : 10, ttl: 60000 },
  })
  async login(@Body() body: unknown) {
    if (config.LOCAL_AUTH_ENABLED !== "true")
      throw new ForbiddenException("Autenticación local deshabilitada");
    const input = loginSchema.parse(body);
    const result = await this.db.pool.query(
      "SELECT * FROM users WHERE email=$1 AND active=true",
      [input.email.toLowerCase()],
    );
    const user = result.rows[0];
    const passwordMatches = await verifyPassword(
      input.password,
      user?.password_hash ?? dummyHash,
    );
    if (!user || !passwordMatches)
      throw new UnauthorizedException("Credenciales inválidas");
    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuer("faenalert-local")
      .setAudience("faenalert-api")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);
    return {
      accessToken,
      expiresIn: 3600,
      user: { id: user.id, name: user.name },
    };
  }
}
