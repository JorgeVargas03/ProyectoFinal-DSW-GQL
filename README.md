Proyecto Final: Desarrollo e Implementación de una API GraphQL Integrada con FacturAPI y Servicios de Notificación

Integrantes:
- Betancourt Espericueta Jesús Ismael
- Betancourt Espericueta Jorge Ismael
- Vargas Partida Jorge Luis
- Natividad Aguilera Andrick Joksan
- Vargas Murillo Otmar Fidel

Descripción:
Para este proyecto final integrador, desarrollamos una API GraphQL planteada a partir de la doumentación
proporcionada, esta utiliza una arquitectura MVC y recopila las funcionalidades de distintos servicios y
librerías para el crud de cada uno de sus componentes (Productos, Clientes y Facturas).
Principalmente hace uso de:
- Apollo Server:
  Se configura como el servidor GraphQL encargado de exponer el esquema (schema) y los resolvers.
- GraphQL:
  Utilizado como lenguaje de consulta para definir de manera tipada todas las operaciones posibles
- FacturaAPI:
  Servicio externo de facturación electrónica-
- Twilio:
  Servicio de comunicaciones en la nube que empleamos para el envío de SMS y WhatsApp.
- Gemini:
  Interfaz de Inteligencia Artificial que utilizamos para generar los resumenes de forma automática
- Nodemailer:
  Librería de Node.js que gestionamos para el envío de correos electrónicos.
- MongoDB/Mongoose:
  Base de datos NoSQL (MongoDB) junto con Mongoose como ODM (Object-Document Mapper) para modelar
  las colecciones de Productos, Clientes y Facturas.

Con esta combinación de tecnologías, la API GraphQL ofrece un flujo completo para la facturación electrónica,
com la creación y gestión de recursos, la notificación inmediata al cliente por múltiples canales,
la generación de documentos PDF y la redacción inteligente de mensajes mediante IA. Sirviendo el desarrollo
y la utilización de este conjunto de tecnologías, como culminación de la materia, reuniendo todos los
conocimientos aprendidos en el transcurso de este semestre.
