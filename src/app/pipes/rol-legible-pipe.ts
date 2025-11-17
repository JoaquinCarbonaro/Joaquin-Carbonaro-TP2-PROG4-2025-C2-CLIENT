import { Pipe, PipeTransform } from '@angular/core'

//convierte el rol en un texto entendible para la interfaz
@Pipe({
  name: 'rolLegible',
  standalone: true
})
export class RolLegiblePipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    const rolNormalizado = (valor ?? '').toString().trim().toLowerCase() //normalizo el valor recibido para evitar inconsistencias

    if (rolNormalizado === 'administrador') {
      //si el rol es administrador devuelvo la etiqueta formal
      return 'Administrador'
    }

    if (rolNormalizado === 'usuario') {
      //si el rol es usuario muestro un nombre mas representativo del proyecto
      return 'Mochilero'
    }

    if (rolNormalizado === '') {
      //si viene vacio informo que falta el dato
      return 'Rol no informado'
    }

    //para cualquier otro rol aplico capitalizacion basica para que se vea prolijo
    return rolNormalizado.charAt(0).toUpperCase() + rolNormalizado.slice(1)
  }
}
