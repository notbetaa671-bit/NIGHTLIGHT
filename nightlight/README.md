# NIGHTLIGHT

Un juego de terror 3D en primera persona, inspirado en el miedo de quedarse despierto en la cama.

En NIGHTLIGHT eres un niño en un dormitorio oscuro. Solo tienes una linterna y una caja musical:

- La linterna ahuyenta a los monstruos que logres iluminar, pero su batería es limitada.
- La caja musical acumula tiempo de sueño mientras la mantienes activa.
- El progreso de sueño se conserva cuando dejas de usar la caja.
- No existe un temporizador de noche.
- La partida termina al acumular **25 segundos de sueño** o cuando un monstruo llega a la cama.

## Abrir el juego

No requiere instalación, terminal, servidor local, Node.js ni paso de compilación.

1. Descarga o clona este repositorio.
2. Abre `index.html` con un navegador moderno.
3. Pulsa **Entrar en la noche** y haz clic sobre la escena para capturar el ratón.

Three.js se carga desde un CDN, así que el navegador necesita conexión a internet la primera vez que abras el juego.

## Controles

| Acción | Control |
| --- | --- |
| Mirar | Ratón arrastrando o ratón capturado |
| Girar | `A` / `D` o flechas izquierda/derecha |
| Mirar arriba/abajo | `W` / `S` o flechas arriba/abajo |
| Linterna | Mantén `Espacio` (también puedes pulsar `F`) |
| Caja musical | Mantén `M` |
| Liberar el ratón | `Esc` |
| Sonido | Botón SONIDO en la esquina superior derecha |

La caja musical también tiene botones táctiles que aparecen en pantallas pequeñas.

## Subirlo a GitHub sin terminal

1. Entra en [github.com](https://github.com/) e inicia sesión.
2. Pulsa **New repository**.
3. Elige un nombre, por ejemplo `nightlight-3d`, y crea el repositorio.
4. En la página del repositorio, pulsa **Add file → Upload files**.
5. Arrastra `index.html`, `styles.css`, `game.js` y `README.md` al área de subida.
6. Pulsa **Commit changes**.

## Publicarlo con GitHub Pages

1. Abre la pestaña **Settings** del repositorio.
2. En la barra lateral, entra en **Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/ (root)`.
5. Pulsa **Save**.
6. Espera unos segundos y vuelve a **Settings → Pages** para abrir el enlace público.

El proyecto no usa rutas especiales ni un backend: GitHub Pages puede servirlo directamente desde la raíz.

## Archivos

- `index.html`: estructura de la interfaz y las pantallas de inicio/resultado.
- `styles.css`: HUD, pantallas, responsividad y estética visual.
- `game.js`: escena Three.js, dormitorio, monstruos, iluminación, audio generado y reglas del juego.

## Créditos técnicos

El proyecto usa [Three.js 0.160.0](https://threejs.org/) desde jsDelivr. La geometría, las luces, las sombras y el audio ambiente se generan en el navegador, por lo que no hacen falta assets adicionales.
