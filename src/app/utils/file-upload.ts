//defino los tipos de imagen que acepto en el registro o perfil
export const TIPOS_IMAGEN_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

//mensaje que muestro si el archivo no es de un formato valido
export const MENSAJE_IMAGEN_INVALIDA =
  'Formato no permitido. Usá imagen PNG, JPG, JPEG, WEBP o GIF.';

//funcion que verifica si el archivo seleccionado es una imagen valida
export const esArchivoImagenValido = (file: File | null): boolean => {
  //si no se subio ningun archivo lo considero valido
  if (!file) return true;
  //compruebo si el tipo del archivo esta dentro de la lista permitida
  return TIPOS_IMAGEN_PERMITIDOS.includes(file.type);
};
