import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

/** Keeps each mobile card field tied to its actual column header. */
@Directive({selector:'table',standalone:true})
export class ResponsiveTableDirective implements AfterViewInit, OnDestroy {
 private el:ElementRef<HTMLTableElement>=inject(ElementRef);
 private observer=new MutationObserver(()=>this.labelCells());
 ngAfterViewInit(){this.labelCells();this.observer.observe(this.el.nativeElement,{childList:true,subtree:true});}
 private labelCells(){const table=this.el.nativeElement;const labels=Array.from(table.querySelectorAll('thead th')).map(h=>h.textContent?.trim()||'Actions');for(const row of Array.from(table.querySelectorAll('tbody tr'))){Array.from(row.children).forEach((cell,i)=>{if(cell instanceof HTMLTableCellElement)cell.dataset['label']=labels[i]==='Actions'?'Acciones':labels[i];});}}
 ngOnDestroy(){this.observer.disconnect();}
}
