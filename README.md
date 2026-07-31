# DOCH20

PWA móvil minimalista para seguimiento de brevet.

## Ejecutar
1. Copia `.env.example` como `.env`.
2. Ejecuta `npm install`.
3. Ejecuta `npm start`.
4. Abre `http://localhost:3000`.

## Instalar en celular
Publica el proyecto en un dominio HTTPS. Android: Chrome → Instalar. iPhone: Safari → Compartir → Agregar a pantalla de inicio.

## Strava
Crea una aplicación en Strava y configura en `.env`:
- STRAVA_CLIENT_ID
- STRAVA_CLIENT_SECRET
- STRAVA_REDIRECT_URI=https://tu-dominio/api/strava/callback
- APP_BASE_URL=https://tu-dominio
- APP_SECRET=secreto largo y aleatorio

Los tokens se cifran localmente con AES-256-GCM. Para múltiples usuarios se recomienda migrar `data/store.json` a PostgreSQL y añadir autenticación de usuario.

## Funciones
- PWA instalable y offline
- plan completo precargado
- km y sesiones realizadas
- dolor de rodilla
- Google Calendar `.ics`
- OAuth Strava, refresh token y sincronización
- asociación automática de actividades por fecha y distancia
