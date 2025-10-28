import { Routes } from '@angular/router';

export const routes: Routes = [
  // temporalmente enviamos a diagnostico para probar el back
  { path: '', redirectTo: 'diagnostico', pathMatch: 'full' },
  { path: 'diagnostico', loadComponent: () => import('./pages/diagnostico/diagnostico').then(m => m.Diagnostico) },

  // ejemplo de tus rutas reales (dejalas descomentadas cuando las tengas)
  //{ path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  //{ path: 'publicaciones', loadComponent: () => import('./pages/publicaciones/publicaciones').then(m => m.Publicaciones) },
  //{ path: 'mi-perfil', loadComponent: () => import('./pages/mi-perfil/mi-perfil').then(m => m.MiPerfil) },

  { path: '**', redirectTo: 'diagnostico' },
];
