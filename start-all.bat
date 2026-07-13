@echo off
cd /d E:\nginx-1.29.7\nginx-1.29.7
start nginx

cd /d E:\Homebition\client
start /b npm run dev

cd /d E:\Homebition\server
start  npm start

