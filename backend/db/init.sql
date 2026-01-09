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
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP    
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
   fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   usuario_id INT REFERENCES usuario(id) ON DELETE RESTRICT
);

-- =========================
-- CREAR TABLA USUARIO_PISO
-- =========================
CREATE TABLE usuario_piso (
   id SERIAL PRIMARY KEY,
   usuario_id INT REFERENCES usuario(id) ON DELETE CASCADE,
   piso_id INT REFERENCES piso(id) ON DELETE CASCADE,
   fecha_entrada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   fecha_salida TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
-- Usuarios (5 admins y 15 usuarios)
INSERT INTO usuario (nombre, email, password_hash, rol, telefono, fecha_registro) VALUES
('Laura Martínez', 'laura.martinez@example.com', '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin', '+34 612 345 678', '2023-01-01 10:00:00+01'),
('Carlos Gómez', 'carlos.gomez@example.com', '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin', '+34 698 112 233', '2023-01-02 11:15:00+01'),
('Miguel Soler', 'miguel.soler@example.com', '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin', '+34 677 889 001', '2023-01-03 09:45:00+01'),
('Ana Torres', 'ana.torres@example.com', '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin', '+34 699 554 321', '2023-01-04 14:20:00+01'),
('Javier Ruiz', 'javier.ruiz@example.com', '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin', '+34 611 223 344', '2023-01-05 16:00:00+01'),
('María López', 'maria.lopez@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 645 778 990', '2023-02-01 09:00:00+01'),
('Pedro Sánchez', 'pedro.sanchez@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 634 556 778', '2023-02-02 10:30:00+01'),
('Lucía Fernández', 'lucia.fernandez@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 622 334 556', '2023-02-03 12:15:00+01'),
('David García', 'david.garcia@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 699 112 233', '2023-02-04 08:50:00+01'),
('Sofía Navarro', 'sofia.navarro@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 688 990 112', '2023-02-05 15:40:00+01'),
('Alberto Díaz', 'alberto.diaz@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 677 889 223', '2023-03-01 11:00:00+01'),
('Clara Romero', 'clara.romero@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 655 443 221', '2023-03-02 13:25:00+01'),
('Hugo Herrera', 'hugo.herrera@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 644 332 110', '2023-03-03 09:35:00+01'),
('Elena Ortega', 'elena.ortega@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 633 221 998', '2023-03-04 17:10:00+01'),
('Raúl Pérez', 'raul.perez@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 622 110 887', '2023-03-05 19:00:00+01'),
('Patricia Morales', 'patricia.morales@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 611 009 776', '2023-04-01 08:20:00+01'),
('Sergio Castro', 'sergio.castro@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 600 998 665', '2023-04-02 14:45:00+01'),
('Isabel Martín', 'isabel.martin@example.com', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 699 887 554', '2023-04-03 16:30:00+01'),
('Laura Serrano', 'OTR73', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 622 556 778', '2023-04-04 12:00:00+01'),
('David Martín', 'OTR74', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 611 334 556', '2023-04-05 09:15:00+01'),
('Marta López', 'OTR75', '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'usuario', '+34 699 223 445', '2023-04-06 18:40:00+01');

-- =========================
-- INSERTS PISO (usuario_id del 1 al 10)
-- =========================
INSERT INTO piso (direccion, ciudad, codigo_postal, descripcion, usuario_id, fecha_publicacion) VALUES
('Calle Mayor 12', 'Madrid', '28013', 'Piso céntrico con 3 habitaciones y balcón.', 6, '2023-01-15 10:00:00+01'),
('Avenida Diagonal 45', 'Barcelona', '08019', 'Luminoso y cerca de la playa.', 7, '2023-02-01 09:00:00+01'),
('Calle Larios 8', 'Málaga', '29015', 'Apartamento moderno en el centro.', 8, '2023-03-10 11:30:00+01'),
('Gran Vía 101', 'Madrid', '28013', 'Habitación amplia en piso compartido.', 9, '2023-04-05 14:20:00+01'),
('Calle San Vicente 23', 'Valencia', '46002', 'Piso reformado con terraza.', 10, '2023-05-20 16:00:00+01'),
('Calle Toledo 5', 'Madrid', '28005', 'Habitación individual en piso tranquilo.', 11, '2023-06-01 09:15:00+01'),
('Calle Colón 14', 'Valencia', '46004', 'Piso con vistas y buena ubicación.', 12, '2023-07-12 10:45:00+01'),
('Calle Serrano 88', 'Madrid', '28006', 'Habitación doble en piso de lujo.', 13, '2023-08-03 12:00:00+01'),
('Calle Alcalá 200', 'Madrid', '28028', 'Piso grande con cocina equipada.', 14, '2023-09-15 15:30:00+01'),
('Calle Princesa 33', 'Madrid', '28008', 'Habitación en piso compartido con estudiantes.', 15, '2023-10-01 17:00:00+01'),
('Calle Pau Claris 9', 'Barcelona', '08001', 'Piso céntrico y bien comunicado.', 16, '2023-01-20 11:00:00+01'),
('Calle San Jacinto 17', 'Sevilla', '41001', 'Habitación en piso con ambiente familiar.', 17, '2023-02-15 13:20:00+01'),
('Calle Real 4', 'Cádiz', '11001', 'Piso cerca de la playa.', 18, '2023-03-01 09:40:00+01'),
('Calle Mayor 55', 'Burgos', '09003', 'Habitación en piso tranquilo.', 19, '2023-04-10 14:10:00+01'),
('Calle Libertad 2', 'Zaragoza', '50003', 'Piso con buena conexión de transporte.', 20, '2023-05-05 16:50:00+01'),
('Calle Gran Capitán 12', 'Granada', '18001', 'Piso con encanto en el centro histórico.', 6, '2023-06-15 10:30:00+01'),
('Calle San Francisco 8', 'Santander', '39002', 'Apartamento moderno con vistas al mar.', 7, '2023-07-01 12:15:00+01'),
('Calle Ancha 21', 'León', '24003', 'Piso amplio y luminoso.', 8, '2023-08-10 09:00:00+01'),
('Calle Mayor 101', 'Madrid', '28013', 'Habitación en piso compartido con profesionales.', 9, '2023-09-20 11:45:00+01'),
('Calle San Pedro 5', 'Alicante', '03002', 'Piso cerca de la playa y del centro.', 10, '2023-10-05 15:20:00+01');

-- =========================
-- INSERTS USUARIO_PISO (usuario_id y piso_id válidos)
-- =========================
INSERT INTO usuario_piso (usuario_id, piso_id, fecha_entrada, fecha_salida) VALUES
(6, 1, '2023-01-15 10:00:00+01', NULL),
(7, 2, '2023-02-01 09:00:00+01', NULL),
(8, 3, '2023-03-10 11:30:00+01', NULL),
(9, 4, '2023-04-05 14:20:00+01', NULL),
(10, 5, '2023-05-20 16:00:00+01', NULL),
(11, 6, '2023-06-01 09:15:00+01', '2023-11-01 10:00:00+01'),
(12, 7, '2023-07-12 10:45:00+01', '2023-12-12 09:30:00+01'),
(13, 8, '2023-08-03 12:00:00+01', '2024-01-03 14:00:00+01'),
(14, 9, '2023-09-15 15:30:00+01', '2024-02-15 11:20:00+01'),
(15, 10, '2023-10-01 17:00:00+01', '2024-03-01 13:45:00+01'),
(16, 11, '2023-01-20 11:00:00+01', '2023-06-20 10:00:00+01'),
(17, 12, '2023-02-15 13:20:00+01', '2023-07-15 09:00:00+01'),
(18, 13, '2023-03-01 09:40:00+01', '2023-08-01 14:00:00+01'),
(19, 14, '2023-04-10 14:10:00+01', '2023-09-10 12:00:00+01'),
(20, 15, '2023-05-05 16:50:00+01', '2023-10-05 15:00:00+01'),
(6, 16, '2023-06-15 10:30:00+01', '2023-11-15 09:00:00+01'),
(7, 17, '2023-07-01 12:15:00+01', '2023-12-01 10:30:00+01'),
(8, 18, '2023-08-10 09:00:00+01', '2024-01-10 11:15:00+01'),
(9, 19, '2023-09-20 11:45:00+01', '2024-02-20 14:40:00+01'),
(10, 20, '2023-10-05 15:20:00+01', '2024-03-05 16:50:00+01');

-- =========================
-- INSERTS USUARIO_PISO (usuario_id y piso_id válidos)
-- =========================
INSERT INTO voto_usuario (votante_id, votado_id, limpieza, ruido, puntualidad_pagos, fecha) VALUES
(6, 7, 4, 3, 5, '2023-06-15 14:30:00+01'),
(7, 6, 5, 2, 4, '2023-06-16 09:15:00+01'),
(8, 9, 3, 4, 5, '2023-07-01 18:45:00+01'),
(9, 8, 4, 3, 4, '2023-07-02 20:10:00+01'),
(10, 11, 5, 5, 5, '2023-08-05 12:00:00+01'),
(11, 10, 4, 4, 4, '2023-08-06 16:20:00+01'),
(12, 13, 3, 2, 5, '2023-09-10 08:50:00+01'),
(13, 12, 5, 3, 3, '2023-09-11 19:05:00+01'),
(14, 15, 4, 4, 5, '2023-10-01 11:40:00+01'),
(15, 14, 3, 5, 4, '2023-10-02 21:15:00+01'),
(16, 17, 5, 2, 5, '2023-06-20 10:00:00+01'),
(17, 16, 4, 3, 4, '2023-06-21 15:30:00+01'),
(18, 19, 3, 4, 3, '2023-07-15 09:45:00+01'),
(19, 18, 5, 5, 5, '2023-07-16 17:25:00+01'),
(20, 6, 4, 3, 4, '2023-08-10 13:55:00+01'),
(6, 8, 5, 4, 5, '2023-08-15 10:20:00+01'),
(7, 9, 3, 3, 4, '2023-08-16 11:45:00+01'),
(8, 10, 4, 2, 5, '2023-08-17 09:30:00+01'),
(9, 11, 5, 5, 4, '2023-08-18 14:10:00+01'),
(10, 12, 4, 4, 5, '2023-08-19 16:50:00+01');
