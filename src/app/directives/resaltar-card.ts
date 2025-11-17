import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core'

//resalta visualmente la card de publicacion cuando paso el mouse por encima
@Directive({
  selector: '[appResaltarCard]',
  standalone: true
})
export class ResaltarCardDirective {
  @Input('appResaltarCard') color = '#4fc3f7' //color personalizado para el borde al hacer hover
  @Input() resaltarSombra = '0 12px 30px rgba(0, 0, 0, 0.35)' //sombra opcional configurada desde la vista

  constructor(private readonly elemento: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {
    //guardo referencia al elemento host y al renderer para manipular estilos de forma segura
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    const nativo = this.elemento.nativeElement //obtengo el elemento nativo de la tarjeta
    //aplico sombra al hacer hover para darle efecto de elevacion
    this.renderer.setStyle(nativo, 'boxShadow', this.resaltarSombra)
    //aplico el color del borde para reforzar el efecto visual
    this.renderer.setStyle(nativo, 'borderColor', this.color)
    //aplico ligera traslacion hacia arriba para simular movimiento
    this.renderer.setStyle(nativo, 'transform', 'translateY(-4px)')
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const nativo = this.elemento.nativeElement //obtengo nuevamente el elemento host
    //remuevo la sombra al salir del hover
    this.renderer.removeStyle(nativo, 'boxShadow')
    //remuevo el borde aplicado
    this.renderer.removeStyle(nativo, 'borderColor')
    //remuevo la traslacion para volver la tarjeta a su posicion original
    this.renderer.removeStyle(nativo, 'transform')
  }
}
