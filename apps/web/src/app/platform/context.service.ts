import { Injectable, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";
import type { Site, User } from "../../../../../packages/contracts";
@Injectable({ providedIn: "root" })
export class ContextService {
  private api = inject(ApiService);
  readonly sites = signal<Site[]>([]);
  readonly users = signal<User[]>([]);
  readonly platformRoles = signal<string[]>([]);
  readonly siteId = signal(sessionStorage.getItem("faenalert.site") ?? "");
  async initialize() {
    const [result, me] = await Promise.all([
      this.api.request<{ items: Site[] }>("sites"),
      this.api.request<{ platform_roles: string[] }>("me"),
    ]);
    this.sites.set(result.items);
    this.platformRoles.set(me.platform_roles ?? []);
    if (!result.items.some((s) => s.id === this.siteId())) this.select("");
    if (this.siteId()) await this.loadUsers();
  }
  select(id: string) {
    this.siteId.set(id);
    sessionStorage.setItem("faenalert.site", id);
    this.users.set([]);
  }
  async loadUsers() {
    this.users.set(
      (
        await this.api.request<{ items: User[] }>(
          "sites/" + this.siteId() + "/users",
        )
      ).items,
    );
  }
  hasPermission(permission: "read" | "write" | "review" | "manage") {
    return (
      this.sites()
        .find((s) => s.id === this.siteId())
        ?.permissions.includes(permission) ?? false
    );
  }
  clear() {
    this.sites.set([]);
    this.users.set([]);
    this.platformRoles.set([]);
    this.select("");
  }
  canWrite() {
    return this.hasPermission("write");
  }
  canReview() {
    return this.hasPermission("review");
  }
  canManage() {
    return this.hasPermission("manage");
  }
  isPlatformAdmin() {
    return this.platformRoles().includes("PLATFORM_ADMIN");
  }
}
