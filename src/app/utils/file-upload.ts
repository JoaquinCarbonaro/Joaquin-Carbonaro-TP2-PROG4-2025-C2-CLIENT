export const TIPOS_IMAGEN_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

export const MENSAJE_IMAGEN_INVALIDA =
  'Formato no permitido. Usá imagen PNG, JPG, JPEG, WEBP o GIF.';

export const esArchivoImagenValido = (file: File | null): boolean => {
  if (!file) return true;
  return TIPOS_IMAGEN_PERMITIDOS.includes(file.type);
};
