# UDG Market

Aplicación web con pantallas de inicio de sesión/registro, módulos HTML originales, API REST en Express y MySQL. Las pantallas originales se muestran en el espacio de la aplicación después de iniciar sesión.

## Requisitos

- Node.js 20 o posterior.
- MySQL 8.0.16 o posterior.

## Preparar y ejecutar

1. Crea la base de datos y las tablas desde la carpeta del proyecto:

   ```powershell
   Get-Content .\database\schema.sql | mysql -u root -p
   ```

   Si no tienes el cliente `mysql`, abre `database/schema.sql` en MySQL Workbench y ejecútalo allí.

2. Copia `.env.example` a `.env` si todavía no existe:

   ```powershell
   Copy-Item .\.env.example .\.env
   ```

   Completa las credenciales `DB_*` y cambia `SESSION_SECRET` por un valor aleatorio. Puedes generar uno con:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Instala dependencias e inicia el servidor:

   ```powershell
   npm install
   npm run dev
   ```

   Abre `http://localhost:3000`. `/api/health` comprueba la conexión a MySQL. Para iniciar sin modo de desarrollo usa `npm start`.

Las variables ya definidas en el entorno del sistema tienen prioridad sobre `.env`; comprueba que `DB_DATABASE` apunte a `udgmarket_v2`, que es el nombre creado por el esquema. El `.env` y `node_modules` están excluidos de Git. No pongas secretos en HTML ni en código que se envíe al navegador. En producción configura HTTPS, `NODE_ENV=production` y un secreto diferente.

## API

Todas las respuestas de error usan `{ "error": "..." }`. Las escrituras reciben JSON salvo la carga multipart de imágenes. La sesión se mantiene en cookie HTTP-only y en la tabla MySQL `sessions`.

| Método | Endpoint | Acceso |
|---|---|---|
| GET | `/api/health` | Público |
| GET | `/api/auth/campuses` | Público |
| POST | `/api/auth/register`, `/api/auth/login` | Público; limitado por tasa |
| GET | `/api/auth/me`, `/api/profile` | Sesión |
| POST | `/api/auth/logout` | Sesión |
| PATCH | `/api/profile` | Sesión; actualiza nombre, campus, carrera, código estudiantil y avatar de la cuenta |
| GET | `/api/profile/seller/:sellerId` | Público |
| PATCH | `/api/profile/seller/orders` | Vendedor |
| GET | `/api/products`, `/api/products/:id`, `/api/products/categories` | Público |
| GET | `/api/products/mine`, `/api/products/pickup-locations/mine` | Vendedor |
| POST/PATCH/DELETE | `/api/products`, `/api/products/:id`, `/api/products/:id/stock` | Vendedor |
| POST/PATCH | `/api/products/pickup-locations` y `/api/products/pickup-locations/:id` | Vendedor |
| GET/POST | `/api/orders`, `/api/orders/:id` | Sesión; al crear, comprador |
| POST | `/api/orders/:id/confirm`, `/api/orders/:id/ready`, `/api/orders/:id/deliver`, `/api/orders/:id/payment/confirm` | Vendedor dueño del pedido |
| POST | `/api/orders/:id/cancel` | Comprador o vendedor del pedido |
| GET/POST | `/api/reviews/seller/:sellerId`, `/api/reviews` | Reseñas públicas; publicar requiere sesión y entrega verificada |
| POST | `/api/wallet/orders/:orderId/pass` | Comprador dueño del pedido |
| POST | `/api/wallet/passes/validate` | Token QR |
| POST | `/api/uploads/images` | Sesión; JPG, PNG o WebP hasta `IMAGE_MAX_SIZE_MB` |

### Ejemplos de escrituras

Registro: `POST /api/auth/register` con `fullName`, `email`, `password`, `campusCode` (uno de los campus definidos en `database/schema.sql`), `accountType` (`buyer` o `seller`) y opcionalmente `career`, `studentCode` y `storeName`.

Los módulos **Mi perfil**, **Perfil y ajustes** y **Perfil del vendedor** leen los datos de la sesión y la base de datos. El formulario de perfil guarda sus cambios mediante `PATCH /api/profile`; los datos de muestra del HTML no se asignan a cuentas reales.

Producto: `POST /api/products` con `name`, `price`, `stock`, y opcionalmente `description`, `ingredients`, `categoryId`, `imageUrl`, `tags` (`[{ "name": "Nuez", "type": "allergen" }]`) y `pickupLocationIds`. Si se omiten los puntos, el producto usa todos los puntos activos de la tienda.

Pedido: `POST /api/orders` con `items` (`[{ "productId": 1, "quantity": 2 }]`), `pickupLocationId`, `pickupAt` en fecha/hora ISO futura y `paymentMethod` (`cash`, `spei` o `transfer`). El pedido queda pendiente de confirmación del vendedor.

Cancelación: `POST /api/orders/:id/cancel` con `reasonCode` (`not_on_campus`, `changed_time_or_location`, `no_longer_needed`, `seller_unavailable` u `other`) y `details` opcional.

El endpoint de pase emite y valida un token QR y guarda solo su hash. La descarga de un pase Apple Wallet real requiere certificados de Apple y no se genera hasta configurarlos. La app tampoco procesa pagos en línea: registra método y confirmación manual del pago.

## Reglas principales

- Un pedido contiene productos de una sola tienda; inventario se verifica/bloquea y descuenta dentro de una transacción.
- Al cancelar antes de la entrega se repone el stock. El inventario agotado se pausa automáticamente y se reactiva al reponerlo; las pausas manuales se conservan.
- Solo vendedor dueño confirma pedidos, marca entregas y confirma pagos. Una reseña solo se acepta para una línea de pedido entregada por el comprador autenticado.
- Los pedidos guardan snapshots del nombre, precio y punto de entrega para conservar el detalle histórico.
- Las imágenes se guardan en `imagenes/` (ignoradas por Git). El backend genera nombres aleatorios y limita formato/tamaño.

Después de iniciar sesión se muestran dentro de la aplicación las pantallas HTML originales: pedidos de vendedor y comprador, inventario, edición de producto, perfiles y ajustes, cancelación, pase de entrega y valoración. Usa la barra de navegación y el selector **Más pantallas** para cambiar entre ellas; las pantallas originales se cargan en el panel central sin reemplazar sus diseños. Registro e inicio de sesión siguen siendo las únicas pantallas nuevas. Los módulos originales son prototipos y conservan sus interacciones visuales; los datos reales se gestionan mediante la API descrita arriba.
