import { Component, signal } from '@angular/core';
import { ApiTestService } from '../../services/api-test';

@Component({
  selector: 'rc-diagnostico',
  standalone: true,
  templateUrl: './diagnostico.html',
  styleUrls: ['./diagnostico.css'],
})
export class Diagnostico {
  // estados de la vista
  loading = signal<boolean>(false);
  result = signal<string>('');
  error = signal<string>('');

  constructor(private api:ApiTestService){}

  // prueba /health del back
  async probarHealth():Promise<void>{
    this.loading.set(true);
    this.result.set('');
    this.error.set('');
    try{
      const data = await this.api.health();
      this.result.set('ok=' + data.ok + ' ts=' + (data.ts ?? 0));
      console.log('health data', data);
    }catch(e:any){
      this.error.set('error: ' + (e?.message ?? 'desconocido'));
      console.error(e);
    }finally{
      this.loading.set(false);
    }
  }

  // prueba error para confirmar que no es cors sino 404 real
  async probarError():Promise<void>{
    this.loading.set(true);
    this.result.set('');
    this.error.set('');
    try{
      const data = await this.api.missing();
      this.result.set(JSON.stringify(data));
    }catch(e:any){
      this.error.set('error esperado: ' + (e?.message ?? 'desconocido'));
      console.error(e);
    }finally{
      this.loading.set(false);
    }
  }
}
