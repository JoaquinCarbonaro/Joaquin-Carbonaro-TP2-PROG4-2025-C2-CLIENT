import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'

@Component({
  standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  imports: [RouterLink, RouterLinkActive, RouterOutlet]
})
export class Dashboard {
  //defino las opciones visibles en el panel
  protected readonly opciones = [
    { path: 'usuarios', texto: 'Usuarios', icono: 'fas fa-users' },
    { path: 'estadisticas', texto: 'Estadísticas', icono: 'fas fa-chart-line' }
  ]
}
