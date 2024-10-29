-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 29, 2024 at 03:11 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `web1`
--

-- --------------------------------------------------------

--
-- Table structure for table `aset`
--

CREATE TABLE `aset` (
  `id` int(11) NOT NULL,
  `foto` varchar(255) NOT NULL,
  `catatan` text DEFAULT NULL,
  `tanggal_dibuat` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_user` int(11) DEFAULT NULL,
  `id_tipe_aset` int(11) DEFAULT NULL,
  `id_tipe_lantai` int(11) DEFAULT NULL,
  `id_kondisi` int(11) DEFAULT NULL,
  `id_tipe_hb` int(11) DEFAULT NULL,
  `id_tipe_door` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `aset`
--

INSERT INTO `aset` (`id`, `foto`, `catatan`, `tanggal_dibuat`, `id_user`, `id_tipe_aset`, `id_tipe_lantai`, `id_kondisi`, `id_tipe_hb`, `id_tipe_door`) VALUES
(1, 'uploads/resized-1730112074798-17301120500267298196745185680570.jpg', 'Good', '2024-10-28 10:41:14', 14, 43, 7, 1, NULL, NULL),
(2, 'uploads/resized-1730112298908-17301122713304078177572206598167.jpg', '', '2024-10-28 10:44:58', 14, 41, 7, 1, NULL, NULL),
(3, 'uploads/resized-1730112494091-17301124754884935267073815505828.jpg', '', '2024-10-28 10:48:14', 14, 87, 3, 2, NULL, NULL),
(4, 'uploads/resized-1730112571127-17301125553773798209714229890525.jpg', 'Gg', '2024-10-28 10:49:31', 14, 42, 7, 1, NULL, NULL),
(5, 'uploads/resized-1730112617903-17301125991066194655033233527614.jpg', 'Skks', '2024-10-28 10:50:17', 14, 41, 7, 1, NULL, NULL),
(6, 'uploads/resized-1730113143758-Untitled.png', '', '2024-10-28 10:59:03', 14, NULL, 19, 1, 87, NULL),
(7, 'uploads/resized-1730114369747-17301143501332301559087943251213.jpg', 'hei', '2024-10-28 11:19:29', 14, 24, 9, 1, NULL, NULL),
(8, 'uploads/resized-1730114735302-17301147205193114894521367418456.jpg', '', '2024-10-28 11:25:35', 14, 52, 6, 1, NULL, NULL),
(9, 'uploads/resized-1730115634295-1_APD-WIFI-LG_Signal_Strength.png', '', '2024-10-28 11:40:34', 14, NULL, 19, 1, 87, NULL),
(10, 'uploads/resized-1730118995422-1730118985673124617523155141255.jpg', '', '2024-10-28 12:36:35', 14, 51, 6, 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `posisi`
--

CREATE TABLE `posisi` (
  `id` int(11) NOT NULL,
  `tipe_posisi` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `posisi`
--

INSERT INTO `posisi` (`id`, `tipe_posisi`) VALUES
(1, 'indoor'),
(2, 'outdoor');

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`role_id`, `role_name`) VALUES
(1, 'admin'),
(2, 'petugas');

-- --------------------------------------------------------

--
-- Table structure for table `tipe_aset`
--

CREATE TABLE `tipe_aset` (
  `id` int(11) NOT NULL,
  `nama_tipe` varchar(255) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `lantai_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipe_aset`
--

INSERT INTO `tipe_aset` (`id`, `nama_tipe`, `deskripsi`, `lantai_id`) VALUES
(1, 'PROMOTION BOX Lt. 3A', NULL, 11),
(2, 'BENCH MARMER Lt. 3A', NULL, 11),
(3, 'BENCH COMBINE Lt. 3A', NULL, 11),
(4, 'LONG BENCH Lt. 3A', NULL, 11),
(5, 'SHORT BENCH Lt. 3A', NULL, 11),
(6, 'LIGHTBOX Lt. 3A', NULL, 11),
(7, 'STANDING TV Lt. 3A', NULL, 11),
(8, 'WALL TV Lt. 3A', NULL, 11),
(9, 'BARRIER GATE Lt. 3A', NULL, 11),
(10, 'STANDING PROMOTION Lt. 3A', NULL, 11),
(11, 'HANGING SIGN 01 Lt. 3A', NULL, 11),
(12, 'HANGING SIGN 02 Lt. 3A', NULL, 11),
(13, 'STANDING PROMOTION Lt. 3', NULL, 10),
(14, 'LIGHTBOX Lt. 3', NULL, 10),
(15, 'PROMOTION BOX Lt. 3', NULL, 10),
(16, 'SHORT BENCH Lt. 3', NULL, 10),
(17, 'WALL TV Lt. 3', NULL, 10),
(18, 'STANDING TV Lt. 3', NULL, 10),
(19, 'HANGING SIGN 01 Lt. 3', NULL, 10),
(20, 'HANGING SIGN 02 Lt. 3', NULL, 10),
(21, 'STANDING PROMOTION Lt. 2', NULL, 9),
(22, 'SHORT BENCH Lt. 2', NULL, 9),
(23, 'WALL TV Lt. 2', NULL, 9),
(24, 'LIGHTBOX Lt. 2', NULL, 9),
(25, 'STANDING TV Lt. 2', NULL, 9),
(26, 'HANGING SIGN 01 Lt. 2', NULL, 9),
(27, 'HANGING SIGN 02 Lt. 2', NULL, 9),
(28, 'SHORT BENCH Lt. 1', NULL, 8),
(29, 'STANDING PROMOTION Lt. 1', NULL, 8),
(30, 'LIGHTBOX Lt. 1', NULL, 8),
(31, 'WALL TV Lt. 1', NULL, 8),
(32, 'STANDING TV Lt. 1', NULL, 8),
(33, 'PROMOTION BOX Lt. 1', NULL, 8),
(34, 'HANGING SIGN 01 Lt. 1', NULL, 8),
(35, 'HANGING SIGN 02 Lt. 1', NULL, 8),
(36, 'STANDING PROMOTION Lt. UG', NULL, 7),
(37, 'SHORT BENCH Lt. UG', NULL, 7),
(38, 'BENCH COMBINE Lt. UG', NULL, 7),
(39, 'LONG BENCH Lt. UG', NULL, 7),
(40, 'BENCH MARMER Lt. UG', NULL, 7),
(41, 'PROMOTION BOX Lt. UG', NULL, 7),
(42, 'WALL TV Lt. UG', NULL, 7),
(43, 'LIGHTBOX Lt. UG', NULL, 7),
(44, 'STANDING TV Lt. UG', NULL, 7),
(45, 'HANGING SIGN 01 Lt. UG', NULL, 7),
(46, 'HANGING SIGN 02 Lt. UG', NULL, 7),
(47, 'BENCH MARMER Lt. GF', NULL, 6),
(48, 'STANDING PROMOTION Lt. GF', NULL, 6),
(49, 'WORK ON PROGRESS Lt. GF', NULL, 6),
(50, 'LIGHTBOX Lt. GF', NULL, 6),
(51, 'BARIER Lt. GF', NULL, 6),
(52, 'PROMOTION BOX Lt. GF', NULL, 6),
(53, 'PARKIR SEPEDA Lt. GF', NULL, 6),
(54, 'NEW SHORT BENCH Lt. GF', NULL, 6),
(55, 'STANDING TV Lt. GF', NULL, 6),
(56, 'KURSI ROTAN SINTETIS Lt. GF', NULL, 6),
(57, 'PAYUNG TEDUH Lt. GF', NULL, 6),
(58, 'BARRIER OUTDOOR Lt. GF', NULL, 6),
(59, 'WALL TV Lt. GF', NULL, 6),
(60, 'HANGING SIGN 01 Lt. GF', NULL, 6),
(61, 'HANGING SIGN 02 Lt. GF', NULL, 6),
(62, 'SHORT BENCH Lt. LM', NULL, 5),
(63, 'STANDING PROMOTION Lt. LM', NULL, 5),
(64, 'LONG BENCH Lt. LM', NULL, 5),
(65, 'COMBINE BENCH Lt. LM', NULL, 5),
(66, 'PROMOTION BOX Lt. LM', NULL, 5),
(67, 'BARIER Lt. LM', NULL, 5),
(68, 'MOVEABLE SIGNAGE Lt. LM', NULL, 5),
(69, 'MOVEABLE SIGNAGE Lt. LM', NULL, 5),
(70, 'STANDING TV Lt. LM', NULL, 5),
(71, 'PILAR TV Lt. LM', NULL, 5),
(72, 'WALL TV Lt. LM', NULL, 5),
(73, 'HANGING SIGN 01 Lt. LM', NULL, 5),
(74, 'HANGING SIGN 02 Lt. LM', NULL, 5),
(75, 'SHORT BENCH Lt. LG', NULL, 4),
(76, 'BENCH COMBINE Lt. LG', NULL, 4),
(77, 'BENCH MARMER Lt. LG', NULL, 4),
(78, 'LONG BENCH Lt. LG', NULL, 4),
(79, 'STANDING PROMOTION Lt. LG', NULL, 4),
(80, 'PROMOTION BOX Lt. LG', NULL, 4),
(81, 'STANDING TV Lt. LG', NULL, 4),
(82, 'WALL TV Lt. LG', NULL, 4),
(83, 'PILAR TV Lt. LG', NULL, 4),
(84, 'HANGING SIGN 01 Lt. LG', NULL, 4),
(85, 'BARRIER Lt. LG', NULL, 4),
(86, 'HANGING SIGN 02 Lt. LG', NULL, 4),
(87, 'BARIER Lt. B', NULL, 3),
(88, 'STANDING PROMOTION Lt. B', NULL, 3),
(89, 'STANDING TV Lt. B', NULL, 3);

-- --------------------------------------------------------

--
-- Table structure for table `tipe_door`
--

CREATE TABLE `tipe_door` (
  `nama_tipe` varchar(255) DEFAULT NULL,
  `posisi` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `lantai_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipe_door`
--

INSERT INTO `tipe_door` (`nama_tipe`, `posisi`, `id`, `lantai_id`) VALUES
('EMERGENCY EXIT. 3A.1-R', 1, 1, 11),
('EMERGENCY EXIT. 3A.13-R', 1, 2, 11),
('EMERGENCY EXIT. 3A.14-R', 1, 3, 11),
('EMERGENCY EXIT. 3A.2-R', 1, 4, 11),
('EMERGENCY EXIT. 3A.5', 1, 5, 11),
('EMERGENCY EXIT. 3A.7-R', 1, 6, 11),
('EMERGENCY EXIT. 3.1-R', 1, 7, 10),
('EMERGENCY EXIT. 3.13-R', 1, 8, 10),
('EMERGENCY EXIT. 3.14-R', 1, 9, 10),
('EMERGENCY EXIT. 3.2-R', 1, 10, 10),
('EMERGENCY EXIT. 3.5', 1, 11, 10),
('EMERGENCY EXIT. 3.7-R', 1, 12, 10),
('EMERGENCY EXIT. 2.1-R', 1, 13, 9),
('EMERGENCY EXIT. 2.13-R', 1, 14, 9),
('EMERGENCY EXIT. 2.14-R', 1, 15, 9),
('EMERGENCY EXIT. 2.2-R', 1, 16, 9),
('EMERGENCY EXIT. 2.5', 1, 17, 9),
('EMERGENCY EXIT. 2.7-R', 1, 18, 9),
('EMERGENCY EXIT. 1.1-R', 1, 19, 8),
('EMERGENCY EXIT. 1.13-R', 1, 20, 8),
('EMERGENCY EXIT. 1.14-R', 1, 21, 8),
('EMERGENCY EXIT. 1.2-R', 1, 22, 8),
('EMERGENCY EXIT. 1.5', 1, 23, 8),
('EMERGENCY EXIT. 1.7-R', 1, 24, 8),
('EMERGENCY EXIT. UG.1-R', 1, 25, 7),
('EMERGENCY EXIT. UG.13-R', 1, 26, 7),
('EMERGENCY EXIT. UG.14-R', 1, 27, 7),
('EMERGENCY EXIT. UG.2-R', 1, 28, 7),
('EMERGENCY EXIT. UG.5', 1, 29, 7),
('EMERGENCY EXIT. UG.7-R', 1, 30, 7),
('EMERGENCY EXIT. G.1-R', 1, 31, 6),
('EMERGENCY EXIT. G.13-R', 1, 32, 6),
('EMERGENCY EXIT. G.14-R', 1, 33, 6),
('EMERGENCY EXIT. G.2-R', 1, 34, 6),
('EMERGENCY EXIT. G.5', 1, 35, 6),
('EMERGENCY EXIT. G.7-R', 1, 36, 6),
('EMERGENCY EXIT. LM.1-R', 1, 37, 5),
('EMERGENCY EXIT. LM.13-R', 1, 38, 5),
('EMERGENCY EXIT. LM.14-R', 1, 39, 5),
('EMERGENCY EXIT. LM.2-R', 1, 40, 5),
('EMERGENCY EXIT. LM.5', 1, 41, 5),
('EMERGENCY EXIT. LM.7-R', 1, 42, 5),
('EMERGENCY EXIT. LG.1-R', 1, 43, 4),
('EMERGENCY EXIT. LG.13-R', 1, 44, 4),
('EMERGENCY EXIT. LG.14-R', 1, 45, 4),
('EMERGENCY EXIT. LG.2-R', 1, 46, 4),
('EMERGENCY EXIT. LG.5', 1, 47, 4),
('EMERGENCY EXIT. LG.7-R', 1, 48, 4),
('EMERGENCY EXIT. P8.4 NORTH', 2, 49, 21),
('EMERGENCY EXIT. P8.6 WEST', 2, 50, 21),
('EMERGENCY EXIT. P7.4 NORTH', 2, 51, 23),
('EMERGENCY EXIT. P7.6 WEST', 2, 52, 23),
('EMERGENCY EXIT. P6.2 EAST', 2, 53, 25),
('EMERGENCY EXIT. P6.4 NORTH', 2, 54, 25),
('EMERGENCY EXIT. P6.6 WEST', 2, 55, 25),
('EMERGENCY EXIT. P5.2 EAST', 2, 56, 27),
('EMERGENCY EXIT. P5.4 NORTH', 2, 57, 27),
('EMERGENCY EXIT. P5.6 WEST', 2, 58, 27),
('EMERGENCY EXIT. P4.2 EAST', 2, 59, 29),
('EMERGENCY EXIT. P4.4 NORTH', 2, 60, 29),
('EMERGENCY EXIT. P4.6 WEST', 2, 61, 29),
('EMERGENCY EXIT. LM2.2 EAST MOBIL', 2, 62, 37),
('EMERGENCY EXIT. LM2.2 WEST MOBIL', 2, 63, 37),
('EMERGENCY EXIT. LM2.4 NORTH MOBIL', 2, 64, 37),
('EMERGENCY EXIT. LM1.2 EAST', 2, 65, 36),
('EMERGENCY EXIT. LM1.4 NORTH', 2, 66, 36),
('EMERGENCY EXIT. LM1.6 NORTH', 2, 67, 36),
('EMERGENCY EXIT. LM1.2 WEST', 2, 68, 36),
('EMERGENCY EXIT. P3. WEST', 2, 69, 31),
('EMERGENCY EXIT. P3. NORTH', 2, 70, 31),
('EMERGENCY EXIT. P3. EAST', 2, 71, 31),
('EMERGENCY EXIT. P2. WEST', 2, 72, 33),
('EMERGENCY EXIT. P2. NORTH', 2, 73, 33),
('EMERGENCY EXIT. P2. EAST', 2, 74, 33),
('EMERGENCY EXIT. LG.19.R EAST', 2, 75, 4),
('EMERGENCY EXIT. LG.10. EAST', 2, 76, 4),
('EMERGENCY EXIT. LG.6 NORTH', 2, 77, 4),
('EMERGENCY EXIT. LG.9 NORTH', 2, 78, 4),
('EMERGENCY EXIT. LG.8 NORTH', 2, 79, 4),
('EMERGENCY EXIT. LG.12 WEST', 2, 80, 4),
('EMERGENCY EXIT. LG.24.R', 2, 81, 4),
('EMERGENCY EXIT. LG.21.R', 2, 82, 4),
('EMERGENCY EXIT. B.3 EAST', 2, 83, 3),
('EMERGENCY EXIT. B.2 EAST', 2, 84, 3),
('EMERGENCY EXIT. B.4 EAST', 2, 85, 3),
('EMERGENCY EXIT. P.B.2 EAST', 2, 86, 3),
('EMERGENCY EXIT. B.7 NORTH', 2, 87, 3),
('EMERGENCY EXIT. B.5 WEST', 2, 88, 3),
('EMERGENCY EXIT. B.10 EAST', 2, 89, 3),
('EMERGENCY EXIT. B.13 WEST', 2, 90, 3),
('EMERGENCY EXIT. B.9 NORTH', 2, 91, 3),
('EMERGENCY EXIT. B. L. EAST', 2, 92, 3),
('EMERGENCY EXIT. P.B.6 WEST', 2, 93, 3),
('EXIT EMERGENCY. MO. 6. 9', 1, 94, 39),
('EXIT EMERGENCY. MO. 6. 8', 1, 95, 39);

-- --------------------------------------------------------

--
-- Table structure for table `tipe_hb`
--

CREATE TABLE `tipe_hb` (
  `nama_tipe` varchar(255) DEFAULT NULL,
  `posisi` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `lantai_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipe_hb`
--

INSERT INTO `tipe_hb` (`nama_tipe`, `posisi`, `id`, `lantai_id`) VALUES
('IHB 3A - 3', 1, 1, 11),
('IHB 3A - 4', 1, 2, 11),
('IHB 3A - 5', 1, 3, 11),
('IHB 3A - 6', 1, 4, 11),
('IHB 3A - 8', 1, 5, 11),
('IHB 3A - 9', 1, 6, 11),
('IHB 3A - 10', 1, 7, 11),
('IHB 3A - 12', 1, 8, 11),
('IHB 3 - 3', 1, 9, 10),
('IHB 3 - 4', 1, 10, 10),
('IHB 3 - 5', 1, 11, 10),
('IHB 3 - 6', 1, 12, 10),
('IHB 3 - 7', 1, 13, 10),
('IHB 3 - 8', 1, 14, 10),
('IHB 2 - 1', 1, 15, 9),
('IHB 2 - 3', 1, 16, 9),
('IHB 2 - 4', 1, 17, 9),
('IHB 2 - 5', 1, 18, 9),
('IHB 2 - 6', 1, 19, 9),
('IHB 2 - 7', 1, 20, 9),
('IHB 2 - 8', 1, 21, 9),
('IHB 2 - 9', 1, 22, 9),
('IHB 2 - 10', 1, 23, 9),
('IHB 2 - 12', 1, 24, 9),
('IHB 1-1', 1, 25, 8),
('IHB 1-2', 1, 26, 8),
('IHB 1-6', 1, 27, 8),
('IHB 1-7', 1, 28, 8),
('IHB 1-8', 1, 29, 8),
('IHB 1-9', 1, 30, 8),
('IHB 1-10', 1, 31, 8),
('IHB 1-11', 1, 32, 8),
('IHB UG- 3', 1, 33, 7),
('IHB UG- 4', 1, 34, 7),
('IHB UG- 5', 1, 35, 7),
('IHB UG- 6', 1, 36, 7),
('IHB UG- 7', 1, 37, 7),
('IHB UG- 8', 1, 38, 7),
('IHB UG- 9', 1, 39, 7),
('IHB UG- 10', 1, 40, 7),
('IHB UG- 11', 1, 41, 7),
('IHB UG- 12', 1, 42, 7),
('IHB UG- 13', 1, 43, 7),
('IHB UG- 14', 1, 44, 7),
('IHB G-1', 1, 45, 6),
('IHB G-3', 1, 46, 6),
('IHB G-4', 1, 47, 6),
('IHB G-5', 1, 48, 6),
('IHB G-6', 1, 49, 6),
('IHB G-7', 1, 50, 6),
('IHB G-9', 1, 51, 6),
('IHB G-10', 1, 52, 6),
('IHB G-12', 1, 53, 6),
('IHB G-14', 1, 54, 6),
('IHB G-16', 1, 55, 6),
('IHB LM-2', 1, 56, 5),
('IHB LM-3', 1, 57, 5),
('IHB LM-4', 1, 58, 5),
('IHB LM-5', 1, 59, 5),
('IHB LM-6', 1, 60, 5),
('IHB LM-7', 1, 61, 5),
('IHB LM-9', 1, 62, 5),
('IHB LM-10', 1, 63, 5),
('IHB LM-12', 1, 64, 5),
('IHB LG - 6', 1, 65, 4),
('IHB LG - 7', 1, 66, 4),
('IHB LG - 8', 1, 67, 4),
('IHB LG - 9', 1, 68, 4),
('IHB LG - 10', 1, 69, 4),
('IHB LG - 11', 1, 70, 4),
('IHB LG - 12', 1, 71, 4),
('IHB LG - 13', 1, 72, 4),
('IHB LG - 14', 1, 73, 4),
('IHB LG - 15', 1, 74, 4),
('OHB P6A - 01', 2, 75, 24),
('OHB P6A - 02', 2, 76, 24),
('OHB P7 - 01', 2, 77, 23),
('OHB P7 - 02', 2, 78, 23),
('OHB P7 - 03', 2, 79, 23),
('OHB P7A - 01', 2, 80, 22),
('OHB P7A - 02', 2, 81, 22),
('OHB P8 - 01', 2, 82, 21),
('OHB P8 - 02', 2, 83, 21),
('OHB P8 - 03', 2, 84, 21),
('OHB P8A - 01', 2, 85, 20),
('OHB P8A - 02', 2, 86, 20),
('OHB P9 - 01', 2, 87, 19),
('OHB P9 - 02', 2, 88, 19),
('OHB P9 - 03', 2, 89, 19),
('OHB P4 - 01', 2, 90, 29),
('OHB P4 - 02', 2, 91, 29),
('OHB P4 - 03', 2, 92, 29),
('OHB P4 - 04', 2, 93, 29),
('OHB P4 - 05', 2, 94, 28),
('OHB P4A - 01', 2, 95, 28),
('OHB P4A - 02', 2, 96, 28),
('OHB P5 - 01', 2, 97, 27),
('OHB P5 - 02', 2, 98, 27),
('OHB P5 - 03', 2, 99, 27),
('OHB P5 - 04', 2, 100, 27),
('OHB P5 - 05', 2, 101, 27),
('OHB P5A - 01', 2, 102, 26),
('OHB P5A - 02', 2, 103, 26),
('OHB P6 - 01', 2, 104, 25),
('OHB P6 - 02', 2, 105, 25),
('OHB P6 - 03', 2, 106, 25),
('OHB P6 - 04', 2, 107, 25),
('OHB P6 - 05', 2, 108, 25),
('OHB P1A - 01', 2, 109, 34),
('OHB P1A - 02', 2, 110, 34),
('OHB P2 - 01', 2, 111, 33),
('OHB P2 - 02', 2, 112, 33),
('OHB P2 - 03', 2, 113, 33),
('OHB P2 - 04', 2, 114, 33),
('OHB P2 - 05', 2, 115, 33),
('OHB P2A - 01', 2, 116, 32),
('OHB P2A - 02', 2, 117, 32),
('OHB P3 - 01', 2, 118, 31),
('OHB P3 - 02', 2, 119, 31),
('OHB P3 - 03', 2, 120, 31),
('OHB P3 - 04', 2, 121, 31),
('OHB P3 - 05', 2, 122, 31),
('OHB P3A - 01', 2, 123, 30),
('OHB P3A - 02', 2, 124, 30),
('OHB LD - 01', 2, 125, 38),
('OHB LD - 02', 2, 126, 38),
('OHB LD - 03', 2, 127, 38),
('OHB LM2 - 01', 2, 128, 37),
('OHB LM2 - 02', 2, 129, 37),
('OHB LM2 - 03', 2, 130, 37),
('OHB LM2 - 04', 2, 131, 37),
('OHB LM2 - 05', 2, 132, 37),
('OHB LM2 - 06', 2, 133, 37),
('OHB P1 - 01', 2, 134, 35),
('OHB P1 - 02', 2, 135, 35),
('OHB P1 - 03', 2, 136, 35),
('OHB P1 - 04', 2, 137, 35),
('OHB P1 - 05', 2, 138, 35),
('OHB B - 01', 2, 139, 3),
('OHB B - 02', 2, 140, 3),
('OHB B - 03', 2, 141, 3),
('OHB B - 04', 2, 142, 3),
('OHB B - 05', 2, 143, 3),
('OHB B - 06', 2, 144, 3),
('OHB B - 07', 2, 145, 3),
('OHB B - 08', 2, 146, 3),
('OHB B - 09', 2, 147, 3),
('OHB B - 10', 2, 148, 3),
('OHB B - 11', 2, 149, 3),
('OHB B - 12', 2, 150, 3),
('OHB B - 13', 2, 151, 3),
('OHB B - 14', 2, 152, 3),
('OHB LG - 01', 2, 153, 4),
('OHB LG - 02', 2, 154, 4),
('OHB LG - 03', 2, 155, 4),
('OHB LG - 04', 2, 156, 4),
('OHB LG - 05', 2, 157, 4),
('OHB LM1 - 01', 2, 158, 36),
('OHB LM1 - 02', 2, 159, 36),
('OHB LM1 - 03', 2, 160, 36),
('OHB LM1 - 04', 2, 161, 36),
('OHB LM1 - 05', 2, 162, 36),
('OHB LM1 - 06', 2, 163, 36),
('OHB LM1 - 07', 2, 164, 36),
('IHB MO - 01', 1, 165, 39),
('IHB MO - 02', 1, 166, 39),
('IHB MO - 03', 1, 167, 39),
('IHB MO - 04', 1, 168, 39),
('BOX APAR MO - 01', 1, 169, 39),
('BOX APAR MO - 02', 1, 170, 39),
('BOX APAR MO - 03', 1, 171, 39),
('BOX APAR MO - 04', 1, 172, 39),
('BOX APAR MO - 05', 1, 173, 39);

-- --------------------------------------------------------

--
-- Table structure for table `tipe_kondisi`
--

CREATE TABLE `tipe_kondisi` (
  `id` int(11) NOT NULL,
  `nama_kondisi` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipe_kondisi`
--

INSERT INTO `tipe_kondisi` (`id`, `nama_kondisi`) VALUES
(1, 'Baik'),
(2, 'Rusak'),
(3, 'Hilang');

-- --------------------------------------------------------

--
-- Table structure for table `tipe_lantai`
--

CREATE TABLE `tipe_lantai` (
  `id` int(11) NOT NULL,
  `nama_lantai` varchar(255) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `posisi` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipe_lantai`
--

INSERT INTO `tipe_lantai` (`id`, `nama_lantai`, `deskripsi`, `posisi`) VALUES
(3, 'B', NULL, 1),
(4, 'LG', NULL, 1),
(5, 'LM', NULL, 1),
(6, 'GF', NULL, 1),
(7, 'UG', NULL, 1),
(8, '1', NULL, 1),
(9, '2', NULL, 1),
(10, '3', NULL, 1),
(11, '3A', NULL, 1),
(12, 'GF RIVAPARK', NULL, 2),
(13, 'UG RIVAPARK', NULL, 2),
(14, 'RIVERSIDE', NULL, 2),
(15, 'MO', NULL, 1),
(19, 'P9', NULL, 2),
(20, 'P8A', NULL, 2),
(21, 'P8', NULL, 2),
(22, 'P7A', NULL, 2),
(23, 'P7', NULL, 2),
(24, 'P6A', NULL, 2),
(25, 'P6', NULL, 2),
(26, 'P5A', NULL, 2),
(27, 'P5', NULL, 2),
(28, 'P4A', NULL, 2),
(29, 'P4', NULL, 2),
(30, 'P3A', NULL, 2),
(31, 'P3', NULL, 2),
(32, 'P2A', NULL, 2),
(33, 'P2', NULL, 2),
(34, 'P1A', NULL, 2),
(35, 'P1', NULL, 2),
(36, 'LM1', NULL, 2),
(37, 'LM2', NULL, 2),
(38, 'LOADING DOCK', NULL, 2),
(39, 'MO', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `name`, `password`, `role_id`) VALUES
(11, 'Jane Smith', '$2b$10$vv.cI04EIsOWD0iJLGDA9.OmscqKDC6gwmIK39s9s7g4uXdyDAyTG', 2),
(13, 'Carlos Diaz', '$2b$10$hU6gU3jUp5fZqX7auKCLm.UfZ11kwr36dNT2vUh0rGT/c.XioffAi', 2),
(14, 'faysal', '$2b$10$m5Pr.tlfndvLmyVZYjE2Su.gIBoFi7Jq4XuQTrQQGChFctfionohe', 1),
(15, 'mustaf', '$2b$10$eFQaLlKzF0xfhdavraT9s.TBi3iCoYnCGSyUvQ4GQ8qE36IvydMGW', 1),
(16, 'sumino', '$2b$10$cF4PZyQaTa/8.SrE1Gb.hORuQR.gWHIfJiHIi.O8JN4SSZTVjSPGe', 2),
(17, 'tarmizi', '$2b$10$qNb8HgfAY5OrvpTvIeixPOFWfDxljnJfEs8e5Kf0ybZcmilzyEapS', 2),
(18, 'sukandar', '$2b$10$/vAmYwFw9FdUDGuL9.6WeOGiaO0SgeVCiJpMy02MRk72zhhRbiizO', 2),
(19, 'syafrizal', '$2b$10$ZoBB42mn.WBT06MtWCCg3u3pN/6ZZJEc9aEvgSN9HcgcMJUeI8M1a', 2),
(20, 'ariadi', '$2b$10$0ee0hcFr8mnF.z0yOGYXE.SqrorR5s3/ekDTAEakxIrRWGVfls80e', 2),
(21, 'edisusanto', '$2b$10$1UhJgVxxtJ1dtOEcL7DtZeFv.WloGLbwKlA.ftrTyn9.opNDpRirm', 2),
(22, 'hardiyanto', '$2b$10$JGGea2RiNJf6h7Yq7CbuWu/7kPmTivmre/TMjhPmsJ9Gaxis3P0ye', 2),
(23, 'lambok', '$2b$10$.PFfaoY8RxyiTpY4gGq8Q.iLAWG8t0lRIojK4QnmqdbEuISF3EWMi', 2),
(24, 'jhoni', '$2b$10$X34DSyTVLiC5GvZFnGFsDejGBYyV4fjSD7znokeW8GIrKNBYBsIDq', 2),
(25, 'handoko', '$2b$10$HivzcO8M.60Yc/ZjShA8/uWGW.8tSiVb0cO24Zv5z84p5LRutFwim', 2),
(28, 'John Doem', '$2b$10$4qKnVLxk4qDdl1BZzAGZTugm.CDPilIJMO.VW73pNXInleQMA1KBu', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aset`
--
ALTER TABLE `aset`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_petugas` (`id_user`),
  ADD KEY `fk_tipe_aset` (`id_tipe_aset`),
  ADD KEY `fk_tipe_lantai` (`id_tipe_lantai`),
  ADD KEY `fk_kondisi` (`id_kondisi`),
  ADD KEY `fk_aset_id_tipe_hb` (`id_tipe_hb`),
  ADD KEY `fk_aset_id_tipe_door` (`id_tipe_door`);

--
-- Indexes for table `posisi`
--
ALTER TABLE `posisi`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tipe_aset`
--
ALTER TABLE `tipe_aset`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_lantai_id` (`lantai_id`);

--
-- Indexes for table `tipe_door`
--
ALTER TABLE `tipe_door`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_lokasi` (`posisi`),
  ADD KEY `fk_tipe_door_lantai` (`lantai_id`);

--
-- Indexes for table `tipe_hb`
--
ALTER TABLE `tipe_hb`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_posisi` (`posisi`),
  ADD KEY `fk_tipe_hb_lantai` (`lantai_id`);

--
-- Indexes for table `tipe_kondisi`
--
ALTER TABLE `tipe_kondisi`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tipe_lantai`
--
ALTER TABLE `tipe_lantai`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tipe_lantai_posisi` (`posisi`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aset`
--
ALTER TABLE `aset`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tipe_aset`
--
ALTER TABLE `tipe_aset`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `tipe_door`
--
ALTER TABLE `tipe_door`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=282;

--
-- AUTO_INCREMENT for table `tipe_hb`
--
ALTER TABLE `tipe_hb`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=183;

--
-- AUTO_INCREMENT for table `tipe_kondisi`
--
ALTER TABLE `tipe_kondisi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tipe_lantai`
--
ALTER TABLE `tipe_lantai`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `aset`
--
ALTER TABLE `aset`
  ADD CONSTRAINT `fk_aset_id_tipe_door` FOREIGN KEY (`id_tipe_door`) REFERENCES `tipe_door` (`id`),
  ADD CONSTRAINT `fk_aset_id_tipe_hb` FOREIGN KEY (`id_tipe_hb`) REFERENCES `tipe_hb` (`id`),
  ADD CONSTRAINT `fk_kondisi` FOREIGN KEY (`id_kondisi`) REFERENCES `tipe_kondisi` (`id`),
  ADD CONSTRAINT `fk_petugas` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tipe_aset` FOREIGN KEY (`id_tipe_aset`) REFERENCES `tipe_aset` (`id`),
  ADD CONSTRAINT `fk_tipe_lantai` FOREIGN KEY (`id_tipe_lantai`) REFERENCES `tipe_lantai` (`id`);

--
-- Constraints for table `tipe_aset`
--
ALTER TABLE `tipe_aset`
  ADD CONSTRAINT `fk_lantai_id` FOREIGN KEY (`lantai_id`) REFERENCES `tipe_lantai` (`id`);

--
-- Constraints for table `tipe_door`
--
ALTER TABLE `tipe_door`
  ADD CONSTRAINT `fk_lokasi` FOREIGN KEY (`posisi`) REFERENCES `posisi` (`id`),
  ADD CONSTRAINT `fk_tipe_door_lantai` FOREIGN KEY (`lantai_id`) REFERENCES `tipe_lantai` (`id`);

--
-- Constraints for table `tipe_hb`
--
ALTER TABLE `tipe_hb`
  ADD CONSTRAINT `fk_posisi` FOREIGN KEY (`posisi`) REFERENCES `posisi` (`id`),
  ADD CONSTRAINT `fk_tipe_hb_lantai` FOREIGN KEY (`lantai_id`) REFERENCES `tipe_lantai` (`id`);

--
-- Constraints for table `tipe_lantai`
--
ALTER TABLE `tipe_lantai`
  ADD CONSTRAINT `fk_tipe_lantai_posisi` FOREIGN KEY (`posisi`) REFERENCES `posisi` (`id`);

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
