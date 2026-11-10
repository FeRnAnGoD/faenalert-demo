import {
  Component,
  ViewEncapsulation,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { WorkspaceUi } from "./platform/workspace-ui.service";
import { WorkspaceNav } from "./platform/workspace-nav";
import {
  LoginScreenComponent,
  type LoginCredentials,
} from "./platform/login-screen";
import type {
  Commitment,
  CommitmentSummary,
  Page,
} from "../../../../packages/contracts";
@Component({
  selector: "fa-management",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    WorkspaceNav,
    LoginScreenComponent,
  ],
  providers: [WorkspaceUi],
  encapsulation: ViewEncapsulation.ShadowDom,
  styleUrls: ["./prevention.css", "./enterprise.css"],
  template: `
    <div
      class="prevention-app"
      [class.authenticated]="!!ui.session.token()"
    >
    @if (ui.session.token()) {
      <fa-workspace-nav />
    }
    <main class="workspace">
      <header class="page-header" [hidden]="!ui.session.token()">
        <div>
          <span class="eyebrow">CONTINUIDAD OPERACIONAL</span>
          <h1>Cada compromiso, a la vista<span>.</span></h1>
          <p>
            Un espacio para seguir las medidas de inspecciones y los acuerdos
            del comité.
          </p>
        </div>
        @if (ui.session.token()) {
          <button class="secondary" [disabled]="ui.busy()" (click)="logout()">
            Cerrar sesión
          </button>
        }
      </header>
      @if (!ui.session.token()) {
        <fa-login-screen
          [busy]="ui.busy()"
          [error]="ui.error()"
          [email]="ui.email"
          (credentials)="login($event)"
        />
      } @else {
        <section class="context-bar">
          <label
            >EMPRESA · FAENA<select
              [ngModel]="ui.context.siteId()"
              [disabled]="ui.busy()"
              (ngModelChange)="selectSite($event)"
            >
              <option value="">Selecciona una faena</option>
              @for (s of ui.context.sites(); track s.id) {
                <option [value]="s.id">
                  {{ s.organization_name }} · {{ s.name }}
                </option>
              }
            </select></label
          ><span class="context-caption">Inspecciones + reuniones</span>
        </section>
        @if (ui.context.siteId()) {
          <div class="filters">
            <label
              >Responsable<select
                [(ngModel)]="owner"
                [disabled]="ui.busy()"
                (ngModelChange)="page = 1; refresh()"
              >
                <option value="">Todos los responsables</option>
                @for (u of responsibles(); track u.id) {
                  <option [value]="u.id">
                    {{ u.name }}{{ u.active ? "" : " (anterior)" }}
                  </option>
                }
              </select></label
            ><button
              class="secondary"
              [disabled]="ui.busy()"
              (click)="state = 'all'; page = 1; refresh()"
            >
              Ver todos los compromisos
            </button>
          </div>
          @if (summary(); as s) {
            <section
              class="summary-cards"
              aria-label="Indicadores de compromisos"
            >
              @for (card of cards; track card.state) {
                <button
                  [class.active]="state === card.state"
                  [disabled]="ui.busy()"
                  (click)="state = card.state; page = 1; refresh()"
                >
                  <strong>{{ metric(card.key) }}</strong
                  ><span>{{ card.label }} →</span>
                </button>
              }
            </section>
            <details class="definition">
              <summary>Cómo se calculan estos indicadores</summary>
              <p>
                Fecha de corte: {{ s.asOf | date: "dd MMM yyyy" }} · Zona:
                {{ s.timezone }}. Fuente: acciones de inspección y acuerdos de
                reunión de la faena y responsable seleccionados. Pendientes:
                todos los estados sin cierre. Vencidos: pendientes con entrega
                anterior a la fecha de corte. Próximos: pendientes con entrega
                entre hoy y siete días después, ambos incluidos. Cerrados:
                acciones verificadas o acuerdos completados. Cada tarjeta abre
                los registros que componen su cifra.
              </p>
            </details>
          }
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>{{ stateLabel() }}</h2>
                <p>{{ total }} compromisos · Datos del entorno local</p>
              </div>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Compromiso</th>
                    <th>Responsable</th>
                    <th>Entrega</th>
                    <th>Estado</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track item.source + item.id) {
                    <tr>
                      <td>
                        <a
                          class="text-action"
                          [routerLink]="
                            item.source === 'MEETING'
                              ? '/reuniones'
                              : '/prevencion'
                          "
                          [queryParams]="
                            item.source === 'MEETING'
                              ? { meeting: item.source_id,tab:'acuerdos',agreement:item.id }
                              : { inspection: item.source_id }
                          "
                          >{{ item.title }} →</a
                        >
                      </td>
                      <td>{{ item.owner_name }}</td>
                      <td [class.overdue]="item.overdue">
                        {{ item.due_on | date: "dd MMM yyyy" }}
                        @if (item.overdue) {
                          <small>Vencido</small>
                        }
                      </td>
                      <td>
                        <span
                          class="status"
                          [attr.data-status]="
                            item.closed ? 'CLOSED' : item.status
                          "
                          >{{ statusLabel(item.status) }}</span
                        >
                      </td>
                      <td>
                        {{
                          item.source === "MEETING" ? "Reunión" : "Inspección"
                        }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5">
                        <div class="empty-state">
                          <h3>
                            {{
                              ui.busy()
                                ? "Cargando compromisos…"
                                : "Sin compromisos en esta selección"
                            }}
                          </h3>
                          <p>
                            Prueba con otro responsable o consulta todos los
                            estados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <button
                class="secondary small"
                [disabled]="page === 1 || ui.busy()"
                (click)="page = page - 1; refresh()"
              >
                ← Anterior</button
              ><span>Página {{ page }}</span
              ><button
                class="secondary small"
                [disabled]="page * 20 >= total || ui.busy()"
                (click)="page = page + 1; refresh()"
              >
                Siguiente →
              </button>
            </div>
          </section>
        } @else {
          <section class="panel empty-state">
            <h2>Selecciona dónde trabajar</h2>
            <p>
              El resumen se calcula únicamente sobre las faenas a las que tienes
              acceso.
            </p>
          </section>
        }
      }
      @if (ui.busy()) {
        <div role="status" class="feedback">
          <span class="spinner"></span> Procesando…
        </div>
      }
      @if (ui.error()) {
        <div role="alert" class="feedback error">
          {{ ui.error()
          }}<button aria-label="Cerrar aviso" (click)="ui.error.set('')">
            ×
          </button>
        </div>
      }
      <footer class="page-footer">
        FAENALERT · Operación local · Datos sintéticos
      </footer>
    </main>
  </div>`,
})
export class ManagementComponent implements OnInit {
  readonly ui = inject(WorkspaceUi);
  responsibles = signal<{ id: string; name: string; active: boolean }[]>([]);
  items = signal<Commitment[]>([]);
  summary = signal<CommitmentSummary | null>(null);
  page = 1;
  total = 0;
  owner = "";
  state = "pending";
  readonly cards = [
    { state: "pending", key: "pending", label: "Pendientes" },
    { state: "overdue", key: "overdue", label: "Vencidos" },
    { state: "upcoming", key: "upcoming", label: "Próximos 7 días" },
    { state: "closed", key: "closed", label: "Cerrados" },
  ] as const;
  logout() {
    if (this.ui.signOut()) {
      this.items.set([]);
      this.summary.set(null);
    }
  }
  ngOnInit() {
    if (this.ui.session.token())
      void this.ui.run(async () => {
        await this.ui.context.initialize();
        if (this.ui.context.siteId()) await this.load();
      });
  }
  login(credentials: LoginCredentials) {
    this.ui.email = credentials.email;
    this.ui.password = credentials.password;
    return this.ui.run(async () => {
      await this.ui.signIn();
      if (this.ui.context.siteId()) await this.load();
    });
  }
  selectSite(id: string) {
    this.ui.context.select(id);
    this.items.set([]);
    this.summary.set(null);
    this.owner = "";
    this.page = 1;
    return this.ui.run(async () => {
      if (id) {
        await this.ui.context.loadUsers();
        await this.load();
      }
    });
  }
  refresh() {
    return this.ui.run(() => this.load());
  }
  async load() {
    const result = await this.ui.api.request<
      Page<Commitment> & {
        summary: CommitmentSummary;
        owners: { id: string; name: string; active: boolean }[];
      }
    >(
      "sites/" +
        this.ui.context.siteId() +
        "/commitments?state=" +
        this.state +
        "&page=" +
        this.page +
        (this.owner ? "&owner=" + this.owner : ""),
    );
    this.responsibles.set(result.owners);
    this.items.set(result.items);
    this.total = result.total;
    this.summary.set(result.summary);
  }
  metric(key: "pending" | "overdue" | "upcoming" | "closed") {
    return this.summary()?.[key] ?? 0;
  }
  stateLabel() {
    return (
      {
        pending: "Compromisos pendientes",
        overdue: "Compromisos vencidos",
        upcoming: "Entregas de los próximos 7 días",
        closed: "Compromisos cerrados",
        all: "Todos los compromisos",
      } as Record<string, string>
    )[this.state];
  }
  statusLabel(s: string) {
    return (
      (
        {
          PENDING: "Pendiente",
          IN_PROGRESS: "En curso",
          PENDING_VERIFICATION: "Por verificar",
          CLOSED: "Cerrada",
          COMPLETED: "Completado",
        } as Record<string, string>
      )[s] ?? "En seguimiento"
    );
  }
}
