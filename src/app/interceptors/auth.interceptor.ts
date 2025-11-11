import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Auth } from '../services/auth';

//defino las rutas publicas que no requieren autenticacion
const rutasPublicas = ['/auth/login', '/auth/registro'];

//defino el interceptor que agrega el token y maneja errores 401
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  //inyecto el servicio de autenticacion
  const auth = inject(Auth);
  //inyecto el router para redirigir si hay error de autenticacion
  const router = inject(Router);
  //obtengo el token guardado
  const token = auth.obtenerToken();
  //verifico si la peticion es hacia una ruta publica
  const esPublica = rutasPublicas.some((ruta) => req.url.includes(ruta));

  //creo una copia de la peticion
  var peticion = req;

  //si tengo token, no es ruta publica y la peticion no trae authorization, agrego el header
  if (token && !req.headers.has('Authorization') && !esPublica) {
    //clono la peticion agregando el header authorization con el token
    peticion = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  //intercepto la respuesta para manejar errores
  return next(peticion).pipe(
    //capturo errores http
    catchError((error) => {
      //si el error es 401 (no autorizado) cierro sesion y redirijo al login
      if (error instanceof HttpErrorResponse && error.status === 401) {
        //cierro sesion del usuario
        auth.cerrarSesion();
        //redirijo al login
        router.navigate(['/login']);
      }
      //reenvio el error para que otros interceptores o componentes puedan manejarlo
      return throwError(() => error);
    })
  );
};
