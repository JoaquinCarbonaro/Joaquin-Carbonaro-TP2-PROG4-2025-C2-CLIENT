import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'; 

//defino los mensajes de error que se muestran en el front
export const MENSAJE_FECHA_OBLIGATORIA = 'Seleccioná tu fecha.';
export const MENSAJE_FECHA_FUTURA = 'La fecha de nacimiento no puede ser futura.';
export const MENSAJE_MENOR_EDAD = 'Debés ser mayor de 18 años para registrarte.';

//normalizo una fecha eliminando la hora para comparar solo dia, mes y año
const normalizarFecha = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

//verifico si el texto recibido puede transformarse en una fecha valida
export const esFechaTextoValida = (valor: string | null | undefined): boolean => {
  if (!valor) return false;
  const fecha = new Date(valor);
  //devuelvo true si la fecha es valida
  return Number.isNaN(fecha.getTime()) === false;
};

//verifico si una fecha es futura respecto a la fecha actual
export const esFechaFutura = (fecha: Date): boolean => {
  const fechaNormalizada = normalizarFecha(fecha);
  const hoy = normalizarFecha(new Date());
  //comparo si la fecha ingresada es posterior a hoy
  return fechaNormalizada.getTime() > hoy.getTime();
};

//calculo la edad actual del usuario segun su fecha de nacimiento
export const calcularEdad = (fecha: Date): number => {
  const hoy = normalizarFecha(new Date());
  const nacimiento = normalizarFecha(fecha);
  const diferenciaAnio = hoy.getFullYear() - nacimiento.getFullYear();
  const mesHoy = hoy.getMonth();
  const diaHoy = hoy.getDate();
  const mesNacimiento = nacimiento.getMonth();
  const diaNacimiento = nacimiento.getDate();
  //verifico si ya cumplio años este año
  const yaCumplio = mesHoy > mesNacimiento || (mesHoy === mesNacimiento && diaHoy >= diaNacimiento);
  //si aun no cumplio, resto un año
  return yaCumplio ? diferenciaAnio : diferenciaAnio - 1;
};

//creo el validador custom para la fecha de nacimiento
export const crearValidadorFechaNacimiento = (): ValidatorFn => {
  //devuelvo una funcion que valida el control del formulario
  const validator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    //si no hay valor devuelvo error de requerido
    if (!valor) return { required: true };
    //si el texto no es una fecha valida devuelvo error
    if (!esFechaTextoValida(valor)) return { invalidDate: true };
    const fecha = new Date(valor);
    //si la fecha es futura devuelvo error correspondiente
    if (esFechaFutura(fecha)) return { futureDate: true };
    //si el usuario tiene menos de 18 años devuelvo error
    if (calcularEdad(fecha) < 18) return { underAge: true };
    //si paso todas las validaciones devuelvo null
    return null;
  };
  return validator;
};
