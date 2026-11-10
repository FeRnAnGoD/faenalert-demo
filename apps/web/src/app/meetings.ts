import { ActivatedRoute, RouterLink } from "@angular/router";
import {
  Component,
  ViewEncapsulation,
  signal,
  inject,
  OnInit,
  HostListener,
  ElementRef,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { WorkspaceUi } from "./platform/workspace-ui.service";
import { DraftService } from "./platform/draft.service";
import { ApiFailure } from "./platform/api.service";

import type {
  Meeting,
  MeetingWorkspace,
  Revision,
  Agreement,
  Committee,
  Page,
} from "../../../../packages/contracts";
import { WorkspaceNav } from "./platform/workspace-nav";
import {
  LoginScreenComponent,
  type LoginCredentials,
} from "./platform/login-screen";

@Component({
  selector: "fa-meetings",
  providers: [WorkspaceUi],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WorkspaceNav,
    LoginScreenComponent,
    RouterLink,
  ],
  encapsulation: ViewEncapsulation.ShadowDom,
  styleUrls: ["./prevention.css", "./enterprise.css"],
  templateUrl: "./meetings.html",
})
export class MeetingsComponent implements OnInit {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus: HTMLElement | null = null;
  constructor() {
    effect(() => {
      const open = this.pendingNavigation();
      const root = this.host.nativeElement.shadowRoot;
      if (open) {
        let focused: Element | null = root?.activeElement ?? null;
        while (focused?.shadowRoot?.activeElement)
          focused = focused.shadowRoot.activeElement;
        this.returnFocus = focused as HTMLElement | null;
        queueMicrotask(() =>
          root
            ?.querySelector<HTMLButtonElement>('[role="dialog"] button')
            ?.focus(),
        );
      } else {
        queueMicrotask(() => {
          if (this.returnFocus?.isConnected) this.returnFocus.focus();
        });
      }
    });
  }
  @HostListener("keydown", ["$event"]) dialogKey(event: KeyboardEvent) {
    if (!this.pendingNavigation()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.resolveNavigation("stay");
    }
    if (event.key === "Tab") {
      const root = this.host.nativeElement.shadowRoot;
      const buttons = Array.from(
        root?.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button:not(:disabled)',
        ) ?? [],
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && root?.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && root?.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
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
  meetings = signal<Meeting[]>([]);
  workspace = signal<MeetingWorkspace | null>(null);
  revisions = signal<Revision[]>([]);
  readonly tabs = [
    { id: "agenda", label: "Agenda" },
    { id: "acta", label: "Acta" },
    { id: "acuerdos", label: "Acuerdos" },
    { id: "historial", label: "Historial" },
  ];
  historyLabel(event: string) {
    return (
      (
        {
          "meetings.created": "Reunión programada",
          "meetings.updated": "Reunión actualizada",
          "minute.created": "Acta preparada",
          "minute.updated": "Acta actualizada",
          "agreement.created": "Acuerdo asignado",
          "agreement.transition": "Estado del acuerdo actualizado",
        } as Record<string, string>
      )[event] ?? "Registro actualizado"
    );
  }
  stateLabel(value: unknown) {
    return (
      (
        {
          PENDING: "Pendiente",
          IN_PROGRESS: "En curso",
          COMPLETED: "Completado",
          DRAFT: "Borrador",
          IN_REVIEW: "En revisión",
        } as Record<string, string>
      )[String(value)] ?? "Actualizado"
    );
  }
  meetingTitle = "";
  scheduled = "";
  location = "";
  agenda = "";
  private drafts = inject(DraftService);
  private activeKey = "";
  private expectedVersion = 0;
  private serverContent = "";
  conflict = signal(false);
  pendingNavigation = signal(false);
  private continuation: (() => void) | null = null;
  private routeResolve: ((value: boolean) => void) | null = null;
  retainAllowed = true;
  showCreate = false;
  activeTab = "agenda";
  due = new Date().toLocaleDateString("sv-SE");
  owner = "";
  page = 1;
  total = 0;
  committeeId = "";
  committeeLinkId = "";
  linkCommittee() {
    return this.run(async () => {
      const m = this.workspace()!.meeting;
      await this.request(
        "sites/" + this.site + "/records/meetings/" + m.id,
        "PATCH",
        {
          version: m.version,
          title: m.title,
          scheduled_at: m.scheduled_at,
          location: m.location,
          agenda: m.agenda,
          committee_id: this.committeeLinkId,
        },
      );
      await this.fetchWorkspace(m.id);
      this.message.set(
        "Comité vinculado; el registro anterior se conserva en el historial.",
      );
    });
  }

  committees = signal<Committee[]>([]);
  historyPage = 1;
  agreementPage = 1;
  revisionPage = 1;
  revisionTotal = 0;
  ngOnInit() {
    if (this.token())
      void this.run(async () => {
        await this.ui.context.initialize();
        if (this.site) {
          await this.loadSite();
          const record = this.route.snapshot.queryParamMap.get("meeting");
          if (record) {
            await this.fetchWorkspace(record);
            const tab = this.route.snapshot.queryParamMap.get("tab");
            if (tab && this.tabs.some((t) => t.id === tab))
              this.activeTab = tab;
          }
        }
      });
  }
  get content() {
    return this.activeKey
      ? this.drafts.book.open(
          this.activeKey,
          this.serverContent,
          this.expectedVersion,
        ).content
      : "";
  }
  set content(value: string) {
    if (this.activeKey) {
      this.drafts.book.edit(this.activeKey, value);
      if (!this.drafts.persist())
        this.error.set(
          "No se pudo respaldar el borrador en este navegador. El texto sigue en el editor; guárdalo en el servidor antes de salir.",
        );
    }
  }
  dirty() {
    return !!this.activeKey && this.drafts.book.dirty(this.activeKey);
  }
  hasDrafts() {
    return this.drafts.book.dirtyFor(this.ui.session.userId() + ":");
  }
  @HostListener("window:beforeunload", ["$event"]) beforeUnload(
    event: BeforeUnloadEvent,
  ) {
    if (this.hasDrafts()) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  canDeactivate() {
    if (!this.dirty()) return true;
    this.retainAllowed = true;
    this.pendingNavigation.set(true);
    return new Promise<boolean>((resolve) => (this.routeResolve = resolve));
  }
  navigate(action: () => void, retain = true) {
    if (!this.dirty()) {
      action();
      return;
    }
    this.continuation = action;
    this.retainAllowed = retain;
    this.pendingNavigation.set(true);
  }
  resolveNavigation(choice: "stay" | "keep" | "discard") {
    if (choice === "discard") {
      this.drafts.book.discard(this.activeKey);
      this.drafts.persist();
    }
    this.pendingNavigation.set(false);
    const action = this.continuation;
    this.continuation = null;
    const resolve = this.routeResolve;
    this.routeResolve = null;
    if (resolve) resolve(choice !== "stay");
    else if (choice !== "stay") action?.();
  }
  login(credentials: LoginCredentials) {
    this.ui.email = credentials.email;
    this.ui.password = credentials.password;
    return this.run(async () => {
      await this.ui.signIn();
      if (this.site) await this.loadSite();
    });
  }
  logout() {
    const close = () => {
      this.drafts.clearUser(this.ui.session.userId());
      this.ui.signOut();
      this.workspace.set(null);
      this.meetings.set([]);
      this.activeKey = "";
    };
    if (this.hasDrafts() && !this.dirty()) {
      this.continuation = close;
      this.retainAllowed = false;
      this.pendingNavigation.set(true);
    } else this.navigate(close, false);
  }
  async loadSite() {
    await this.ui.context.loadUsers();
    this.owner = this.owners()[0]?.id ?? "";
    this.committees.set(
      (
        await this.request<{ items: Committee[] }>(
          "sites/" + this.site + "/committees",
        )
      ).items,
    );
    this.committeeId = this.committees()[0]?.id ?? "";
    await this.fetchMeetings();
  }

  agreementTitle = "";
  async fetchMeetings() {
    const r = await this.request<Page<Meeting>>(
      "sites/" + this.site + "/records/meetings?page=" + this.page,
    );
    this.meetings.set(r.items);
    this.total = r.total;
  }
  listMeetings() {
    return this.run(() => this.fetchMeetings());
  }
  selectSite(value: string) {
    this.navigate(() => {
      this.site = value;
      this.workspace.set(null);
      this.activeKey = "";
      this.revisions.set([]);
      this.meetings.set([]);
      this.page = 1;
      this.run(async () => {
        if (this.site) await this.loadSite();
      });
    });
  }
  createMeeting() {
    this.navigate(() =>
      this.run(async () => {
        const m = await this.request<Meeting>(
          "sites/" + this.site + "/records/meetings",
          "POST",
          {
            title: this.meetingTitle,
            committee_id: this.committeeId,
            scheduled_at: new Date(this.scheduled).toISOString(),
            location: this.location,
            agenda: this.agenda,
          },
        );
        this.meetingTitle = this.agenda = "";
        await this.fetchMeetings();
        await this.fetchWorkspace(m.id);
        this.showCreate = false;
      }),
    );
  }
  async fetchWorkspace(id: string) {
    const w = await this.request<MeetingWorkspace>(
      "meetings/" +
        id +
        "/workspace?historyPage=" +
        this.historyPage +
        "&agreementsPage=" +
        this.agreementPage,
    );
    this.workspace.set(w);
    this.activeKey = this.ui.session.userId() + ":" + id;
    this.serverContent = w.minute?.content ?? w.meeting.agenda;
    const draft = this.drafts.book.open(
      this.activeKey,
      this.serverContent,
      w.minute?.version ?? 0,
    );
    this.expectedVersion = draft.baseVersion;
    this.drafts.persist();
  }
  closeMeeting() {
    this.navigate(() => {
      this.workspace.set(null);
      this.conflict.set(false);
      if (typeof window !== "undefined" && window.history?.pushState) {
        window.history.pushState(null, "", "/reuniones");
      }
    });
  }
  openMeeting(id: string) {
    this.navigate(() => {
      this.historyPage = this.agreementPage = 1;
      this.activeTab = "agenda";
      this.conflict.set(false);
      this.run(() => this.fetchWorkspace(id));
    });
  }
  refreshWorkspace() {
    return this.run(() => this.fetchWorkspace(this.workspace()!.meeting.id));
  }
  generateMinute() {
    return this.run(async () => {
      const saved = await this.request<
        import("../../../../packages/contracts").Minute
      >("meetings/" + this.workspace()!.meeting.id + "/minutes", "POST", {
        content: this.content,
      });
      this.drafts.book.saved(this.activeKey, saved.content, saved.version);
      this.drafts.persist();
      await this.fetchWorkspace(this.workspace()!.meeting.id);
      this.activeTab = "acta";
    });
  }
  saveMinute(status: string) {
    return this.run(async () => {
      const m = this.workspace()!.minute!;
      try {
        const saved = await this.request<
          import("../../../../packages/contracts").Minute
        >("minutes/" + m.id + "/draft", "PATCH", {
          version: this.expectedVersion,
          content: this.content,
          status,
        });
        this.drafts.book.saved(this.activeKey, saved.content, saved.version);
        this.drafts.persist();
        this.conflict.set(false);
        await this.fetchWorkspace(this.workspace()!.meeting.id);
        this.message.set("Acta guardada; versión " + saved.version);
      } catch (error) {
        if (error instanceof ApiFailure && error.status === 409) {
          this.conflict.set(true);
          await this.fetchWorkspace(this.workspace()!.meeting.id);
        }
        throw error;
      }
    });
  }
  rebaseDraft() {
    const w = this.workspace()!;
    const mine = this.content;
    this.drafts.book.saved(
      this.activeKey,
      w.minute!.content,
      w.minute!.version,
    );
    this.drafts.book.edit(this.activeKey, mine);
    this.expectedVersion = w.minute!.version;
    this.drafts.persist();
    this.conflict.set(false);
    this.message.set(
      "Texto local conservado sobre la versión actual. Revisa y guarda para confirmar.",
    );
  }
  createAgreement() {
    return this.run(async () => {
      await this.request(
        "minutes/" + this.workspace()!.minute!.id + "/agreements",
        "POST",
        { title: this.agreementTitle, ownerId: this.owner, dueOn: this.due },
      );
      this.agreementTitle = "";
      await this.fetchWorkspace(this.workspace()!.meeting.id);
    });
  }
  advanceAgreement(a: Agreement) {
    return this.run(async () => {
      await this.request("agreements/" + a.id, "PATCH", {
        version: a.version,
        status: a.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED",
      });
      await this.fetchWorkspace(this.workspace()!.meeting.id);
    });
  }
  loadRevisions() {
    return this.run(async () => {
      const result = await this.request<Page<Revision>>(
        "minutes/" +
          this.workspace()!.minute!.id +
          "/revisions?page=" +
          this.revisionPage,
      );
      this.revisions.set(result.items);
      this.revisionTotal = result.total;
    });
  }
  agreementLabel(s: string) {
    return (
      (
        {
          PENDING: "Pendiente",
          IN_PROGRESS: "En curso",
          COMPLETED: "Completado",
        } as Record<string, string>
      )[s] ?? s
    );
  }
}
