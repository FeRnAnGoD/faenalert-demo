import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_PASSWORD;

function capturePageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function signIn(page: Page, email = "admin@demo.local") {
  if (!password)
    throw new Error("SEED_PASSWORD is required for isolated browser tests");

  await page.goto("/");
  await page.getByLabel(/Correo electrónico/).fill(email);
  await page.getByLabel(/Contraseña/).fill(password);
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
}

async function findControlsWithoutNames(page: Page) {
  return page
    .locator(
      'button:visible, a[href]:visible, input:not([type="hidden"]):visible, select:visible, textarea:visible',
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const control = element as HTMLElement & {
            labels?: NodeListOf<HTMLLabelElement>;
          };
          const labelledBy = (element.getAttribute("aria-labelledby") ?? "")
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim())
            .filter(Boolean)
            .join(" ");
          const labelText = Array.from(control.labels ?? [])
            .map((label) => label.innerText.trim())
            .filter(Boolean)
            .join(" ");
          const imageAlt = Array.from(element.querySelectorAll("img[alt]"))
            .map((image) => image.getAttribute("alt")?.trim())
            .filter(Boolean)
            .join(" ");
          const inputValue =
            element instanceof HTMLInputElement &&
            ["button", "submit", "reset"].includes(element.type)
              ? element.value.trim()
              : "";
          return ![
            element.getAttribute("aria-label")?.trim(),
            labelledBy,
            element.getAttribute("title")?.trim(),
            labelText,
            (element as HTMLElement).innerText?.trim(),
            imageAlt,
            inputValue,
          ].some(Boolean);
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute("type"),
          className: element.getAttribute("class"),
        })),
    );
}

test("demo presentation leads to the local login and authenticates", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Juntos por una operación más segura/ }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Ver presentación del producto" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "La gestión de tu comité, clara y al día.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Acceder al Comité Paritario/ })
    .first()
    .click();
  await expect(page.getByLabel(/Correo electrónico/)).toBeVisible();

  await page.getByLabel(/Correo electrónico/).fill("admin@demo.local");
  await page.getByLabel(/Contraseña/).fill(password ?? "");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("button", { name: "Panel general" }),
  ).toHaveAttribute("aria-current", "page");
  expect(pageErrors).toEqual([]);
});

test("authenticated admin can open every workspace module", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });

  for (const label of [
    "Panel general",
    "Empresas y faenas",
    "Reuniones",
    "Actas",
    "Acuerdos y acciones",
    "Integrantes",
    "Inspecciones",
    "Accidentes e incidentes",
    "Capacitaciones",
    "Comisiones",
    "Documentos y normativa",
    "Asistente IA",
    "Reportes",
    "Configuración",
  ]) {
    const item = navigation.getByRole("button", { name: new RegExp(label) });
    await item.click();
    await expect(item).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test("Chile faena reference catalog loads attributed local photos", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  const failedImages: string[] = [];
  page.on("response", (response) => {
    if (
      new URL(response.url()).pathname.startsWith("/assets/faenas/") ||
      new URL(response.url()).pathname.startsWith("/assets/faena-")
    ) {
      if (!response.ok()) failedImages.push(response.url());
    }
  });

  await signIn(page);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Empresas y faenas" })
    .click();

  const cards = page.locator(".reference-card");
  await expect(cards).toHaveCount(19);
  for (const card of await cards.all()) {
    const name = (await card.locator("h2").innerText()).trim();
    const image = card.locator(".reference-photo img");
    await image.scrollIntoViewIfNeeded();
    const metadata = await image.evaluate(async (element: HTMLImageElement) => {
      await element.decode();
      return {
        source: element.currentSrc,
        alt: element.alt.trim(),
        width: element.naturalWidth,
      };
    });
    expect(metadata.width, `${name} photo did not load`).toBeGreaterThan(0);
    expect(metadata.source, `${name} photo is not local`).toContain(
      "127.0.0.1:4201/assets/",
    );
    expect(metadata.alt, `${name} photo needs descriptive alt text`).not.toBe(
      "",
    );

    const credit = card.locator(".reference-credit");
    await expect(credit).toContainText(/Foto:/);
    await expect(credit.locator("a[href^='https://']")).toHaveCount(1);
    await expect(
      card.locator(".reference-links a[href^='https://']"),
    ).toHaveCount(2);
  }
  expect(failedImages).toEqual([]);

  await page.getByLabel("Buscar faena de referencia").fill("Los Pelambres");
  await expect(cards).toHaveCount(1);
  await expect(cards.locator("h2")).toHaveText("Los Pelambres");
  expect(pageErrors).toEqual([]);
});

test("visible controls have accessible names and keyboard navigation restores focus", async ({
  page,
}) => {
  await page.goto("/");
  expect(await findControlsWithoutNames(page)).toEqual([]);

  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  for (const label of [
    "Panel general",
    "Reuniones",
    "Actas",
    "Acuerdos y acciones",
    "Integrantes",
    "Inspecciones",
    "Accidentes e incidentes",
    "Capacitaciones",
    "Comisiones",
    "Documentos y normativa",
    "Reportes",
    "Configuración",
  ]) {
    await navigation.getByRole("button", { name: new RegExp(label) }).click();
    expect(await findControlsWithoutNames(page), label).toEqual([]);
  }

  await page.setViewportSize({ width: 393, height: 852 });
  const openNavigation = page.getByRole("button", { name: "Abrir navegación" });
  await openNavigation.focus();
  await page.keyboard.press("Enter");
  await expect(openNavigation).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openNavigation).toHaveAttribute("aria-expanded", "false");
  await expect(openNavigation).toBeFocused();
});

test("workspace routes fit desktop, tablet and mobile viewports", async ({
  page,
}, testInfo) => {
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  const routes = [
    "Panel general",
    "Empresas y faenas",
    "Reuniones",
    "Actas",
    "Acuerdos y acciones",
    "Integrantes",
    "Inspecciones",
    "Accidentes e incidentes",
    "Capacitaciones",
    "Comisiones",
    "Documentos y normativa",
    "Asistente IA",
    "Reportes",
    "Configuración",
  ];
  const viewports = [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 393, height: 852 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const isCompact = viewport.width <= 1024;
    if (isCompact) {
      await expect(
        page.getByRole("button", { name: "Abrir navegación" }),
      ).toBeVisible();
    }

    for (const route of routes) {
      if (isCompact) {
        await page.getByRole("button", { name: "Abrir navegación" }).click();
      }
      await navigation.getByRole("button", { name: new RegExp(route) }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (isCompact) {
        await expect(
          page.getByRole("button", { name: "Abrir navegación" }),
        ).toHaveAttribute("aria-expanded", "false");
        await page.locator(".sidebar").evaluate(async (element) => {
          await Promise.all(
            element
              .getAnimations()
              .map((animation) => animation.finished.catch(() => undefined)),
          );
        });
      }
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(
        widths.document,
        `${route} overflows at ${viewport.width}px: ${JSON.stringify(widths)}`,
      ).toBeLessThanOrEqual(widths.viewport);

      if (route === "Panel general") {
        await page.screenshot({
          path: testInfo.outputPath(`dashboard-${viewport.width}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test("site reader can consult records without write controls", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page, "lector@demo.local");
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });

  await navigation.getByRole("button", { name: "Reuniones" }).click();
  await expect(page.getByRole("heading", { name: "Reuniones" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Programar reunión" }),
  ).toHaveCount(0);

  await navigation.getByRole("button", { name: "Integrantes" }).click();
  await expect(
    page.getByRole("heading", { name: "Integrantes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Agregar integrante" }),
  ).toHaveCount(0);

  await navigation.getByRole("button", { name: "Empresas y faenas" }).click();
  await expect(page.getByRole("button", { name: "Crear empresa" })).toHaveCount(
    0,
  );
  expect(pageErrors).toEqual([]);
});

test("member CSV export honors the active search and omits contact data", async ({
  page,
}) => {
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation.getByRole("button", { name: "Integrantes" }).click();
  await page.getByLabel("Buscar integrantes").fill("Sam Prueba");
  await expect(
    page.getByRole("row").filter({ hasText: "Sam Prueba" }),
  ).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("faenalert-members.csv");
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The CSV download stream was unavailable");
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();

  expect(csv).toContain("Sam Prueba");
  expect(csv).not.toContain("Luz Ejemplo");
  expect(csv).not.toContain("@demo.local");
  expect(csv).not.toContain("d0000000-0000-4000-8000-000000000001");
});

test("inspection action closes only after evidence and independent review", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation.getByRole("button", { name: "Inspecciones" }).click();

  const inspectionTitle = `Inspección E2E ${Date.now()}`;
  const findingText = `Condición de prueba ${Date.now()}`;
  const actionTitle = `Acción E2E ${Date.now()}`;
  const date = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Nueva inspección" }).click();
  await page.getByLabel("Título").fill(inspectionTitle);
  await page.getByLabel("Área").fill("Sector de pruebas sintéticas");
  await page.getByLabel("Fecha", { exact: true }).fill(date);
  await page.getByRole("button", { name: /Crear inspección/ }).click();

  const prevention = page.locator("fa-prevention");
  await expect(
    prevention.getByRole("heading", { name: inspectionTitle }),
  ).toBeVisible();
  await prevention.getByLabel("Hallazgo").fill(findingText);
  await prevention.getByRole("button", { name: /Agregar hallazgo/ }).click();

  const finding = prevention.locator(".finding-card").filter({
    hasText: findingText,
  });
  await expect(
    finding.getByRole("heading", { name: findingText }),
  ).toBeVisible();
  await finding.getByText("Asignar una nueva acción").click();
  await finding.getByLabel("Acción").fill(actionTitle);
  await finding.getByLabel("Responsable").selectOption({ label: "Alex Demo" });
  await finding.getByLabel("Fecha comprometida").fill(date);
  await finding.getByRole("button", { name: "Crear acción" }).click();
  await expect(
    finding.getByRole("heading", { name: actionTitle }),
  ).toBeVisible();

  await finding.getByRole("button", { name: /Iniciar acción/ }).click();
  await expect(finding.locator('[data-status="IN_PROGRESS"]')).toBeVisible();
  await finding
    .getByPlaceholder("Describe el avance o la evidencia disponible.")
    .fill("Se revisó la señalización del sector de prueba.");
  await finding.getByRole("button", { name: "Guardar evidencia" }).click();
  await finding.getByRole("button", { name: /Solicitar verificación/ }).click();
  await expect(
    finding.locator('[data-status="PENDING_VERIFICATION"]'),
  ).toBeVisible();

  await page.locator(".topbar .profile").click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "verificador@demo.local");
  await expect(page.locator(".topbar .profile")).toContainText("Casey Ejemplo");

  const reviewerNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reviewerNavigation
    .getByRole("button", { name: "Inspecciones" })
    .click();
  await page.getByRole("button", { name: new RegExp(inspectionTitle) }).click();
  const reviewerFinding = page
    .locator("fa-prevention .finding-card")
    .filter({ hasText: findingText });
  await expect(
    reviewerFinding.locator('[data-status="PENDING_VERIFICATION"]'),
  ).toBeVisible();
  await expect(
    reviewerFinding.getByRole("button", { name: /Iniciar acción/ }),
  ).toHaveCount(0);
  await reviewerFinding
    .getByLabel("Observación de revisión")
    .fill("Evidencia revisada; cierre aceptado para la demostración.");
  await reviewerFinding
    .getByRole("button", { name: /Verificar y cerrar/ })
    .click();
  await expect(reviewerFinding.locator('[data-status="CLOSED"]')).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Inspecciones" })
    .click();
  await page.getByRole("button", { name: new RegExp(inspectionTitle) }).click();
  const persistedFinding = page
    .locator("fa-prevention .finding-card")
    .filter({ hasText: findingText });
  await expect(
    persistedFinding.locator('[data-status="CLOSED"]'),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("meeting, minutes and agreement remain connected after reload", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation.getByRole("button", { name: "Reuniones" }).click();

  const meetingTitle = `Reunión E2E ${Date.now()}`;
  const meetingTopic = `Tema E2E ${Date.now()}`;
  const meetingNotes = `Notas sintéticas ${Date.now()}`;
  const minuteSummary = `Resumen guardado ${Date.now()}`;
  const agreementTitle = `Acuerdo E2E ${Date.now()}`;
  const dueDate = new Date(Date.now() + 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  await page.getByRole("button", { name: "Programar reunión" }).click();
  await page.getByLabel("Título *").fill(meetingTitle);
  await page.getByLabel("Fecha *").fill(dueDate);
  await page.getByLabel("Hora *").fill("09:30");
  await page.getByLabel("Lugar de reunión").fill("Sala sintética E2E");
  await page.getByLabel("Agenda del comité").fill(meetingTopic);
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();

  const meeting = page
    .locator(".meeting-list-item")
    .filter({ hasText: meetingTitle });
  await expect(meeting).toBeVisible();
  await meeting.getByRole("button", { name: "Ver reunión" }).click();

  await page.getByRole("button", { name: "Asistencia", exact: true }).click();
  const attendee = page.locator(".attendance-row input").first();
  await attendee.check();
  await expect(attendee).toBeChecked();
  await expect(page.locator(".panel-title .badge.green")).toHaveText(
    "1 presentes",
  );

  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  const topicRow = page
    .locator(".agenda-row")
    .filter({ hasText: meetingTopic });
  await topicRow.getByRole("button").click();
  await expect(topicRow.getByRole("button")).toHaveClass(/done/);

  await page.getByRole("button", { name: "Notas", exact: true }).click();
  await page
    .getByPlaceholder(/Registra los hechos, temas tratados/)
    .fill(meetingNotes);
  await page.getByRole("button", { name: /Iniciar reunión/ }).click();
  await expect(page.locator(".detail-toolbar .badge")).toHaveText("En curso");
  await page.getByRole("button", { name: /Finalizar y crear acta/ }).click();

  const minute = page
    .locator(".document-card")
    .filter({ hasText: `Acta · ${meetingTitle}` });
  await expect(minute).toBeVisible();
  await minute.getByRole("button", { name: /Abrir acta/ }).click();
  const summary = page.getByRole("textbox", { name: "Resumen de acta" });
  await expect(summary).toHaveValue(new RegExp(meetingNotes));
  await summary.fill(minuteSummary);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
  await page.getByRole("button", { name: "Solicitar revisión" }).click();
  await expect(page.locator(".minute-editor .section-top > .badge")).toHaveText(
    "Por revisar",
  );

  await navigation.getByRole("button", { name: "Acuerdos y acciones" }).click();
  await page.getByRole("button", { name: "Nuevo acuerdo" }).click();
  await page.getByLabel("Título *").fill(agreementTitle);
  await page.getByLabel("Fecha de entrega *").fill(dueDate);
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();
  const agreementTask = page
    .locator(".task-card")
    .filter({ hasText: agreementTitle });
  await expect(agreementTask).toBeVisible();
  await agreementTask
    .getByLabel("Estado del acuerdo")
    .selectOption({ label: "Por verificar" });
  await expect(page.getByRole("dialog")).toBeVisible();
  const agreementEvidence = `Evidencia sintética ${Date.now()}`;
  await page
    .getByLabel("Descripción de la evidencia *")
    .fill(agreementEvidence);
  await page.getByRole("button", { name: "Registrar evidencia" }).click();
  await expect(agreementTask).toContainText("Por verificar");
  await expect(page.getByRole("status")).toContainText(
    "Evidencia registrada y enviada a revisión independiente",
  );

  await page.locator(".topbar .profile").click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "verificador@demo.local");
  const reviewerNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reviewerNavigation
    .getByRole("button", { name: "Acuerdos y acciones" })
    .click();
  const reviewerAgreement = page
    .locator(".task-card")
    .filter({ hasText: agreementTitle });
  await expect(
    reviewerAgreement.getByRole("button", { name: "Revisar evidencia" }),
  ).toBeVisible();
  await reviewerAgreement
    .getByRole("button", { name: "Revisar evidencia" })
    .click();
  await expect(page.locator(".review-evidence")).toContainText(
    agreementEvidence,
  );
  await page
    .getByLabel("Observación de la revisión *")
    .fill(`Revisión sintética ${Date.now()}`);
  await page.getByRole("button", { name: "Verificar y cerrar" }).click();
  await expect(reviewerAgreement).toContainText("Completado");
  await expect(
    reviewerAgreement.getByLabel("Estado del acuerdo"),
  ).toBeDisabled();

  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  const reloadedNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reloadedNavigation.getByRole("button", { name: "Actas" }).click();
  const reloadedMinute = page
    .locator(".document-card")
    .filter({ hasText: `Acta · ${meetingTitle}` });
  await reloadedMinute.getByRole("button", { name: /Abrir acta/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Resumen de acta" }),
  ).toHaveValue(minuteSummary);
  await expect(
    page.getByRole("row").filter({ hasText: agreementTitle }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("incident chronology is ordered, persistent and read-only to site readers", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation
    .getByRole("button", { name: "Accidentes e incidentes" })
    .click();

  const incidentTitle = `Evento E2E ${Date.now()}`;
  const incidentFacts = `Hechos sintéticos ${Date.now()}`;
  const earlierNote = `Observación inicial sintética ${Date.now()}`;
  const laterNote = `Seguimiento sintético ${Date.now()}`;
  const incidentDate = new Date(Date.now() - 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const earlierAt = new Date(Date.now() - 2 * 86_400_000 + 60 * 60_000);
  const laterAt = new Date(Date.now() - 2 * 86_400_000 + 2 * 60 * 60_000);
  const toDateTimeLocal = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

  await page.getByRole("button", { name: "Registrar evento" }).click();
  await page.getByLabel("Título *").fill(incidentTitle);
  await page.getByLabel("Fecha del evento *").fill(incidentDate);
  await page.getByLabel("Clasificación").selectOption("Incidente peligroso");
  await page.getByLabel("Ubicación").fill("Sector sintético E2E");
  await page.getByLabel("Hechos observados").fill(incidentFacts);
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();

  const incidentRow = page.getByRole("row").filter({ hasText: incidentTitle });
  await expect(incidentRow).toBeVisible();
  await incidentRow.getByRole("button", { name: "Ver cronología" }).click();
  await expect(page.locator(".incident-detail")).toContainText(incidentFacts);
  await expect(
    page.getByRole("heading", { name: "Cronología descriptiva" }),
  ).toBeVisible();

  const timelineForm = page.locator(".incident-timeline-form");
  await timelineForm
    .getByLabel("Fecha y hora del hecho *")
    .fill(toDateTimeLocal(laterAt));
  await timelineForm.getByLabel("Descripción *").fill(laterNote);
  await timelineForm
    .getByRole("button", { name: /Guardar nota cronológica/ })
    .click();
  await expect(page.locator(".incident-timeline-list li")).toHaveCount(1);

  await timelineForm
    .getByLabel("Fecha y hora del hecho *")
    .fill(toDateTimeLocal(earlierAt));
  await timelineForm.getByLabel("Descripción *").fill(earlierNote);
  await timelineForm
    .getByRole("button", { name: /Guardar nota cronológica/ })
    .click();
  const entries = page.locator(".incident-timeline-list li");
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText(earlierNote);
  await expect(entries.nth(1)).toContainText(laterNote);
  await expect(entries.nth(0)).toContainText("Alex Demo");

  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  const reloadedNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reloadedNavigation
    .getByRole("button", { name: "Accidentes e incidentes" })
    .click();
  const reloadedIncident = page
    .getByRole("row")
    .filter({ hasText: incidentTitle });
  await reloadedIncident
    .getByRole("button", { name: "Ver cronología" })
    .click();
  const persistedEntries = page.locator(".incident-timeline-list li");
  await expect(persistedEntries).toHaveCount(2);
  await expect(persistedEntries.nth(0)).toContainText(earlierNote);
  await expect(persistedEntries.nth(1)).toContainText(laterNote);

  await page.locator(".topbar .profile").click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "lector@demo.local");
  const readerNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await readerNavigation
    .getByRole("button", { name: "Accidentes e incidentes" })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: incidentTitle })
    .getByRole("button", { name: "Ver cronología" })
    .click();
  await expect(page.locator(".incident-timeline-form")).toHaveCount(0);
  await expect(page.locator(".incident-readonly").last()).toContainText(
    "no agregar notas",
  );
  await expect(page.locator(".incident-timeline-list li")).toHaveCount(2);
  expect(pageErrors).toEqual([]);
});

test("training attendance and commission actions persist with independent review", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  const trainingTitle = `Capacitación E2E ${Date.now()}`;
  const participantName = `Participante E2E ${Date.now()}`;
  const trainingEvidence = `Material formativo revisado ${Date.now()}`;
  const commissionTitle = `Comisión E2E ${Date.now()}`;
  const commissionObjective = `Objetivo sintético ${Date.now()}`;
  const commissionAction = `Acción de comisión E2E ${Date.now()}`;
  const actionEvidence = `Evidencia de comisión revisada ${Date.now()}`;
  const reviewNote = `Revisión independiente E2E ${Date.now()}`;
  const futureDate = new Date(Date.now() + 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  await navigation.getByRole("button", { name: "Capacitaciones" }).click();
  await page.getByRole("button", { name: "Programar capacitación" }).click();
  await page.getByLabel("Título *").fill(trainingTitle);
  await page.getByLabel("Fecha *").fill(futureDate);
  await page.getByLabel("Hora *").fill("10:00");
  await page.getByLabel("Relator/a *").fill("Relator ficticio E2E");
  await page
    .getByLabel("Descripción *")
    .fill("Actividad preventiva sintética para validar asistencia.");
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();

  let trainingCard = page
    .locator(".document-card")
    .filter({ hasText: trainingTitle });
  await expect(trainingCard).toBeVisible();
  await trainingCard
    .getByRole("button", { name: "Gestionar asistencia y evidencia" })
    .click();
  await page.getByLabel("Nombre de participante").fill(participantName);
  await page.getByRole("button", { name: "Agregar", exact: true }).click();

  const participant = page
    .locator(".training-person")
    .filter({ hasText: participantName });
  await expect(participant).toBeVisible();
  await participant
    .getByLabel(`Asistencia de ${participantName}`)
    .selectOption({ label: "Presente" });
  await expect(page.locator(".panel-title .badge.green").first()).toHaveText(
    "1 presentes",
  );
  await page.getByLabel("Descripción de evidencia").fill(trainingEvidence);
  await page.getByRole("button", { name: "Guardar descripción" }).click();
  await expect(page.locator(".evidence-list")).toContainText(trainingEvidence);

  await page.reload();
  const reloadedNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reloadedNavigation
    .getByRole("button", { name: "Capacitaciones" })
    .click();
  trainingCard = page
    .locator(".document-card")
    .filter({ hasText: trainingTitle });
  await trainingCard
    .getByRole("button", { name: "Gestionar asistencia y evidencia" })
    .click();
  const persistedParticipant = page
    .locator(".training-person")
    .filter({ hasText: participantName });
  const persistedAttendance = persistedParticipant.getByLabel(
    `Asistencia de ${participantName}`,
  );
  await expect(persistedAttendance.locator("option:checked")).toHaveText(
    "Presente",
  );
  await expect(page.locator(".evidence-list")).toContainText(trainingEvidence);

  await reloadedNavigation.getByRole("button", { name: "Comisiones" }).click();
  await page.getByRole("button", { name: "Crear comisión" }).click();
  await page.getByLabel("Título *").fill(commissionTitle);
  await page.getByLabel("Objetivo de la comisión *").fill(commissionObjective);
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();

  let commissionCard = page
    .locator(".document-card")
    .filter({ hasText: commissionTitle });
  await expect(commissionCard).toBeVisible();
  await commissionCard
    .getByRole("button", { name: "Ver objetivo y seguimiento" })
    .click();
  await page
    .getByPlaceholder("Describe una acción concreta")
    .fill(commissionAction);
  await page.getByLabel("Responsable").selectOption({ label: "Alex Demo" });
  await page.getByLabel("Fecha de entrega").fill(futureDate);
  await page.getByRole("button", { name: "Agregar acción" }).click();

  const action = page
    .locator(".commission-task-list .task-card")
    .filter({ hasText: commissionAction });
  await expect(action).toBeVisible();
  const actionStatus = action.getByLabel("Estado de la acción");
  await actionStatus.selectOption({ label: "En curso" });
  await expect(actionStatus.locator("option:checked")).toHaveText("En curso");
  await expect(page.getByRole("status")).toContainText(
    "Estado actualizado en la API local",
  );
  await actionStatus.selectOption({ label: "Por verificar" });
  await page.getByLabel("Descripción de la evidencia *").fill(actionEvidence);
  await page.getByRole("button", { name: "Registrar evidencia" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Evidencia registrada y enviada a revisión independiente",
  );
  await expect(actionStatus.locator("option:checked")).toHaveText(
    "Por verificar",
  );

  await page.locator(".topbar .profile").click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "verificador@demo.local");
  await expect(page.locator(".topbar .profile")).toContainText("Casey Ejemplo");
  const reviewerNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await reviewerNavigation
    .getByRole("button", { name: "Acuerdos y acciones" })
    .click();
  const reviewerAction = page
    .locator(".task-card")
    .filter({ hasText: commissionAction });
  await expect(reviewerAction).toContainText("Por verificar");
  await expect(
    reviewerAction.getByRole("button", { name: "Revisar evidencia" }),
  ).toBeVisible();
  const evidenceResponsePromise = page.waitForResponse(
    (response) =>
      /\/actions\/[^/]+\/evidence/.test(response.url()) &&
      response.request().method() === "GET",
    { timeout: 5_000 },
  );
  await reviewerAction
    .getByRole("button", { name: "Revisar evidencia" })
    .click();
  const evidenceResponse = await evidenceResponsePromise;
  const evidenceResponseBody = await evidenceResponse.json();
  expect(evidenceResponse.ok(), JSON.stringify(evidenceResponseBody)).toBe(
    true,
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".review-evidence")).toContainText(actionEvidence);
  await page.getByLabel("Observación de la revisión *").fill(reviewNote);
  await page.getByRole("button", { name: "Verificar y cerrar" }).click();
  await expect(reviewerAction).toContainText("Completado");

  await reviewerNavigation
    .getByRole("button", { name: "Capacitaciones" })
    .click();
  const reviewerTrainingCard = page
    .locator(".document-card")
    .filter({ hasText: trainingTitle });
  await reviewerTrainingCard
    .getByRole("button", { name: "Gestionar asistencia y evidencia" })
    .click();
  await expect(
    page
      .locator(".training-person")
      .filter({ hasText: participantName })
      .getByLabel(`Asistencia de ${participantName}`),
  ).toBeDisabled();
  await expect(page.getByLabel("Nombre de participante")).toHaveCount(0);
  await expect(page.getByLabel("Descripción de evidencia")).toHaveCount(0);

  await reviewerNavigation.getByRole("button", { name: "Comisiones" }).click();
  const reviewerCommissionCard = page
    .locator(".document-card")
    .filter({ hasText: commissionTitle });
  const commissionActionsResponsePromise = page.waitForResponse(
    (response) =>
      /\/commissions\/[^/]+\/actions\?page=1/.test(response.url()) &&
      response.request().method() === "GET",
    { timeout: 5_000 },
  );
  await reviewerCommissionCard
    .getByRole("button", { name: "Ver objetivo y seguimiento" })
    .click();
  const commissionActionsResponse = await commissionActionsResponsePromise;
  const commissionActionsBody = await commissionActionsResponse.json();
  expect(
    commissionActionsResponse.ok(),
    JSON.stringify(commissionActionsBody),
  ).toBe(true);
  expect(
    commissionActionsBody.items.map((item: { title: string }) => item.title),
  ).toContain(commissionAction);
  const reviewerCommissionAction = page
    .locator(".commission-task-list .task-card")
    .filter({ hasText: commissionAction });
  await expect(reviewerCommissionAction).toContainText("Completado");
  await expect(page.locator(".commission-action-form")).toHaveCount(0);
  await expect(
    reviewerCommissionAction.getByLabel("Estado de la acción"),
  ).toBeDisabled();

  await page.reload();
  const persistedNavigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await persistedNavigation
    .getByRole("button", { name: "Acuerdos y acciones" })
    .click();
  const persistedAction = page
    .locator(".task-card")
    .filter({ hasText: commissionAction });
  await expect(persistedAction).toContainText("Completado");
  await expect(persistedAction.getByLabel("Estado del acuerdo")).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test("workspace search finds a seeded record and opens its module", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  const searchNetwork: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/search")) searchNetwork.push("request sent");
  });
  page.on("response", (response) => {
    if (response.url().includes("/search"))
      searchNetwork.push(`response ${response.status()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/search"))
      searchNetwork.push(`failed ${request.failure()?.errorText ?? "unknown"}`);
  });
  await signIn(page);
  const search = page.getByRole("textbox", { name: "Buscar en el espacio" });
  await search.fill("señalización");

  const result = page.getByRole("button", {
    name: /Revisar la señalización del área de práctica/,
  });
  try {
    await expect(result).toBeVisible({ timeout: 20_000 });
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : "Search did not resolve"}\n` +
        `Network trace: ${searchNetwork.join(", ") || "no search request"}`,
    );
  }
  await result.click();
  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("button", { name: "Acuerdos y acciones" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByText(/Revisar la señalización del área de práctica/),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("mobile navigation opens, changes module and closes", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.getByRole("button", { name: "Abrir navegación" }).click();

  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "Reuniones" }).click();
  await expect(
    navigation.getByRole("button", { name: "Reuniones" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Abrir navegación" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(pageErrors).toEqual([]);
});

test("faena access stays separate when a site reader switches workspaces", async ({
  page,
}) => {
  const pageErrors = capturePageErrors(page);
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  const suffix = Date.now();
  const organizationName = `ZZZ E2E Empresa ${suffix}`;
  const siteName = `Faena E2E ${suffix}`;
  const meetingTitle = `Reunión aislada E2E ${suffix}`;

  await navigation.getByRole("button", { name: "Empresas y faenas" }).click();
  await page.getByRole("button", { name: "Crear empresa" }).click();
  const organizationDialog = page.getByRole("dialog", {
    name: "Crear empresa y primera faena",
  });
  await organizationDialog
    .getByLabel("Nombre de la empresa *")
    .fill(organizationName);
  await organizationDialog.getByLabel("Primera faena *").fill(siteName);
  await organizationDialog
    .getByLabel("Nombre del comité *")
    .fill(`Comité E2E ${suffix}`);
  await organizationDialog
    .getByLabel("Inicio del período *")
    .fill(new Date().toISOString().slice(0, 10));
  await organizationDialog
    .getByRole("button", { name: "Crear empresa y faena" })
    .click();
  await expect(page.locator(".workspace strong")).toHaveText(siteName);

  await navigation.getByRole("button", { name: "Reuniones" }).click();
  await page.getByRole("button", { name: "Programar reunión" }).click();
  await page.getByLabel("Título *").fill(meetingTitle);
  await page
    .getByLabel("Fecha *")
    .fill(new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel("Hora *").fill("09:30");
  await page.getByLabel("Lugar de reunión").fill("Sala de prueba sintética");
  await page.getByLabel("Agenda del comité").fill("Seguimiento aislado E2E");
  await page.getByRole("button", { name: "Guardar en el espacio" }).click();
  await expect(
    page.locator(".meeting-list-item").filter({ hasText: meetingTitle }),
  ).toBeVisible();

  await navigation.getByRole("button", { name: "Empresas y faenas" }).click();
  const organization = page
    .locator(".workspace-organization")
    .filter({ hasText: organizationName });
  const site = organization.locator(".workspace-site").filter({
    hasText: siteName,
  });
  await site.getByRole("button", { name: "Accesos" }).click();
  const accessDialog = page.getByRole("dialog", {
    name: `Accesos · ${siteName}`,
  });
  await accessDialog
    .getByLabel("Cuenta")
    .selectOption({ label: "Riley Muestra · lector@demo.local" });
  await accessDialog.getByLabel("Rol en la faena").selectOption("VIEWER");
  await accessDialog.getByRole("button", { name: "Asignar acceso" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Acceso asignado a la faena",
  );
  await accessDialog.getByRole("button", { name: "Cerrar diálogo" }).click();

  await page.locator(".topbar .profile").click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "lector@demo.local");
  await page.getByRole("button", { name: "Cambiar faena" }).click();
  await page
    .locator(".workspace-switcher-card")
    .filter({ hasText: siteName })
    .click();
  await expect(page.locator(".workspace strong")).toHaveText(siteName);
  await navigation.getByRole("button", { name: "Reuniones" }).click();
  await expect(
    page.locator(".meeting-list-item").filter({ hasText: meetingTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Programar reunión" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Cambiar faena" }).click();
  await page
    .locator(".workspace-switcher-card")
    .filter({ hasText: "Faena demostración" })
    .click();
  await expect(page.locator(".workspace strong")).toHaveText(
    "Faena demostración",
  );
  await navigation.getByRole("button", { name: "Reuniones" }).click();
  await expect(
    page.locator(".meeting-list-item").filter({ hasText: meetingTitle }),
  ).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
