import { DomainContext } from "./domain-context";
import { Global, Module } from "@nestjs/common";
import { AccessService } from "./access.service";
import { AuditService } from "./audit.service";
@Global()
@Module({
  providers: [AccessService, AuditService, DomainContext],
  exports: [AccessService, AuditService, DomainContext],
})
export class CommonModule {}
