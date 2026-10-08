/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.10-MariaDB, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: iao
-- ------------------------------------------------------
-- Server version	10.11.10-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` varchar(255) NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES
(1,'0001_01_01_000000_create_users_table',1),
(2,'0001_01_01_000001_create_cache_table',1),
(3,'0001_01_01_000002_create_jobs_table',1),
(4,'2026_10_03_000001_create_teams_table',1),
(5,'2026_10_03_000002_create_participants_table',1),
(6,'2026_10_03_000003_add_admin_and_submission',1),
(7,'2026_10_05_075914_create_personal_access_tokens_table',1),
(8,'2026_10_06_000001_team_approval_archive_settings',2),
(9,'2026_10_06_000002_add_team_rejection_details',3);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participants`
--

DROP TABLE IF EXISTS `participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `participants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) unsigned NOT NULL,
  `status` varchar(30) NOT NULL,
  `student_group` varchar(10) DEFAULT NULL,
  `previous_prizewinner` tinyint(1) NOT NULL DEFAULT 0,
  `needs_visa_invitation` tinyint(1) NOT NULL DEFAULT 0,
  `family_name_en` varchar(255) NOT NULL,
  `first_name_en` varchar(255) NOT NULL,
  `family_name_native` varchar(255) NOT NULL,
  `first_name_native` varchar(255) NOT NULL,
  `birth_date` date NOT NULL,
  `birth_place` varchar(255) NOT NULL,
  `sex` varchar(10) NOT NULL,
  `citizenship` varchar(255) NOT NULL,
  `other_citizenships` varchar(255) DEFAULT NULL,
  `ethnicity` varchar(255) DEFAULT NULL,
  `previous_visits_uz` text DEFAULT NULL,
  `passport_number` varchar(255) DEFAULT NULL,
  `passport_issue_date` date DEFAULT NULL,
  `passport_expiry_date` date DEFAULT NULL,
  `passport_issued_by` varchar(255) DEFAULT NULL,
  `passport_scan_path` varchar(255) DEFAULT NULL,
  `face_photo_path` varchar(255) DEFAULT NULL,
  `position` varchar(255) NOT NULL,
  `org_name` varchar(255) NOT NULL,
  `org_location` varchar(255) NOT NULL,
  `org_address` varchar(255) DEFAULT NULL,
  `org_contacts` varchar(255) DEFAULT NULL,
  `graduation_date` varchar(255) DEFAULT NULL,
  `previous_olympiads` text DEFAULT NULL,
  `home_location` varchar(255) NOT NULL,
  `home_address` varchar(255) NOT NULL,
  `home_phone` varchar(255) DEFAULT NULL,
  `mobile_phone` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `official_language` varchar(20) NOT NULL,
  `native_languages` varchar(255) NOT NULL,
  `diet` varchar(20) NOT NULL DEFAULT 'standard',
  `food_notes` text DEFAULT NULL,
  `medical_notes` text DEFAULT NULL,
  `tshirt_size` varchar(5) DEFAULT NULL,
  `emergency_family_name` varchar(255) NOT NULL,
  `emergency_first_name` varchar(255) NOT NULL,
  `emergency_relation` varchar(255) NOT NULL,
  `emergency_age` tinyint(3) unsigned DEFAULT NULL,
  `emergency_languages` varchar(255) DEFAULT NULL,
  `emergency_phones` varchar(255) NOT NULL,
  `emergency_email` varchar(255) DEFAULT NULL,
  `emergency_telegram` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `participants_passport_number_unique` (`passport_number`),
  KEY `participants_team_id_foreign` (`team_id`),
  KEY `participants_status_index` (`status`),
  CONSTRAINT `participants_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participants`
--

LOCK TABLES `participants` WRITE;
/*!40000 ALTER TABLE `participants` DISABLE KEYS */;
INSERT INTO `participants` VALUES
(1,5,'team_leader_jury',NULL,0,0,'Smith','Jonathan','Smith','Jonathan','1980-03-12','Sydney, Australia','male','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Teacher','Sydney Grammar School','Sydney, Australia',NULL,NULL,NULL,NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.leader@example.com','english','English','standard',NULL,NULL,'L','Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:29:26','2026-10-06 01:29:26'),
(2,5,'observer',NULL,0,1,'Brown','Emily','Brown','Emily','1990-07-21','Melbourne, Australia','female','Australian',NULL,NULL,NULL,'PA1234567','2022-05-10','2032-05-09','Department of Foreign Affairs','participants/5/2/Pas-brown.jpg','participants/5/2/Face-brown.jpg','Teacher','Melbourne High School','Melbourne, Australia','Forrest Hill, South Yarra VIC 3141, Australia','+61 3 0000 0000, office@example.com',NULL,NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 003','test.observer@example.com','english','English','standard',NULL,NULL,'M','Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:30:06','2026-10-06 01:30:06'),
(3,5,'student','beta',0,0,'Wilson','Olivia','Wilson','Olivia','2009-03-10','Sydney, Australia','female','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030',NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.student1@example.com','english','English','standard',NULL,NULL,NULL,'Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:30:31','2026-10-06 01:30:31'),
(4,5,'student','alpha',0,0,'Taylor','Liam','Taylor','Liam','2012-02-02','Sydney, Australia','male','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030',NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.student2@example.com','english','English','standard',NULL,NULL,NULL,'Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:30:47','2026-10-06 01:30:47'),
(5,5,'student','alpha',0,0,'Clark','Sophie','Clark','Sophie','2011-09-14','Perth, Australia','female','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030',NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.student3@example.com','english','English','standard',NULL,NULL,NULL,'Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:30:49','2026-10-06 01:30:49'),
(6,5,'student','gamma',1,0,'Evans','Noah','Evans','Noah','2008-11-05','Brisbane, Australia','male','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030','IAO-2025: Diploma II','Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.student4@example.com','english','English','avoid_pork','No pork, please','Peanut allergy; carries an EpiPen','XXL','Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:30:52','2026-10-06 01:31:15'),
(7,5,'student','alpha',0,0,'Hall','Ethan','Hall','Ethan','2012-04-04','Adelaide, Australia','male','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030',NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.hall@example.com','english','English','standard',NULL,NULL,NULL,'Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:31:43','2026-10-06 01:31:43'),
(8,5,'student','alpha',0,0,'King','Grace','King','Grace','2011-12-01','Adelaide, Australia','female','Australian',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Student','Sydney Grammar School','Sydney, Australia',NULL,NULL,'June 2030',NULL,'Sydney, Australia','1 Test Street, Sydney',NULL,'+61 400 000 001','test.king@example.com','english','English','standard',NULL,NULL,NULL,'Smith','Mary','wife',NULL,NULL,'+61 400 000 002',NULL,NULL,'2026-10-06 01:31:45','2026-10-06 01:31:45');
/*!40000 ALTER TABLE `participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES
(2,'App\\Models\\User',1,'api','a1e7fd871584077ff0da3d201a037a8b25d22ea16644554097a06a930ba1c2c9','[\"*\"]','2026-10-05 03:15:02',NULL,'2026-10-05 03:15:01','2026-10-05 03:15:02'),
(12,'App\\Models\\User',5,'api','a153c59f7d2bf4446c2dc9837898b3e36545e737037606e2a2e3f183e9bbe6b7','[\"*\"]','2026-10-06 01:25:29',NULL,'2026-10-05 07:08:17','2026-10-06 01:25:29'),
(13,'App\\Models\\User',1,'api','3dd987e9a9b5ed27cad232d36ca7a2299e5693fe078fab29e79561962fb45991','[\"*\"]','2026-10-06 01:43:54',NULL,'2026-10-06 01:25:48','2026-10-06 01:43:54'),
(14,'App\\Models\\User',5,'api','9096044d974e87c52f435a54e01a77129ecfbd6016a8e2681e7477be795a14e7','[\"*\"]','2026-10-06 01:42:57',NULL,'2026-10-06 01:26:41','2026-10-06 01:42:57'),
(15,'App\\Models\\User',5,'api','b3da10e9267d2d26adfb9493ac9e6b81e5b585b15246ceb8dcba3e51a1a631f8','[\"*\"]','2026-10-06 01:44:43',NULL,'2026-10-06 01:28:26','2026-10-06 01:44:43');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES
('2k849KKZw5bif0SHadiwFNFQnGcYWJ4pEQmHaFje',NULL,'152.163.120.195','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJFaWxDTEphVHlLRDdhNUI1aWRPZ1YwZUZneTAwZFF1SEI4YUllNHc0IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791193251),
('2phNiwoW6iyGwPEMAOfAWmkYlUSEziChzu8nbvMN',NULL,'104.253.228.232','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJIQkFiZ09qY1NwN2lJSGtVSXlhcE02WnliWG0yVld2TTh0ZTIwVXdTIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791193282),
('3LtL7ZKftnzQg1AgN6ZkaoBHvEd7ENoSxBqNtzsh',NULL,'192.175.111.241','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJCT3lrYzEydUxaeXZsSTJsaDhxa0R3MHZJeEQ2SWF2YjM2ZjBzTGxOIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791189461),
('3PNLrsPJGGTu1LVQk8rKW3owVvZnJpU0Q3RSfSCJ',NULL,'192.175.111.253','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJHeUFqMVdmUW9hblpoWE9HVGNHbXBaTXVlN0NLM0c1NkJQdTM2dU00IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791189470),
('5rFWeje8WuBF5VGWumru9vCFZB9Q8iC3mEFdiu66',NULL,'103.196.9.41','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJhV1RYdXQxdVJKQUl1b1U2a2FFVkNraXZuWFN1ajlnbjU2SWJPbHlMIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791188764),
('6A1Tfxgdd7CAlbyKmBjSMRe31WltAK1BbuUzENGC',NULL,'34.59.132.35','Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36','eyJfdG9rZW4iOiJGczBDRXFQcGlseVYyZkVFSHdIWUdLbGpVUjdaWXE5Rlc0OWFXb2toIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791195290),
('8FOeQrT5uupNM8qzJKqDyn10s9dxTT91ZkE7tYrK',NULL,'194.163.188.41','curl/8.5.0','eyJfdG9rZW4iOiJkdndDNDFqcnhTYlpwdDhvUUJUNHpabWtEbFlKbUFieGtpbHlpeFJmIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6XC9lbWFpbC12ZXJpZmllZCIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791191496),
('EGFFin65Jfo9ar6vvYKxaV8uwDa6YZ8KnbbeaFhM',NULL,'32.186.121.12','Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJ3MFNQVXhDZzVzNkszMG1tbmFoRHB6THVudzZEOE1OVHMyNDhxaUdkIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791191566),
('ePWzzT95UD4RPnXyylgZDmSQdoVXY8tSJKtoR0mt',NULL,'54.245.65.253','Mozilla/5.0 (Linux; Android 16; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.8037.97 Mobile Safari/537.36','eyJfdG9rZW4iOiJ3MmhJQU44NFN5V2dJeUllVjd2UTVtbHE3dVdkWnZPSUxnaEgxWTVkIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791192143),
('eybwUXrOdW4SJUmJBzVXgq7q8pE369KRL51iHW9j',NULL,'192.175.111.241','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJuNko2cVBvZHlodndOZ2o0bEhBUldiSk1EQ2EyTkREdG5KcklXaDBxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791189470),
('GIVm0CkDkDyTnKIKNuOrrO9E3DGkb458uBE3tkMF',NULL,'144.124.199.236','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJ1bVRRZnRkZWluZVRiTlNNcks0TTE2eXR3SzJ5Z0xDTmJVYXNtWXBTIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6XC9lbWFpbC12ZXJpZmllZCIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791191511),
('H4pWNASaW9X67nwb5mNYxJcxyHpxLUrb6Upvqsr4',NULL,'104.164.126.10','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJXN3FlcXhxR0RCbUVaUnlLck1rTGllOGs0QmppZlhGRWdneHVpdXlOIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791188778),
('ITjbtyQQQbSPGBLDSLzTMIF93bADVaF3l2WiyDJj',NULL,'192.175.111.233','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJOWjFCTERVa2dXYm9YN3FESFNrQ0ZBbmppcVlNTlhwclJjWDQ1T0NUIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791189469),
('jkqEBL7ORze7MYx7tu3vygdf9d7mGm5rLLtEO3ac',NULL,'193.47.62.167','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36','eyJfdG9rZW4iOiI3QjZtTG1pR291TWd6NlZER3FzQUdNT3pjM3dJdFlJSjVTTXRpU3JHIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791188725),
('JroYJpG3dAKajabDg8sAu3fH2fVFplkXHH2QGDZD',NULL,'45.76.192.182','Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1','eyJfdG9rZW4iOiIwdWtQMzFRZVl5NWJ3Y2xiY2JQbUZtZVZNVTEzTmJaOWdxY001MlZHIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791192850),
('kdooQ37KlDI4xY02K0Gjv67vuRmGtOMcsoIBExHu',NULL,'144.124.199.236','curl/8.21.0','eyJfdG9rZW4iOiJ1S2cxaDFSQXN4eEEwSGd3dWFtZkdCcUVhbXBIMXBScm51T3BLSzZvIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791197539),
('kRVcGUIzxBVidS72xLlmxhZwxATwzYg7N9NyiHlM',NULL,'144.124.199.236','curl/8.21.0','eyJfdG9rZW4iOiJqblZEOHozVlZsT0Rmc1duQkxhYkpXM0wzd0Y3VWd2UFlDNlF6UTdzIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6XC9lbWFpbC12ZXJpZmllZCIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791197542),
('M1KWxHvrmFyOYU76FmgJ1oOLUHQB1vWjuIXf3DQt',NULL,'104.164.126.10','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJiYUJYZnlicnpoYnpoNGZ6Y3hINmNMSzQzRnNGU1kya2pVdnFpVEtxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791188760),
('MpgggZJzDG6rSpPu7FQiJ4gXmSqfq1m4wHxFgUFV',NULL,'192.175.111.231','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','eyJfdG9rZW4iOiI0M0FKVTg0Vk5XeDlLRnpwN3oyMDVEMUg1aUZCUWRFTlZRb00zaGJNIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791189460),
('NojfmfLr1kUC2mnBly0VSAtP9Db5tU3ZBjIj0mef',NULL,'81.171.74.60','Go-http-client/1.1','eyJfdG9rZW4iOiJYNDRtWUMybkxLNWxOZVllSUc5OVFnUk5BajBjRTlVTXdJWkE2ZXFJIiwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791192272),
('NzJq7GQPhiRehKgi0u3ZVjOtQ1Kg11cvxLCs6Ljo',NULL,'144.124.199.236','curl/8.21.0','eyJfdG9rZW4iOiI0dDFIeEVXMnZsUjE4dmRveFRMdE95QU5sWVZMY0NaaXV3N3c4RlNDIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791191633),
('pLASFWuHYKJDYTRfB7DirnRouf8CRbpqvpI87Avh',NULL,'81.171.74.60','Go-http-client/1.1','eyJfdG9rZW4iOiJJdmVKS1NaUVNvOFlpTFIyQjZpVnNiNVFUTG9NOTl6UDZ6Uk5VclRsIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791192272),
('sl9vBaspYon5W7UKDyDoKL4SAUEeKkjdKY64EH8n',NULL,'144.124.199.236','curl/8.21.0','eyJfdG9rZW4iOiJTdkJpdlRpVFBRTUZqbU11akNOMUROeUh1Y1JvN0FDZzlTQTEwV2xkIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6XC9wdWJsaWNcL2luZGV4LnBocCIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791197642),
('VBM4LsZQPum9nX3Yg62hz59vXsZMEqw329WWuLqn',NULL,'54.245.65.253','Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.8037.97 Safari/537.36','eyJfdG9rZW4iOiIwcGV5cTBWczN5WkhBRWZrMkswR0V3R0dwVFhqUjVyQzNhdjZyT2lCIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791192134),
('VV1PGLMCec87uVhD7sR87ng7tx12b32Lrq1iT59J',NULL,'193.47.62.167','Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15','eyJfdG9rZW4iOiJNdzdPRFB4NUFuVkc5UGRRdE4xWXo5enQ5YUpZMml4Nm9rQWxTSTRSIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHBzOlwvXC9yZWdpc3Rlci5lYXN5cG9zLnV6Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791188706),
('XSVeWvLwom75dJz3pf91o14Y03TgYK96ypSPlRxK',NULL,'32.186.121.12','Mozilla/5.0 (Linux; Android 16; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36','eyJfdG9rZW4iOiI5U2RoaVhCMjBBT1hKaHozMTdOZlBXNUcxTE1mVUMya25qdnBIejN4IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL3JlZ2lzdGVyLmVhc3lwb3MudXoiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=',1791191566);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `key` varchar(100) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `country` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `rejection` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rejection`)),
  `submitted_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teams_status_index` (`status`),
  KEY `teams_archived_at_index` (`archived_at`),
  KEY `teams_user_id_index` (`user_id`),
  KEY `teams_country_index` (`country`),
  CONSTRAINT `teams_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES
(5,5,'Australia','approved','2026-10-05 07:00:59',NULL,NULL,NULL,'2026-10-06 01:43:42',NULL,'2026-10-05 06:59:13','2026-10-06 01:43:42');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'Test User','izzatulloh650@gmail.com',NULL,'2026-10-05 03:14:47','$2y$12$YD9KTy96tB0iQTiTJtK3SuHk45UehQXU..PZBn3o1XZ7xOfMRsOES',1,NULL,'2026-10-05 03:11:50','2026-10-05 03:14:47'),
(5,'Phille Foden','ibrohimobidov603@gmail.com','+998940758800','2026-10-05 07:00:59','$2y$12$noQwJSu1orsbCJ9qWIy5SO8DrbPqT2dtIkMveohBHFQRXUzgyelDO',0,NULL,'2026-10-05 06:59:13','2026-10-05 07:00:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-06 12:02:16
