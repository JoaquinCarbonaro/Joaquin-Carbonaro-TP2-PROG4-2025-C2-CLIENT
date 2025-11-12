import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'
import { Usuario } from '../models/usuario'

//operaciones del panel de administracion de usuarios
@Injectable({
  providedIn: 'root'
})
export class Usuarios {
  //inyecto httpclient para comunicarme con el backend
  private readonly http = inject(HttpClient)

  //obtengo todos los usuarios segun el parametro (activos e inactivos)
  listar(incluirInactivos: boolean = true): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${environment.apiBaseUrl}/usuarios`, {
      params: { incluirInactivos: incluirInactivos.toString() }
    })
  }

  //envio al backend los datos del formulario para crear un usuario nuevo
  crear(datos: FormData): Observable<Usuario> {
    return this.http.post<Usuario>(`${environment.apiBaseUrl}/usuarios`, datos)
  }

  //realizo una baja logica de un usuario especifico
  deshabilitar(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${environment.apiBaseUrl}/usuarios/${id}`)
  }

  //realizo una alta logica para reactivar un usuario previamente deshabilitado
  reactivar(id: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${environment.apiBaseUrl}/usuarios/${id}/reactivar`, {})
  }
}
