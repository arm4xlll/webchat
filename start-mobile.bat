@echo off
chcp 65001
set JAVA_HOME=C:\Program Files\Java\jdk-21
set ANDROID_HOME=C:\Users\nn\AppData\Local\Android\Sdk
cd /d "%~dp0mobile"
npx expo run:android
