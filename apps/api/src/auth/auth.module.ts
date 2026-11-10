import { Global, Module } from "@nestjs/common";
import { AuthController, AuthGuard } from "./auth";
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
