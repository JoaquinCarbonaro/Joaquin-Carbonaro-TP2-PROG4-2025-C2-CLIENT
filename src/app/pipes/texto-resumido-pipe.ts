import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'textoResumido'
})
export class TextoResumidoPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
