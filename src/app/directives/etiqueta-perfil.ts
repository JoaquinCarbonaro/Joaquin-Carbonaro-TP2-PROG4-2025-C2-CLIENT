import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core'

//aplica estilos para mostrar una etiqueta segun el rol del usuario
@Directive({
  selector: '[appEtiquetaPerfil]',
  standalone: true
})
export class EtiquetaPerfilDirective implements OnChanges {
  @Input('appEtiquetaPerfil') tipo: string | null = null //recibo el tipo de rol desde la vista

  constructor(private readonly elemento: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {
    //guardo la referencia al elemento host y al renderer para manipular estilos de forma segura
  }

  ngOnChanges(): void {
    //cuando cambia el valor del rol vuelvo a aplicar estilos
    this.aplicarEstilos()
  }

  private aplicarEstilos(): void {
    const host = this.elemento.nativeElement //obtengo el elemento nativo donde aplico estilos
    const rol = (this.tipo ?? '').toLowerCase() //normalizo el rol a minusculas
    var colorFondo = 'rgba(158, 158, 158, 0.2)' //color por defecto para roles desconocidos
    var colorTexto = '#f1f8e9' //color de texto por defecto

    if (rol === 'administrador') {
      //si el rol es administrador uso colores de acento naranja
      colorFondo = 'rgba(255, 183, 77, 0.18)'
      colorTexto = '#ffb74d'
    } else if (rol === 'usuario') {
      //si el rol es usuario uso colores celestes de la identidad visual
      colorFondo = 'rgba(79, 195, 247, 0.18)'
      colorTexto = '#4fc3f7'
    }

    //aplico los estilos finales a la etiqueta
    this.renderer.setStyle(host, 'backgroundColor', colorFondo)
    this.renderer.setStyle(host, 'color', colorTexto)
    this.renderer.setStyle(host, 'border', `1px solid ${colorTexto}`)
    this.renderer.setStyle(host, 'padding', '0.2rem 0.75rem')
    this.renderer.setStyle(host, 'borderRadius', '999px')
    this.renderer.setStyle(host, 'fontSize', '0.85rem')
    this.renderer.setStyle(host, 'fontWeight', '600')
    this.renderer.setStyle(host, 'display', 'inline-flex')
    this.renderer.setStyle(host, 'alignItems', 'center')
    this.renderer.setStyle(host, 'gap', '0.35rem')
  }
}
