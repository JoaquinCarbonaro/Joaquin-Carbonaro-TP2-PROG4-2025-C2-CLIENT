// servicio de diagnostico para probar el back desde el front
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiTestService {
  // prueba el endpoint /health del back
  async health():Promise<{ ok:boolean; ts?:number }>{
    const url = environment.apiBaseUrl + '/health';
    const res = await fetch(url, {
      method: 'GET',
      // si luego usas cookies httponly, descomentar la linea siguiente
      //credentials: environment.useCookies ? 'include' : 'same-origin'
    });
    return res.json();
  }

  // prueba un endpoint inexistente para ver manejo de errores y cors
  async missing():Promise<any>{
    const url = environment.apiBaseUrl + '/_no_existe_';
    const res = await fetch(url);
    if(!res.ok){
      throw new Error('not ok: ' + res.status);
    }
    return res.json();
  }
}
