import { Pipe, PipeTransform } from '@angular/core'

//transforma una fecha en un mensaje de fecha relativa
@Pipe({
  name: 'tiempoRelativo',
  standalone: true
})
export class TiempoRelativoPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    if (!valor) {
      //si no llega fecha devuelvo un mensaje generico
      return 'Hace instantes'
    }

    const fecha = valor instanceof Date ? valor : new Date(valor) //convierto a objeto date por seguridad

    if (Number.isNaN(fecha.getTime())) {
      //si la fecha no es valida devuelvo mensaje corto
      return 'Hace instantes'
    }

    const diferencia = Date.now() - fecha.getTime() //calculo diferencia en milisegundos

    if (diferencia <= 0) {
      //si la fecha es futura o igual devuelvo mensaje generico
      return 'Hace instantes'
    }

    const segundosTotales = Math.floor(diferencia / 1000) //paso la diferencia a segundos

    const escalas = [
      { valor: 31536000, singular: 'año', plural: 'años' },
      { valor: 2592000, singular: 'mes', plural: 'meses' },
      { valor: 604800, singular: 'semana', plural: 'semanas' },
      { valor: 86400, singular: 'día', plural: 'días' },
      { valor: 3600, singular: 'hora', plural: 'horas' },
      { valor: 60, singular: 'minuto', plural: 'minutos' }
    ] //tabla de escalas para comparar de mayor a menor

    for (const escala of escalas) {
      //recorro las escalas hasta encontrar una que aplique
      if (segundosTotales >= escala.valor) {
        const cantidad = Math.floor(segundosTotales / escala.valor) //calculo cuantas unidades de esa escala pasaron
        const etiqueta = cantidad === 1 ? escala.singular : escala.plural //uso singular o plural segun corresponda
        return `Hace ${cantidad} ${etiqueta}` //armo el mensaje final
      }
    }

    //si no coincide con ninguna escala devuelvo un mensaje para segundos
    return 'Hace unos segundos'
  }
}
