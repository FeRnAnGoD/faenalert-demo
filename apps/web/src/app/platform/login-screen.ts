import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { BrandComponent } from "../brand";
import { IconComponent } from "../icons";

export interface LoginCredentials {
  email: string;
  password: string;
}

@Component({
  selector: "fa-login-screen",
  standalone: true,
  imports: [FormsModule, RouterLink, BrandComponent, IconComponent],
  template: `
    <section class="login-screen" aria-label="Ingreso a Faenalert">
      <div class="login-story">
        <div class="brand large"><fa-brand /></div>
        <span class="eyebrow">PERSONAS · PREVENCIÓN · CONTINUIDAD</span>
        <h1>Juntos por una<br />operación más segura.</h1>
        <p>
          Conecta a tu comité, transforma acuerdos en acciones y construye una
          cultura de prevención.
        </p>
        <div class="login-values">
          <span><fa-icon name="users" /> Participación que conecta</span>
          <span><fa-icon name="shield" /> Evidencia que permanece</span>
          <span><fa-icon name="trend" /> Decisiones que previenen</span>
        </div>
      </div>

      <section class="login-card">
        <span class="label">BIENVENIDO A FAENALERT</span>
        <h2>Tu próximo paso hacia una operación más segura</h2>
        <p class="muted">Ingresa a tu espacio de trabajo.</p>
        <form (ngSubmit)="submit()">
          <label
            >Correo electrónico *<input
              autocomplete="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              placeholder="nombre@empresa.cl"
              required
          /></label>
          <label
            >Contraseña<input
              autocomplete="current-password"
              name="password"
              type="password"
              [(ngModel)]="password"
              placeholder="Contraseña de demostración"
              required
          /></label>
          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }
          <button class="btn primary wide" type="submit" [disabled]="busy">
            {{ busy ? "Ingresando…" : "Continuar" }}
            <fa-icon name="arrow" />
          </button>
        </form>
        <a class="btn ghost wide presentation-link" routerLink="/maqueta">
          Volver a la presentación
        </a>
        <p class="demo-note">
          <fa-icon name="lock" /> Acceso de demostración local. Usa cuentas y
          datos ficticios.
        </p>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LoginScreenComponent {
  @Input() busy = false;
  @Input() error = "";
  @Input() email = "";
  @Input() password = "";
  @Output() credentials = new EventEmitter<LoginCredentials>();

  submit() {
    this.credentials.emit({ email: this.email, password: this.password });
  }
}
