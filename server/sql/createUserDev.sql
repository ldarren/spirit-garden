CREATE SCHEMA IF NOT EXISTS `sgUsers`;
CREATE SCHEMA IF NOT EXISTS `sgGame`;

DROP USER 'sgUserAdmin'@'%';
DROP USER 'sgUserServers'@'%';
DROP USER 'sgUserEditors'@'%';
DROP USER 'sgUserViewers'@'%';
DROP USER 'sgUserAdmin'@'localhost';
DROP USER 'sgUserServers'@'localhost';
DROP USER 'sgUserEditors'@'localhost';
DROP USER 'sgUserViewers'@'localhost';

CREATE USER 'sgUserAdmin'@'%' IDENTIFIED BY 'sg';
CREATE USER 'sgUserServers'@'%' IDENTIFIED BY 'sg';
CREATE USER 'sgUserEditors'@'%' IDENTIFIED BY 'sg';
CREATE USER 'sgUserViewers'@'%' IDENTIFIED BY 'sg';

CREATE USER 'sgUserAdmin'@'localhost' IDENTIFIED BY 'sg';
CREATE USER 'sgUserServers'@'localhost' IDENTIFIED BY 'sg';
CREATE USER 'sgUserEditors'@'localhost' IDENTIFIED BY 'sg';
CREATE USER 'sgUserViewers'@'localhost' IDENTIFIED BY 'sg';

GRANT ALL PRIVILEGES ON `sgGame`.* TO 'sgUserAdmin'@'%' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgUsers`.* TO 'sgUserAdmin'@'%' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgGame`.* TO 'sgUserServers'@'%' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgUsers`.* TO 'sgUserServers'@'%' WITH GRANT OPTION;

GRANT ALL PRIVILEGES ON `sgGame`.* TO 'sgUserAdmin'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgUsers`.* TO 'sgUserAdmin'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgGame`.* TO 'sgUserServers'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `sgUsers`.* TO 'sgUserServers'@'localhost' WITH GRANT OPTION;
