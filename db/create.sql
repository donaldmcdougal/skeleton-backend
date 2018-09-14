CREATE DATABASE `testdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;

USE `testdb`;

CREATE TABLE `authority` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`,`name`),
  UNIQUE KEY `idx_authority_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `authority` (name) values ('ROLE_ADMIN'), ('ROLE_USER');

CREATE TABLE `user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `image_url` varchar(256) DEFAULT NULL,
  `activated` bit(1) NOT NULL,
  `lang_key` varchar(6) DEFAULT NULL,
  `activation_key` varchar(20) DEFAULT NULL,
  `reset_key` varchar(20) DEFAULT NULL,
  `reset_date` timestamp NULL DEFAULT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_date` timestamp NOT NULL,
  `last_modified_by` varchar(255) DEFAULT NULL,
  `last_modified_date` timestamp NULL DEFAULT NULL,
  `deleted` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_user_email` (`email`),
  KEY `idx_user_deleted` (`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `user` (password_hash, first_name, last_name, email, activated, created_by, created_date, deleted) VALUES
(sha2('admin', 512), 'Admin', 'User', 'admin@localhost', 1, 'system', current_timestamp, 0);

CREATE TABLE `user_authority` (
  `user_id` bigint(20) NOT NULL,
  `authority_id` bigint(20) NOT NULL,
  PRIMARY KEY (`user_id`,`authority_id`),
  KEY `fk_authority_id` (`authority_id`),
  CONSTRAINT `fk_authority_id` FOREIGN KEY (`authority_id`) REFERENCES `authority` (`id`),
  CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `user_authority` (user_id, authority_id) VALUES
(1, 1),
(1, 2);
