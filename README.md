# DOCH20 V5 — Paquete B

Añade cuenta opcional, autenticación y respaldo con Supabase.

La aplicación sigue funcionando con localStorage si Supabase no está configurado.

## Ejecutar
```bash
npm start
```

## Activar Supabase

1. Crear un proyecto en Supabase.
2. Ejecutar `database/supabase.sql` en SQL Editor.
3. En Render agregar:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Volver a desplegar.

No utilizar la service-role key en el frontend.
