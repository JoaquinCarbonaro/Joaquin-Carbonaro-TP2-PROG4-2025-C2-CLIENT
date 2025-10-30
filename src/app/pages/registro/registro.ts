import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Auth } from '../../services/auth';
import { mostrarSwal } from '../../utils/swal';

//defino validador para nombres y apellidos
const onlyLettersValidator = (min = 2): ValidatorFn => (c: AbstractControl) => {
  const v = (c.value ?? '').trim();
  if (!v) return { required: true };
  if (v.length < min) return { minlength: { requiredLength: min, actualLength: v.length } };
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(v) ? null : { onlyLetters: true };
};

//defino validador para emails con tld minimo de 2 letras
const emailWithTldValidator: ValidatorFn = (c: AbstractControl) => {
  const v = (c.value ?? '').trim();
  if (!v) return { required: true };
  //verifico formato algo@algo.tld
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) ? null : { emailTld: true };
};

//defino validador para username entre 4 y 20 caracteres
const usernameValidator = (min = 4, max = 20): ValidatorFn => (c: AbstractControl) => {
  const v = (c.value ?? '').trim();
  if (!v) return { required: true };
  if (v.length < min) return { minlength: { requiredLength: min, actualLength: v.length } };
  if (v.length > max) return { maxlength: { requiredLength: max, actualLength: v.length } };
  //permito letras, numeros y guion bajo, sin espacios
  return /^[a-zA-Z0-9](?:_?[a-zA-Z0-9])*$/.test(v) ? null : { usernamePattern: true };
};

@Component({
  standalone: true,
  selector: 'app-registro-page',
  templateUrl: './registro.html',
  styleUrl: './registro.css',
  imports: [ReactiveFormsModule, RouterLink]
})
export class Registro {
  //inyecto servicios necesarios
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  //defino regex para contraseña segura
  protected readonly passwordPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

  //controlo estado ui del boton y nombre de imagen
  protected isSubmitting = false;
  protected selectedImageName = 'Ningún archivo seleccionado';

  //armo formulario reactivo con validadores
  protected readonly registerForm = this.fb.group(
    {
      name: this.fb.control('', { validators: [onlyLettersValidator(2)], updateOn: 'blur' }),
      lastName: this.fb.control('', { validators: [onlyLettersValidator(2)], updateOn: 'blur' }),
      email: this.fb.control('', { validators: [emailWithTldValidator], updateOn: 'blur' }),
      username: this.fb.control('', { validators: [usernameValidator(4, 20)], updateOn: 'blur' }),
      password: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(this.passwordPattern)],
        updateOn: 'blur'
      }),
      confirmPassword: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
      birthDate: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
      description: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
        updateOn: 'blur'
      }),
      //guardo imagenPerfil alineada con el backend
      imagenPerfil: this.fb.control<File | null>(null),
    },
    { validators: (group) => this.matchPasswords(group) }
  );

  //verifico si un control tiene un error especifico
  protected has(ctrl: string, err: string): boolean {
    const c = this.registerForm.get(ctrl);
    return !!(c && c.touched && c.hasError(err));
  }

  //envio los datos al backend
  protected submit(): void {
    if (this.isSubmitting) return;

    //normalizo strings antes de validar
    ['name','lastName','email','username','description'].forEach(k => {
      const c = this.registerForm.get(k);
      if (c && typeof c.value === 'string') c.setValue(c.value.trim(), { emitEvent: false });
    });
    this.registerForm.updateValueAndValidity({ emitEvent: false });

    //si el formulario es invalido muestro modal y corto
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      mostrarSwal('Revisá el formulario', 'Hay campos con errores resaltados en rojo.', 'info');
      return;
    }

    //activo modo cargando
    this.isSubmitting = true;

    //obtengo valores crudos del formulario
    const val = this.registerForm.getRawValue();

    //creo formdata con todos los campos que espera el back
    const fd = new FormData();
    fd.append('nombre', val.name!);
    fd.append('apellido', val.lastName!);
    fd.append('email', val.email!);
    fd.append('userName', val.username!);
    fd.append('password', val.password!);
    fd.append('fechaNacimiento', String(val.birthDate));
    fd.append('descripcion', val.description!);
    if (val.imagenPerfil) {
      fd.append('imagenPerfil', val.imagenPerfil);
    }

    //llamo al servicio para crear cuenta
    this.auth.crearCuenta(fd)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          const token = res?.token;
          if (token) this.auth.guardarToken(token);
          //muestro modal unico de exito
          mostrarSwal('Registro completado', 'Ya podés empezar a usar Rumbo Criollo', 'success');
          this.router.navigate(['/publicaciones']);
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'No se pudo registrar';
          mostrarSwal('Error', Array.isArray(msg) ? msg.join(', ') : String(msg), 'error');
        }
      });
  }

  //manejo el cambio de imagen de perfil
  protected onProfileImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.registerForm.get('imagenPerfil')?.setValue(file);
    this.selectedImageName = file ? file.name : 'Ningún archivo seleccionado';
  }

  //valido que las contraseñas coincidan
  private matchPasswords(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value ?? '';
    const confirm = control.get('confirmPassword')?.value ?? '';
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  }
}
