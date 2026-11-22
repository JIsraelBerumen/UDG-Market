# Backend de UDG Market

Este backend proporciona la API de autenticación y registro de usuarios de UDG
Market. Está construido con Node.js y Express, y utiliza MySQL para guardar las
cuentas. El frontend React envía solicitudes HTTP a esta API.

## Estructura

```text
backend/
├── config/
│   └── database.js  # Configuración del pool de conexiones MySQL
├── routes/
│   └── auth.js      # Endpoints de registro e inicio de sesión
├── server.js        # Configuración e inicio del servidor Express
└── README.md        # Esta documentación
```

## Funcionamiento general

1. `server.js` carga la configuración de `udgmarketuno/.env`, configura Express
   para recibir cuerpos JSON y habilita CORS.
2. El servidor monta las rutas de `routes/auth.js` bajo `/api/auth`.
3. Las rutas reciben los datos del frontend, validan la solicitud y utilizan el
   pool exportado por `config/database.js` para consultar o insertar usuarios.
4. Al registrarse, la contraseña se convierte en un hash bcrypt antes de
   guardarse. Al iniciar sesión, se compara la contraseña recibida con ese hash.
5. Si el inicio de sesión es válido, se devuelve un JWT con una vigencia de
   ocho horas y datos públicos del usuario. El hash de contraseña no se envía
   en la respuesta.

## Configuración

Coloca un archivo `.env` en la raíz del proyecto `udgmarketuno` (al mismo nivel
que su `package.json`). `server.js` carga ese archivo explícitamente, aunque el
comando se ejecute desde otra carpeta.

Variables disponibles:

| Variable | Uso | Valor predeterminado |
|---|---|---|
| `PORT` | Puerto HTTP del backend | `5000` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | `2025` |
| `DB_NAME` | Nombre de la base | `udgmarket` |
| `JWT_SECRET` | Clave privada para firmar tokens | `clave_secreta_udg_market` |

Ejemplo local (reemplaza los valores con los de tu entorno):

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=udgmarket_app
DB_PASSWORD=tu_clave_local
DB_NAME=udgmarket
JWT_SECRET=una_clave_aleatoria_larga_y_privada
```

Los valores predeterminados son únicamente para facilitar el desarrollo local.
Configura credenciales propias y un `JWT_SECRET` fuerte en cada entorno, no
subas `.env` al repositorio y no expongas credenciales de base de datos en el
frontend. En producción, configura CORS para permitir únicamente el origen del
frontend y sirve la API sobre HTTPS.

## Ejecución

Instala las dependencias desde el directorio `udgmarketuno`:

```powershell
cd C:\ruta\al\proyecto\udgmarketuno
npm install
```

Puedes iniciar solo el backend desde ese directorio:

```powershell
npm run start:backend
```

O, desde la raíz que contiene la carpeta `udgmarketuno`:

```powershell
npm run backend
```

El servidor escucha en `http://localhost:5000` de forma predeterminada. El
frontend se inicia por separado con `npm start` desde `udgmarketuno` o desde la
raíz que contiene ese proyecto.

## API de autenticación

### `POST /api/auth/register`

Registra un usuario. El cuerpo debe ser JSON:

```json
{
  "fullName": "Nombre Apellido",
  "studentCode": "219012345",
  "campus": "CUCEI",
  "email": "persona@alumnos.udg.mx",
  "password": "una-contraseña"
}
```

El correo se normaliza a minúsculas y debe terminar en `@alumnos.udg.mx`.
`fullName`, `studentCode`, `campus` y `password` deben ser textos no vacíos.
Una respuesta correcta usa HTTP `201` e incluye `userId`. Si el correo o el
código ya existen, responde HTTP `400`.

### `POST /api/auth/login`

Inicia sesión con este cuerpo JSON:

```json
{
  "email": "persona@alumnos.udg.mx",
  "password": "una-contraseña"
}
```

Una respuesta correcta contiene `token` y `user`, con `id`, `name`, `email`,
`studentCode`, `campus`, `phone`, `isSeller` y `createdAt`. Las credenciales
incorrectas responden HTTP `401`; campos faltantes responden HTTP `400`.

## Documentación de los módulos

### `config/database.js`

- Crea un pool de conexiones usando `mysql2/promise`, que permite ejecutar
  consultas asíncronas con `await`.
- Lee host, puerto, usuario, contraseña y base de datos desde las variables
  `DB_*`.
- Exporta el pool para que las rutas lo compartan sin crear una conexión nueva
  por solicitud.
- La base debe existir y contener una tabla `usuarios` compatible con las
  consultas de autenticación. Si el esquema cambia, adapta las consultas en
  `routes/auth.js`.

### `routes/auth.js`

- Define un `express.Router` con las rutas `/login` y `/register`. Como el
  servidor monta el router en `/api/auth`, sus rutas públicas completas son
  `/api/auth/login` y `/api/auth/register`.
- En el registro valida los campos y el dominio del correo, genera un hash con
  bcrypt y almacena el usuario mediante una consulta parametrizada.
- En el inicio de sesión busca por correo, compara la contraseña con bcrypt y
  firma un JWT de ocho horas con `JWT_SECRET`.
- Traduce errores de duplicidad de MySQL a una respuesta `400`; registra los
  errores inesperados en la consola y devuelve HTTP `500`.
- No envía `password_hash` al cliente. Si se modifican los nombres de columnas,
  actualiza las consultas y el mapeo de usuario de este módulo.

### `server.js`

- Carga `.env` desde la raíz de `udgmarketuno`, usando una ruta relativa a la
  ubicación del propio archivo.
- Configura Express para analizar JSON y habilita CORS.
- Monta el router de autenticación bajo `/api/auth`.
- Escucha en `PORT` o, si no está configurado, en el puerto `5000`.
- En producción, el middleware CORS debe restringirse al dominio real del
  frontend.

## Esquema de base esperado

Las rutas asumen una tabla `usuarios` con estas columnas:

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    codigo_estudiante VARCHAR(20) UNIQUE NOT NULL,
    centro_universitario VARCHAR(50) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono_whatsapp VARCHAR(15) NULL,
    modo_vendedor BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

El backend no crea la base ni ejecuta migraciones automáticamente. Crea la base
y la tabla antes de iniciar el servicio. Si el proyecto destino utiliza otro
esquema, cambia la configuración y las consultas para que coincidan.
