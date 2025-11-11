import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { mostrarSwal } from '../../utils/swal';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [ReactiveFormsModule, RouterLink]
})
export class Login {
  //form builder compartido
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  //expresion para validar la contraseña
  protected readonly passwordPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

  //credenciales rapidas cargadas en la base real
  private readonly credencialesRapidas = environment.quickLogins;

  //formulario reactivo del login
  protected readonly loginForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]]
  });

  //mensaje de error del servidor
  protected serverError = '';

  //estado de carga
  protected cargando = false;

  //envia el formulario
  protected submit(): void {
    if (this.cargando) {
      return;
    }
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.serverError = '';
    this.cargando = true;

    const formValue = this.loginForm.getRawValue();
    const identifier = formValue.identifier ?? '';
    const password = formValue.password ?? '';

    this.authService
      .iniciarSesion({ identifier: identifier, password: password })
      .subscribe({
        next: (response) => {
          const token = response?.token ?? '';
          if (!token) {
            this.cargando = false;
            this.serverError = 'no recibimos el token del servidor';
            mostrarSwal('respuesta incompleta', this.serverError, 'warning');
            return;
          }
          this.authService.guardarToken(token);
          mostrarSwal('ingreso exitoso', 'ya estas dentro de rumbo criollo', 'success');
          this.cargando = false;
          this.router.navigate(['/publicaciones']);
        },
        error: (error) => {
          this.cargando = false;
          const mensaje = this.obtenerMensajeError(error);
          this.serverError = mensaje;
          mostrarSwal('no pudimos iniciar sesion', mensaje, 'error');
        }
      });
  }

  //login directo para agilizar pruebas
  protected iniciarSesionRapida(perfil: 'admin' | 'user'): void {
    const credenciales =
      perfil === 'admin' ? this.credencialesRapidas.admin : this.credencialesRapidas.user;
    this.loginForm.patchValue({
      identifier: credenciales.identifier,
      password: credenciales.password
    });
    this.submit();
  }

  //arma un mensaje legible segun la respuesta
  private obtenerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const mensajeDirecto =
        typeof error.error === 'string' ? error.error : error.error?.message;
      if (mensajeDirecto) {
        return mensajeDirecto;
      }
      if (error.status === 401) {
        return 'credenciales invalidas para rumbo criollo';
      }
      if (error.status === 0) {
        return 'no pudimos comunicarnos con el servidor';
      }
    }
    return 'ocurrio un problema inesperado';
  }
}
