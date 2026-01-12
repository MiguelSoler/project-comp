-- =========================================================
-- Project Comp (MVP)
-- Varias habitaciones por piso + anunciante no convive + votos por piso
-- =========================================================

-- DROP en orden por dependencias
DROP TABLE IF EXISTS voto_usuario CASCADE;
DROP TABLE IF EXISTS usuario_habitacion CASCADE;
DROP TABLE IF EXISTS foto_habitacion CASCADE;
DROP TABLE IF EXISTS foto_piso CASCADE;
DROP TABLE IF EXISTS habitacion CASCADE;
DROP TABLE IF EXISTS piso CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;

-- =========================================================
-- 1) USUARIO
-- =========================================================
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'user'
      CHECK (rol IN ('user', 'advertiser', 'admin')),
    telefono VARCHAR(20),
    foto_perfil_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice único para email en minúsculas
CREATE UNIQUE INDEX uq_usuario_email_lower ON usuario (LOWER(email));

-- =========================================================
-- 2) PISO
-- =========================================================
CREATE TABLE piso (
    id SERIAL PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    descripcion TEXT,
    manager_usuario_id INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_piso_ciudad ON piso(ciudad);
CREATE INDEX idx_piso_activo ON piso(activo);
CREATE INDEX idx_piso_manager ON piso(manager_usuario_id);

-- =========================================================
-- 3) HABITACION
-- =========================================================
CREATE TABLE habitacion (
    id SERIAL PRIMARY KEY,
    piso_id INT NOT NULL REFERENCES piso(id) ON DELETE CASCADE,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio_mensual INT NOT NULL CHECK (precio_mensual >= 0),
    disponible BOOLEAN NOT NULL DEFAULT true,
    tamano_m2 INTEGER CHECK (tamano_m2 IS NULL OR tamano_m2 > 0),
    amueblada BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_habitacion_piso ON habitacion(piso_id);
CREATE INDEX idx_habitacion_disponible ON habitacion(disponible);
CREATE INDEX idx_habitacion_precio ON habitacion(precio_mensual);
CREATE INDEX idx_habitacion_precio_disponible ON habitacion(disponible, precio_mensual);

-- =========================================================
-- 4) FOTOS
-- =========================================================
CREATE TABLE foto_piso (
    id SERIAL PRIMARY KEY,
    piso_id INT NOT NULL REFERENCES piso(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foto_habitacion (
    id SERIAL PRIMARY KEY,
    habitacion_id INT NOT NULL REFERENCES habitacion(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_foto_piso_piso ON foto_piso(piso_id);
CREATE INDEX idx_foto_habitacion_habitacion ON foto_habitacion(habitacion_id);

-- =========================================================
-- 5) USUARIO_HABITACION
-- =========================================================
CREATE TABLE usuario_habitacion (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    habitacion_id INT NOT NULL REFERENCES habitacion(id) ON DELETE CASCADE,
    fecha_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida  TIMESTAMPTZ NULL DEFAULT NULL,
    CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_entrada)
);

CREATE UNIQUE INDEX uq_usuario_estancia_activa
ON usuario_habitacion(usuario_id)
WHERE fecha_salida IS NULL;

CREATE UNIQUE INDEX uq_habitacion_ocupacion_activa
ON usuario_habitacion(habitacion_id)
WHERE fecha_salida IS NULL;

CREATE INDEX idx_usuario_habitacion_usuario ON usuario_habitacion(usuario_id);
CREATE INDEX idx_usuario_habitacion_habitacion ON usuario_habitacion(habitacion_id);
CREATE INDEX idx_usuario_habitacion_activos ON usuario_habitacion(usuario_id) WHERE fecha_salida IS NULL;
CREATE INDEX idx_usuario_habitacion_historial ON usuario_habitacion(habitacion_id, fecha_salida);

-- =========================================================
-- 6) VOTOS
-- =========================================================
CREATE TABLE voto_usuario (
    id SERIAL PRIMARY KEY,
    piso_id INT NOT NULL REFERENCES piso(id) ON DELETE CASCADE,
    votante_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    votado_id  INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    limpieza INT NOT NULL CHECK (limpieza BETWEEN 1 AND 5),
    ruido INT NOT NULL CHECK (ruido BETWEEN 1 AND 5),
    puntualidad_pagos INT NOT NULL CHECK (puntualidad_pagos BETWEEN 1 AND 5),
    num_cambios INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (votante_id <> votado_id),
    UNIQUE (piso_id, votante_id, votado_id)
);

CREATE INDEX idx_voto_piso ON voto_usuario(piso_id);
CREATE INDEX idx_voto_votado ON voto_usuario(votado_id);
CREATE INDEX idx_voto_votante ON voto_usuario(votante_id);
CREATE INDEX idx_voto_fecha ON voto_usuario(created_at);

-- =========================================================
-- TRIGGER: Validar que el usuario votado esté activo
-- =========================================================
-- Función que valida que el votante haya convivido con el votado
CREATE OR REPLACE FUNCTION validar_convivencia_voto()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM usuario_habitacion uh1
        JOIN habitacion h1 ON uh1.habitacion_id = h1.id
        JOIN piso p1 ON h1.piso_id = p1.id
        JOIN habitacion h2 ON p1.id = h2.piso_id
        JOIN usuario_habitacion uh2 ON h2.id = uh2.habitacion_id
        WHERE uh1.usuario_id = NEW.votante_id
          AND uh2.usuario_id = NEW.votado_id
    ) THEN
        RAISE EXCEPTION 'No se puede votar a un usuario con el que no se ha convivido (Votante: %, Votado: %)', NEW.votante_id, NEW.votado_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en voto_usuario
DROP TRIGGER IF EXISTS trg_validar_usuario_votado_activo ON voto_usuario;

CREATE TRIGGER trg_validar_convivencia_voto
BEFORE INSERT OR UPDATE ON voto_usuario
FOR EACH ROW
EXECUTE FUNCTION validar_convivencia_voto();

----------------------------------------
-- INSERTS usuario (20)
----------------------------------------
INSERT INTO usuario (id, nombre, email, password_hash, rol, telefono, foto_perfil_url, activo, fecha_registro) VALUES
-- 2 admins
(1, 'Miguel García Soler', 'miguel@projectcomp.com',
 '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin',
 '+34 610 120 340', 'C:/Proyectos/project-comp/uploads/perfiles/miguel.jpg', true, '2026-01-02 10:00:00+01'),
(2, 'Laura Martínez Rivas', 'laura@projectcomp.com',
 '$2b$10$BW6NweH6UApQ3VMERU4PCOMjHoiqR1N.7rxNbw1k3Kq/.wY9gN/dS', 'admin',
 '+34 622 445 118', 'C:/Proyectos/project-comp/uploads/perfiles/laura.jpg', true, '2026-01-02 10:05:00+01'),
-- 4 advertisers
(3, 'Carlos Domínguez Herrera', 'carlos@pisosdominguez.es',
 '$2b$10$1S27QzfTbwTJ4rquyHLRue.yjah11R/rFmIGs/g0fT6t2X06FsZD2', 'advertiser',
 '+34 611 201 903', 'C:/Proyectos/project-comp/uploads/perfiles/carlos_dom.jpg', true, '2026-01-03 09:20:00+01'),
(4, 'María López Varela', 'maria@alquilaviviendas.com',
 '$2b$10$1S27QzfTbwTJ4rquyHLRue.yjah11R/rFmIGs/g0fT6t2X06FsZD2', 'advertiser',
 '+34 699 830 211', 'C:/Proyectos/project-comp/uploads/perfiles/maria_varela.jpg', true, '2026-01-03 09:35:00+01'),
(5, 'Javier Ruiz Morales', 'javier@habitacionesruiz.com',
 '$2b$10$1S27QzfTbwTJ4rquyHLRue.yjah11R/rFmIGs/g0fT6t2X06FsZD2', 'advertiser',
 '+34 634 200 488', 'C:/Proyectos/project-comp/uploads/perfiles/javier_ruiz.jpg', true, '2026-01-03 10:10:00+01'),
(6, 'Ana Torres Benítez', 'ana@torresinmuebles.com',
 '$2b$10$1S27QzfTbwTJ4rquyHLRue.yjah11R/rFmIGs/g0fT6t2X06FsZD2', 'advertiser',
 '+34 677 450 902', 'C:/Proyectos/project-comp/uploads/perfiles/ana_torres.jpg', true, '2026-01-03 10:25:00+01'),
-- 14 users (buscadores)
(7, 'Manuel Pérez Castillo', 'manuel.perez@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 600 112 221', 'C:/Proyectos/project-comp/uploads/perfiles/manuel_perez.jpg', true, '2026-01-04 08:15:00+01'),
(8, 'Lucía Fernández Álvarez', 'lucia.fernandez@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 644 221 880', 'C:/Proyectos/project-comp/uploads/perfiles/lucia_fernandez.jpg', true, '2026-01-04 08:25:00+01'),
(9, 'David Romero Gil', 'david.romero@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 622 339 104', 'C:/Proyectos/project-comp/uploads/perfiles/david_romero.jpg', true, '2026-01-04 09:10:00+01'),
(10, 'Paula Sánchez Moreno', 'paula.sanchez@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 655 140 980', 'C:/Proyectos/project-comp/uploads/perfiles/paula_sanchez.jpg', true, '2026-01-04 10:30:00+01'),
(11, 'Hugo Navarro Paredes', 'hugo.navarro@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 699 201 333', 'C:/Proyectos/project-comp/uploads/perfiles/hugo_navarro.jpg', true, '2026-01-04 11:05:00+01'),
(12, 'Elena Molina Prieto', 'elena.molina@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 611 400 771', 'C:/Proyectos/project-comp/uploads/perfiles/elena_molina.jpg', true, '2026-01-04 12:45:00+01'),
(13, 'Álvaro Ortega Fuentes', 'alvaro.ortega@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 633 210 010', 'C:/Proyectos/project-comp/uploads/perfiles/alvaro_ortega.jpg', true, '2026-01-05 09:00:00+01'),
(14, 'Cristina Vidal Ramos', 'cristina.vidal@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 698 220 518', 'C:/Proyectos/project-comp/uploads/perfiles/cristina_vidal.jpg', true, '2026-01-05 09:10:00+01'),
(15, 'Raúl Ibáñez Soto', 'raul.ibanez@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 620 118 404', 'C:/Proyectos/project-comp/uploads/perfiles/raul_ibanez.jpg', true, '2026-01-05 10:20:00+01'),
(16, 'Irene Lozano Cruz', 'irene.lozano@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 688 901 121', 'C:/Proyectos/project-comp/uploads/perfiles/irene_lozano.jpg', true, '2026-01-05 10:55:00+01'),
(17, 'Sergio Calvo Muñoz', 'sergio.calvo@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 612 222 030', 'C:/Proyectos/project-comp/uploads/perfiles/sergio_calvo.jpg', true, '2026-01-05 12:00:00+01'),
(18, 'Patricia León Roldán', 'patricia.leon@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 699 332 118', 'C:/Proyectos/project-comp/uploads/perfiles/patricia_leon.jpg', true, '2026-01-06 09:30:00+01'),
(19, 'Diego Serrano Blasco', 'diego.serrano@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 650 778 990', 'C:/Proyectos/project-comp/uploads/perfiles/diego_serrano.jpg', true, '2026-01-06 10:45:00+01'),
(20, 'Natalia Campos Aguilar', 'natalia.campos@gmail.com',
 '$2b$10$W9C5TRugUDNuSgcS2CualuWZSey5QOekJOVR17yJy4vNkTxca6ZDm', 'user',
 '+34 677 330 454', 'C:/Proyectos/project-comp/uploads/perfiles/natalia_campos.jpg', true, '2026-01-06 11:20:00+01');

-------------------------------------------------------
-- INSERTS piso (6 pisos, managers = advertisers 3–6)
-------------------------------------------------------
INSERT INTO piso (id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at) VALUES
(1, 'Calle Fuencarral 128, 3ºB', 'Madrid', '28010',
 'Piso reformado con salón amplio, cocina equipada y dos baños. Comunidad tranquila. Ideal para jóvenes profesionales.',
 3, true, '2026-01-07 10:15:00+01'),
(2, 'Carrer de Provença 214, 2º1ª', 'Barcelona', '08036',
 'Piso en Eixample con techos altos y buena ventilación. Cocina grande y salón comedor. Metro cercano.',
 4, true, '2026-01-07 12:40:00+01'),
(3, 'Calle Cádiz 42, 1ºD', 'Valencia', '46006',
 'Piso en Ruzafa, ambiente tranquilo. Cocina completa, galería y salón con balcón. Bien aislado.',
 5, true, '2026-01-08 09:05:00+01'),
(4, 'Calle San Jacinto 19, 4ºA', 'Sevilla', '41010',
 'Piso en Triana con mucha luz. Aire acondicionado en salón. Buenas zonas comunes.',
 6, true, '2026-01-08 18:20:00+01'),
(5, 'Calle Ercilla 27, 5ºIzq', 'Bilbao', '48011',
 'Piso en Indautxu, cercano a metro. Calefacción central. Salón amplio para teletrabajo.',
 3, true, '2026-01-09 11:10:00+01'),
(6, 'Calle Carretería 56, 2ºC', 'Málaga', '29008',
 'Piso céntrico, cerca de transporte y comercios. Cocina equipada y buen aislamiento acústico.',
 4, true, '2026-01-09 17:45:00+01');

-------------------------------------------------------
-- INSERTS habitacion (18 habitaciones, 3 por piso)
-------------------------------------------------------
INSERT INTO habitacion (id, piso_id, titulo, descripcion, precio_mensual, disponible, tamano_m2, amueblada, created_at) VALUES
-- Piso 1 (Madrid)
(1, 1, 'Habitación exterior con balcón', 'Exterior, muy luminosa. Cama doble, armario grande y escritorio.', 520, true, 14, true, '2026-01-07 10:30:00+01'),
(2, 1, 'Habitación interior tranquila', 'Ideal para estudiar/teletrabajo. Buena ventilación. Cama 90.', 430, true, 10, true, '2026-01-07 10:35:00+01'),
(3, 1, 'Habitación grande con zona de trabajo', 'Cama 135, escritorio amplio, estanterías. Ventana a patio amplio.', 490, true, 13, true, '2026-01-07 10:40:00+01'),
-- Piso 2 (Barcelona)
(4, 2, 'Habitación con techos altos', 'Cama doble, armario empotrado. Muy silenciosa por la noche.', 610, true, 15, true, '2026-01-07 13:00:00+01'),
(5, 2, 'Habitación individual cerca del metro', 'Cama 90, escritorio y buen almacenaje. Perfecta para estudiante.', 480, true, 9, true, '2026-01-07 13:05:00+01'),
(6, 2, 'Habitación amplia con luz natural', 'Cama 135, armario grande, ventilador de techo.', 570, true, 14, true, '2026-01-07 13:10:00+01'),
-- Piso 3 (Valencia)
(7, 3, 'Habitación con ventana a calle tranquila', 'Cama doble, escritorio, armario y mesillas.', 420, true, 12, true, '2026-01-08 09:20:00+01'),
(8, 3, 'Habitación compacta y económica', 'Cama 90, escritorio plegable. Ideal si buscas ahorrar.', 340, true, 8, false, '2026-01-08 09:25:00+01'),
(9, 3, 'Habitación con balcón francés', 'Muy luminosa, cama 135 y escritorio grande.', 460, true, 13, true, '2026-01-08 09:30:00+01'),
-- Piso 4 (Sevilla)
(10, 4, 'Habitación con aire acondicionado', 'A/C individual, cama 135, armario y escritorio.', 390, true, 12, true, '2026-01-08 18:40:00+01'),
(11, 4, 'Habitación interior silenciosa', 'Cama 90, armario alto. Muy buena para descansar.', 330, true, 9, true, '2026-01-08 18:45:00+01'),
(12, 4, 'Habitación exterior luminosa', 'Cama doble, escritorio, estantería. Ventana grande.', 410, true, 13, true, '2026-01-08 18:50:00+01'),
-- Piso 5 (Bilbao)
(13, 5, 'Habitación amplia para teletrabajo', 'Escritorio grande y buena luz. Cama 135.', 550, true, 14, true, '2026-01-09 11:25:00+01'),
(14, 5, 'Habitación individual económica', 'Cama 90, armario, escritorio. Buena relación calidad/precio.', 440, true, 10, true, '2026-01-09 11:30:00+01'),
(15, 5, 'Habitación con armario empotrado', 'Cama doble, armario empotrado y mesillas.', 590, true, 15, true, '2026-01-09 11:35:00+01'),
-- Piso 6 (Málaga)
(16, 6, 'Habitación con mucha luz', 'Cama 135, escritorio y ventilador. Muy luminosa.', 470, true, 12, true, '2026-01-09 18:00:00+01'),
(17, 6, 'Habitación tranquila y fresca', 'Cama 90, armario y buena ventilación cruzada.', 390, true, 10, false, '2026-01-09 18:05:00+01'),
(18, 6, 'Habitación grande con escritorio', 'Cama doble, escritorio amplio y estanterías.', 520, true, 14, true, '2026-01-09 18:10:00+01');

-------------------------------------------------------
-- INSERTS fotos (foto_piso y foto_habitacion)
-------------------------------------------------------
INSERT INTO foto_piso (id, piso_id, url, orden, created_at) VALUES
-- Piso 1
(1, 1, 'C:/Proyectos/project-comp/uploads/pisos/1/salon_01.jpg', 0, '2026-01-07 10:50:00+01'),
(2, 1, 'C:/Proyectos/project-comp/uploads/pisos/1/cocina_01.jpg', 1, '2026-01-07 10:50:30+01'),
(3, 1, 'C:/Proyectos/project-comp/uploads/pisos/1/bano_01.jpg', 2, '2026-01-07 10:51:00+01'),
-- Piso 2
(4, 2, 'C:/Proyectos/project-comp/uploads/pisos/2/salon_01.jpg', 0, '2026-01-07 13:25:00+01'),
(5, 2, 'C:/Proyectos/project-comp/uploads/pisos/2/cocina_01.jpg', 1, '2026-01-07 13:25:30+01'),
(6, 2, 'C:/Proyectos/project-comp/uploads/pisos/2/bano_01.jpg', 2, '2026-01-07 13:26:00+01'),
-- Piso 3
(7, 3, 'C:/Proyectos/project-comp/uploads/pisos/3/salon_01.jpg', 0, '2026-01-08 09:50:00+01'),
(8, 3, 'C:/Proyectos/project-comp/uploads/pisos/3/cocina_01.jpg', 1, '2026-01-08 09:50:30+01'),
(9, 3, 'C:/Proyectos/project-comp/uploads/pisos/3/terraza_01.jpg', 2, '2026-01-08 09:51:00+01'),
-- Piso 4
(10, 4, 'C:/Proyectos/project-comp/uploads/pisos/4/salon_01.jpg', 0, '2026-01-08 19:10:00+01'),
(11, 4, 'C:/Proyectos/project-comp/uploads/pisos/4/cocina_01.jpg', 1, '2026-01-08 19:10:30+01'),
(12, 4, 'C:/Proyectos/project-comp/uploads/pisos/4/bano_01.jpg', 2, '2026-01-08 19:11:00+01'),
-- Piso 5
(13, 5, 'C:/Proyectos/project-comp/uploads/pisos/5/salon_01.jpg', 0, '2026-01-09 11:55:00+01'),
(14, 5, 'C:/Proyectos/project-comp/uploads/pisos/5/cocina_01.jpg', 1, '2026-01-09 11:55:30+01'),
(15, 5, 'C:/Proyectos/project-comp/uploads/pisos/5/bano_01.jpg', 2, '2026-01-09 11:56:00+01'),
-- Piso 6
(16, 6, 'C:/Proyectos/project-comp/uploads/pisos/6/salon_01.jpg', 0, '2026-01-09 18:25:00+01'),
(17, 6, 'C:/Proyectos/project-comp/uploads/pisos/6/cocina_01.jpg', 1, '2026-01-09 18:25:30+01'),
(18, 6, 'C:/Proyectos/project-comp/uploads/pisos/6/bano_01.jpg', 2, '2026-01-09 18:26:00+01');

INSERT INTO foto_habitacion (id, habitacion_id, url, orden, created_at) VALUES
-- Habitaciones 1..18 (2 fotos cada una)
(1, 1, 'C:/Proyectos/project-comp/uploads/habitaciones/1/01.jpg', 0, '2026-01-07 10:55:00+01'),
(2, 1, 'C:/Proyectos/project-comp/uploads/habitaciones/1/02.jpg', 1, '2026-01-07 10:55:10+01'),
(3, 2, 'C:/Proyectos/project-comp/uploads/habitaciones/2/01.jpg', 0, '2026-01-07 10:56:00+01'),
(4, 2, 'C:/Proyectos/project-comp/uploads/habitaciones/2/02.jpg', 1, '2026-01-07 10:56:10+01'),
(5, 3, 'C:/Proyectos/project-comp/uploads/habitaciones/3/01.jpg', 0, '2026-01-07 10:57:00+01'),
(6, 3, 'C:/Proyectos/project-comp/uploads/habitaciones/3/02.jpg', 1, '2026-01-07 10:57:10+01'),
(7, 4, 'C:/Proyectos/project-comp/uploads/habitaciones/4/01.jpg', 0, '2026-01-07 13:30:00+01'),
(8, 4, 'C:/Proyectos/project-comp/uploads/habitaciones/4/02.jpg', 1, '2026-01-07 13:30:10+01'),
(9, 5, 'C:/Proyectos/project-comp/uploads/habitaciones/5/01.jpg', 0, '2026-01-07 13:31:00+01'),
(10, 5, 'C:/Proyectos/project-comp/uploads/habitaciones/5/02.jpg', 1, '2026-01-07 13:31:10+01'),
(11, 6, 'C:/Proyectos/project-comp/uploads/habitaciones/6/01.jpg', 0, '2026-01-07 13:32:00+01'),
(12, 6, 'C:/Proyectos/project-comp/uploads/habitaciones/6/02.jpg', 1, '2026-01-07 13:32:10+01'),
(13, 7, 'C:/Proyectos/project-comp/uploads/habitaciones/7/01.jpg', 0, '2026-01-08 09:55:00+01'),
(14, 7, 'C:/Proyectos/project-comp/uploads/habitaciones/7/02.jpg', 1, '2026-01-08 09:55:10+01'),
(15, 8, 'C:/Proyectos/project-comp/uploads/habitaciones/8/01.jpg', 0, '2026-01-08 09:56:00+01'),
(16, 8, 'C:/Proyectos/project-comp/uploads/habitaciones/8/02.jpg', 1, '2026-01-08 09:56:10+01'),
(17, 9, 'C:/Proyectos/project-comp/uploads/habitaciones/9/01.jpg', 0, '2026-01-08 09:57:00+01'),
(18, 9, 'C:/Proyectos/project-comp/uploads/habitaciones/9/02.jpg', 1, '2026-01-08 09:57:10+01'),
(19, 10, 'C:/Proyectos/project-comp/uploads/habitaciones/10/01.jpg', 0, '2026-01-08 19:15:00+01'),
(20, 10, 'C:/Proyectos/project-comp/uploads/habitaciones/10/02.jpg', 1, '2026-01-08 19:15:10+01'),
(21, 11, 'C:/Proyectos/project-comp/uploads/habitaciones/11/01.jpg', 0, '2026-01-08 19:16:00+01'),
(22, 11, 'C:/Proyectos/project-comp/uploads/habitaciones/11/02.jpg', 1, '2026-01-08 19:16:10+01'),
(23, 12, 'C:/Proyectos/project-comp/uploads/habitaciones/12/01.jpg', 0, '2026-01-08 19:17:00+01'),
(24, 12, 'C:/Proyectos/project-comp/uploads/habitaciones/12/02.jpg', 1, '2026-01-08 19:17:10+01'),
(25, 13, 'C:/Proyectos/project-comp/uploads/habitaciones/13/01.jpg', 0, '2026-01-09 12:00:00+01'),
(26, 13, 'C:/Proyectos/project-comp/uploads/habitaciones/13/02.jpg', 1, '2026-01-09 12:00:10+01'),
(27, 14, 'C:/Proyectos/project-comp/uploads/habitaciones/14/01.jpg', 0, '2026-01-09 12:01:00+01'),
(28, 14, 'C:/Proyectos/project-comp/uploads/habitaciones/14/02.jpg', 1, '2026-01-09 12:01:10+01'),
(29, 15, 'C:/Proyectos/project-comp/uploads/habitaciones/15/01.jpg', 0, '2026-01-09 12:02:00+01'),
(30, 15, 'C:/Proyectos/project-comp/uploads/habitaciones/15/02.jpg', 1, '2026-01-09 12:02:10+01'),
(31, 16, 'C:/Proyectos/project-comp/uploads/habitaciones/16/01.jpg', 0, '2026-01-09 18:30:00+01'),
(32, 16, 'C:/Proyectos/project-comp/uploads/habitaciones/16/02.jpg', 1, '2026-01-09 18:30:10+01'),
(33, 17, 'C:/Proyectos/project-comp/uploads/habitaciones/17/01.jpg', 0, '2026-01-09 18:31:00+01'),
(34, 17, 'C:/Proyectos/project-comp/uploads/habitaciones/17/02.jpg', 1, '2026-01-09 18:31:10+01'),
(35, 18, 'C:/Proyectos/project-comp/uploads/habitaciones/18/01.jpg', 0, '2026-01-09 18:32:00+01'),
(36, 18, 'C:/Proyectos/project-comp/uploads/habitaciones/18/02.jpg', 1, '2026-01-09 18:32:10+01');

-------------------------------------------------------
-- INSERTS usuario_habitacion (convivencia real)
-- Activos (fecha_salida NULL): usuarios 7–15 ocupan habitaciones 1–9
-- Historial: usuarios 16–20 han vivido antes (fecha_salida no NULL)
-- Ningún advertiser vive (3–6 no aparecen aquí)
-------------------------------------------------------
INSERT INTO usuario_habitacion (id, usuario_id, habitacion_id, fecha_entrada, fecha_salida) VALUES
-- Piso 1 (habitaciones 1-3) - actuales
(1, 7, 1, '2026-01-10 19:00:00+01', NULL),
(2, 8, 2, '2026-01-11 09:00:00+01', NULL),
(3, 9, 3, '2026-01-11 18:30:00+01', NULL),
-- Piso 2 (habitaciones 4-6) - actuales
(4, 10, 4, '2026-01-10 20:00:00+01', NULL),
(5, 11, 5, '2026-01-11 12:00:00+01', NULL),
(6, 12, 6, '2026-01-11 21:00:00+01', NULL),
-- Piso 3 (habitaciones 7-9) - actuales
(7, 13, 7, '2026-01-09 18:00:00+01', NULL),
(8, 14, 8, '2026-01-10 10:30:00+01', NULL),
(9, 15, 9, '2026-01-10 13:15:00+01', NULL),
-- Historial (ya no viven) para poder tener más relaciones y votos realistas
(10, 16, 10, '2025-10-01 12:00:00+02', '2025-12-20 10:00:00+01'),
(11, 17, 11, '2025-10-15 12:00:00+02', '2025-12-22 12:00:00+01'),
(12, 18, 12, '2025-11-01 12:00:00+02', '2026-01-05 09:00:00+01'),
(13, 19, 13, '2025-09-10 11:00:00+02', '2025-12-01 10:00:00+01'),
(14, 20, 14, '2025-09-15 11:00:00+02', '2025-12-15 10:00:00+01');

----------------------------------------------------------------------------
-- INSERTS voto_usuario (pasan tu trigger)
-- Votos entre compañeros del mismo piso (actuales) y algunos históricos.
----------------------------------------------------------------------------
INSERT INTO voto_usuario
(id, piso_id, votante_id, votado_id, limpieza, ruido, puntualidad_pagos, num_cambios, created_at)
VALUES
-- Piso 1: 7,8,9 conviven (hab 1,2,3)
(1, 1, 7, 8, 4, 3, 5, 0, '2026-01-12 09:10:00+01'),
(2, 1, 8, 7, 5, 4, 4, 0, '2026-01-12 09:12:00+01'),
(3, 1, 7, 9, 3, 2, 5, 0, '2026-01-12 09:15:00+01'),
(4, 1, 9, 7, 4, 3, 4, 0, '2026-01-12 09:18:00+01'),
(5, 1, 8, 9, 4, 2, 4, 0, '2026-01-12 09:20:00+01'),
(6, 1, 9, 8, 3, 3, 5, 0, '2026-01-12 09:22:00+01'),
-- Piso 2: 10,11,12 conviven (hab 4,5,6)
(7, 2, 10, 11, 5, 4, 5, 0, '2026-01-12 10:05:00+01'),
(8, 2, 11, 10, 4, 3, 4, 0, '2026-01-12 10:08:00+01'),
(9, 2, 12, 10, 4, 2, 5, 0, '2026-01-12 10:10:00+01'),
(10, 2, 10, 12, 3, 4, 4, 0, '2026-01-12 10:12:00+01'),
-- Piso 3: 13,14,15 conviven (hab 7,8,9)
(11, 3, 13, 14, 4, 4, 5, 0, '2026-01-12 11:00:00+01'),
(12, 3, 14, 13, 5, 3, 4, 0, '2026-01-12 11:02:00+01'),
(13, 3, 15, 14, 3, 2, 5, 0, '2026-01-12 11:05:00+01'),
-- Históricos (Piso 4: 16,17,18 convivieron en hab 10,11,12)
(14, 4, 16, 17, 4, 3, 4, 0, '2025-12-10 19:00:00+01'),
(15, 4, 17, 18, 3, 4, 3, 0, '2025-12-11 20:30:00+01'),
(16, 4, 18, 16, 5, 2, 5, 0, '2025-12-12 18:15:00+01');





