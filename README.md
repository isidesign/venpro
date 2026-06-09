# Venpro

Sistema de gestión de inventarios para pequeños y medianos negocios. Venpro ofrece portales diferenciados para **propietarios** y **empleados**, con control de stock, ventas, movimientos de inventario, escaneo QR y panel financiero.

> Los datos se persisten en el navegador (`localStorage`). No requiere backend para funcionar en modo local.

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles y acceso](#roles-y-acceso)
- [Persistencia de datos](#persistencia-de-datos)
- [Permisos del navegador](#permisos-del-navegador)
- [Desarrollo](#desarrollo)
- [Limitaciones actuales](#limitaciones-actuales)

## Características

### Portal del propietario

- **Dashboard** con métricas de ventas, alertas de stock bajo y gráficos (Recharts).
- **Inventario**: alta, edición y eliminación de productos; filtros por categoría y nivel de stock.
- **Finanzas**: resumen de ingresos, márgenes y métodos de pago.
- **Historial** de ventas y movimientos de stock.
- **Configuración** de la tienda (nombre, moneda, impuestos, PIN de acceso).
- **Códigos QR** para productos y recetas compuestas.
- **Gestión de personal** y onboarding de equipo.

### Portal del empleado

- **Punto de venta** con carrito, variantes y múltiples métodos de pago.
- **Escaneo QR** con cámara (`html5-qrcode`) para identificar productos.
- **Registro de productos** con captura de foto desde galería o cámara.
- **Ajustes de stock** (entradas y salidas con motivo).
- **Dashboard** operativo con resumen del turno.

### General

- Interfaz responsive con animaciones (Motion).
- Datos de demostración precargados al primer uso.
- Flujo de autenticación y registro con wizard de configuración inicial.

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| UI | React 19, TypeScript |
| Build | Vite 6 |
| Estilos | Tailwind CSS 4 |
| Gráficos | Recharts |
| Iconos | Lucide React |
| QR / cámara | html5-qrcode, MediaDevices API |
| Persistencia | localStorage |

## Requisitos previos

- **Node.js** 18 o superior
- **npm** 9 o superior (incluido con Node.js)
- Navegador moderno con soporte para ES modules y `localStorage`

## Instalación y ejecución

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd venpro

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:3000)
npm run dev
```

Para generar una build de producción:

```bash
npm run build
npm run preview
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en el puerto **3000** |
| `npm run build` | Compila la aplicación en `dist/` |
| `npm run preview` | Sirve la build de producción localmente |
| `npm run lint` | Verificación de tipos con TypeScript (`tsc --noEmit`) |
| `npm run clean` | Elimina `dist/` y artefactos de build |

## Variables de entorno

Copia el archivo de ejemplo y ajusta los valores si los necesitas:

```bash
cp .env.example .env.local
```

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GEMINI_API_KEY` | No (local) | Clave de la API de Gemini. Reservada para integraciones con Google AI Studio o funciones de IA futuras. |
| `APP_URL` | No (local) | URL pública de la aplicación. Usada en despliegues con AI Studio. |

> En desarrollo local la aplicación funciona sin configurar variables de entorno.

## Estructura del proyecto

```
venpro/
├── public/                  # Assets estáticos
├── src/
│   ├── app/
│   │   └── App.tsx          # Enrutamiento por rol y estado de sesión
│   ├── components/
│   │   ├── auth/            # Login, registro y selección de rol
│   │   ├── owner/           # Portal del propietario
│   │   └── employee/        # Portal del empleado
│   ├── constants/
│   │   └── storage.ts       # Claves de localStorage
│   ├── data/
│   │   └── seed.ts          # Datos iniciales de demostración
│   ├── hooks/
│   │   └── useVenproStorage.ts  # Lectura/escritura de persistencia
│   ├── types/
│   │   └── index.ts         # Modelos: Product, Sale, StockTransaction, StoreConfig
│   ├── index.css            # Estilos globales y Tailwind
│   └── main.tsx             # Punto de entrada
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Roles y acceso

1. En la pantalla inicial, elige **Propietario** o **Empleado**.
2. Completa el flujo de login o registro (modo demostración: credenciales precargadas en la UI).
3. El propietario puede configurar un **PIN de acceso** desde la configuración de la tienda.

**PIN por defecto (datos seed):** `1234`

## Persistencia de datos

Los datos se almacenan en `localStorage` bajo las siguientes claves:

| Clave | Contenido |
|-------|-----------|
| `venpro_products` | Catálogo de productos |
| `venpro_sales` | Historial de ventas |
| `venpro_transactions` | Movimientos de stock |
| `venpro_config` | Configuración de la tienda |

Para restablecer los datos de demostración, elimina estas claves desde las herramientas de desarrollo del navegador (Application → Local Storage) y recarga la página.

## Permisos del navegador

- **Cámara**: necesaria para escanear códigos QR y capturar fotos de productos. El navegador solicitará permiso la primera vez.
- Se recomienda usar **HTTPS** o `localhost` para que la API de cámara funcione correctamente.

## Desarrollo

- El alias `@/` apunta a `src/` (configurado en `vite.config.ts` y `tsconfig.json`).
- Ejecuta `npm run lint` antes de commit para validar tipos.
- La variable `DISABLE_HMR=true` desactiva Hot Module Replacement (útil en entornos de edición automatizada).

## Limitaciones actuales

- Sin backend: no hay sincronización entre dispositivos ni usuarios reales.
- La autenticación es simulada para fines de prototipo/UI.
- Los datos viven solo en el navegador del usuario; limpiar caché o datos del sitio los borra.
- Integración con Gemini API preparada a nivel de dependencias, aún no implementada en el frontend.

---

Desarrollado como prototipo funcional de gestión de inventarios. Para producción se recomienda añadir API, base de datos y autenticación real.
