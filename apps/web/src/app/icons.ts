import { Component, Input } from '@angular/core';
const icons: Record<string,string> = {
home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
book:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z M8 7h8 M8 11h8',
users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
calendar:'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M8 14h2 M14 14h2 M8 18h2',
file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h6',
check:'m5 12 4 4L19 6',shield:'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z m-4-11 3 3 5-5',
search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
arrow:'M5 12h14 m-5-5 5 5-5 5',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',plus:'M12 5v14 M5 12h14',close:'m6 6 12 12 M6 18 18 6',
clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
chart:'M3 3v18h18 M7 14v3 M12 9v8 M17 5v12',sparkles:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z M20 2v4 M18 4h4',
settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3H6l-4-5 3-3V6Z',
alert:'m12 3 10 18H2Z M12 9v5 M12 17v1',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',more:'M5 12h.01 M12 12h.01 M19 12h.01',
briefcase:'M8 6V3h8v3 M3 7h18v14H3Z M3 12h18 M10 12v3h4v-3',grid:'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',
list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',lock:'M6 11V7a6 6 0 0 1 12 0v4 M4 11h16v11H4Z M12 15v3',
send:'m22 2-7 20-4-9-9-4Z M22 2 11 13',upload:'M12 16V3 m-5 5 5-5 5 5 M3 16v5h18v-5',logout:'M9 3H3v18h6 M9 12h13 m-5-5 5 5-5 5',
edit:'m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5',mail:'M2 4h20v16H2Z m0 0 10 9L22 4',building:'M4 22V3h12v19 M16 8h4v14 M8 7h4 M8 11h4 M8 15h4 M8 19h4',
trend:'m3 17 6-6 4 4 8-10 M15 5h6v6',leaf:'M20 3C8 1 1 8 5 17c9 4 17-1 15-14Z M4 21 15 10',menu:'M3 6h18 M3 12h18 M3 18h18',
folder:'M3 5h6l2 3h10v13H3Z',refresh:'M20 8a8 8 0 1 0 1 7 M20 3v5h-5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
};
@Component({selector:'fa-icon',standalone:true,template:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path"/></svg>`,styles:[`:host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}`]})
export class IconComponent { @Input() name='home'; get path(){return icons[this.name]||icons['file'];} }
