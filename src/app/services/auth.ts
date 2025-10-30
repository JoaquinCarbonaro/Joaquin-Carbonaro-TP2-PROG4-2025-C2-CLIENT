import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { mostrarSwal, swalConOpciones } from '../utils/swal';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  //inyecto http y router para peticiones y navegacion
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  //mantengo el estado reactivo del usuario
  private readonly logueado = new BehaviorSubject<boolean>(this.estaLogueado());
  private readonly perfilAdmin = new BehaviorSubject<boolean>(this.esUsuarioAdmin());
  private readonly nombreUsuario = new BehaviorSubject<string>(this.obtenerNombreUsuario());

  //uso temporizadores para aviso y cierre de sesion
  private timeoutAviso: any;
  private timeoutLogout: any;

  //expongo observables publicos para los componentes
  usuarioLogueado$ = this.logueado.asObservable();
  usuarioAdmin$ = this.perfilAdmin.asObservable();
  nombreUsuario$ = this.nombreUsuario.asObservable();

  //inicio sesion con correo o nombre de usuario
  iniciarSesion(datos: { identifier: string; password: string }): Observable<any> {
    //armo el body segun si es email o username
    const body: Record<string, string> = { password: datos.password };
    if (datos.identifier.includes('@')) {
      body['email'] = datos.identifier;
    } else {
      body['userName'] = datos.identifier;
    }
    //envio la peticion al backend
    return this.http.post(`${environment.apiBaseUrl}/auth/login`, body);
  }

  //creo un nuevo usuario con los datos del formulario
  crearCuenta(formData: FormData): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/registro`, formData);
  }

  //cierro la sesion actual y limpio datos locales
  cerrarSesion(): void {
    this.limpiarTemporizadores();
    localStorage.removeItem('token');
    this.logueado.next(false);
    this.perfilAdmin.next(false);
    this.nombreUsuario.next('');
  }

  //guardo el token recibido y preparo la vigilancia
  guardarToken(token: string): void {
    this.limpiarTemporizadores();
    localStorage.setItem('token', token);
    this.logueado.next(true);
    this.perfilAdmin.next(this.esUsuarioAdmin());
    this.nombreUsuario.next(this.obtenerNombreUsuario());
    this.validarExpiracionToken(token);
  }

  //pido al backend un nuevo token si el actual es valido
  refrescarToken(): Observable<any> {
    const token = this.obtenerToken();
    if (!token) {
      return of(null);
    }
    return this.http.post(
      `${environment.apiBaseUrl}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  //traigo el listado de usuarios si tengo permisos
  traerListadoUsuarios(incluirInactivos: boolean = false): Observable<any> {
    const token = this.obtenerToken();
    return this.http.get(`${environment.apiBaseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      params: { incluirInactivos: incluirInactivos.toString() }
    });
  }

  //verifico si el token guardado sigue siendo valido
  verificarToken(): Observable<any> {
    const token = this.obtenerToken();
    if (!token) {
      return of(null);
    }
    return this.http.get(`${environment.apiBaseUrl}/auth/autorizar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  //obtengo el token desde el localstorage
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  //compruebo si hay una sesion valida segun la expiracion
  estaLogueado(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    const payload = this.decodificarToken(token);
    if (!payload || !payload.exp) return false;
    const ahora = Math.floor(Date.now() / 1000);
    return payload.exp > ahora;
  }

  //verifico si el usuario tiene perfil administrador
  esUsuarioAdmin(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    const payload = this.decodificarToken(token);
    if (!payload) return false;
    return payload.perfil === 'administrador';
  }

  //obtengo el id del usuario desde el token
  obtenerIdUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload) return '';
    const identificador = payload.uuid ?? payload.id ?? '';
    return identificador;
  }

  //obtengo el nombre del usuario desde el token
  obtenerNombreUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload) return '';
    return payload.nombre ?? payload.userName ?? '';
  }

  //inicio la vigilancia del token actual
  iniciarVigilanciaToken(): void {
    const token = this.obtenerToken();
    if (token) this.validarExpiracionToken(token);
  }

  //limpio los temporizadores activos de aviso y logout
  private limpiarTemporizadores(): void {
    if (this.timeoutAviso) clearTimeout(this.timeoutAviso);
    if (this.timeoutLogout) clearTimeout(this.timeoutLogout);
  }

  //valido la expiracion del token y programo los avisos
  private validarExpiracionToken(token: string): void {
    const payload = this.decodificarToken(token);
    if (!payload || !payload.exp) {
      this.cerrarSesion();
      this.router.navigate(['login']);
      return;
    }
    const ahora = Math.floor(Date.now() / 1000);
    if (payload.exp <= ahora) {
      this.cerrarSesion();
      this.router.navigate(['login']);
      return;
    }
    const tiempoRestante = (payload.exp - ahora) * 1000;
    const tiempoAviso = tiempoRestante - environment.tokenWarningMs;
    //programo aviso antes del cierre si hay tiempo suficiente
    if (tiempoAviso > 0) {
      this.timeoutAviso = setTimeout(() => this.mostrarModalRenovacion(), tiempoAviso);
    } else {
      this.mostrarModalRenovacion();
    }
    //cierro sesion automaticamente cuando el token expira
    this.timeoutLogout = setTimeout(() => {
      this.cerrarSesion();
      this.router.navigate(['login']);
      mostrarSwal('sesion finalizada', 'tu token expiro', 'info');
    }, tiempoRestante);
  }

  //muestro modal para extender o cerrar sesion
  private mostrarModalRenovacion(): void {
    swalConOpciones(
      'deseas extender la sesion 15 minutos mas?',
      'el token esta por expirar',
      'renovar',
      'cerrar sesion'
    ).then((respuesta) => {
      if (respuesta === 'si') {
        this.refrescarToken().subscribe({
          next: (res) => {
            const nuevoToken = res?.token;
            if (nuevoToken) {
              this.guardarToken(nuevoToken);
              mostrarSwal('sesion extendida', 'ya podes seguir navegando', 'success');
            }
          },
          error: (error) => {
            console.error('no se pudo renovar la sesion', error);
            mostrarSwal('sesion no renovada', 'volvemos al login', 'error');
            this.cerrarSesion();
            this.router.navigate(['login']);
          }
        });
      } else if (respuesta === 'no') {
        this.cerrarSesion();
        this.router.navigate(['login']);
      }
    });
  }

  //decodifico el token jwt sin librerias externas
  private decodificarToken(token: string): any {
    try {
      const partes = token.split('.');
      if (partes.length < 2) return null;
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(decoded);
    } catch (error) {
      console.error('token invalido', error);
      return null;
    }
  }
}
