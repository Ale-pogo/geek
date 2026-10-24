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
2. En **SQL Editor**, ejecuta el contenido de [`supabase/setup.sql`](./supabase/setup.sql). El script crea la tabla, las políticas de seguridad y el bucket privado; también importa como aprobados los diez avisos iniciales de `db.json` sin duplicar los que ya existan por URL de foto. Si ya habías configurado Supabase, vuelve a ejecutar el script actualizado para aplicar los cambios.
3. En **Authentication → Users**, agrega manualmente un usuario para la administradora con correo y contraseña. No hay registro de administradores desde el sitio. Desactiva el registro público de usuarios en la configuración del proveedor Email.
4. Copia el **UID** de ese usuario desde la lista de Users. En **SQL Editor**, autorízalo como administrador ejecutando, con su UID real:
   ```sql
   insert into public.administradores (user_id)
   values ('UID-DEL-USUARIO')
   on conflict (user_id) do nothing;
   ```
5. Configura las variables locales de `.env.local` y ejecuta `npm run dev`. Los archivos admitidos son JPG, PNG y WebP de hasta 5 MB.

En el sitio, entra en **Administrar** e inicia sesión con esa cuenta. Los envíos nuevos quedan como `pendiente`; desde el panel puedes **Aprobar**, **Rechazar**, **Marcar adoptado** o **Eliminar** un aviso. Los aprobados aparecen en “Gatitos en adopción”. Los adoptados aparecen en la página “Gatitos adoptados”, sin mostrar el WhatsApp de contacto. Eliminar borra el aviso y trata de borrar también su foto del bucket.

La tabla y el bucket tienen políticas RLS: solo un usuario cuyo UID esté en `administradores` puede revisar y modificar avisos. La API pública solo expone los campos necesarios de avisos aprobados y adoptados; las fotos siguen en un bucket privado. La clave pública del frontend no es secreta y nunca debe reemplazarse por una clave `secret` o `service_role`.

El formulario permite envíos y cargas anónimas para que visitantes publiquen avisos. El tamaño y formato están limitados, y los avisos requieren aprobación, pero un sitio público todavía puede recibir spam o consumir almacenamiento. Revisa el uso del proyecto y considera añadir CAPTCHA o límites de frecuencia si aumentan los envíos.

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
