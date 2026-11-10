import { Injectable, signal } from "@angular/core";
@Injectable({ providedIn: "root" })
export class SessionService {
  readonly token = signal(sessionStorage.getItem("faenalert.session") ?? "");
  readonly userId = signal(sessionStorage.getItem("faenalert.user") ?? "");
  readonly expired = signal(false);
  establish(token: string, userId: string) {
    sessionStorage.setItem("faenalert.session", token);
    sessionStorage.setItem("faenalert.user", userId);
    this.token.set(token);
    this.userId.set(userId);
    this.expired.set(false);
  }
  clear() {
    sessionStorage.removeItem("faenalert.session");
    sessionStorage.removeItem("faenalert.user");
    sessionStorage.removeItem("faenalert.site");
    this.token.set("");
    this.userId.set("");
    this.expired.set(false);
  }
  expire() {
    this.clear();
    this.expired.set(true);
  }
}
