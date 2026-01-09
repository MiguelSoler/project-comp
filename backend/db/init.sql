-- Crear base de datos (ejecutar solo si no existe)
CREATE DATABASE companeros_piso;
-- \c companeros_piso;

-- =========================
-- ELIMINAR TABLAS SI EXISTEN
-- =========================
DROP TABLE IF EXISTS usuario_piso CASCADE;
DROP TABLE IF EXISTS piso CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;

-- =========================
-- CREAR TABLA USUARIO
-- =========================
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario', -- Ej: 'usuario', 'admin'
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
);

-- =========================
-- CREAR TABLA PISO
-- =========================
CREATE TABLE piso (
   id SERIAL PRIMARY KEY,
   direccion VARCHAR(255) NOT NULL,
   ciudad VARCHAR(100) NOT NULL,
   codigo_postal VARCHAR(10),
   descripcion TEXT,
   fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   usuario_id INT REFERENCES usuario(id) ON DELETE RESTRICT
);

-- =========================
-- CREAR TABLA USUARIO_PISO
-- =========================
CREATE TABLE usuario_piso (
   id SERIAL PRIMARY KEY,
   usuario_id INT REFERENCES usuario(id) ON DELETE CASCADE,
   piso_id INT REFERENCES piso(id) ON DELETE CASCADE,
   fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   fecha_salida TIMESTAMP,
   UNIQUE (usuario_id, piso_id)
);

-- =========================
-- CREAR TABLA VOTO_USUARIO
-- =========================
CREATE TABLE voto_usuario (
    id SERIAL PRIMARY KEY,
    votante_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    votado_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    limpieza INT NOT NULL CHECK (limpieza BETWEEN 1 AND 5),
    ruido INT NOT NULL CHECK (ruido BETWEEN 1 AND 5),
    puntualidad_pagos INT NOT NULL CHECK (puntualidad_pagos BETWEEN 1 AND 5),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (votante_id <> votado_id), -- Evitar que un usuario se vote a sí mismo
    UNIQUE (votante_id, votado_id)
);

-- =================================
-- Índices para optimizar búsquedas
-- =================================
CREATE INDEX idx_voto_usuario_votado ON voto_usuario(votado_id);
CREATE INDEX idx_voto_usuario_votante ON voto_usuario(votante_id);
CREATE INDEX idx_usuario_piso_usuario ON usuario_piso(usuario_id);
CREATE INDEX idx_usuario_piso_piso ON usuario_piso(piso_id);

-- =========================
-- INSERTS USUARIO
-- =========================
INSERT INTO usuario (nombre, email, telefono, limpieza, ruido, puntualidad_pagos) VALUES
('Juan Pérez', 'juan.perez@example.com', '600111111'),
('María López', 'maria.lopez@example.com', '600222222'),
('Carlos García', 'carlos.garcia@example.com', '600333333'),
('Ana Torres', 'ana.torres@example.com', '600444444'),
('Luis Fernández', 'luis.fernandez@example.com', '600555555'),
('Marta Martínez', 'marta.martinez@example.com', '600666666'),
('Pedro Sánchez', 'pedro.sanchez@example.com', '600777777'),
('Laura Gómez', 'laura.gomez@example.com', '600888888'),
('Sergio Ruiz', 'sergio.ruiz@example.com', '600999999'),
('Elena Díaz', 'elena.diaz@example.com', '601000000');

-- =========================
-- INSERTS PISO (usuario_id del 1 al 10)
-- =========================
INSERT INTO piso (direccion, ciudad, codigo_postal, descripcion, usuario_id) VALUES
('Calle Mayor 10', 'Madrid', '28013', 'Piso céntrico con 3 habitaciones', 1),
('Av. Diagonal 200', 'Barcelona', '08018', 'Piso luminoso cerca de la playa', 2),
('Gran Vía 45', 'Madrid', '28013', 'Piso moderno y bien comunicado', 3),
('Calle Serrano 100', 'Madrid', '28006', 'Piso de lujo en zona exclusiva', 4),
('Calle San Vicente 5', 'Valencia', '46001', 'Piso acogedor en el centro', 5),
('Av. Libertad 50', 'Sevilla', '41001', 'Piso con terraza y vistas', 6),
('Calle Real 12', 'Bilbao', '48001', 'Piso reformado y céntrico', 7),
('Calle del Mar 8', 'Málaga', '29001', 'Piso cerca de la playa', 8),
('Calle Sol 15', 'Granada', '18001', 'Piso con patio interior', 9),
('Calle Luna 20', 'Zaragoza', '50001', 'Piso amplio y luminoso', 10);

-- =========================
-- INSERTS USUARIO_PISO (usuario_id y piso_id válidos)
-- =========================
INSERT INTO usuario_piso (usuario_id, piso_id, fecha_entrada, fecha_salida) VALUES
(1, 1, '2024-06-01', NULL),
(2, 1, '2024-06-05', '2024-08-01'),
(3, 2, '2024-06-10', NULL),
(4, 3, '2024-06-15', '2024-07-15'),
(5, 4, '2024-06-20', NULL),
(6, 5, '2024-06-25', NULL),
(7, 6, '2024-06-30', '2024-09-01'),
(8, 7, '2024-07-05', NULL),
(9, 8, '2024-07-10', NULL),
(10, 9, '2024-07-15', '2024-08-20');