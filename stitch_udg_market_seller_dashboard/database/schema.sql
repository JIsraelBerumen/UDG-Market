CREATE DATABASE IF NOT EXISTS udgmarket_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE udgmarket_v2;

CREATE TABLE IF NOT EXISTS campuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_campuses_code (code)
) ENGINE=InnoDB;

INSERT INTO campuses (code, name) VALUES
  ('CUCEI', 'Centro Universitario de Ciencias Exactas e Ingenierías'),
  ('CUCEA', 'Centro Universitario de Ciencias Económico Administrativas'),
  ('CUAAD', 'Centro Universitario de Arte, Arquitectura y Diseño'),
  ('CUCS', 'Centro Universitario de Ciencias de la Salud'),
  ('CUCSH', 'Centro Universitario de Ciencias Sociales y Humanidades'),
  ('CUCBA', 'Centro Universitario de Ciencias Biológicas y Agropecuarias'),
  ('CUTONALA', 'Centro Universitario de Tonalá'),
  ('CUTLAJOMULCO', 'Centro Universitario de Tlajomulco'),
  ('CUALTOS', 'Centro Universitario de Los Altos'),
  ('CUVALLES', 'Centro Universitario de los Valles'),
  ('CUCOSTA', 'Centro Universitario de la Costa'),
  ('SUV', 'Sistema de Universidad Virtual')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT,
  PRIMARY KEY (session_id),
  KEY ix_sessions_expires (expires)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campus_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  student_code VARCHAR(20) NULL,
  career VARCHAR(120) NULL,
  avatar_url VARCHAR(2048) NULL,
  role ENUM('buyer', 'seller', 'both', 'admin') NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_student_code (student_code),
  KEY ix_users_campus (campus_id),
  CONSTRAINT fk_users_campus
    FOREIGN KEY (campus_id) REFERENCES campuses (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  order_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  review_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  store_name VARCHAR(120) NULL,
  bio TEXT NULL,
  accepts_orders BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_seller_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE  IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

INSERT INTO categories (name) VALUES
  ('Comida preparada'),
  ('Postres'),
  ('Bebidas'),
  ('Material escolar'),
  ('Accesorios'),
  ('Otros')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ingredients TEXT NULL,
  image_url VARCHAR(2048) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_products_seller_status (seller_id, is_active),
  KEY ix_products_category (category_id),
  CONSTRAINT fk_products_seller
    FOREIGN KEY (seller_id) REFERENCES seller_profiles (user_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL,
  CONSTRAINT chk_products_price CHECK (price > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_product_images_product (product_id, sort_order),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  tag_type ENUM('allergen', 'diet') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_tags_type_name (tag_type, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_tag_assignments (
  product_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  CONSTRAINT fk_product_tag_assignments_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_tag_assignments_tag
    FOREIGN KEY (tag_id) REFERENCES product_tags (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pickup_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  details VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY ix_pickup_locations_seller (seller_id, is_active),
  CONSTRAINT fk_pickup_locations_seller
    FOREIGN KEY (seller_id) REFERENCES seller_profiles (user_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_pickup_locations (
  product_id BIGINT UNSIGNED NOT NULL,
  pickup_location_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, pickup_location_id),
  CONSTRAINT fk_product_pickup_locations_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_pickup_locations_location
    FOREIGN KEY (pickup_location_id) REFERENCES pickup_locations (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code VARCHAR(24) NOT NULL,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  pickup_location_id BIGINT UNSIGNED NULL,
  pickup_location_snapshot VARCHAR(255) NOT NULL,
  pickup_at DATETIME NULL,
  status ENUM('pending', 'confirmed', 'ready', 'delivered', 'cancelled')
    NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  delivered_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_code (order_code),
  KEY ix_orders_buyer_status_date (buyer_id, status, created_at),
  KEY ix_orders_seller_status_date (seller_id, status, created_at),
  CONSTRAINT fk_orders_buyer
    FOREIGN KEY (buyer_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_orders_seller
    FOREIGN KEY (seller_id) REFERENCES seller_profiles (user_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_orders_pickup_location
    FOREIGN KEY (pickup_location_id) REFERENCES pickup_locations (id)
    ON DELETE SET NULL,
  CONSTRAINT chk_orders_totals CHECK (subtotal >= 0 AND total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name_snapshot VARCHAR(120) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_order_items_order (order_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL,
  CONSTRAINT chk_order_items_values
    CHECK (unit_price >= 0 AND quantity > 0 AND line_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  method ENUM('cash', 'spei', 'transfer', 'other') NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  paid_at DATETIME NULL,
  external_reference VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_order (order_id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_cancellations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  cancelled_by BIGINT UNSIGNED NOT NULL,
  reason_code ENUM(
    'not_on_campus',
    'changed_time_or_location',
    'no_longer_needed',
    'seller_unavailable',
    'other'
  ) NOT NULL,
  details VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_cancellations_order (order_id),
  CONSTRAINT fk_order_cancellations_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_order_cancellations_user
    FOREIGN KEY (cancelled_by) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_passes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  serial_number VARCHAR(120) NOT NULL,
  qr_token_hash CHAR(64) NULL,
  status ENUM('issued', 'revoked') NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_passes_order (order_id),
  UNIQUE KEY uq_wallet_passes_serial (serial_number),
  CONSTRAINT fk_wallet_passes_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_item_id BIGINT UNSIGNED NOT NULL,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(250) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_order_item (order_item_id),
  KEY ix_reviews_seller_date (seller_id, created_at),
  CONSTRAINT fk_reviews_order_item
    FOREIGN KEY (order_item_id) REFERENCES order_items (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_buyer
    FOREIGN KEY (buyer_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_seller
    FOREIGN KEY (seller_id) REFERENCES seller_profiles (user_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;
