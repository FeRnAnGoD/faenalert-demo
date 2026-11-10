import { ActivatedRoute, RouterLink } from "@angular/router";
import { WorkspaceNav } from "./platform/workspace-nav";
import {
  LoginScreenComponent,
  type LoginCredentials,
} from "./platform/login-screen";

import { WorkspaceUi } from "./platform/workspace-ui.service";
import type {
  Inspection,
  InspectionDetail,
  Action,
  Evidence,
  Page,
  Finding,
} from "../../../../packages/contracts";
import { localDate } from "./date-utils";
import {
  Component,
  HostBinding,
  signal,
  ViewEncapsulation,
  inject,
  OnInit,
  Input,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IconComponent } from "./icons";
@Component({
  encapsulation: ViewEncapsulation.ShadowDom,
  selector: "fa-prevention",
  providers: [WorkspaceUi],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    WorkspaceNav,
    LoginScreenComponent,
    RouterLink,
  ],
  templateUrl: "./prevention.html",
  styleUrls: ["./prevention.css", "./enterprise.css"],
})
export class PreventionComponent implements OnInit {
  @Input() embedded = false;
  @HostBinding("class.embedded-host") get embeddedHostClass() {
    return this.embedded;
  }
  ngOnInit() {
    if (this.token())
      void this.run(async () => {
        await this.ui.context.initialize();
        if (this.site) {
          this.inspector = this.users()[0]?.id ?? "";
          this.owner = this.owners()[0]?.id ?? "";
          await this.load();
          const record = this.route.snapshot.queryParamMap.get("inspection");
          if (record)
            this.detail.set(
              await this.request<InspectionDetail>("inspections/" + record),
            );
        }
      });
  }

  private route = inject(ActivatedRoute);
  readonly ui = inject(WorkspaceUi);
  readonly token = this.ui.session.token;
  readonly sites = this.ui.context.sites;
  readonly users = this.ui.context.users;
  readonly busy = this.ui.busy;
  readonly error = this.ui.error;
  readonly message = this.ui.message;
  get email() {
    return this.ui.email;
  }
  set email(v: string) {
    this.ui.email = v;
  }
  get password() {
    return this.ui.password;
  }
  set password(v: string) {
    this.ui.password = v;
  }
  get site() {
    return this.ui.context.siteId();
  }
  set site(v: string) {
    this.ui.context.select(v);
  }
  canWrite() {
    return this.ui.context.canWrite();
  }
  canReview() {
    return this.ui.context.canReview();
  }
  toggleCreate() {
    if (this.canWrite() && this.site) this.showCreate = !this.showCreate;
  }
  owners() {
    return this.users().filter((u) => u.permissions.includes("write"));
  }
  userName(id: string) {
    return this.users().find((u) => u.id === id)?.name ?? "Usuario asignado";
  }
  request<T>(path: string, method = "GET", body?: unknown) {
    return this.ui.api.request<T>(path, method, body);
  }
  run(fn: () => Promise<void>) {
    return this.ui.run(fn);
  }
  actionCount() {
    return this.detail()?.stats.actions ?? "—";
  }
  closedCount() {
    return this.detail()?.stats.closed ?? "—";
  }
  showCreate = false;
  findingsPage = 1;
  evidencePage = 1;
  evidenceTotal = 0;
  evidenceAction = "";
  actionPages: Partial<Record<string, number>> = {};
  actionDrafts: Record<
    string,
    { title: string; ownerId: string; dueOn: string; priority: string }
  > = {};
  draftFor(id: string) {
    return (
      this.actionDrafts[id] ??
      (this.actionDrafts[id] = {
        title: "",
        ownerId: this.owners()[0]?.id ?? "",
        dueOn: this.date,
        priority: "MEDIUM",
      })
    );
  }
  changeFindingsPage(page: number) {
    this.findingsPage = page;
    return this.run(() => this.reload());
  }
  loadActions(
    finding: import("../../../../packages/contracts").Finding,
    page: number,
  ) {
    return this.run(async () => {
      const result = await this.request<Page<Action>>(
        "findings/" + finding.id + "/actions?page=" + page,
      );
      this.actionPages[finding.id] = page;
      const d = this.detail()!;
      this.detail.set({
        ...d,
        findings: d.findings.map((f: Finding) =>
          f.id === finding.id
            ? { ...f, actions: result.items, actions_total: result.total }
            : f,
        ),
      });
    });
  }
  statusLabel(value: string) {
    return (
      (
        {
          PENDING: "Pendiente",
          IN_PROGRESS: "En curso",
          PENDING_VERIFICATION: "Por verificar",
          CLOSED: "Cerrada",
        } as Record<string, string>
      )[value] ?? value
    );
  }
  inspections = signal<Inspection[]>([]);
  detail = signal<InspectionDetail | null>(null);
  evidenceNotes = signal<Evidence[]>([]);
  title = "";
  area = "";
  date = localDate();
  inspector = "";
  finding = "";
  actionTitle = "";
  owner = "";
  due = this.date;
  priority = "MEDIUM";
  evidenceDrafts: Record<string, string> = {};
  reviewDrafts: Record<string, string> = {};
  page = 1;
  total = 0;
  login(credentials: LoginCredentials) {
    this.ui.email = credentials.email;
    this.ui.password = credentials.password;
    return this.run(async () => {
      await this.ui.signIn();
      if (this.site) {
        await this.ui.context.loadUsers();
        await this.load();
      }
    });
  }
  logout() {
    if (!this.ui.signOut()) return;
    this.inspections.set([]);
    this.detail.set(null);
    this.evidenceNotes.set([]);
    this.total = 0;
    this.page = 1;
  }
  changeSite() {
    this.users.set([]);
    this.inspections.set([]);
    this.total = 0;
    this.page = 1;
    this.detail.set(null);
    this.evidenceNotes.set([]);
    return this.run(async () => {
      if (!this.site) return;
      this.users.set(
        (
          await this.request<{
            items: import("../../../../packages/contracts").User[];
          }>("sites/" + this.site + "/users")
        ).items,
      );
      this.inspector = this.users()[0]?.id ?? "";
      this.owner = this.owners()[0]?.id ?? "";
      await this.load();
    });
  }
  async load() {
    const result = await this.request<Page<Inspection>>(
      "sites/" + this.site + "/inspections?page=" + this.page,
    );
    this.inspections.set(result.items);
    this.total = result.total;
  }
  refresh() {
    return this.run(() => this.load());
  }
  closeDetail() {
    this.detail.set(null);
    this.evidenceNotes.set([]);
    this.evidenceAction = "";
    if (
      !this.embedded &&
      typeof window !== "undefined" &&
      window.history?.pushState
    ) {
      window.history.pushState(null, "", "/prevencion");
    }
  }
  open(id: string) {
    this.evidenceNotes.set([]);
    this.evidenceAction = "";
    this.findingsPage = 1;
    this.actionPages = {};
    return this.run(async () => {
      this.detail.set(
        await this.request<InspectionDetail>("inspections/" + id),
      );
    });
  }
  createInspection() {
    return this.run(async () => {
      const result = await this.request<Inspection>(
        "sites/" + this.site + "/inspections",
        "POST",
        {
          title: this.title,
          area: this.area,
          inspectedOn: this.date,
          inspectorId: this.inspector,
        },
      );
      this.title = this.area = "";
      this.showCreate = false;
      await this.load();
      this.detail.set(
        await this.request<InspectionDetail>("inspections/" + result.id),
      );
    });
  }
  async reload() {
    this.detail.set(
      await this.request<InspectionDetail>(
        "inspections/" + this.detail()!.id + "?page=" + this.findingsPage,
      ),
    );
  }
  addFinding() {
    return this.run(async () => {
      await this.request(
        "inspections/" + this.detail()!.id + "/findings",
        "POST",
        { description: this.finding },
      );
      this.finding = "";
      await this.reload();
    });
  }
  createAction(id: string) {
    return this.run(async () => {
      await this.request("findings/" + id + "/actions", "POST", {
        title: this.draftFor(id).title,
        ownerId: this.draftFor(id).ownerId,
        dueOn: this.draftFor(id).dueOn,
        priority: this.draftFor(id).priority,
      });
      delete this.actionDrafts[id];
      await this.reload();
      this.message.set("Acción creada. Ya puedes iniciar su seguimiento.");
    });
  }
  transition(a: Action, status: string) {
    return this.run(async () => {
      await this.request("actions/" + a.id, "PATCH", {
        version: a.version,
        status,
      });
      await this.reload();
      this.message.set("Estado de la acción actualizado.");
    });
  }
  evidence(a: Action, note: string) {
    if (!note.trim()) {
      this.message.set(
        "Escribe una descripción de evidencia antes de guardar.",
      );
      return;
    }
    return this.run(async () => {
      await this.request("actions/" + a.id + "/evidence", "POST", {
        description: note.trim(),
      });
      this.evidenceDrafts[a.id] = "";
      if (this.evidenceAction === a.id) {
        const result = await this.request<Page<Evidence>>(
          "actions/" + a.id + "/evidence?page=" + this.evidencePage,
        );
        this.evidenceNotes.set(result.items);
        this.evidenceTotal = result.total;
      }
      this.message.set("Evidencia guardada");
    });
  }
  verify(a: Action, approved: boolean, note: string) {
    if (!this.canReview()) {
      this.message.set("Tu perfil no tiene permiso para revisar esta acción.");
      return;
    }
    if (!note.trim()) {
      this.message.set("Escribe una observación para registrar la revisión.");
      return;
    }
    return this.run(async () => {
      await this.request("actions/" + a.id + "/verification", "POST", {
        version: a.version,
        approved,
        note: note.trim(),
      });
      this.reviewDrafts[a.id] = "";
      await this.reload();
      this.message.set(
        approved
          ? "Cierre verificado y registrado."
          : "Acción devuelta para completar el trabajo.",
      );
    });
  }
  showEvidence(id: string, page = 1) {
    return this.run(async () => {
      this.evidenceAction = id;
      this.evidencePage = page;
      const result = await this.request<Page<Evidence>>(
        "actions/" + id + "/evidence?page=" + page,
      );
      this.evidenceNotes.set(result.items);
      this.evidenceTotal = result.total;
    });
  }
}
