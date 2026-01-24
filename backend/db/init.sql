-- =========================================================
-- Project Comp (MVP)
-- Varias habitaciones por piso + anunciante no convive + votos por piso
-- IDs: SERIAL (autoincrement) en todas las PK
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
    -- Quitamos UNIQUE aquí porque vamos a imponer unicidad case-insensitive
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'user'
      CHECK (rol IN ('user', 'advertiser', 'admin')),
    telefono VARCHAR(20),
    foto_perfil_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unicidad de email sin distinguir mayúsculas/minúsculas
CREATE UNIQUE INDEX uq_usuario_email_lower ON usuario (LOWER(email));

-- (Opcional) Búsquedas típicas
CREATE INDEX idx_usuario_rol ON usuario (rol);
CREATE INDEX idx_usuario_activo ON usuario (activo);

-- =========================================================
-- 2) PISO
-- =========================================================
CREATE TABLE piso (
    id SERIAL PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    descripcion TEXT,
    -- Manager del anuncio (no tiene por qué convivir)
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

    -- Estado simple, sin overengineering
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

    -- "orden" sirve para decidir cuál es la portada y el orden en el carrusel.
    orden INT NOT NULL DEFAULT 0 CHECK (orden >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foto_habitacion (
    id SERIAL PRIMARY KEY,
    habitacion_id INT NOT NULL REFERENCES habitacion(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT NOT NULL DEFAULT 0 CHECK (orden >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de FK
CREATE INDEX idx_foto_piso_piso ON foto_piso(piso_id);
CREATE INDEX idx_foto_habitacion_habitacion ON foto_habitacion(habitacion_id);

-- (Opcional) Evita repetir el mismo "orden" dentro del mismo piso/habitación
-- Si prefieres permitir duplicados, comenta estas 2 líneas.
CREATE UNIQUE INDEX uq_foto_piso_orden ON foto_piso (piso_id, orden);
CREATE UNIQUE INDEX uq_foto_habitacion_orden ON foto_habitacion (habitacion_id, orden);

-- =========================================================
-- 5) USUARIO_HABITACION
--    - fecha_salida NULL => estancia activa
--    - La convivencia real se deduce por "habitaciones dentro del mismo piso"
-- =========================================================
CREATE TABLE usuario_habitacion (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    habitacion_id INT NOT NULL REFERENCES habitacion(id) ON DELETE CASCADE,

    fecha_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida  TIMESTAMPTZ NULL DEFAULT NULL,

    CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_entrada)
);

-- Un usuario no puede tener 2 estancias activas a la vez (en ninguna habitación)
CREATE UNIQUE INDEX uq_usuario_estancia_activa
ON usuario_habitacion(usuario_id)
WHERE fecha_salida IS NULL;

-- Una habitación no puede tener 2 ocupaciones activas a la vez
CREATE UNIQUE INDEX uq_habitacion_ocupacion_activa
ON usuario_habitacion(habitacion_id)
WHERE fecha_salida IS NULL;

-- Índices para consultas frecuentes
CREATE INDEX idx_usuario_habitacion_usuario ON usuario_habitacion(usuario_id);
CREATE INDEX idx_usuario_habitacion_habitacion ON usuario_habitacion(habitacion_id);

-- Índices que ayudan al trigger (búsquedas por usuario + fechas)
CREATE INDEX idx_uh_usuario_fechas ON usuario_habitacion(usuario_id, fecha_entrada, fecha_salida);
CREATE INDEX idx_uh_habitacion_fechas ON usuario_habitacion(habitacion_id, fecha_entrada, fecha_salida);

-- =========================================================
-- 6) VOTOS (por piso)
--    - Un voto por (piso, votante, votado)
--    - Permitimos votar si convivieron en ese piso (pasado o presente),
--      y además exige SOLAPE temporal real.
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
-- 7) TRIGGER: Validar convivencia real (piso correcto + solape temporal)
-- =========================================================
CREATE OR REPLACE FUNCTION validar_convivencia_voto()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM usuario_habitacion uh1
    JOIN habitacion h1 ON h1.id = uh1.habitacion_id
    JOIN usuario_habitacion uh2 ON uh2.usuario_id = NEW.votado_id
    JOIN habitacion h2 ON h2.id = uh2.habitacion_id
    WHERE uh1.usuario_id = NEW.votante_id
      AND h1.piso_id = NEW.piso_id
      AND h2.piso_id = NEW.piso_id
      -- Solape temporal: basta con coincidir un instante (pasado o presente)
      AND uh1.fecha_entrada <= COALESCE(uh2.fecha_salida, 'infinity'::timestamptz)
      AND uh2.fecha_entrada <= COALESCE(uh1.fecha_salida, 'infinity'::timestamptz)
  ) THEN
    RAISE EXCEPTION
      'No se puede votar: no hubo convivencia (solapada) en el piso % (Votante %, Votado %)',
      NEW.piso_id, NEW.votante_id, NEW.votado_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_convivencia_voto ON voto_usuario;

CREATE TRIGGER trg_validar_convivencia_voto
BEFORE INSERT OR UPDATE ON voto_usuario
FOR EACH ROW
EXECUTE FUNCTION validar_convivencia_voto();


-- =========================================================
-- INSERTS: usuario (20)
-- 2 admin, 4 advertiser, 14 user
-- =========================================================
INSERT INTO usuario
(nombre, email, password_hash, rol, telefono, foto_perfil_url, activo, fecha_registro)
VALUES
-- ADMINS (2)
('Miguel García Soler', 'miguel@projectcomp.com', '$2b$10$5uh6gOGR8CrgQoL3gYXEMuBY4nFdZ4vgsZivd5o20sxjBYJazFIWm', 'admin', '+34 610 120 340', '/uploads/perfiles/miguel_garcia_soler.jpg', true, '2026-01-02 10:00:00+01'),
('Laura Martínez Rivas', 'laura@projectcomp.com', '$2b$10$5uh6gOGR8CrgQoL3gYXEMuBY4nFdZ4vgsZivd5o20sxjBYJazFIWm', 'admin', '+34 622 445 118', '/uploads/perfiles/laura_martinez_rivas.jpg', true, '2026-01-02 10:05:00+01'),
-- ADVERTISERS (4)
('Carlos Domínguez Herrera', 'carlos@pisosdominguez.es', '$2b$10$OPKDYcjFdQ6l2cIZOd2nsuTUpdW4OG5eduKw0/LnHXSllaDn2uJsO', 'advertiser', '+34 611 201 903', '/uploads/perfiles/carlos_dominguez_herrera.jpg', true, '2026-01-03 09:20:00+01'),
('María López Varela', 'maria@alquilaviviendas.com', '$2b$10$OPKDYcjFdQ6l2cIZOd2nsuTUpdW4OG5eduKw0/LnHXSllaDn2uJsO', 'advertiser', '+34 699 830 211', '/uploads/perfiles/maria_lopez_varela.jpg', true, '2026-01-03 09:35:00+01'),
('Javier Ruiz Morales', 'javier@habitacionesruiz.com', '$2b$10$OPKDYcjFdQ6l2cIZOd2nsuTUpdW4OG5eduKw0/LnHXSllaDn2uJsO', 'advertiser', '+34 634 200 488', '/uploads/perfiles/javier_ruiz_morales.jpg', true, '2026-01-03 10:10:00+01'),
('Ana Torres Benítez', 'ana@torresinmuebles.com', '$2b$10$OPKDYcjFdQ6l2cIZOd2nsuTUpdW4OG5eduKw0/LnHXSllaDn2uJsO', 'advertiser', '+34 677 450 902', '/uploads/perfiles/ana_torres_benitez.jpg', true, '2026-01-03 10:25:00+01'),
-- USERS (14) - buscadores/inquilinos
('Manuel Pérez Castillo', 'manuel.perez.castillo@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 600 112 221', '/uploads/perfiles/manuel_perez_castillo.jpg', true, '2026-01-04 08:15:00+01'),
('Lucía Fernández Álvarez', 'lucia.fernandez.alvarez@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 644 221 880', '/uploads/perfiles/lucia_fernandez_alvarez.jpg', true, '2026-01-04 08:25:00+01'),
('David Romero Gil', 'david.romero.gil@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 622 339 104', '/uploads/perfiles/david_romero_gil.jpg', true, '2026-01-04 09:10:00+01'),
('Paula Sánchez Moreno', 'paula.sanchez.moreno@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 655 140 980', '/uploads/perfiles/paula_sanchez_moreno.jpg', true, '2026-01-04 10:30:00+01'),
('Hugo Navarro Paredes', 'hugo.navarro.paredes@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 699 201 333', '/uploads/perfiles/hugo_navarro_paredes.jpg', true, '2026-01-04 11:05:00+01'),
('Elena Molina Prieto', 'elena.molina.prieto@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 611 400 771', '/uploads/perfiles/elena_molina_prieto.jpg', true, '2026-01-04 12:45:00+01'),
('Alberto Ortega Fuentes', 'alberto.ortega.fuentes@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 633 210 010', '/uploads/perfiles/alberto_ortega_fuentes.jpg', true, '2026-01-05 09:00:00+01'),
('Cristina Vidal Ramos', 'cristina.vidal.ramos@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 698 220 518', '/uploads/perfiles/cristina_vidal_ramos.jpg', true, '2026-01-05 09:10:00+01'),
('Raúl Ibáñez Soto', 'raul.ibanez.soto@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 620 118 404', '/uploads/perfiles/raul_ibanez_soto.jpg', true, '2026-01-05 10:20:00+01'),
('Irene Lozano Cruz', 'irene.lozano.cruz@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 688 901 121', '/uploads/perfiles/irene_lozano_cruz.jpg', true, '2026-01-05 10:55:00+01'),
('Sergio Calvo Muñoz', 'sergio.calvo.munoz@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 612 222 030', '/uploads/perfiles/sergio_calvo_munoz.jpg', true, '2026-01-05 12:00:00+01'),
('Patricia León Roldán', 'patricia.leon.roldan@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 699 332 118', '/uploads/perfiles/patricia_leon_roldan.jpg', true, '2026-01-06 09:30:00+01'),
('Diego Serrano Blasco', 'diego.serrano.blasco@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 650 778 990', '/uploads/perfiles/diego_serrano_blasco.jpg', true, '2026-01-06 10:45:00+01'),
('Natalia Campos Aguilar', 'natalia.campos.aguilar@gmail.com', '$2b$10$VJY30bm0w6bIJDxlwfKnyuOJ33Zk9Iwzjq/K7bU1U9mEL3vQW3xaa', 'user', '+34 677 330 454', '/uploads/perfiles/natalia_campos_aguilar.jpg', true, '2026-01-06 11:20:00+01');

-- =========================================================
-- INSERTS: piso (7)
-- managers = advertisers (id 3..6)
-- =========================================================
INSERT INTO piso
(direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at)
VALUES
('Calle Fuencarral 128, 3ºB', 'Madrid', '28010', 'Piso reformado, salón amplio y cocina equipada. 2 baños. Buena convivencia y normas claras. Ideal para jóvenes profesionales y teletrabajo.', 3, true, '2026-01-07 10:15:00+01'),
('Carrer de Provença 214, 2º1ª', 'Barcelona', '08036', 'Piso en Eixample con techos altos y buena ventilación. Cocina grande y salón comedor. Metro y supermercados a 5 minutos.', 4, true, '2026-01-07 12:40:00+01'),
('Calle Cádiz 42, 1ºD', 'Valencia', '46006', 'Piso en Ruzafa, ambiente tranquilo. Galería/lavadero y balcón. Bien aislado. Se prioriza orden en zonas comunes.', 5, true, '2026-01-08 09:05:00+01'),
('Calle San Jacinto 19, 4ºA', 'Sevilla', '41010', 'Piso luminoso en Triana. Aire acondicionado en salón. Zonas comunes cuidadas. Se busca gente respetuosa con el descanso.', 6, true, '2026-01-08 18:20:00+01'),
('Calle Ercilla 27, 5ºIzq', 'Bilbao', '48011', 'Piso en Indautxu, muy bien comunicado. Calefacción central. Salón amplio para teletrabajo. Ambiente serio y tranquilo.', 3, true, '2026-01-09 11:10:00+01'),
('Calle Carretería 56, 2ºC', 'Málaga', '29008', 'Piso céntrico, cerca de transporte y comercios. Cocina equipada y buen aislamiento acústico. Comunidad tranquila.', 4, true, '2026-01-09 17:45:00+01'),
('Paseo Sagasta 18, 6ºD', 'Zaragoza', '50006', 'Piso amplio cerca del tranvía. Se dio de baja temporalmente por reforma de baño. Volverá a publicarse cuando termine la obra.', 5, false, '2026-01-05 16:30:00+01');

-- =========================================================
-- INSERTS: habitacion (21)
-- 3 por piso (7 pisos)
-- =========================================================
INSERT INTO habitacion
(piso_id, titulo, descripcion, precio_mensual, disponible, tamano_m2, amueblada, created_at)
VALUES
-- Piso 1 (Madrid) - piso_id = 1
(1, 'Exterior con balcón (luz todo el día)', 'Habitación exterior con balcón a calle tranquila. Cama 135, armario grande y escritorio. Muy buena para teletrabajo.', 540, true, 14, true, '2026-01-07 10:30:00+01'),
(1, 'Interior silenciosa (ideal estudio)', 'Habitación interior muy silenciosa. Cama 90, escritorio y estanterías. Perfecta si valoras el descanso.', 430, true, 10, true, '2026-01-07 10:35:00+01'),
(1, 'Grande con zona de trabajo', 'Cama 150, escritorio amplio y silla cómoda. Ventana a patio amplio (entra luz sin ruido).', 510, false, 15, true, '2026-01-07 10:40:00+01'),
-- Piso 2 (Barcelona) - piso_id = 2
(2, 'Techos altos en Eixample', 'Habitación con techos altos, cama 135 y armario empotrado. Buen aislamiento. Ambiente tranquilo.', 650, true, 15, true, '2026-01-07 13:00:00+01'),
(2, 'Individual cerca del metro', 'Cama 90, escritorio y almacenamiento. Buena relación calidad/precio para la zona.', 520, true, 9, true, '2026-01-07 13:05:00+01'),
(2, 'Amplia con luz natural', 'Cama 135, armario grande y ventilador de techo. Ventana grande y buena ventilación.', 610, false, 14, true, '2026-01-07 13:10:00+01'),
-- Piso 3 (Valencia) - piso_id = 3
(3, 'Ventana a calle tranquila (Ruzafa)', 'Cama 135, escritorio y armario. Calle poco transitada por la noche. Zonas comunes cuidadas.', 440, true, 12, true, '2026-01-08 09:20:00+01'),
(3, 'Compacta y económica', 'Cama 90 y escritorio plegable. Ideal si buscas ahorrar. (Sin muebles extra, se puede traer lo propio).', 330, true, 8, false, '2026-01-08 09:25:00+01'),
(3, 'Balcón francés y mucha luz', 'Muy luminosa, cama 135 y escritorio grande. Buen armario y espacio para almacenaje.', 480, true, 13, true, '2026-01-08 09:30:00+01'),
-- Piso 4 (Sevilla) - piso_id = 4
(4, 'A/C individual + cama 135', 'Aire acondicionado propio. Cama 135, armario y escritorio. Buena para verano.', 400, true, 12, true, '2026-01-08 18:40:00+01'),
(4, 'Interior silenciosa (descanso)', 'Cama 90, armario alto. Muy buena para descansar. Ventilación correcta.', 320, true, 9, true, '2026-01-08 18:45:00+01'),
(4, 'Exterior luminosa (ventana grande)', 'Cama 150, escritorio y estantería. Ventana grande y buena luz natural.', 430, false, 14, true, '2026-01-08 18:50:00+01'),
-- Piso 5 (Bilbao) - piso_id = 5
(5, 'Teletrabajo: escritorio grande', 'Escritorio grande, silla cómoda y buena luz. Cama 135. Calefacción central incluida en comunidad.', 590, true, 14, true, '2026-01-09 11:25:00+01'),
(5, 'Individual económica (Indautxu)', 'Cama 90, armario, escritorio. Muy buena ubicación, ambiente serio.', 480, true, 10, true, '2026-01-09 11:30:00+01'),
(5, 'Doble con armario empotrado', 'Cama 150, armario empotrado y espacio extra. Habitación más “premium” del piso.', 650, true, 15, true, '2026-01-09 11:35:00+01'),
-- Piso 6 (Málaga) - piso_id = 6
(6, 'Mucha luz + cama 135', 'Cama 135, escritorio y ventilador. Muy luminosa. Buen aislamiento acústico.', 490, true, 12, true, '2026-01-09 18:00:00+01'),
(6, 'Tranquila y fresca (sin amueblar)', 'Habitación fresca con ventilación cruzada. Sin muebles (ideal si ya tienes).', 380, true, 10, false, '2026-01-09 18:05:00+01'),
(6, 'Grande con escritorio amplio', 'Cama 150, escritorio grande y estanterías. Perfecta para teletrabajo.', 540, false, 14, true, '2026-01-09 18:10:00+01'),
-- Piso 7 (Zaragoza - INACTIVO) - piso_id = 7
-- (Aunque las habitaciones estén "disponibles", el piso está inactivo: útil para test de filtros)
(7, 'Exterior con vistas (piso en reforma)', 'Habitación exterior. El piso está temporalmente inactivo por reforma de baño; se retomarán visitas en breve.', 420, true, 12, true, '2026-01-05 16:40:00+01'),
(7, 'Interior tranquila (piso inactivo)', 'Habitación interior tranquila. Ideal para estudiante. Se reactivará el anuncio al finalizar la obra.', 350, true, 9, true, '2026-01-05 16:45:00+01'),
(7, 'Amplia con armario grande (piso inactivo)', 'Cama 135 y armario grande. Buena luz. Aún no se hacen visitas por reforma.', 460, true, 13, true, '2026-01-05 16:50:00+01');

-- =========================================================
-- INSERTS: foto_piso (3 por piso, 7 pisos)
-- orden: 0 portada, 1,2 siguientes
-- =========================================================
INSERT INTO foto_piso
(piso_id, url, orden, created_at)
VALUES
-- Piso 1 (Madrid)
(1, '/uploads/pisos/1/salon_01.jpg', 0, '2026-01-07 10:50:00+01'),
(1, '/uploads/pisos/1/cocina_01.jpg', 1, '2026-01-07 10:50:30+01'),
(1, '/uploads/pisos/1/bano_01.jpg',   2, '2026-01-07 10:51:00+01'),
-- Piso 2 (Barcelona)
(2, '/uploads/pisos/2/salon_01.jpg', 0, '2026-01-07 13:25:00+01'),
(2, '/uploads/pisos/2/cocina_01.jpg', 1, '2026-01-07 13:25:30+01'),
(2, '/uploads/pisos/2/bano_01.jpg',   2, '2026-01-07 13:26:00+01'),
-- Piso 3 (Valencia)
(3, '/uploads/pisos/3/salon_01.jpg',   0, '2026-01-08 09:50:00+01'),
(3, '/uploads/pisos/3/cocina_01.jpg',  1, '2026-01-08 09:50:30+01'),
(3, '/uploads/pisos/3/galeria_01.jpg', 2, '2026-01-08 09:51:00+01'),
-- Piso 4 (Sevilla)
(4, '/uploads/pisos/4/salon_01.jpg', 0, '2026-01-08 19:10:00+01'),
(4, '/uploads/pisos/4/cocina_01.jpg', 1, '2026-01-08 19:10:30+01'),
(4, '/uploads/pisos/4/bano_01.jpg',   2, '2026-01-08 19:11:00+01'),
-- Piso 5 (Bilbao)
(5, '/uploads/pisos/5/salon_01.jpg', 0, '2026-01-09 11:55:00+01'),
(5, '/uploads/pisos/5/cocina_01.jpg', 1, '2026-01-09 11:55:30+01'),
(5, '/uploads/pisos/5/bano_01.jpg',   2, '2026-01-09 11:56:00+01'),
-- Piso 6 (Málaga)
(6, '/uploads/pisos/6/salon_01.jpg', 0, '2026-01-09 18:25:00+01'),
(6, '/uploads/pisos/6/cocina_01.jpg', 1, '2026-01-09 18:25:30+01'),
(6, '/uploads/pisos/6/bano_01.jpg',   2, '2026-01-09 18:26:00+01'),
-- Piso 7 (Zaragoza - inactivo)
(7, '/uploads/pisos/7/salon_01.jpg', 0, '2026-01-05 17:10:00+01'),
(7, '/uploads/pisos/7/cocina_01.jpg', 1, '2026-01-05 17:10:30+01'),
(7, '/uploads/pisos/7/bano_01.jpg',   2, '2026-01-05 17:11:00+01');

-- =========================================================
-- INSERTS foto_habitacion
-- 2 fotos por habitación (orden 0 = principal)
-- =========================================================
INSERT INTO foto_habitacion (habitacion_id, url, orden, created_at) VALUES
(1, '/uploads/habitaciones/1/01.jpg', 0, CURRENT_TIMESTAMP),
(1, '/uploads/habitaciones/1/02.jpg', 1, CURRENT_TIMESTAMP),
(2, '/uploads/habitaciones/2/01.jpg', 0, CURRENT_TIMESTAMP),
(2, '/uploads/habitaciones/2/02.jpg', 1, CURRENT_TIMESTAMP),
(3, '/uploads/habitaciones/3/01.jpg', 0, CURRENT_TIMESTAMP),
(3, '/uploads/habitaciones/3/02.jpg', 1, CURRENT_TIMESTAMP),
(4, '/uploads/habitaciones/4/01.jpg', 0, CURRENT_TIMESTAMP),
(4, '/uploads/habitaciones/4/02.jpg', 1, CURRENT_TIMESTAMP),
(5, '/uploads/habitaciones/5/01.jpg', 0, CURRENT_TIMESTAMP),
(5, '/uploads/habitaciones/5/02.jpg', 1, CURRENT_TIMESTAMP),
(6, '/uploads/habitaciones/6/01.jpg', 0, CURRENT_TIMESTAMP),
(6, '/uploads/habitaciones/6/02.jpg', 1, CURRENT_TIMESTAMP),
(7, '/uploads/habitaciones/7/01.jpg', 0, CURRENT_TIMESTAMP),
(7, '/uploads/habitaciones/7/02.jpg', 1, CURRENT_TIMESTAMP),
(8, '/uploads/habitaciones/8/01.jpg', 0, CURRENT_TIMESTAMP),
(8, '/uploads/habitaciones/8/02.jpg', 1, CURRENT_TIMESTAMP),
(9, '/uploads/habitaciones/9/01.jpg', 0, CURRENT_TIMESTAMP),
(9, '/uploads/habitaciones/9/02.jpg', 1, CURRENT_TIMESTAMP),
(10, '/uploads/habitaciones/10/01.jpg', 0, CURRENT_TIMESTAMP),
(10, '/uploads/habitaciones/10/02.jpg', 1, CURRENT_TIMESTAMP),
(11, '/uploads/habitaciones/11/01.jpg', 0, CURRENT_TIMESTAMP),
(11, '/uploads/habitaciones/11/02.jpg', 1, CURRENT_TIMESTAMP),
(12, '/uploads/habitaciones/12/01.jpg', 0, CURRENT_TIMESTAMP),
(12, '/uploads/habitaciones/12/02.jpg', 1, CURRENT_TIMESTAMP),
(13, '/uploads/habitaciones/13/01.jpg', 0, CURRENT_TIMESTAMP),
(13, '/uploads/habitaciones/13/02.jpg', 1, CURRENT_TIMESTAMP),
(14, '/uploads/habitaciones/14/01.jpg', 0, CURRENT_TIMESTAMP),
(14, '/uploads/habitaciones/14/02.jpg', 1, CURRENT_TIMESTAMP),
(15, '/uploads/habitaciones/15/01.jpg', 0, CURRENT_TIMESTAMP),
(15, '/uploads/habitaciones/15/02.jpg', 1, CURRENT_TIMESTAMP),
(16, '/uploads/habitaciones/16/01.jpg', 0, CURRENT_TIMESTAMP),
(16, '/uploads/habitaciones/16/02.jpg', 1, CURRENT_TIMESTAMP),
(17, '/uploads/habitaciones/17/01.jpg', 0, CURRENT_TIMESTAMP),
(17, '/uploads/habitaciones/17/02.jpg', 1, CURRENT_TIMESTAMP),
(18, '/uploads/habitaciones/18/01.jpg', 0, CURRENT_TIMESTAMP),
(18, '/uploads/habitaciones/18/02.jpg', 1, CURRENT_TIMESTAMP);
(19, '/uploads/habitaciones/19/01.jpg', 0, CURRENT_TIMESTAMP),
(19, '/uploads/habitaciones/19/02.jpg', 1, CURRENT_TIMESTAMP),
(20, '/uploads/habitaciones/20/01.jpg', 0, CURRENT_TIMESTAMP),
(21, '/uploads/habitaciones/21/01.jpg', 0, CURRENT_TIMESTAMP),
(21, '/uploads/habitaciones/21/02.jpg', 1, CURRENT_TIMESTAMP);

-- =========================================================
-- INSERTS usuario_habitacion
-- Activos: fecha_salida NULL
-- Históricos: fecha_salida NOT NULL
-- =========================================================
INSERT INTO usuario_habitacion (usuario_id, habitacion_id, fecha_entrada, fecha_salida) VALUES
-- ESTANCIAS ACTIVAS (usuarios 7..15)
-- Piso 1 (habitaciones 1-3): 7,8,9 conviven ahora
(7,  1, '2026-01-10 19:00:00+01', NULL),
(8,  2, '2026-01-11 09:00:00+01', NULL),
(9,  3, '2026-01-11 18:30:00+01', NULL),
-- Piso 2 (habitaciones 4-6): 10,11,12 conviven ahora
(10, 4, '2026-01-10 20:00:00+01', NULL),
(11, 5, '2026-01-11 12:00:00+01', NULL),
(12, 6, '2026-01-11 21:00:00+01', NULL),
-- Piso 3 (habitaciones 7-9): 13,14,15 conviven ahora
(13, 7, '2026-01-09 18:00:00+01', NULL),
(14, 8, '2026-01-10 10:30:00+01', NULL),
(15, 9, '2026-01-10 13:15:00+01', NULL),
-- HISTÓRICO (usuarios 16..20) - ya no viven, pero existió convivencia
-- Piso 4 (habitaciones 10-12): 16,17,18 convivieron y se fueron en fechas distintas (hay solape real)
(16, 10, '2025-09-05 12:00:00+02', '2025-12-10 10:00:00+01'),
(17, 11, '2025-09-20 12:00:00+02', '2025-12-22 12:00:00+01'),
(18, 12, '2025-10-10 12:00:00+02', '2026-01-05 09:00:00+01'),
-- Piso 5 (habitaciones 13-15): 19 vivió un tiempo (solo 1 histórico aquí, útil para edge cases)
(19, 13, '2025-06-01 10:00:00+02', '2025-11-15 10:00:00+01'),
-- Piso 6 (habitaciones 16-18): 20 vivió un tiempo
(20, 16, '2025-07-10 11:00:00+02', '2025-12-01 10:00:00+01');

-------------------------------------------------------
-- INSERTS voto_usuario
-- Todos estos INSERTS pasan el trigger (convivencia solapada por piso)
-- num_cambios = 0 en seeds
-------------------------------------------------------
INSERT INTO voto_usuario
(piso_id, votante_id, votado_id, limpieza, ruido, puntualidad_pagos, num_cambios, created_at)
VALUES
-- Piso 1 (usuarios 7,8,9)
(1, 7, 8, 4, 3, 5, 0, '2026-01-12 09:10:00+01'),
(1, 8, 7, 5, 4, 4, 0, '2026-01-12 09:12:00+01'),
(1, 7, 9, 3, 2, 5, 0, '2026-01-12 09:15:00+01'),
(1, 9, 7, 4, 3, 4, 0, '2026-01-12 09:18:00+01'),
(1, 8, 9, 4, 2, 4, 0, '2026-01-12 09:20:00+01'),
(1, 9, 8, 3, 3, 5, 0, '2026-01-12 09:22:00+01'),
-- Piso 2 (usuarios 10,11,12)
(2, 10, 11, 5, 4, 5, 0, '2026-01-12 10:05:00+01'),
(2, 11, 10, 4, 3, 4, 0, '2026-01-12 10:08:00+01'),
(2, 12, 10, 4, 2, 5, 0, '2026-01-12 10:10:00+01'),
(2, 10, 12, 3, 4, 4, 0, '2026-01-12 10:12:00+01'),
(2, 11, 12, 4, 3, 4, 0, '2026-01-12 10:14:00+01'),
(2, 12, 11, 3, 4, 3, 0, '2026-01-12 10:16:00+01'),
-- Piso 3 (usuarios 13,14,15)
(3, 13, 14, 4, 4, 5, 0, '2026-01-12 11:00:00+01'),
(3, 14, 13, 5, 3, 4, 0, '2026-01-12 11:02:00+01'),
(3, 15, 14, 3, 2, 5, 0, '2026-01-12 11:05:00+01'),
(3, 14, 15, 4, 3, 4, 0, '2026-01-12 11:08:00+01'),
(3, 13, 15, 4, 2, 4, 0, '2026-01-12 11:10:00+01'),
(3, 15, 13, 3, 3, 5, 0, '2026-01-12 11:12:00+01'),
-- Piso 4 (histórico: usuarios 16,17,18 con solape real)
(4, 16, 17, 4, 3, 4, 0, '2025-11-15 19:00:00+01'),
(4, 17, 18, 3, 4, 3, 0, '2025-12-11 20:30:00+01'),
(4, 18, 16, 5, 2, 5, 0, '2025-12-12 18:15:00+01'),
(4, 16, 18, 4, 2, 4, 0, '2025-12-13 10:05:00+01'),
(4, 18, 17, 3, 4, 4, 0, '2025-12-14 21:10:00+01');






