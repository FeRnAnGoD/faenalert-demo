import { Injectable, inject } from "@angular/core";
import { SessionService } from "./session.service";
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public requestId: string,
    message: string,
  ) {
    super(message);
  }
}
@Injectable({ providedIn: "root" })
export class ApiService {
  private session = inject(SessionService);
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    let response: Response;
    const token = this.session.token();
    try {
      response = await fetch("/api/v1/" + path, {
        method,
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: "Bearer " + token }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiFailure(
        0,
        "",
        "No se pudo conectar. Tus cambios siguen en el editor; vuelve a intentarlo.",
      );
    }
    const data = await response.json().catch(() => ({
      message: "El servicio no devolvió una respuesta válida.",
    }));
    if (token && this.session.token() !== token)
      throw new ApiFailure(
        401,
        data.requestId ?? "",
        "La sesión cambió mientras se procesaba la solicitud. Vuelve a intentarlo.",
      );
    if (!response.ok) {
      if (response.status === 401 && token) this.session.expire();
      const fields = data.fieldErrors?.fieldErrors as
        Record<string, string[]> | undefined;
      const detail = fields
        ? Object.entries(fields)
            .map(
              ([field, messages]) =>
                (
                  ({
                    title: "Título",
                    area: "Área",
                    ownerId: "Responsable",
                    dueOn: "Fecha de entrega",
                    committee_id: "Comité",
                    scheduled_at: "Fecha y hora",
                    content: "Contenido",
                    version: "Versión",
                  }) as Record<string, string>
                )[field] ?? "Campo",
            )
            .join(" · ")
        : "";
      throw new ApiFailure(
        response.status,
        data.requestId ?? "",
        response.status === 409
          ? "Otro cambio o estado impide guardar. Conservamos tu texto; consulta la versión del servidor antes de reintentar."
          : (data.message ?? "No se pudo completar la operación") +
              (detail ? " · " + detail : ""),
      );
    }
    return data as T;
  }
}
