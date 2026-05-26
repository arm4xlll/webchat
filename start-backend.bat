@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-21
cd /d "%~dp0backend"
echo Starting WebChat Backend...
mvnw.cmd spring-boot:run
