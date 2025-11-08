import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Perfil } from '../models/perfil'
import { crearValidadorFechaNacimiento } from './date-validators'
import { esArchivoImagenValido } from './file-upload'

//estructura con los datos del modal que se muestran en la vista
export interface EstadoModalPerfil {
  nombreArchivo: string
  vistaPrevia: string
}

//estructura para informar mensajes relacionados a la fecha
export interface MensajesFechaModalPerfil {
  futuro: string
  menorEdad: string
}

//estructura con el titulo y detalle del mensaje de error
export interface MensajeModal {
  titulo: string
  detalle: string
}

//estructura con los datos necesarios para actualizar el perfil
export interface DatosActualizacionPerfil {
  nombre: string
  apellido: string
  email: string
  userName: string
  fechaNacimiento: string
  descripcion: string
  imagenPerfil: File | null
}

//crea el formulario reactivo utilizado dentro del modal
export function crearFormularioModalPerfil(fb: FormBuilder): FormGroup {
  //creo el formulario con todos los campos necesarios del perfil
  const formulario = fb.group({
    //campo nombre con requeridos basicos y patron alfabetico
    nombre: fb.control('', {
      validators: [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/)],
      updateOn: 'blur'
    }),
    //campo apellido con mismas reglas que nombre
    apellido: fb.control('', {
      validators: [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/)],
      updateOn: 'blur'
    }),
    //campo email con requerido y validacion de formato
    email: fb.control('', {
      validators: [Validators.required, Validators.email],
      updateOn: 'blur'
    }),
    //campo nombre de usuario con longitud y patron especifico
    userName: fb.control('', {
      validators: [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z][A-Za-z0-9_.]*$/)
      ],
      updateOn: 'blur'
    }),
    //campo fecha de nacimiento usando el validador personalizado
    fechaNacimiento: fb.control('', {
      validators: [crearValidadorFechaNacimiento()],
      updateOn: 'blur'
    }),
    //campo descripcion con limites minimos y maximos
    descripcion: fb.control('', {
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
      updateOn: 'blur'
    }),
    //campo imagen de perfil para almacenar el file seleccionado
    imagenPerfil: fb.control<File | null>(null)
  })

  //retorno el formulario ya configurado para usar en el modal
  return formulario
}

//precarga los datos del perfil dentro del formulario del modal
export function prepararFormularioModalPerfil(
  form: FormGroup,
  perfil: Perfil,
  formatearFecha: (fecha: Date | string | null | undefined) => string,
  resolverImagen: (ruta: string) => string
): EstadoModalPerfil {
  //formateo la fecha recibida para que sea compatible con el input date
  const fechaFormateada = formatearFecha(perfil.fechaNacimiento ?? '')

  //cargo los valores actuales del perfil en el formulario
  form.reset({
    nombre: perfil.nombre ?? '',
    apellido: perfil.apellido ?? '',
    email: perfil.email ?? '',
    userName: perfil.userName ?? '',
    fechaNacimiento: fechaFormateada,
    descripcion: perfil.descripcion ?? '',
    imagenPerfil: null
  })

  //marco el formulario como sin cambios y fuerzo recalculo de validaciones
  form.markAsPristine()
  form.updateValueAndValidity({ emitEvent: false })

  //resuelvo la url actual de la imagen de perfil
  const imagenActual = resolverImagen(perfil.imagenPerfil ?? '')
  //si hay imagen muestro texto generico, si no marco que no hay seleccion
  const nombreArchivo = imagenActual !== '' ? 'imagen cargada' : 'sin imagen seleccionada'

  //devuelvo el estado que usa el componente para mostrar en la vista
  return {
    nombreArchivo: nombreArchivo,
    vistaPrevia: imagenActual
  }
}

//restablece el formulario del modal a su estado inicial
export function restablecerFormularioModalPerfil(form: FormGroup): void {
  //reseteo todos los campos del formulario
  form.reset()
  //lo marco como pristino para limpiar estados visuales
  form.markAsPristine()
  //actualizo validaciones sin emitir eventos
  form.updateValueAndValidity({ emitEvent: false })
}

//maneja el cambio de archivo del input de imagen dentro del modal
export function manejarCambioImagenModalPerfil(
  evento: Event,
  form: FormGroup,
  perfilActual: Perfil | null,
  resolverImagen: (ruta: string) => string,
  actualizarVistaPrevia: (valor: string) => void
): { nombreArchivo: string; error: boolean } {
  //obtengo el input origen del evento
  const input = evento.target as HTMLInputElement | null
  //tomo el primer archivo si hay alguno seleccionado
  const archivo = input?.files && input.files.length > 0 ? input.files[0] : null

  //si el archivo no es valido limpio el campo y restauro la vista previa
  if (!esArchivoImagenValido(archivo)) {
    form.get('imagenPerfil')?.setValue(null)
    if (input) {
      input.value = ''
    }
    const vistaAnterior = perfilActual ? resolverImagen(perfilActual.imagenPerfil ?? '') : ''
    actualizarVistaPrevia(vistaAnterior)
    return {
      nombreArchivo: 'mantendras tu imagen actual',
      error: true
    }
  }

  //si el archivo es valido lo guardo en el control del formulario
  form.get('imagenPerfil')?.setValue(archivo)

  //si no hay archivo seleccionado vuelvo a la imagen original del perfil
  if (!archivo) {
    const vistaOriginal = perfilActual ? resolverImagen(perfilActual.imagenPerfil ?? '') : ''
    actualizarVistaPrevia(vistaOriginal)
    return {
      nombreArchivo: 'mantendras tu imagen actual',
      error: false
    }
  }

  //si hay archivo valido genero una vista previa usando filereader
  const lector = new FileReader()
  lector.onload = () => {
    const resultado = typeof lector.result === 'string' ? lector.result : ''
    //actualizo la vista previa con el dataurl generado
    actualizarVistaPrevia(resultado)
  }
  lector.readAsDataURL(archivo)

  //devuelvo el nombre real del archivo seleccionado
  return {
    nombreArchivo: archivo.name,
    error: false
  }
}

//recorta los campos de texto del formulario para quitar espacios sobrantes
export function limpiarCamposTextoModalPerfil(form: FormGroup, campos: string[]): void {
  //recorro cada nombre de campo que quiero limpiar
  campos.forEach((campo) => {
    const control = form.get(campo)
    //si el valor es string aplico trim para quitar espacios
    if (control && typeof control.value === 'string') {
      const valorSinEspacios = control.value.trim()
      control.setValue(valorSinEspacios, { emitEvent: false })
    }
  })
}

//obtiene el mensaje adecuado cuando hay errores en la fecha del formulario
export function obtenerMensajeErrorFechaModalPerfil(
  form: FormGroup,
  mensajes: MensajesFechaModalPerfil
): MensajeModal | null {
  //obtengo el objeto de errores del control de fecha
  const erroresFecha = form.get('fechaNacimiento')?.errors

  //si no hay errores no devuelvo mensaje
  if (!erroresFecha) {
    return null
  }

  //si la fecha esta en el futuro uso el mensaje correspondiente
  if (erroresFecha['futureDate']) {
    return {
      titulo: 'fecha invalida',
      detalle: mensajes.futuro
    }
  }

  //si la persona es menor a la edad requerida uso el mensaje correspondiente
  if (erroresFecha['underAge']) {
    return {
      titulo: 'fecha invalida',
      detalle: mensajes.menorEdad
    }
  }

  //si la fecha es invalida a nivel formato o valor aviso con texto generico
  if (erroresFecha['invalidDate']) {
    return {
      titulo: 'fecha invalida',
      detalle: 'ingresa una fecha real'
    }
  }

  //si falta completar la fecha lo indico explicitamente
  if (erroresFecha['required']) {
    return {
      titulo: 'fecha requerida',
      detalle: 'selecciona tu fecha de nacimiento'
    }
  }

  //si hay otros errores devuelvo un mensaje general de revision
  return {
    titulo: 'revisa el formulario',
    detalle: 'hay datos pendientes de corregir'
  }
}

//arma el payload con los datos del formulario para enviar al backend
export function obtenerDatosActualizacionModalPerfil(form: FormGroup): DatosActualizacionPerfil {
  //obtengo todos los valores del formulario sin tocar estados
  const valores = form.getRawValue() as {
    nombre?: string
    apellido?: string
    email?: string
    userName?: string
    fechaNacimiento?: string
    descripcion?: string
    imagenPerfil?: File | null
  }

  //normalizo la fecha de nacimiento a cadena vacia si no viene
  const fecha = valores.fechaNacimiento ?? ''

  //construyo el objeto de actualizacion usando fallback en cada campo
  return {
    nombre: valores.nombre ?? '',
    apellido: valores.apellido ?? '',
    email: valores.email ?? '',
    userName: valores.userName ?? '',
    fechaNacimiento: fecha,
    descripcion: valores.descripcion ?? '',
    imagenPerfil: valores.imagenPerfil ?? null
  }
}
