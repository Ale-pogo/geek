# Adopción de Gatitos

Aplicación web para publicar gatitos en adopción. Está construida con JavaScript, React y Vite; Supabase guarda los avisos y las fotos. El frontend puede publicarse gratuitamente en GitHub Pages.

## Tecnologías

- React y Vite para la interfaz.
- Supabase Database para los avisos.
- Supabase Storage para las imágenes.
- GitHub Pages y GitHub Actions para publicar la web.

## Ejecutar localmente

Requisitos: Node.js 20.19+ o 22.12+.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Completa `.env.local` con la URL del proyecto Supabase y su clave pública (`anon` o `publishable`). Sin esas variables se puede abrir la interfaz, pero no cargar ni enviar avisos.

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

La clave pública se incluye en el frontend: la seguridad depende de las políticas RLS de `supabase/setup.sql`. **Nunca** coloques una clave `service_role` en variables `VITE_` ni en el repositorio.

## Preparar Supabase

1. Crea un proyecto en Supabase y copia su Project URL y clave pública.
2. En **SQL Editor**, ejecuta el contenido de [`supabase/setup.sql`](./supabase/setup.sql). Además de configurar el proyecto, este script importa como aprobados los diez avisos iniciales de `db.json`; es idempotente y no duplica los que ya existan por URL de foto.
3. Configura las variables locales de `.env.local` y ejecuta `npm run dev`.
4. Comprueba la carga de una imagen y del aviso. Los archivos admitidos son JPG, PNG y WebP de hasta 5 MB.

El script crea la tabla `gatitos` y el bucket privado `gatitos`. Los envíos anónimos se guardan como `pendiente`; solo se muestran avisos con estado `aprobado`. Las fotos del bucket solo se pueden leer cuando su aviso está aprobado. Para moderar, abre **Table Editor → gatitos** en Supabase y cambia el estado del aviso que quieras publicar a `aprobado` (o a `rechazado`). La web no permite borrar avisos públicamente.

El bucket permite cargas anónimas para que cualquier visitante pueda enviar una foto. El tamaño y formato están limitados, pero un sitio público aún puede recibir spam o consumir la cuota gratuita de almacenamiento. Revisa periódicamente los avisos y el uso del proyecto. Si el sitio crece, conviene añadir autenticación o un mecanismo anti-spam antes de abrir las cargas sin moderación.

Si ya habías ejecutado una versión anterior de `setup.sql`, vuelve a ejecutar el script actualizado para importar los avisos iniciales que falten.

## Publicar gratis en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) construye y publica la aplicación cuando hay un `push` a `main`.

1. Sube este proyecto al repositorio GitHub `Ale-pogo/geek` (el `base` de Vite está configurado para ese nombre).
2. En el repositorio, abre **Settings → Secrets and variables → Actions → Variables** y crea:
   - `VITE_SUPABASE_URL`: Project URL de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: clave pública de Supabase.
3. En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.
4. Haz un `push` a `main` o ejecuta manualmente el workflow desde **Actions**.

Si publicas antes de configurar las variables de Supabase, el workflow igualmente desplegará la web con los diez avisos de muestra de `db.json`; el formulario no podrá guardar nuevos avisos hasta que agregues ambas variables y vuelvas a ejecutar el workflow. La web quedará disponible en `https://Ale-pogo.github.io/geek/`. GitHub Pages y el plan gratuito de Supabase tienen límites y condiciones que pueden cambiar; revisa sus cuotas antes de depender de ellos para un uso de alto volumen.

## Comandos

```powershell
npm run dev      # Desarrollo local
npm run build    # Compilar para producción
npm run preview  # Previsualizar la compilación
```
