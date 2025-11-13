import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

//estructura de publicaciones por usuario devuelta por el backend
export interface PublicacionesPorUsuarioDto {
  nombre: string;
  total: number;
}

//estructura de comentarios agrupados por fecha devuelta por el backend
export interface ComentariosPorFechaDto {
  fecha: string;
  total: number;
}

//estructura de comentarios agrupados por publicacion devuelta por el backend
export interface ComentariosPorPublicacionDto {
  titulo: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class Estadisticas {
  //inyecto httpclient para poder hacer las peticiones http al backend
  private readonly http = inject(HttpClient);

  //traigo la cantidad de publicaciones que hizo cada usuario dentro del rango indicado
  obtenerPublicacionesPorUsuario(
    desde: string,
    hasta: string
  ): Observable<PublicacionesPorUsuarioDto[]> {
    //armo los parametros de la consulta agregando el rango de fechas
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);

    //hago la peticion get al endpoint de estadisticas y devuelvo el observable tipado
    return this.http.get<PublicacionesPorUsuarioDto[]>(
      `${environment.apiBaseUrl}/estadisticas/publicaciones-por-usuario`,
      { params }
    );
  }

  //traigo la cantidad total de comentarios realizados por fecha dentro del rango indicado
  obtenerComentariosPorTiempo(
    desde: string,
    hasta: string
  ): Observable<ComentariosPorFechaDto[]> {
    //armo los parametros con las fechas seleccionadas
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);

    //hago la peticion get al endpoint de comentarios por tiempo y devuelvo el observable
    return this.http.get<ComentariosPorFechaDto[]>(
      `${environment.apiBaseUrl}/estadisticas/comentarios-por-tiempo`,
      { params }
    );
  }

  //traigo la cantidad de comentarios que recibio cada publicacion dentro del rango indicado
  obtenerComentariosPorPublicacion(
    desde: string,
    hasta: string
  ): Observable<ComentariosPorPublicacionDto[]> {
    //armo los parametros para enviar el rango de fechas en la consulta
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);

    //hago la peticion al endpoint que devuelve comentarios agrupados por publicacion
    return this.http.get<ComentariosPorPublicacionDto[]>(
      `${environment.apiBaseUrl}/estadisticas/comentarios-por-publicacion`,
      { params }
    );
  }
}
