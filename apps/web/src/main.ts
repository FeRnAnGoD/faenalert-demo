import { bootstrapApplication } from "@angular/platform-browser";
import { Component, LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { provideRouter, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet />",
})
class AppShell {}
registerLocaleData(localeEs, "es-CL");
bootstrapApplication(AppShell, {
  providers: [
    { provide: LOCALE_ID, useValue: "es-CL" },

    provideRouter([
{path:'',loadComponent:()=>import('./app/app').then(m=>m.AppComponent)},
{path:'gestion',redirectTo:'',pathMatch:'full'},
{path:'reuniones',redirectTo:'',pathMatch:'full'},
{path:'prevencion',redirectTo:'',pathMatch:'full'},
      { path: "maqueta", redirectTo: "", pathMatch: "full" },
      { path: "**", redirectTo: "" },
    ]),
  ],
}).catch(console.error);
