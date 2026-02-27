# 🏠 Project Comp

**Project Comp** es una aplicación web que combina funcionalidades de **Tripadvisor** y **Fotocasa**, diseñada para ayudar a personas que comparten piso a evaluar y encontrar compañeros de piso ideales.

Los usuarios pueden:
- Publicar anuncios de habitaciones/pisos disponibles.
- Buscar pisos por ciudad y precio.
- Votar a sus compañeros de piso en tres categorías:
  - **Limpieza**
  - **Ruido**
  - **Pagos**

---

## 🚀 Tecnologías utilizadas

### **Frontend**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [React Router DOM](https://reactrouter.com/) para la navegación.
- CSS modular para estilos por página.
- Fetch API para comunicación con el backend.

### **Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- PostgreSQL como base de datos.
- JWT para autenticación.
- Middleware personalizado para verificación de tokens.

### **Base de datos**
- PostgreSQL con tablas:
  - `usuario`
  - `piso`
  - `usuario_piso` (relación entre usuarios y pisos)
  - `voto_usuario` (relación entre votos y usuarios)
- Script de inicialización: `backend/db/init.sql`

---

## 📂 Estructura del proyecto
- project-comp/ 
    ## 📂 Backend
            ├── 📁 controllers
                ├── 📄 adminHabitacionController.js
                ├── 📄 adminPisoController.js
                ├── 📄 adminUsuarioController.js
                ├── 📄 authController.js
                ├── 📄 habitacionController.js
                ├── 📄 pisoController.js
                ├── 📄 usuarioController.js
                ├── 📄 usuarioHabitacionController.js
                ├── 📄 votoUsuarioAuthController.js
                └── 📄 votoUsuarioController.js
            ├── 📁 db
                ├── 📄 init.sql
                └── 📄 pool.js
            ├── 📁 middleware
                └── 📄 authMiddleware.js
            ├── 📁 node_modules
            ├── 📁 routes
                ├── 📄 adminHabitacion.js
                ├── 📄 adminPiso.js
                ├── 📄 adminUsuario.js
                ├── 📄 auth.js
                ├── 📄 habitacion.js
                ├── 📄 piso.js
                ├── 📄 usuario.js
                ├── 📄 usuarioHabitacion.js
                ├── 📄 votoUsuario.js
                └── 📄 votoUsuarioAuth.js
            ├── 📁 utilities
            ├── 📄 .env
            ├── 📄 main.js
            ├── 📄 package-lock.json
            └── 📄 package.json
    ## 📂 Frontend
            ├── 📁 public
                └── (archivos estáticos)
            ├── 📁 src
                ├── 📁 api
                    ├── 📄 auth.js
                    ├── 📄 piso.js
                    ├── 📄 usuario.js
                    └── 📄 usuarioPiso.js
                ├── 📁 assets
                    └── (recursos estáticos como imágenes, iconos, etc.)
                ├── 📁 components
                    ├── 📄 Footer.jsx
                    ├── 📄 FormInput.jsx
                    ├── 📄 Navbar.jsx
                    ├── 📄 ProtectedRoute.jsx
                    └── 📄 VolverInicio.jsx
                ├── 📁 context
                    └── 📄 authContext.jsx
                ├── 📁 hooks
                    └── 📄 useAuth.js
                ├── 📁 pages
                    ├── 📄 CreatePiso.jsx
                    ├── 📄 Dashboard.jsx
                    ├── 📄 Home.jsx
                    ├── 📄 JoinPiso.jsx
                    ├── 📄 Login.jsx
                    ├── 📄 PisoDetail.jsx
                    ├── 📄 PisoList.jsx
                    └── 📄 Register.jsx
                ├── 📁 styles (archivos CSS por página o globales)
                    ├── 📄 App.jsx
                    └── 📄 main.jsx
                ├── 📄 eslint.config.js
                ├── 📄 index.html
                ├── 📄 package-lock.json
                ├── 📄 package.json
                ├── 📄 README.md
                └── 📄 vite.config.js
---

## ⚙ Instalación y ejecución

### **1. Clonar el repositorio**
```bash
git clone git@github.com:MiguelSoler/project-comp.git
cd project-comp
```
### **2. Configurar el backend**
```bash
cd backend
npm install

Crear un archivo .env con:
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=project_comp
DB_PORT=5432
JWT_SECRET=tu_secreto

Inicializar la base de datos:
bash
psql -U tu_usuario -d project_comp -f db/init.sql
Copiar

Ejecutar el backend:
bash
npm start
```
### **3. Configurar el frontend**
```bash
cd ../frontend
npm install
npm run dev
```

## 📌 Funcionalidades principales
Registro e inicio de sesión de usuarios.
Publicación de pisos (con control de que un usuario no tenga más de un piso activo).
Búsqueda de pisos por ciudad y precio.
Paginación en la lista de pisos.
Votaciones a compañeros de piso en:
Limpieza
Ruido
Pagos
Protección de rutas para que solo usuarios autenticados puedan acceder a ciertas páginas.

## 🔒 Autenticación
El backend usa JWT para autenticar usuarios.
Las rutas protegidas requieren enviar el token en la cabecera:

Authorization: Bearer <token>

## Código de buenas prácticas
Código de buenas prácticas (Project Comp)
1) Principios base
	-Claridad > cleverness: priorizamos código fácil de leer y mantener.
	-Una responsabilidad por función: cada handler hace una cosa principal.
	-Errores explícitos: respuestas consistentes, sin “silenciar” fallos.
	-Consistencia: mismo estilo en nombres, respuestas JSON, y estructura.

2) Nombres y estilo
	-Archivos
		--Controllers: authController.js, pisoController.js
		--Routes: auth.js, 	piso.js
	-Funciones
		--Handlers: register, login, createPiso, getPisoById
		--Utilidades: signToken, hashPassword, sanitizeUser
	-Variables
		--Nombres descriptivos: userRow, existingUser, tokenPayload
		--Evitar data, info, temp, x salvo bucles cortos.

3) Contratos API (consistencia)
	-JSON siempre (request/response).
	-Status codes coherentes:
		--200 OK, 201 Created
		--400 Validation error
		--401 Auth inválida
		--403 Prohibido / usuario inactivo / sin permisos
		--404 No encontrado
		--409 Conflicto (email duplicado, etc.)
		--500 Error inesperado
	-Formato de error estándar:
		--{ "error": "ERROR_CODE", "message": "Texto humano opcional", "details": [] }
	-No filtramos campos sensibles: nunca devolver password_hash.

4) Validación de entrada
		-Validamos al principio del handler (fail fast).
		-Si faltan campos o formato inválido → 400 VALIDATION_ERROR.
		-Validación mínima por ahora (MVP):
			--email con formato básico + trim + lowercase para buscar
			--password longitud mínima (p.ej. 8)
			--nombre no vacío
		-Nunca confiar en el frontend.

5) Base de datos y SQL
	-Siempre SQL parametrizado: ... WHERE email = $1.
	-Nunca concatenar strings para construir queries con input del usuario.
	-Preferir queries con RETURNING para evitar SELECT extra cuando aplica.
	-Seleccionar solo columnas necesarias (y nunca password_hash en responses).
	-Índices/constraints mandan: si hay error de constraint → mapear a 409 o 400 según corresponda.

6) Estructura de cada controller
	-Orden recomendado en cada handler:
		--Leer y normalizar inputs (trim, lowercase).
		--Validar (si falla → return res.status(400)...).
		--Ejecutar queries (DB).
		--Lógica de negocio mínima (hash, compare, token).
		--Responder.
	-Un único return res... por rama y no seguir ejecutando después.

7) Autenticación y seguridad
	-Password:
		--Guardamos bcrypt.hash(password, saltRounds)
		--Login con bcrypt.compare
	-JWT:
		--Payload mínimo: { id, rol }
		--Expiración definida (p.ej. 7d)
	-No revelar si el email existe en login (opcional MVP).
		--Respuesta genérica INVALID_CREDENTIALS.

8) Manejo de errores
	-No usar console.log sueltos: usar console.error en errores inesperados.
	-Errores esperables:
		--Duplicado email → 409 EMAIL_ALREADY_EXISTS
		--Credenciales inválidas → 401 INVALID_CREDENTIALS
		--Usuario inactivo → 403 USER_INACTIVE
	-Errores inesperados → 500 INTERNAL_ERROR (sin filtrar detalles internos al cliente).

9) Código limpio en la práctica
	-Funciones pequeñas: si un handler pasa de ~60–80 líneas, extraer helpers.
	-Evitar duplicación: helpers como sanitizeUser(row) o buildAuthResponse(user).
	-Comentarios solo para explicar “por qué”, no “qué”.
	-Evitar magia: constantes arriba (salt rounds, jwt expiry). No hardcodear números/strings sin significado, usar constantes claras.
	-Utilizar las funciones .filter y .map todo lo que sea posible, para hacer más legible el código.

10) Formato y tooling
	-Mantener formato consistente (ideal: Prettier + ESLint).
	-Sin code-smells:
		--nada de variables sin usar
		--nada de any mental (en JS: cuidado con tipos)
	-Commits pequeños, descriptivos.

📜 Licencia
Este proyecto está bajo la licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.

👤 Autor
Miguel García
