import { Component, ViewEncapsulation } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { BrandComponent } from "../brand";
import { IconComponent } from "../icons";

@Component({
  selector: "fa-workspace-nav",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandComponent, IconComponent],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `
    <nav aria-label="Navegación operativa">
      <a routerLink="/gestion" class="brand" aria-label="FAENALERT, resumen">
        <fa-brand />
      </a>
      <p class="brand-caption">PREVENCIÓN COLABORATIVA</p>

      <section class="workspace-card" aria-label="Espacio de demostración">
        <span class="workspace-icon"><fa-icon name="building" /></span>
        <span>
          <small>ESPACIO DE TRABAJO</small>
          <strong>Faena demostración</strong>
        </span>
      </section>

      <div class="section-label">OPERACIÓN</div>
      <div class="links">
        <a
          routerLink="/gestion"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
        >
          <fa-icon name="home" /><span>Panel general</span>
        </a>
        <a
          routerLink="/prevencion"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
        >
          <fa-icon name="shield" /><span>Inspecciones</span>
        </a>
        <a
          routerLink="/reuniones"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
        >
          <fa-icon name="calendar" /><span>Reuniones y actas</span>
        </a>
      </div>

      <div class="sidebar-bottom">
        <span class="status-dot"></span>
        <span>Espacio de demostración</span>
        <a routerLink="/maqueta">Maqueta visual ↗</a>
      </div>
      <div class="sidebar-landscape" aria-hidden="true">
        <div>
          <span></span>
          <p>Seguridad hoy,<br /><strong>operaciones para el mañana.</strong></p>
        </div>
      </div>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 230px;
        height: 100vh;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      nav {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        background: #0a1d35;
        color: #c8d1db;
        padding: 24px 0 14px;
      }
      .brand {
        display: flex;
        justify-content: center;
        padding: 0 18px;
        color: #fff;
      }
      .brand fa-brand {
        max-width: 100%;
      }
      .brand-caption {
        margin: 8px 0 28px;
        text-align: center;
        color: #9baabd;
        font-size: 8px;
        letter-spacing: 1.15px;
      }
      .workspace-card {
        display: flex;
        align-items: center;
        gap: 9px;
        margin: 0 15px 22px;
        padding: 12px;
        border: 1px solid #334861;
        border-radius: 8px;
        color: #fff;
      }
      .workspace-icon {
        display: inline-flex;
        padding: 7px;
        border-radius: 6px;
        background: #1b3453;
        color: #d4dfeb;
      }
      .workspace-icon fa-icon {
        width: 17px;
        height: 17px;
      }
      .workspace-card small {
        display: block;
        color: #93a4b9;
        font-size: 8px;
        letter-spacing: 0.9px;
      }
      .workspace-card strong {
        display: block;
        margin-top: 5px;
        font-size: 11px;
      }
      .section-label {
        padding: 0 26px 8px;
        color: #8092a8;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .links {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 0 13px;
      }
      .links a {
        display: flex;
        min-height: 43px;
        align-items: center;
        gap: 12px;
        padding: 10px 13px;
        border-radius: 7px;
        color: #c8d1db;
        font-size: 12px;
        text-decoration: none;
        transition: background 0.15s ease;
      }
      .links a:hover {
        background: #163152;
      }
      .links a.active {
        background: #ed6a19;
        box-shadow: 0 4px 12px #07152540;
        color: #fff;
      }
      .links fa-icon {
        width: 18px;
        height: 18px;
      }
      .sidebar-bottom {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: auto;
        padding: 18px 20px;
        color: #b3becb;
        font-size: 10px;
      }
      .status-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 5px;
        border-radius: 50%;
        background: #77bd88;
      }
      .sidebar-bottom a {
        margin-left: auto;
        color: #ff9a50;
        font-size: 10px;
        text-decoration: none;
      }
      .sidebar-bottom a:hover {
        text-decoration: underline;
      }
      .sidebar-landscape {
        display: flex;
        flex-shrink: 0;
        align-items: flex-end;
        height: 160px;
        padding: 20px;
        background:
          linear-gradient(0deg, #071423d4, transparent),
          url("/assets/faena-panorama.png") left 70% / auto 370px;
      }
      .sidebar-landscape > div {
        display: flex;
        align-items: stretch;
        gap: 9px;
      }
      .sidebar-landscape > div > span {
        width: 3px;
        border-radius: 4px;
        background: #f8751f;
      }
      .sidebar-landscape p {
        color: #fff;
        font-size: 12px;
        line-height: 1.55;
      }
      a:focus-visible {
        outline: 3px solid #ff9a50;
        outline-offset: 3px;
      }
      @media (max-width: 900px) and (min-width: 681px) {
        :host {
          width: 205px;
        }
      }
      @media (max-width: 680px) {
        :host {
          width: 100%;
          height: auto;
          position: sticky;
          top: 0;
          z-index: 40;
        }
        nav {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0 12px;
          height: auto;
          overflow: visible;
          padding: 10px 14px 0;
        }
        .brand {
          justify-content: flex-start;
          padding: 0;
        }
        .brand fa-brand {
          transform: scale(0.78);
          transform-origin: left center;
        }
        .brand-caption,
        .workspace-card,
        .section-label,
        .sidebar-bottom,
        .sidebar-landscape {
          display: none;
        }
        .links {
          grid-column: 1 / -1;
          flex-direction: row;
          gap: 5px;
          overflow-x: auto;
          padding: 8px 0 0;
        }
        .links a {
          min-height: 40px;
          padding: 8px 10px;
          font-size: 10px;
          white-space: nowrap;
        }
        .links fa-icon {
          width: 15px;
          height: 15px;
        }
      }
    `,
  ],
})
export class WorkspaceNav {}
