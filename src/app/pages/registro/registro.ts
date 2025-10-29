import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

// ajusta la ruta segun donde tengas el util
import { mostrarSwal } from '../../utils/swal'; // ejemplo: src/app/utils/swal.ts

@Component({
  standalone: true,
  selector: 'app-registro-page',
  templateUrl: './registro.html',
  styleUrl: './registro.css',
  imports: [ReactiveFormsModule, RouterLink]
})
export class Registro {
  //form builder para el registro
  private readonly fb = inject(FormBuilder);

  //regex para la contraseña segura
  protected readonly passwordPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

  //nombre del archivo seleccionado
  protected selectedImageName = 'Ningún archivo seleccionado';

  //formulario de registro
  protected readonly registerForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
      confirmPassword: ['', Validators.required],
      birthDate: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(200)]],
      image: this.fb.control<File | null>(null)
    },
    { validators: (control) => this.matchPasswords(control) }
  );

  //controla el envio del formulario
  protected submit(): void {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username } = this.registerForm.getRawValue();
    //muestra modal global con el util swal
    mostrarSwal(
      'Registro en marcha',
      `${username ?? 'Tu usuario'}, vamos a guardar tus datos y tu foto cuando conectemos con el servidor.`,
      'info'
    );

    //si queres, resetea el form:
    // this.registerForm.reset();
    // this.selectedImageName = 'Ningún archivo seleccionado';
  }

  //cambia el archivo de imagen
  protected onProfileImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.registerForm.get('image')?.setValue(file);
    this.selectedImageName = file ? file.name : 'Ningún archivo seleccionado';
  }

  //valida que las contraseñas coincidan
  private matchPasswords(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value ?? '';
    const confirm = control.get('confirmPassword')?.value ?? '';

    if (!password || !confirm) {
      return null;
    }
    if (password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
