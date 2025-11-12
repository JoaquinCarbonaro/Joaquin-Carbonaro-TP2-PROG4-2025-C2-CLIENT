import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Usuarios } from '../../../services/usuarios';
import { Usuario } from '../../../models/usuario';
import { mostrarSwal } from '../../../utils/swal';
import { crearValidadorFechaNacimiento, MENSAJE_FECHA_FUTURA, MENSAJE_MENOR_EDAD } from '../../../utils/date-validators';
import { esArchivoImagenValido, MENSAJE_IMAGEN_INVALIDA } from '../../../utils/file-upload';

//MISMOS VALIDADORES QUE EN REGISTRO

//validador de solo letras con minimo configurable
const onlyLettersValidator =
  (min = 2) =>
  (c: AbstractControl): ValidationErrors | null => {
    const v = (c.value ?? '').trim();
    if (!v) return { required: true };
    if (v.length < min) return { minlength: { requiredLength: min, actualLength: v.length } };
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(v) ? null : { onlyLetters: true };
  };

//validador de email con tld obligatorio
const emailWithTldValidator = (c: AbstractControl): ValidationErrors | null => {
  const v = (c.value ?? '').trim();
  if (!v) return { required: true };
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) ? null : { emailTld: true };
};

//validador de username con largo y patron basico
const usernameValidator =
  (min = 4, max = 20) =>
  (c: AbstractControl): ValidationErrors | null => {
    const v = (c.value ?? '').trim();
    if (!v) return { required: true };
    if (v.length < min) return { minlength: { requiredLength: min, actualLength: v.length } };
    if (v.length > max) return { maxlength: { requiredLength: max, actualLength: v.length } };
    return /^[A-Za-z][A-Za-z0-9_.]*$/.test(v) ? null : { usernamePattern: true };
  };

@Component({
  standalone: true,
  selector: 'app-dashboard-usuarios',
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  imports: [CommonModule, ReactiveFormsModule]
})
export class DashboardUsuarios implements OnInit {
  //inyecto formbuilder para crear el formulario reactivo
  private readonly fb = inject(FormBuilder);
  //inyecto servicio de usuarios para consumir el backend
  private readonly usuariosService = inject(Usuarios);

  //estado: lista de usuarios en memoria
  protected readonly usuarios = signal<Usuario[]>([]);
  //estado: usuario seleccionado para ver detalle
  protected readonly usuarioSeleccionado = signal<Usuario | null>(null);
  //estado: indicador de carga de la tabla
  protected readonly cargandoLista = signal<boolean>(false);
  //estado: indicador de proceso de creacion
  protected readonly creandoUsuario = signal<boolean>(false);
  //estado: control de visibilidad del formulario
  protected readonly mostrarFormulario = signal<boolean>(false);

  //archivo de imagen elegido por el admin
  protected imagenSeleccionada: File | null = null;

  //defino formulario reactivo con validadores y updateOn blur
  protected readonly formulario: FormGroup = this.fb.group(
    {
      nombre: this.fb.control('', { validators: [onlyLettersValidator(2)], updateOn: 'blur' }),
      apellido: this.fb.control('', { validators: [onlyLettersValidator(2)], updateOn: 'blur' }),
      email: this.fb.control('', { validators: [emailWithTldValidator], updateOn: 'blur' }),
      userName: this.fb.control('', { validators: [usernameValidator(4, 20)], updateOn: 'blur' }),
      password: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)],
        updateOn: 'blur'
      }),
      confirmPassword: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
      fechaNacimiento: this.fb.control('', { validators: [crearValidadorFechaNacimiento()], updateOn: 'blur' }),
      descripcion: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
        updateOn: 'blur'
      }),
      perfil: this.fb.control<'usuario' | 'administrador'>('usuario')
    },
    { validators: (form) => this.validarPasswords(form) }
  );

  //al iniciar cargo el listado de usuarios
  ngOnInit(): void {
    this.cargarUsuarios();
  }

  //traigo usuarios del backend y actualizo estado
  protected cargarUsuarios(): void {
    this.cargandoLista.set(true);
    this.usuariosService
      .listar(true)
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (respuesta) => {
          //ordeno por username para ver lista consistente
          const ordenados = [...respuesta].sort((a, b) => a.userName.localeCompare(b.userName));
          this.usuarios.set(ordenados);
          //si habia un seleccionado lo reubico por id
          const sel = this.usuarioSeleccionado();
          if (sel) this.usuarioSeleccionado.set(ordenados.find((u) => u._id === sel._id) ?? null);
        },
        error: (e) => {
          console.error('no pude cargar los usuarios', e);
          mostrarSwal('Error', 'No pude traer el listado de usuarios.', 'error');
        }
      });
  }

  //selecciono un usuario y cierro el formulario si estaba abierto
  protected seleccionar(usuario: Usuario): void {
    this.mostrarFormulario.set(false);
    this.usuarioSeleccionado.set(usuario);
  }

  //cierro el panel de detalle
  protected cerrarDetalle(): void {
    this.usuarioSeleccionado.set(null);
  }

  //abro el formulario y deselecciono usuario
  protected abrirFormulario(): void {
    this.usuarioSeleccionado.set(null);
    if (!this.mostrarFormulario()) this.mostrarFormulario.set(true);
  }

  //cierro el formulario
  protected cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  //creo un nuevo usuario a partir del formulario
  protected crearUsuario(): void {
    if (this.creandoUsuario()) return;

    //normalizo strings como en registro
    ['nombre', 'apellido', 'email', 'userName', 'descripcion'].forEach((k) => {
      const c = this.formulario.get(k);
      if (c && typeof c.value === 'string') c.setValue(c.value.trim(), { emitEvent: false });
    });
    this.formulario.updateValueAndValidity({ emitEvent: false });

    //si hay errores muestro swal con el caso mas relevante
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();

      const birthErrors = this.formulario.get('fechaNacimiento')?.errors;
      if (birthErrors?.['underAge']) {
        mostrarSwal('Necesitás ser mayor de edad', MENSAJE_MENOR_EDAD, 'info');
      } else if (birthErrors?.['futureDate']) {
        mostrarSwal('Fecha inválida', MENSAJE_FECHA_FUTURA, 'info');
      } else if (birthErrors?.['invalidDate']) {
        mostrarSwal('Fecha inválida', 'Ingresá una fecha real.', 'info');
      } else {
        mostrarSwal('Revisá el formulario', 'Hay campos con errores destacados.', 'info');
      }
      return;
    }

    //armo formdata para enviar incluyendo imagen opcional
    const v = this.formulario.getRawValue();
    const formData = new FormData();
    formData.append('nombre', v.nombre ?? '');
    formData.append('apellido', v.apellido ?? '');
    formData.append('email', v.email ?? '');
    formData.append('userName', v.userName ?? '');
    formData.append('password', v.password ?? '');
    formData.append('fechaNacimiento', String(v.fechaNacimiento ?? ''));
    formData.append('descripcion', v.descripcion ?? '');
    formData.append('perfil', v.perfil ?? 'usuario');
    if (this.imagenSeleccionada) formData.append('imagenPerfil', this.imagenSeleccionada);

    //llamo al servicio para crear y actualizo estados
    this.creandoUsuario.set(true);
    this.usuariosService
      .crear(formData)
      .pipe(finalize(() => this.creandoUsuario.set(false)))
      .subscribe({
        next: (usuario) => {
          mostrarSwal('Usuario creado', 'El nuevo usuario ya puede iniciar sesión.', 'success');
          //reseteo formulario y estados visuales
          this.formulario.reset({ perfil: 'usuario' });
          this.imagenSeleccionada = null;
          this.cargarUsuarios();
          this.usuarioSeleccionado.set(usuario);
          this.mostrarFormulario.set(false);
        },
        error: (error) => {
          const mensaje = error?.error?.message ?? 'No pude crear el usuario.';
          mostrarSwal('Error', Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje), 'error');
        }
      });
  }

  //deshabilito un usuario (baja logica)
  protected deshabilitar(usuario: Usuario): void {
    this.usuariosService.deshabilitar(usuario._id).subscribe({
      next: () => {
        mostrarSwal('Usuario deshabilitado', 'Este usuario no podrá ingresar hasta que lo habilites.', 'info');
        this.cargarUsuarios();
      },
      error: (e) => {
        console.error('no pude deshabilitar al usuario', e);
        mostrarSwal('Error', 'No pude deshabilitar al usuario.', 'error');
      }
    });
  }

  //reactivo un usuario (alta logica)
  protected reactivar(usuario: Usuario): void {
    this.usuariosService.reactivar(usuario._id).subscribe({
      next: () => {
        mostrarSwal('Usuario habilitado', 'El usuario puede volver a usar la aplicación.', 'success');
        this.cargarUsuarios();
      },
      error: (e) => {
        console.error('no pude reactivar al usuario', e);
        mostrarSwal('Error', 'No pude reactivar al usuario.', 'error');
      }
    });
  }

  //valido y guardo imagen seleccionada
  protected seleccionarImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!esArchivoImagenValido(file)) {
      this.imagenSeleccionada = null;
      if (input) input.value = '';
      mostrarSwal('Formato no soportado', MENSAJE_IMAGEN_INVALIDA, 'warning');
      return;
    }

    this.imagenSeleccionada = file;
  }

  //limpio formulario a estado inicial
  protected limpiarFormulario(): void {
    this.formulario.reset({ perfil: 'usuario' });
    this.imagenSeleccionada = null;
  }

  //obtengo mensaje de error segun validaciones del control
  protected obtenerError(campo: string): string {
    const control = this.formulario.get(campo);
    if (!control || !control.touched || !control.errors) {
      //caso especial: mismatch en confirm
      if (campo === 'confirmPassword' && this.formulario.hasError('passwordMismatch') && this.formulario.get('confirmPassword')?.touched) {
        return 'Las contraseñas deben coincidir.';
      }
      return '';
    }

    if (control.errors['required']) return 'Este campo es obligatorio.';
    if (control.errors['minlength']) return `Debés escribir al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    if (control.errors['maxlength']) return 'Alcanzaste el máximo permitido.';
    if (control.errors['pattern']) return 'Debe tener 8 caracteres, una mayúscula y un número.';
    if (control.errors['onlyLetters']) return 'Ingresá solo letras (mínimo 2).';
    if (control.errors['emailTld']) return 'Revisá que el correo sea válido.';
    if (control.errors['usernamePattern']) return 'Debe empezar con letra y solo usar letras, números, "_" o "."';
    if (control.errors['invalidDate']) return 'Ingresá una fecha válida.';
    if (control.errors['futureDate']) return 'La fecha no puede ser posterior a hoy.';
    if (control.errors['underAge']) return 'Debés tener 18 años o más.';
    return 'Revisá este campo.';
  }

  //validador de coincidencia de contraseñas a nivel formulario
  private validarPasswords(form: AbstractControl): ValidationErrors | null {
    if (!(form instanceof FormGroup)) return null;
    const p = form.get('password')?.value ?? '';
    const c = form.get('confirmPassword')?.value ?? '';
    if (!p || !c) return null;
    return p === c ? null : { passwordMismatch: true };
  }
}
