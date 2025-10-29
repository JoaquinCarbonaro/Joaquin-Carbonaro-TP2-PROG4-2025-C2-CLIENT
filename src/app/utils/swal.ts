//indica si los estilos del modal ya fueron cargados
var estilosCargados = false

//asegura que los estilos se inyecten una sola vez
function asegurarEstilos(): void {
  if (estilosCargados) {
    return
  }

  //crea la etiqueta style con los estilos del modal
  const style = document.createElement('style')
  style.textContent = `
    .rumbo-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1.5rem;
    }
    .rumbo-modal-card {
      background: #f1f8e9;
      border-radius: 1rem;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
      padding: 2rem;
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: #1b5e20;
      font-family: 'Montserrat', Arial, sans-serif;
      text-align: center;
    }
    .rumbo-modal-title {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
    }
    .rumbo-modal-text {
      margin: 0;
      font-size: 1rem;
      line-height: 1.4;
    }
    .rumbo-modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    .rumbo-modal-btn {
      border: none;
      border-radius: 999px;
      padding: 0.7rem 1.6rem;
      font-weight: 600;
      cursor: pointer;
      background: #fb8c00;
      color: #1b5e20;
    }
    .rumbo-modal-btn-sec {
      background: #4fc3f7;
      color: #1b5e20;
    }
    .rumbo-modal-icon {
      font-size: 2.6rem;
    }
  `
  //agrega los estilos al head
  document.head.appendChild(style)
  estilosCargados = true
}

//crea la estructura html del modal
function crearModal(titulo: string, mensaje: string, icono: string): HTMLDivElement {
  asegurarEstilos()

  //crea el contenedor del fondo
  const overlay = document.createElement('div')
  overlay.className = 'rumbo-modal-overlay'

  //crea la tarjeta del modal
  const card = document.createElement('div')
  card.className = 'rumbo-modal-card'

  //agrega icono
  const icon = document.createElement('div')
  icon.className = 'rumbo-modal-icon'
  icon.textContent = icono

  //agrega titulo
  const title = document.createElement('h2')
  title.className = 'rumbo-modal-title'
  title.textContent = titulo

  //agrega mensaje
  const text = document.createElement('p')
  text.className = 'rumbo-modal-text'
  text.textContent = mensaje

  //contenedor de botones
  const actions = document.createElement('div')
  actions.className = 'rumbo-modal-actions'

  //ensambla la estructura
  card.appendChild(icon)
  card.appendChild(title)
  card.appendChild(text)
  card.appendChild(actions)
  overlay.appendChild(card)
  return overlay
}

//devuelve un icono segun el tipo de mensaje
function iconoPorTipo(tipo: 'info' | 'success' | 'error' | 'warning'): string {
  if (tipo === 'info') {
    return 'ℹ️'
  }
  if (tipo === 'success') {
    return '✅'
  }
  if (tipo === 'error') {
    return '❌'
  }
  return '⚠️'
}

//muestra un modal simple tipo sweetalert
export function mostrarSwal(
  titulo: string,
  mensaje: string,
  tipo: 'info' | 'success' | 'error' | 'warning' = 'success'
): void {
  //crea el modal con icono segun tipo
  const overlay = crearModal(titulo, mensaje, iconoPorTipo(tipo))
  const actions = overlay.querySelector('.rumbo-modal-actions')

  //si no hay contenedor de acciones, permite cerrar al clickear overlay
  if (!actions) {
    document.body.appendChild(overlay)
    overlay.addEventListener('click', () => {
      overlay.remove()
    })
    return
  }

  //crea boton aceptar
  const closeBtn = document.createElement('button')
  closeBtn.className = 'rumbo-modal-btn'
  closeBtn.textContent = 'Aceptar'
  closeBtn.addEventListener('click', () => {
    overlay.remove()
  })

  //agrega boton y eventos
  actions.appendChild(closeBtn)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      overlay.remove()
    }
  })

  //muestra modal en el documento
  document.body.appendChild(overlay)
}

//muestra modal con dos opciones y devuelve promesa
export function swalConOpciones(
  text: string,
  title: string,
  confirmButtonText: string,
  denyButtonText: string
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const overlay = crearModal(title, text, iconoPorTipo('info'))
    const actions = overlay.querySelector('.rumbo-modal-actions')

    //si no hay acciones permite cerrar clickeando fondo
    if (!actions) {
      document.body.appendChild(overlay)
      overlay.addEventListener('click', () => {
        overlay.remove()
        resolve(undefined)
      })
      return
    }

    //boton confirmar
    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'rumbo-modal-btn'
    confirmBtn.textContent = confirmButtonText
    confirmBtn.addEventListener('click', () => {
      overlay.remove()
      resolve('si')
    })

    //boton negar
    const denyBtn = document.createElement('button')
    denyBtn.className = 'rumbo-modal-btn rumbo-modal-btn-sec'
    denyBtn.textContent = denyButtonText
    denyBtn.addEventListener('click', () => {
      overlay.remove()
      resolve('no')
    })

    //agrega botones al contenedor
    actions.appendChild(confirmBtn)
    actions.appendChild(denyBtn)

    //cierra si se clickea fuera del modal
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        overlay.remove()
        resolve(undefined)
      }
    })

    //inserta modal al body
    document.body.appendChild(overlay)
  })
}
