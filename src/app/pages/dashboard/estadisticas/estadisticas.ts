import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';
import {
  ComentariosPorFechaDto,
  ComentariosPorPublicacionDto,
  Estadisticas,
  PublicacionesPorUsuarioDto
} from '../../../services/estadisticas';
import { mostrarSwal } from '../../../utils/swal';

@Component({
  standalone: true,
  selector: 'app-dashboard-estadisticas',
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
  imports: [CommonModule, FormsModule]
})
export class DashboardEstadisticas implements AfterViewInit, OnDestroy {
  //inyecto el servicio que consume las apis de estadisticas
  private readonly estadisticas = inject(Estadisticas);

  //referencias a los contenedores de los graficos
  @ViewChild('graficoPublicaciones', { static: true })
  private graficoPublicaciones?: ElementRef<HTMLDivElement>;

  @ViewChild('graficoComentarios', { static: true })
  private graficoComentarios?: ElementRef<HTMLDivElement>;

  @ViewChild('graficoComentariosPublicacion', { static: true })
  private graficoComentariosPublicacion?: ElementRef<HTMLDivElement>;

  //rangos de fechas elegidos por el admin
  protected fechaDesde = '';
  protected fechaHasta = '';

  //guardo los datos para poder mostrar mensajes vacios
  protected readonly datosPublicaciones = signal<PublicacionesPorUsuarioDto[]>([]);
  protected readonly datosComentarios = signal<ComentariosPorFechaDto[]>([]);
  protected readonly datosComentariosPublicacion = signal<ComentariosPorPublicacionDto[]>([]);

  //referencias a las instancias de echarts para actualizar y destruir
  private graficoPublicacionesInstancia: echarts.ECharts | null = null;
  private graficoComentariosInstancia: echarts.ECharts | null = null;
  private graficoComentariosPublicacionInstancia: echarts.ECharts | null = null;

  //manejo el resize de la ventana para ajustar los graficos
  private readonly manejadorResize = () => {
    //si ya tengo el grafico de publicaciones lo redimensiono
    if (this.graficoPublicacionesInstancia) {
      this.graficoPublicacionesInstancia.resize();
    }
    //si ya tengo el grafico de comentarios por fecha lo redimensiono
    if (this.graficoComentariosInstancia) {
      this.graficoComentariosInstancia.resize();
    }
    //si ya tengo el grafico de comentarios por publicacion lo redimensiono
    if (this.graficoComentariosPublicacionInstancia) {
      this.graficoComentariosPublicacionInstancia.resize();
    }
  };

  ngAfterViewInit(): void {
    //me aseguro de estar en entorno navegador antes de escuchar el resize
    if (typeof window !== 'undefined') {
      //agrego el listener de resize para que los graficos se ajusten al ancho
      window.addEventListener('resize', this.manejadorResize);
    }
  }

  ngOnDestroy(): void {
    //antes de destruir el componente saco el listener del resize
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.manejadorResize);
    }
    //libero correctamente las instancias de los graficos
    this.destruirGraficos();
  }

  //valido fechas y solicito los datos al backend
  protected mostrarDatos(): void {
    //si falta alguna de las dos fechas aviso con modal y corto
    if (!this.fechaDesde || !this.fechaHasta) {
      mostrarSwal(
        'Revisá las fechas',
        'Elegí el rango completo antes de mostrar los datos.',
        'warning'
      );
      return;
    }

    //convierto las cadenas a objetos date para poder validar el rango
    const desde = new Date(this.fechaDesde);
    const hasta = new Date(this.fechaHasta);

    //si alguna fecha no es valida aviso y no llamo a las apis
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
      mostrarSwal(
        'Revisá las fechas',
        'Ingresá fechas válidas para continuar.',
        'warning'
      );
      return;
    }

    //si el rango es inconsistente (desde mayor que hasta) lo marco como error
    if (desde > hasta) {
      mostrarSwal(
        'Rango inválido',
        'La fecha desde no puede ser mayor que la fecha hasta.',
        'error'
      );
      return;
    }

    //si el rango es correcto pido los tres tipos de estadisticas en paralelo
    this.cargarPublicacionesPorUsuario();
    this.cargarComentariosPorTiempo();
    this.cargarComentariosPorPublicacion();
  }

  //indico si hay datos para mostrar mensaje de vacio en publicaciones
  protected sinDatosPublicaciones(): boolean {
    //si el arreglo de publicaciones esta vacio muestro el mensaje informativo
    return this.datosPublicaciones().length === 0;
  }

  //indico si hay datos para mostrar mensaje de vacio en comentarios por fecha
  protected sinDatosComentarios(): boolean {
    //si el arreglo de comentarios por fecha esta vacio muestro el mensaje informativo
    return this.datosComentarios().length === 0;
  }

  //indico si hay datos para mostrar mensaje de vacio en comentarios por publicacion
  protected sinDatosComentariosPublicacion(): boolean {
    //si el arreglo de comentarios por publicacion esta vacio muestro el mensaje informativo
    return this.datosComentariosPublicacion().length === 0;
  }

  //pido al backend la cantidad de publicaciones por usuario
  private cargarPublicacionesPorUsuario(): void {
    //llamo al servicio de estadisticas pasando el rango elegido
    this.estadisticas
      .obtenerPublicacionesPorUsuario(this.fechaDesde, this.fechaHasta)
      .subscribe({
        next: (respuesta) => {
          //me aseguro de trabajar siempre con un arreglo valido
          const datos = Array.isArray(respuesta) ? respuesta : [];
          //actualizo el signal con los datos recibidos
          this.datosPublicaciones.set(datos);

          //si no hay datos limpio el grafico para mostrar el estado vacio
          if (datos.length === 0) {
            this.limpiarGrafico(this.graficoPublicacionesInstancia);
            return;
          }

          //si hay datos armo o actualizo el grafico de publicaciones
          this.renderizarGraficoPublicaciones(datos);
        },
        error: (error) => {
          //log de consola para debuguear errores de la api
          console.error('no pude cargar publicaciones por usuario', error);
          //si hay error dejo los datos en vacio
          this.datosPublicaciones.set([]);
          //tambien limpio el grafico para que no muestre informacion vieja
          this.limpiarGrafico(this.graficoPublicacionesInstancia);
          //intento obtener un mensaje legible desde la respuesta
          const mensaje = error?.error?.message ?? 'No pude obtener los datos.';
          //muestro el error usando el modal de la aplicacion
          mostrarSwal(
            'Error',
            Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje),
            'error'
          );
        }
      });
  }

  //pido al backend la cantidad de comentarios realizados por fecha
  private cargarComentariosPorTiempo(): void {
    //llamo al endpoint de comentarios por rango temporal
    this.estadisticas
      .obtenerComentariosPorTiempo(this.fechaDesde, this.fechaHasta)
      .subscribe({
        next: (respuesta) => {
          //normalizo la respuesta a un arreglo
          const datos = Array.isArray(respuesta) ? respuesta : [];
          //actualizo el signal con los datos
          this.datosComentarios.set(datos);

          //si no tengo datos limpio el grafico para mostrar el estado vacio
          if (datos.length === 0) {
            this.limpiarGrafico(this.graficoComentariosInstancia);
            return;
          }

          //si tengo datos armo el grafico de linea con los comentarios por fecha
          this.renderizarGraficoComentarios(datos);
        },
        error: (error) => {
          //log de consola para rastrear el error
          console.error('no pude cargar comentarios por tiempo', error);
          //reseteo los datos del signal
          this.datosComentarios.set([]);
          //limpio el grafico para evitar datos desactualizados
          this.limpiarGrafico(this.graficoComentariosInstancia);
          //armo un mensaje de error legible para el modal
          const mensaje = error?.error?.message ?? 'No pude obtener los datos.';
          mostrarSwal(
            'Error',
            Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje),
            'error'
          );
        }
      });
  }

  //pido al backend los comentarios agrupados por publicacion
  private cargarComentariosPorPublicacion(): void {
    //llamo al endpoint que agrupa comentarios por publicacion dentro del rango
    this.estadisticas
      .obtenerComentariosPorPublicacion(this.fechaDesde, this.fechaHasta)
      .subscribe({
        next: (respuesta) => {
          //me aseguro de trabajar con un arreglo aunque la respuesta venga rara
          const datos = Array.isArray(respuesta) ? respuesta : [];
          //actualizo el signal que se usa en la vista y en el mensaje vacio
          this.datosComentariosPublicacion.set(datos);

          //si no hay datos limpio el grafico horizontal
          if (datos.length === 0) {
            this.limpiarGrafico(this.graficoComentariosPublicacionInstancia);
            return;
          }

          //si tengo datos armo el grafico de barras por publicacion
          this.renderizarGraficoComentariosPublicacion(datos);
        },
        error: (error) => {
          //log de consola para entender que paso con la peticion
          console.error('no pude cargar comentarios por publicacion', error);
          //reseteo el signal a arreglo vacio
          this.datosComentariosPublicacion.set([]);
          //limpio el grafico para no mostrar informacion vieja
          this.limpiarGrafico(this.graficoComentariosPublicacionInstancia);
          //preparo el mensaje para mostrar en el swal
          const mensaje = error?.error?.message ?? 'No pude obtener los datos.';
          mostrarSwal(
            'Error',
            Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje),
            'error'
          );
        }
      });
  }

  //armo el grafico de publicaciones usando un grafico de torta
  private renderizarGraficoPublicaciones(datos: PublicacionesPorUsuarioDto[]): void {
    //obtengo el div donde voy a dibujar el grafico
    const contenedor = this.graficoPublicaciones?.nativeElement;
    //si por algun motivo no tengo contenedor no sigo
    if (!contenedor) return;

    //si ya tengo instancia la reutilizo, si no la creo por primera vez
    this.graficoPublicacionesInstancia =
      this.graficoPublicacionesInstancia ??
      echarts.init(contenedor, undefined, { renderer: 'canvas' });

    //guardo la referencia local para trabajar mas comodo
    const grafico = this.graficoPublicacionesInstancia;
    //limpio cualquier configuracion previa antes de setear la nueva
    grafico.clear();

    //armo el listado de nombres de usuario con fallback a 'sin nombre'
    const nombres = datos.map((item) =>
      typeof item?.nombre === 'string' && item.nombre.trim() !== ''
        ? item.nombre
        : 'Sin nombre'
    );
    //armo el listado de totales de publicaciones con fallback a 0
    const totales = datos.map((item) =>
      typeof item?.total === 'number' ? item.total : 0
    );

    //configuro las opciones del grafico de torta
    grafico.setOption({
      backgroundColor: '#0b3a10',
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: { color: '#f1f8e9' }
      },
      series: [
        {
          name: 'Publicaciones',
          type: 'pie',
          radius: '60%',
          data: nombres.map((nombre, indice) => ({
            name: nombre,
            value: totales[indice]
          })),
          label: { color: '#f1f8e9' },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(0, 0, 0, 0.4)'
            }
          }
        }
      ]
    });

    //ajusto el grafico al tamaño actual del contenedor
    grafico.resize();
  }

  //armo el grafico de comentarios por fecha usando una linea suave
  private renderizarGraficoComentarios(datos: ComentariosPorFechaDto[]): void {
    //obtengo el contenedor html del grafico de linea
    const contenedor = this.graficoComentarios?.nativeElement;
    //si no tengo contenedor corto la ejecucion
    if (!contenedor) return;

    //reutilizo instancia existente o creo una nueva si es la primera vez
    this.graficoComentariosInstancia =
      this.graficoComentariosInstancia ??
      echarts.init(contenedor, undefined, { renderer: 'canvas' });

    //referencia corta a la instancia
    const grafico = this.graficoComentariosInstancia;
    //limpio cualquier configuracion anterior
    grafico.clear();

    //extraigo las fechas para el eje x
    const fechas = datos.map((item) => item.fecha);
    //extraigo los totales asegurando que sean numeros
    const totales = datos.map((item) =>
      typeof item?.total === 'number' ? item.total : 0
    );

    //configuro el grafico de linea suave para ver la evolucion de comentarios
    grafico.setOption({
      backgroundColor: '#0b3a10',
      tooltip: { trigger: 'axis' },
      grid: { left: '10%', right: '5%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: fechas,
        boundaryGap: false,
        axisLabel: { color: '#f1f8e9' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#f1f8e9' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [
        {
          name: 'Comentarios',
          type: 'line',
          smooth: true,
          symbolSize: 10,
          lineStyle: { color: '#4fc3f7', width: 3 },
          areaStyle: { opacity: 0.15, color: '#4fc3f7' },
          itemStyle: { color: '#4fc3f7' },
          data: totales
        }
      ]
    });

    //ajusto el grafico al ancho disponible
    grafico.resize();
  }

  //armo el grafico de comentarios por publicacion usando barras horizontales
  private renderizarGraficoComentariosPublicacion(
    datos: ComentariosPorPublicacionDto[]
  ): void {
    //obtengo el contenedor para el grafico de barras horizontales
    const contenedor = this.graficoComentariosPublicacion?.nativeElement;
    //si no tengo contenedor no sigo
    if (!contenedor) return;

    //reutilizo la instancia existente o la creo si es la primera vez
    this.graficoComentariosPublicacionInstancia =
      this.graficoComentariosPublicacionInstancia ??
      echarts.init(contenedor, undefined, { renderer: 'canvas' });

    //referencia corta a la instancia
    const grafico = this.graficoComentariosPublicacionInstancia;
    //limpio cualquier configuracion previa
    grafico.clear();

    //armo los titulos de las publicaciones con un fallback generico
    const titulos = datos.map((item) =>
      typeof item?.titulo === 'string' && item.titulo.trim() !== ''
        ? item.titulo
        : 'Publicación'
    );
    //armo los totales de comentarios asegurando numeros
    const totales = datos.map((item) =>
      typeof item?.total === 'number' ? item.total : 0
    );

    //configuro el grafico de barras horizontales por publicacion
    grafico.setOption({
      backgroundColor: '#0b3a10',
      tooltip: { trigger: 'axis' },
      grid: { left: '25%', right: '10%', bottom: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#f1f8e9' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } }
      },
      yAxis: {
        type: 'category',
        data: titulos,
        axisLabel: {
          color: '#f1f8e9',
          width: 220,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'Comentarios',
          type: 'bar',
          barWidth: '55%',
          itemStyle: { color: '#fb8c00' },
          data: totales
        }
      ]
    });

    //ajusto el grafico al tamaño final del contenedor
    grafico.resize();
  }

  //limpio los graficos cuando no tengo datos para mostrarlos
  private limpiarGrafico(grafico: echarts.ECharts | null): void {
    //si recibo una instancia valida llamo a clear para vaciarla
    if (grafico) {
      grafico.clear();
    }
  }

  //destruyo las instancias cuando salgo del componente
  private destruirGraficos(): void {
    //si existe el grafico de publicaciones lo libero y pongo null
    if (this.graficoPublicacionesInstancia) {
      this.graficoPublicacionesInstancia.dispose();
      this.graficoPublicacionesInstancia = null;
    }
    //si existe el grafico de comentarios por fecha lo libero y pongo null
    if (this.graficoComentariosInstancia) {
      this.graficoComentariosInstancia.dispose();
      this.graficoComentariosInstancia = null;
    }
    //si existe el grafico de comentarios por publicacion lo libero y pongo null
    if (this.graficoComentariosPublicacionInstancia) {
      this.graficoComentariosPublicacionInstancia.dispose();
      this.graficoComentariosPublicacionInstancia = null;
    }
  }
}
