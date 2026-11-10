import { Injectable } from "@angular/core";
import { DraftBook } from "./drafts";
@Injectable({ providedIn: "root" })
export class DraftService {
  readonly book = new DraftBook();
  constructor() {
    try {
      this.book.restore(
        JSON.parse(sessionStorage.getItem("faenalert.drafts") ?? "[]"),
      );
    } catch {
      sessionStorage.removeItem("faenalert.drafts");
    }
  }
  persist() {
    try {
      sessionStorage.setItem(
        "faenalert.drafts",
        JSON.stringify(this.book.snapshot()),
      );
      return true;
    } catch {
      return false;
    }
  }
  clearUser(user: string) {
    this.book.clearPrefix(user + ":");
    this.persist();
  }
}
