SaaS Events - Serverless Project
Este proyecto implementa un sistema de eventos para un SaaS utilizando Serverless Framework, AWS Lambda, y Python. Permite manejar eventos y notificaciones dentro de una arquitectura 100% serverless.

Tecnologías utilizadas
Serverless Framework

AWS Lambda

Python 3.11

serverless-offline (para pruebas locales)

Funciones implementadas
POST /event
Crea un nuevo evento en el sistema.

POST /notification
Envía una notificación basada en un evento.

Requisitos previos
Node.js >= 18.x

Python >= 3.11

Serverless Framework instalado globalmente:
npm install -g serverless

Instalación y ejecución local
Clonar el repositorio:

git clone https://github.com/Samuels2018/saas-events.git
cd saas-events

Instalar dependencias de Python:
pip install -r requirements.txt

Instalar dependencias Node.js (para serverless y plugins):
npm install

Ejecutar el proyecto localmente:
serverless offline

Las funciones estarán disponibles en http://localhost:3000.
