import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core'

//maneja estilos visuales cuando un boton entra en estado de carga
@Directive({
  selector: '[appBotonCargando]',
  standalone: true
})
export class BotonCargandoDirective implements OnChanges {
  @Input('appBotonCargando') activo = false //recibo el valor booleano que indica si el boton esta cargando

  constructor(private readonly elemento: ElementRef<HTMLButtonElement>, private readonly renderer: Renderer2) {
    //guardo la referencia al elemento nativo y al renderer para manipular estilos de forma segura
  }

  ngOnChanges(changes: SimpleChanges): void {
    //verifico si cambio la propiedad activo
    if (changes['activo']) {
      //si hubo cambio actualizo la apariencia del boton
      this.actualizarEstado()
    }
  }

  private actualizarEstado(): void {
    const nativo = this.elemento.nativeElement //obtengo el boton nativo

    if (this.activo) {
      //si el estado es activo aplico atributos aria y estilos visuales del estado cargando
      this.renderer.setAttribute(nativo, 'aria-busy', 'true')
      this.renderer.setStyle(nativo, 'opacity', '0.7')
      this.renderer.setStyle(nativo, 'cursor', 'not-allowed')
    } else {
      //si el estado deja de ser activo remuevo todos los estilos y atributos aplicados
      this.renderer.removeAttribute(nativo, 'aria-busy')
      this.renderer.removeStyle(nativo, 'opacity')
      this.renderer.removeStyle(nativo, 'cursor')
    }
  }
}
