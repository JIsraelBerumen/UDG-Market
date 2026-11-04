# Informe técnico de pruebas de inicio de sesión (Login) del backend — 3 de noviembre de 2026

**Proyecto:** UDG Market  
**Fecha de ejecución:** 3 de noviembre de 2026  
**Alcance principal:** endpoint `POST /api/auth/login`  
**Tipo de pruebas:** comprobaciones controladas del API local, enfocadas exclusivamente en inicio de sesión.

## Resumen ejecutivo

Se inició el backend local y se probaron dos respuestas del endpoint de login. Ambos resultados coincidieron con lo esperado: campos vacíos devolvieron HTTP 400 y una cuenta de prueba inexistente devolvió HTTP 401. Esta última respuesta confirma que el backend procesó la solicitud y pudo realizar la consulta de búsqueda en MySQL.

**No se probó un inicio de sesión exitoso**: no se proporcionó una cuenta de prueba autorizada y no se crearon ni modificaron usuarios para esta validación.

## Entorno y procedimiento

- Endpoint evaluado: `POST /api/auth/login`.
- API local: `http://127.0.0.1:5000`.
- MySQL local estaba disponible en el puerto 3306.
- El API no estaba activo al comenzar; se inició temporalmente para las pruebas y se detuvo al terminar.
- No se encontraron archivos `.env` en las ubicaciones revisadas. No se imprimieron ni incluyeron credenciales de configuración en este informe.
- Las solicitudes fueron de solo lectura respecto a usuarios: no se usó el endpoint de registro ni se modificaron datos de la base.

## Casos ejecutados

| # | Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|
| 1 | Enviar correo y contraseña vacíos | HTTP 400 con error de campos requeridos | HTTP 400: “Por favor completa todos los campos.” | Aprobado |
| 2 | Enviar credenciales para una dirección inexistente bajo el dominio reservado `.invalid` | HTTP 401 por credenciales inválidas | HTTP 401: “Credenciales inválidas. Verifica tu correo.” | Aprobado |

El primer caso valida la respuesta básica de entrada sin consultar credenciales. El segundo confirma que el servicio pudo completar la búsqueda del usuario en la base de datos y manejar correctamente la ausencia de coincidencia.

## Resultados y límites

- Se verificaron los caminos de validación de campos vacíos y cuenta inexistente.
- No se verificó la comparación bcrypt de una contraseña incorrecta asociada a una cuenta real.
- No se verificó la emisión de JWT ni la respuesta positiva que contiene token y datos de usuario.
- No se usó una cuenta real ni se insertaron datos temporales. Para validar el camino exitoso se requiere una cuenta de prueba autorizada y conocida.
- Estas comprobaciones no cubren registro, recuperación de contraseña, autorización de endpoints protegidos ni pruebas de carga.

## Conclusión

Las respuestas negativas principales del endpoint de **inicio de sesión (login)** funcionaron conforme al comportamiento esperado y el backend logró comunicarse con MySQL para resolver la cuenta inexistente. La autenticación exitosa permanece pendiente de validar con credenciales de prueba autorizadas; por ello, el resultado no debe interpretarse como certificación completa del proceso de autenticación.
