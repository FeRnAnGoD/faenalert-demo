import { Injectable, inject, signal } from "@angular/core";
import { SessionService } from "./session.service";
import { ContextService } from "./context.service";
import { ApiService } from "./api.service";
import { DraftService } from "./draft.service";
@Injectable()
export class WorkspaceUi {
  readonly session = inject(SessionService);
  readonly context = inject(ContextService);
  readonly api = inject(ApiService);
  private drafts = inject(DraftService);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly message = signal("");
  email = "";
  password = "";
  async run(fn: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.message.set("");
    try {
      await fn();
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación",
      );
    } finally {
      this.busy.set(false);
    }
  }
  async signIn() {
    const result = await this.api.request<{
      accessToken: string;
      user: { id: string };
    }>("auth/login", "POST", { email: this.email, password: this.password });
    this.password = "";
    this.session.establish(result.accessToken, result.user.id);
    try {
      await this.context.initialize();
    } catch (error) {
      this.session.clear();
      this.context.clear();
      throw error;
    }
  }
  signOut() {
    if (this.drafts.book.dirtyFor(this.session.userId() + ":")) {
      this.error.set(
        "Tienes borradores pendientes. Vuelve a Reuniones y actas para guardarlos o descartarlos antes de cerrar sesión.",
      );
      return false;
    }
    this.drafts.clearUser(this.session.userId());
    this.session.clear();
    this.context.clear();
    this.error.set("");
    this.message.set("");
    return true;
  }
}
