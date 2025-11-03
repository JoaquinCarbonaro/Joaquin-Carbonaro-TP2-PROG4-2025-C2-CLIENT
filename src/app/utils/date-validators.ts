import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MENSAJE_FECHA_OBLIGATORIA = 'Seleccioná tu fecha.';
export const MENSAJE_FECHA_FUTURA = 'La fecha de nacimiento no puede ser futura.';
export const MENSAJE_MENOR_EDAD = 'Debés ser mayor de 18 años para registrarte.';

const normalizarFecha = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export const esFechaTextoValida = (valor: string | null | undefined): boolean => {
  if (!valor) return false;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) === false;
};

export const esFechaFutura = (fecha: Date): boolean => {
  const fechaNormalizada = normalizarFecha(fecha);
  const hoy = normalizarFecha(new Date());
  return fechaNormalizada.getTime() > hoy.getTime();
};

export const calcularEdad = (fecha: Date): number => {
  const hoy = normalizarFecha(new Date());
  const nacimiento = normalizarFecha(fecha);
  const diferenciaAnio = hoy.getFullYear() - nacimiento.getFullYear();
  const mesHoy = hoy.getMonth();
  const diaHoy = hoy.getDate();
  const mesNacimiento = nacimiento.getMonth();
  const diaNacimiento = nacimiento.getDate();
  const yaCumplio = mesHoy > mesNacimiento || (mesHoy === mesNacimiento && diaHoy >= diaNacimiento);
  return yaCumplio ? diferenciaAnio : diferenciaAnio - 1;
};

export const crearValidadorFechaNacimiento = (): ValidatorFn => {
  const validator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (!valor) return { required: true };
    if (!esFechaTextoValida(valor)) return { invalidDate: true };
    const fecha = new Date(valor);
    if (esFechaFutura(fecha)) return { futureDate: true };
    if (calcularEdad(fecha) < 18) return { underAge: true };
    return null;
  };
  return validator;
};
