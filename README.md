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
                ├── 📄 authController.js
                ├── 📄 pisoController.js
                ├── 📄 usuarioController.js
                └── 📄 usuarioPisoController.js
            ├── 📁 db
                ├── 📄 init.sql
                └── 📄 pool.js
            ├── 📁 middleware
                └── 📄 authMiddleware.js
            ├── 📁 routes
                ├── 📄 auth.js
                ├── 📄 piso.js
                ├── 📄 usuario_piso.js
                └── 📄 usuario.js
            ├── 📄 .env
            ├── 📄 generateHashes.js
            ├── 📄 main.js
            ├── 📄 package-lock.json
            ├── 📄 package.json
            ├── 📄 testConnect.js
            └── 📄 testConnection.js
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

📜 Licencia
Este proyecto está bajo la licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.

👤 Autor
Miguel García
