import { Pipe, PipeTransform } from '@angular/core'

//resume un texto largo para mostrarlo de forma mas compacta en las vistas no detalladas
@Pipe({
  name: 'textoResumido',
  standalone: true
})
export class TextoResumidoPipe implements PipeTransform {
  transform(valor: string | null | undefined, limite = 120, sufijo = '...'): string {
    const texto = (valor ?? '').trim() //normalizo el texto para evitar errores con null o undefined
    const limiteSeguro = limite > 0 ? limite : 0 //me aseguro de no usar limites negativos

    if (texto.length <= limiteSeguro) {
      //si el texto ya entra en el limite lo devuelvo tal cual
      return texto
    }

    var resumen = texto.slice(0, limiteSeguro).trimEnd() //recorto el texto y limpio espacios finales

    if (resumen === '') {
      //si quedo vacio por algun texto con muchos espacios reintento sin trim
      resumen = texto.slice(0, limiteSeguro)
    }

    //devuelvo el texto recortado seguido del sufijo configurado
    return `${resumen}${sufijo}`
  }
}
