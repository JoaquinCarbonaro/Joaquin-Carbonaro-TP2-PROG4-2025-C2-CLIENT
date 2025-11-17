import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tiempoRelativo'
})
export class TiempoRelativoPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
