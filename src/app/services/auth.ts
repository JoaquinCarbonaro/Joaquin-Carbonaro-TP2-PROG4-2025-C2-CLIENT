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
  //http y router disponibles
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  //estado del usuario
  private readonly logueado = new BehaviorSubject<boolean>(this.estaLogueado());
  private readonly perfilAdmin = new BehaviorSubject<boolean>(this.esUsuarioAdmin());
  private readonly nombreUsuario = new BehaviorSubject<string>(this.obtenerNombreUsuario());

  //temporizadores para aviso y cierre
  private timeoutAviso: any;
  private timeoutLogout: any;

  //observables publicos
  usuarioLogueado$ = this.logueado.asObservable();
  usuarioAdmin$ = this.perfilAdmin.asObservable();
  nombreUsuario$ = this.nombreUsuario.asObservable();

  //inicia sesion con email o username
  iniciarSesion(datos: { identifier: string; password: string }): Observable<any> {
    const body: Record<string, string> = { password: datos.password };
    if (datos.identifier.includes('@')) {
      body['email'] = datos.identifier;
    } else {
      body['userName'] = datos.identifier;
    }
    return this.http.post(`${environment.apiBaseUrl}/auth/login`, body);
  }

  //crea una cuenta nueva
  crearCuenta(formData: FormData): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/registro`, formData);
  }

  //cierra la sesion actual
  cerrarSesion(): void {
    this.limpiarTemporizadores();
    localStorage.removeItem('token');
    this.logueado.next(false);
    this.perfilAdmin.next(false);
    this.nombreUsuario.next('');
  }

  //guarda el token y prepara vigilancia
  guardarToken(token: string): void {
    this.limpiarTemporizadores();
    localStorage.setItem('token', token);
    this.logueado.next(true);
    this.perfilAdmin.next(this.esUsuarioAdmin());
    this.nombreUsuario.next(this.obtenerNombreUsuario());
    this.validarExpiracionToken(token);
  }

  //vuelve a consultar el backend para refrescar el token
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

  //trae listado de usuarios protegido
  traerListadoUsuarios(incluirInactivos: boolean = false): Observable<any> {
    const token = this.obtenerToken();
    return this.http.get(`${environment.apiBaseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      params: { incluirInactivos: incluirInactivos.toString() }
    });
  }

  //verifica el token con el backend
  verificarToken(): Observable<any> {
    const token = this.obtenerToken();
    if (!token) {
      return of(null);
    }
    return this.http.get(`${environment.apiBaseUrl}/auth/autorizar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  //obtiene el token desde storage
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  //revisa si la sesion es valida
  estaLogueado(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    const payload = this.decodificarToken(token);
    if (!payload || !payload.exp) return false;
    const ahora = Math.floor(Date.now() / 1000);
    return payload.exp > ahora;
  }

  //saber si es admin
  esUsuarioAdmin(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    const payload = this.decodificarToken(token);
    if (!payload) return false;
    return payload.perfil === 'administrador';
  }

  //trae id desde el token
  obtenerIdUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload) return '';
    const identificador = payload.uuid ?? payload.id ?? '';
    return identificador;
  }

  //trae el nombre desde el token
  obtenerNombreUsuario(): string {
    const token = this.obtenerToken();
    if (!token) return '';
    const payload = this.decodificarToken(token);
    if (!payload) return '';
    return payload.nombre ?? payload.userName ?? '';
  }

  //inicia la vigilancia del token guardado
  iniciarVigilanciaToken(): void {
    const token = this.obtenerToken();
    if (token) this.validarExpiracionToken(token);
  }

  //limpia temporizadores activos
  private limpiarTemporizadores(): void {
    if (this.timeoutAviso) clearTimeout(this.timeoutAviso);
    if (this.timeoutLogout) clearTimeout(this.timeoutLogout);
  }

  //valida expiracion y arma avisos
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
    if (tiempoAviso > 0) {
      this.timeoutAviso = setTimeout(() => this.mostrarModalRenovacion(), tiempoAviso);
    } else {
      this.mostrarModalRenovacion();
    }
    this.timeoutLogout = setTimeout(() => {
      this.cerrarSesion();
      this.router.navigate(['login']);
      mostrarSwal('sesion finalizada', 'tu token expiro', 'info');
    }, tiempoRestante);
  }

  //muestra modal para extender sesion
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

  //decodifica el token sin librerias externas
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
