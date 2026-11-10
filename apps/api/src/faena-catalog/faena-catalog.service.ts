import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";
import { FaenaCatalogRepository } from "./faena-catalog.repository";

@Injectable()
export class FaenaCatalogService {
  constructor(
    @Inject(Database) private db: Database,
    @Inject(FaenaCatalogRepository) private repo: FaenaCatalogRepository,
  ) {}

  list() {
    return this.db.read(async (c) => ({ items: await this.repo.list(c) }));
  }
}
