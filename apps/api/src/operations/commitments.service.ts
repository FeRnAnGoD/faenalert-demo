import { Injectable, Inject } from "@nestjs/common";
import { z } from "zod";
import { DomainContext } from "../common/domain-context";
import { Actor } from "../auth/auth";
import { pagination } from "../prevention/schemas";
import { CommitmentsRepository } from "./commitments.repository";
const filters = pagination.extend({
  state: z
    .enum(["all", "pending", "overdue", "upcoming", "closed"])
    .default("all"),
  owner: z.uuid().optional(),
});
@Injectable()
export class CommitmentsService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(CommitmentsRepository) private repo: CommitmentsRepository,
  ) {}
  list(actor: Actor, site: string, input: unknown) {
    const query = filters.parse(input);
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return this.repo.list(c, site, query);
    });
  }
}
