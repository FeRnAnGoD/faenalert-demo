export interface Draft {
  content: string;
  baseContent: string;
  baseVersion: number;
}
export class DraftBook {
  private drafts = new Map<string, Draft>();
  open(key: string, content: string, version: number) {
    const existing = this.drafts.get(key);
    if (
      !existing ||
      (!this.dirty(key) &&
        (existing.baseVersion !== version || existing.baseContent !== content))
    )
      this.drafts.set(key, {
        content,
        baseContent: content,
        baseVersion: version,
      });
    return this.drafts.get(key)!;
  }
  edit(key: string, content: string) {
    const draft = this.drafts.get(key);
    if (draft) draft.content = content;
  }
  dirty(key: string) {
    const d = this.drafts.get(key);
    return !!d && d.content !== d.baseContent;
  }
  anyDirty() {
    return [...this.drafts.keys()].some((k) => this.dirty(k));
  }
  saved(key: string, content: string, version: number) {
    this.drafts.set(key, {
      content,
      baseContent: content,
      baseVersion: version,
    });
  }
  discard(key: string) {
    this.drafts.delete(key);
  }
  clear() {
    this.drafts.clear();
  }
  snapshot() {
    return [...this.drafts.entries()];
  }
  restore(entries: [string, Draft][]) {
    this.drafts = new Map(entries);
  }
  dirtyFor(prefix: string) {
    return [...this.drafts.keys()].some(
      (key) => key.startsWith(prefix) && this.dirty(key),
    );
  }
  clearPrefix(prefix: string) {
    for (const key of this.drafts.keys())
      if (key.startsWith(prefix)) this.drafts.delete(key);
  }
}
