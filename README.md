# cne-project

Backend mínimo para CNE.

Instrucciones rápidas (local):
1. Copiar `.env.example` a `.env` y rellenar JWT_SECRET y ADMIN_KEY.
2. npm install
3. npm run dev
4. Abrir http://localhost:4000

API:
- GET /api/status -> { ok: true }
- POST /api/login { "key": "<ADMIN_KEY>" } -> { token: "..." }
- GET /api/admin (Authorization: Bearer <token>) -> acceso admin

Preparar despliegue:
- Branch para deploy: `deploy/render-ready`
- Build: `npm install`
- Start: `npm start`

Notas de seguridad:
- No subir `.env` con secretos.
- Configurar JWT_SECRET y ADMIN_KEY en el panel del host (Render/Heroku/etc).