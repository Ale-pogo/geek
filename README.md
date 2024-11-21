# Proyecto Web: (Alura-Geek - Challenge) Adopción de Gatitos 🐾

Este es un proyecto web diseñado para facilitar la adopción de gatitos. Consta de dos páginas principales: `index.html` y `carga.html`, ambas interconectadas y desarrolladas utilizando **HTML**, **CSS**, **JavaScript** y **MockAPI**.

---

## Funcionalidades Principales

### `index.html`
Esta es la página principal del proyecto, donde se visualizan las tarjetas de los gatitos disponibles para adopción. 

#### Características:
- **Cabecera (header):**
  - Un logo en la parte izquierda.
  - Un buscador en el centro que filtra las tarjetas según el nombre del gatito.
  - Un botón "Agregar Gatito" que redirige a la página `carga.html`.

- **Cuerpo (main):**
  - Tarjetas (cards) que muestran información sobre cada gatito:
    - **Imagen**: cargada desde el formulario.
    - **Nombre**: proporcionado desde el formulario.
    - **Descripción**: breve descripción cargada desde el formulario.
    - **Ícono de WhatsApp**: al hacer clic, abre el contacto del adoptante.
    - **Ícono de "Borrar"**: elimina la tarjeta del gatito una vez adoptado.

- **Footer:**
  - Logo que redirige al repositorio de GitHub.
  - Mensaje y una imagen centrados.

---

### `carga.html`
Esta página permite agregar nuevos gatitos al listado mediante un formulario.

#### Características:
- **Cabecera (header):**
  - Un logo en la parte izquierda.
  - Un buscador en el centro.
  - Un botón "Volver Página" que redirige a la página principal.

- **Cuerpo (main):**
  - Un formulario con los siguientes campos:
    - **Nombre del gatito**: campo para ingresar el nombre.
    - **Foto del gatito**: URL de una imagen de la web (ejemplo: Pinterest).
    - **Datos del gatito**: breve descripción del gatito.
    - **Tiempo del gatito**: edad del gatito (en días, meses o años).
    - **Contacto**: número de WhatsApp del adoptante.
    - **Botón "Agregar Gatito"**: guarda los datos en el archivo `db.json`.
    - **Botón "Limpiar Formulario"**: limpia los campos para una nueva entrada.

- **Footer:**
  - Logo que redirige al repositorio de GitHub.
  - Mensaje y una imagen centrados.

---

## Tecnologías Utilizadas

- **HTML5**: Estructura del contenido.
- **CSS3**: Estilos y diseño responsivo.
- **JavaScript**: Lógica interactiva.
- **MockAPI**: Simulación de una API para gestionar los datos del proyecto.

---

## Cómo Ejecutar el Proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Ale-pogo/adopcion-gatitos.git
