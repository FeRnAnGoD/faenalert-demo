import { CommonModule as DomainCommonModule } from "./common/common.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { PreventionModule } from "./prevention/prevention.module";
import { OperationsModule } from "./operations/operations.module";
import { FaenaCatalogModule } from "./faena-catalog/faena-catalog.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import "reflect-metadata";
import {
  Module,
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { config } from "./config";
import { Database } from "./database/database";
import { ErrorFilter } from "./common/errors";
@Controller("health")
class HealthController {
  constructor(@Inject(Database) private db: Database) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.pool.query("SELECT 1");
    } catch {
      throw new ServiceUnavailableException(
        "Base de datos temporalmente no disponible",
      );
    }
    return { status: "ok" };
  }
}
@Module({
  imports: [
    DatabaseModule,
    DomainCommonModule,
    AuthModule,
    PreventionModule,
    OperationsModule,
    FaenaCatalogModule,
    WorkspaceModule,
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: config.NODE_ENV === "test" ? 600 : 120 },
    ]),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use((req: any, res: any, next: () => void) => {
    req.id = randomUUID();
    res.setHeader("X-Request-ID", req.id);
    const start = Date.now();
    res.on("finish", () =>
      console.log(
        JSON.stringify({
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        }),
      ),
    );
    next();
  });
  app.enableCors({ origin: config.CORS_ORIGIN });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  if (config.NODE_ENV !== "production") {
    SwaggerModule.setup(
      "api/docs",
      app,
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle("FAENALERT Local API")
          .setVersion("1")
          .addBearerAuth()
          .build(),
      ),
    );
  }
  await app.listen(config.PORT, config.HOST);
}
bootstrap().catch(() => {
  console.error("API startup failed; check configuration and database");
  process.exitCode = 1;
});
