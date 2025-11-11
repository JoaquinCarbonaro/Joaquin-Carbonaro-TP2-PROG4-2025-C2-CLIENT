import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { mostrarSwal, swalConOpciones } from '../utils/swal';

//describo la estructura esperada del token jwt utilizado en rumbo criollo
export interface TokenPayload {
  uuid?: string;
  id?: string;
  perfil?: string;
  email?: string;
  userName?: string;
  nombre?: string;
  exp?: number;
  iat?: number;
  [clave: string]: unknown;
}

//defino respuestas tipadas para las rutas del backend
type TokenRefreshResponse = { mensaje: string; token: string; usuario: TokenPayload };
type AutorizarResponse = { autorizado: boolean; usuario: TokenPayload };

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
    this.actualizarEstadoDesdePayload(null);
  }

  //guardo el token recibido y preparo la vigilancia
  guardarToken(token: string): void {
    const payload = this.decodificarToken(token);
    if (!payload) {
      this.cerrarSesion();
      return;
    }
    this.limpiarTemporizadores();
    localStorage.setItem('token', token);
    this.actualizarEstadoDesdePayload(payload);
    this.validarExpiracionToken(token, payload);
  }

  //pido al backend un nuevo token si el actual es valido
  refrescarToken(): Observable<TokenRefreshResponse | null> {
    const token = this.obtenerToken();
    //si no hay token no tiene sentido llamar al backend
    if (!token) {
      return of(null);
    }
    //no agrego headers a mano, el interceptor sumara Authorization
    const request = this.http.post<TokenRefreshResponse>(
      `${environment.apiBaseUrl}/auth/refrescar`,
      {}
    );
    //retorno la solicitud tipada para reutilizar el observable
    return request as Observable<TokenRefreshResponse | null>;
  }

  //traigo el listado de usuarios si tengo permisos
  traerListadoUsuarios(incluirInactivos: boolean = false): Observable<any> {
    //el interceptor agregara el token si existe, aca solo paso los params
    return this.http.get(`${environment.apiBaseUrl}/usuarios`, {
      params: { incluirInactivos: incluirInactivos.toString() }
    });
  }

  //verifico si el token guardado sigue siendo valido
  verificarToken(): Observable<AutorizarResponse | null> {
    const token = this.obtenerToken();
    if (!token) {
      return of(null);
    }
    //el interceptor agregara Authorization: Bearer <token>
    const request = this.http.post<AutorizarResponse>(
      `${environment.apiBaseUrl}/auth/autorizar`,
      {}
    );
    //retorno la solicitud tipada para reutilizar el observable
    return request as Observable<AutorizarResponse | null>;
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
    if (!payload) return false;
    return !this.estaExpirado(payload);
  }

  //verifico si el usuario tiene perfil administrador
  esUsuarioAdmin(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    const payload = this.decodificarToken(token);
    if (!payload || this.estaExpirado(payload)) return false;
    return payload.perfil === 'administrador';
  }

  //obtengo el id del usuario desde el token
  obtenerIdUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload || this.estaExpirado(payload)) return '';
    const identificador = payload.uuid ?? payload.id ?? '';
    return identificador;
  }

  //obtengo el nombre del usuario desde el token
  obtenerNombreUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload || this.estaExpirado(payload)) return '';
    return payload.nombre ?? payload.userName ?? '';
  }

  //inicio la vigilancia del token actual
  iniciarVigilanciaToken(): void {
    const token = this.obtenerToken();
    if (!token) {
      this.actualizarEstadoDesdePayload(null);
      return;
    }
    const payload = this.decodificarToken(token);
    if (!payload || this.estaExpirado(payload)) {
      this.cerrarSesion();
      return;
    }
    this.actualizarEstadoDesdePayload(payload);
    this.validarExpiracionToken(token, payload);
  }

  //limpio los temporizadores activos de aviso y logout
  private limpiarTemporizadores(): void {
    if (this.timeoutAviso) clearTimeout(this.timeoutAviso);
    if (this.timeoutLogout) clearTimeout(this.timeoutLogout);
  }

  //actualizo los subjects internos usando la informacion del token
  private actualizarEstadoDesdePayload(payload: TokenPayload | null): void {
    const sesionActiva = !!payload && !this.estaExpirado(payload);
    this.logueado.next(sesionActiva);
    this.perfilAdmin.next(sesionActiva && payload?.perfil === 'administrador');
    const nombre = sesionActiva ? payload?.userName ?? payload?.nombre ?? '' : '';
    this.nombreUsuario.next(nombre);
  }

  //determino si un payload ya vencio usando el campo exp
  private estaExpirado(payload: TokenPayload): boolean {
    if (typeof payload.exp !== 'number') {
      return true;
    }
    const ahora = Math.floor(Date.now() / 1000);
    return payload.exp <= ahora;
  }

  //valido la expiracion del token y programo los avisos
  private validarExpiracionToken(token: string, payload?: TokenPayload | null): void {
    const datos = payload ?? this.decodificarToken(token);
    if (!datos || this.estaExpirado(datos) || typeof datos.exp !== 'number') {
      this.cerrarSesion();
      this.router.navigate(['/login']);
      return;
    }
    const ahora = Math.floor(Date.now() / 1000);
    const tiempoRestante = Math.max((datos.exp - ahora) * 1000, 0);
    const tiempoAviso = Math.max(tiempoRestante - environment.tokenWarningMs, 0);
    //programo aviso antes del cierre si hay margen
    if (tiempoAviso > 0) {
      this.timeoutAviso = setTimeout(() => this.mostrarModalRenovacion(), tiempoAviso);
    } else {
      this.mostrarModalRenovacion();
    }
    //cierro sesion automaticamente cuando el token expira
    this.timeoutLogout = setTimeout(() => {
      this.cerrarSesion();
      this.router.navigate(['/login']);
      mostrarSwal('sesion finalizada', 'tu token expiro', 'info');
    }, tiempoRestante);
  }

  //muestro modal para extender o cerrar sesion
  private mostrarModalRenovacion(): void {
    swalConOpciones(
      'queres extender la sesion quince minutos mas?',
      'quedan cinco minutos de sesion',
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
            } else {
              this.cerrarSesion();
              this.router.navigate(['/login']);
              mostrarSwal('sesion no renovada', 'necesitas iniciar sesion nuevamente', 'warning');
            }
          },
          error: (error) => {
            console.error('no se pudo renovar la sesion', error);
            mostrarSwal('sesion no renovada', 'volvemos al login', 'error');
            this.cerrarSesion();
            this.router.navigate(['/login']);
          }
        });
      } else if (respuesta === 'no') {
        this.cerrarSesion();
        this.router.navigate(['/login']);
      }
    });
  }

  //decodifico el token jwt sin librerias externas
  private decodificarToken(token: string): TokenPayload | null {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) {
        return null;
      }
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
      const normalizado = `${base64}${padding}`;
      const decoded = decodeURIComponent(
        atob(normalizado)
          .split('')
          .map((caracter) => `%${('00' + caracter.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      const payload = JSON.parse(decoded) as TokenPayload;
      if (!payload || typeof payload !== 'object') {
        return null;
      }
      return payload;
    } catch (error) {
      console.error('token invalido', error);
      return null;
    }
  }
}
