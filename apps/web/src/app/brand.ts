import { Component } from '@angular/core';

/** Vector identity inspired by the supplied CPHS reference; scales without raster text. */
@Component({
 selector:'fa-brand', standalone:true,
 template:`<svg viewBox="0 0 76 68" aria-hidden="true"><path d="M5 61 37 6 45 20 23 57h30l8 11H1Z" fill="currentColor"/><path d="m45 27 21 35H32l7-11h9l-9-15Z" fill="#ef6b17"/><path d="m57 62 7 6h11l-7-12Z" fill="currentColor"/></svg><span class="wordmark">FAENA<span>LERT</span><small>COMITÉS PARITARIOS</small></span>`,
 styles:[`:host{display:inline-flex;align-items:center;gap:9px;max-width:100%;color:inherit;line-height:1}svg{width:43px;height:43px;flex:none}.wordmark{font-size:23px;font-weight:800;letter-spacing:-.8px;white-space:nowrap}.wordmark>span{color:#ef6b17}.wordmark small{display:block;font-size:9px;letter-spacing:1.4px;font-weight:600;margin-top:8px;color:inherit}@media(max-width:360px){.wordmark{font-size:21px}svg{width:37px}}`]
})
export class BrandComponent {}
