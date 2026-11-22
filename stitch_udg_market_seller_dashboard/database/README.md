# Base de datos UDG Market

Esquema relacional para MySQL 8.0.16 o posterior. El esquema parte de las pantallas HTML y deja la autenticación y las operaciones de compra a cargo de un backend; el navegador no debe conectarse directamente a MySQL.

## Instalación

Desde la carpeta del proyecto, ejecuta el esquema con un usuario que pueda crear la base de datos:

```powershell
Get-Content .\database\schema.sql | mysql -u root -p
```

Configura las credenciales locales en `.env` (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`). El `.env` está excluido de Git; no agregues credenciales reales al repositorio.

## Módulos y tablas

- **Perfil y ajustes:** `users`, `user_preferences`, `seller_profiles`, `campuses`.
- **Inventario y edición de producto:** `products`, `categories`, `product_images`, `product_tags`, `product_tag_assignments`.
- **Puntos de entrega:** `pickup_locations`, `product_pickup_locations`.
- **Mis pedidos y gestión de pedidos del vendedor:** `orders`, `order_items`, `payments`.
- **Cancelar reserva:** `order_cancellations`; el pedido también cambia a `cancelled`.
- **Pase de entrega / Wallet:** `wallet_passes`. Solo se guarda el hash del token QR, nunca el token de acceso en claro.
- **Perfil público y reseñas:** `reviews`, vinculadas a una línea de pedido para que el backend pueda comprobar la compra y entrega antes de permitir reseñar.

`orders` guarda una sola tienda por pedido, como en los flujos de reserva mostrados. `order_items` conserva nombre, precio y cantidad al momento de compra, aunque el producto cambie después. `pickup_location_snapshot` conserva el punto acordado si el vendedor edita o elimina su ubicación.

Los estados de pedido son `pending`, `confirmed`, `ready`, `delivered` y `cancelled`. El backend debe validar las transiciones y usar una transacción al crear un pedido: comprobar stock, descontar inventario, guardar pedido/líneas/pago y revertir todo si una operación falla. Al reponer un producto pausado automáticamente por agotarse, se puede reactivar si `auto_paused = TRUE`; no reactivar los pausados manualmente.

Las reseñas deben aceptarse únicamente para pedidos entregados y cuya línea pertenezca a quien reseña. El índice único permite una reseña por línea de compra. El promedio y conteo del perfil del vendedor se calculan con `AVG(rating)` y `COUNT(*)` sobre `reviews`, no se almacenan como datos duplicados.
