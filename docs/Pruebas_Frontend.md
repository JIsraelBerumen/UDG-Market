# Informe técnico de pruebas del frontend

**Fecha:** 3 de noviembre de 2026  
**Proyecto:** UDG Market  
**Alcance:** pantalla de acceso, navegación a recuperación de contraseña y registro, y compilación de producción.

## Resumen ejecutivo

La suite finalizó con **3 pruebas aprobadas**, distribuidas en **2 suites**. La compilación optimizada para producción también se completó correctamente.

Durante la primera ejecución de la suite completa se encontraron pruebas de `App` desactualizadas: verificaban vistas del dashboard, aunque la aplicación actualmente presenta `LoginView` como pantalla de entrada. Se actualizó la prueba de humo para validar la interfaz que realmente monta `App`; no se modificó el comportamiento de producción.

## Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `npm test -- --watchAll=false --runInBand` | **Aprobado:** 2 suites, 3 pruebas; 0 fallos. |
| `npm test -- --watchAll=false --runInBand --runTestsByPath src/frontend/views/components_login/LoginView.test.jsx` | **Aprobado:** 1 suite, 2 pruebas; 0 fallos. |
| `npm run build` | **Aprobado:** compilación de producción completada. |

La compilación reportó una advertencia de Node.js indicando que `fs.F_OK` está obsoleto (`DEP0176`); no impidió completar el build.

## Cobertura comprobada

- `App` muestra el encabezado UDG Market, los campos de correo y contraseña, y los enlaces de recuperación y registro.
- Desde el acceso se puede abrir la recuperación de contraseña y regresar al acceso.
- Desde el acceso se puede abrir el registro y regresar al acceso.
- El proyecto compila en modo de producción.

La prueba de humo de `App` se actualizó en `src/App.test.js` para corresponder a la pantalla de entrada actual. Las pruebas anteriores verificaban interacciones del dashboard, que no se monta desde `App` en la configuración vigente.

## Límites de la validación

Estas pruebas no validan autenticación contra un servicio, persistencia de usuarios, llamadas de red, compatibilidad visual en navegadores ni comportamiento responsive. El build confirma compilación, no el funcionamiento de servicios externos.

## Conclusión

La entrada al frontend y los flujos locales de recuperación y registro cubiertos por la suite funcionan según las pruebas automatizadas. La compilación de producción está lista; queda registrada la advertencia de deprecación como observación no bloqueante.
