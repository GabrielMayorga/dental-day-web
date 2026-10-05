<div align="center">

<img src="public/logo-mark.png" alt="Clínica Dental Day" width="90" />

# Dental Day — Interfaz web

**Sistema de gestión de citas para una clínica odontológica.**
Agenda, expediente clínico, reportes y control de accesos por rol.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Material UI](https://img.shields.io/badge/Material_UI-6-007FFF?logo=mui&logoColor=white)](https://mui.com)
[![FullCalendar](https://img.shields.io/badge/FullCalendar-6-2C3E50)](https://fullcalendar.io)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

[Ver la API →](https://github.com/GabrielMayorga/dental-day-api)

</div>

---

## El problema

La clínica Dental Day gestionaba sus citas en papel y mensajería. Eso producía
tres fallas recurrentes: **citas duplicadas** sobre el mismo odontólogo,
**confirmaciones manuales** que consumían tiempo de recepción, e **inasistencias**
que dejaban horarios vacíos sin posibilidad de reasignarlos. No existía forma de
saber cuántos pacientes se atendieron en un mes ni qué porcentaje no se presentó.

## La solución

Una aplicación web donde la recepción agenda en un calendario que **no permite
solapamientos**, los odontólogos registran el expediente clínico de cada
paciente, y la administración consulta indicadores reales del período que elija.
Cada usuario ve únicamente lo que su rol le permite.

---

## Funcionalidad

| Módulo | Qué resuelve |
|---|---|
| **Inicio** | Panel del día: citas de hoy con acciones rápidas, próximas citas, indicadores según rol |
| **Agenda** | Calendario con vistas de mes, semana y día. Ciclo de vida completo de la cita, reprogramación y motivo de cancelación |
| **Pacientes** | Registro con búsqueda incremental, validación de datos de contacto y baja lógica |
| **Historia clínica** | Expediente por paciente y vista de registros recientes de toda la clínica |
| **Notificaciones** | Citas próximas agrupadas en hoy, mañana y esta semana, con teléfono para contacto directo |
| **Reportes** | Indicadores filtrables por período: volumen de citas, tasa de inasistencia, distribución por estado y por odontólogo |
| **Usuarios** | Alta de personal, cambio de rol y control de acceso. Exclusivo de administración |

---

## Decisiones de diseño

Las que vale la pena explicar, porque no son las opciones por defecto.

### La interfaz refleja la máquina de estados, no la contradice

Una cita solo admite ciertas transiciones: de *programada* puede pasar a
*confirmada*, *cancelada* o *no asistió*, pero nunca directo a *completada*. Esa
regla vive en el backend y devuelve `400` ante un salto inválido.

La interfaz **solo ofrece los botones de las transiciones válidas** para el
estado actual. No se trata de duplicar la validación, sino de no mostrarle al
usuario una acción que el servidor va a rechazar. La regla se hace cumplir en el
servidor; la interfaz la hace comprensible.

### La hora de una cita es hora de pared, no un instante universal

La columna `scheduled_at` es `TIMESTAMP` sin zona horaria: guarda la hora de la
clínica. Enviar los rangos con `toISOString()` los convertía a UTC y desplazaba
las consultas seis horas.

El síntoma era desconcertante: **en local funcionaba y en producción no**. El
servidor de desarrollo corre en UTC−6 y el de producción en UTC, así que los dos
desplazamientos se cancelaban en una máquina y no en la otra. Las citas de la
mañana se dibujaban de madrugada y desaparecían de la vista semanal.

La solución fue eliminar la conversión en ambos extremos: el backend devuelve la
hora como texto y el frontend la formatea en hora local. El dato viaja en un solo
formato, y el sistema se comporta igual en cualquier zona horaria.

### Isotipo vectorial que hereda el color del tema

El logo institucional es horizontal y contiene texto, lo que lo vuelve ilegible
por debajo de ~120 px. Para la interfaz se derivó un isotipo simplificado en SVG
que usa `stroke="currentColor"`: un mismo archivo se dibuja marino en modo claro
y claro en modo oscuro, sin duplicar recursos ni código condicional.

El logo completo se conserva donde el espacio lo permite y la fidelidad de marca
importa.

### La elevación en modo oscuro se resuelve con luz, no con sombra

Una sombra negra sobre un fondo casi negro no se percibe. El modo oscuro usa
**niveles de superficie**: cuanto más alto está un elemento en la jerarquía, más
clara es su base. Los azules también se aclaran —`#2563EB` pierde contraste y
vibra sobre `#0D1117`— siguiendo la práctica estándar de aclarar los colores de
marca en temas oscuros.

### Un lenguaje de movimiento, no animaciones sueltas

Duraciones, curvas y escalonado se definen en un único módulo y se registran en
el tema. Las curvas son asimétricas a propósito: lo que entra frena al llegar, lo
que sale acelera al irse. Ninguna animación de respuesta a una acción supera los
400 ms, y todas respetan `prefers-reduced-motion`.

---

## Arquitectura

```
src/
├── api/          Cliente HTTP y funciones por módulo
├── components/   Reutilizables: layout, listas animadas, skeletons, isotipo
├── config/       Datos de la clínica
├── context/      Autenticación y tema
├── hooks/        Lógica reutilizable
├── pages/        Una por módulo funcional
├── theme/        Paleta, modo claro/oscuro y sistema de movimiento
└── utils/        Formateo y traducción de estados
```

El cliente HTTP centraliza la URL base, adjunta el token en cada petición y
gestiona la renovación del *access token* al vencer.

**Responsive por diseño, no por ajuste**: en móvil la navegación pasa a menú
lateral, las tablas se convierten en tarjetas, los diálogos ocupan la pantalla
completa y la agenda abre en vista de día, que es la única legible en un ancho
reducido.

---

## Instalación

Requiere Node.js 20 o superior y la [API](https://github.com/GabrielMayorga/dental-day-api)
en ejecución.

```bash
git clone https://github.com/GabrielMayorga/dental-day-web.git
cd dental-day-web
npm install
cp .env.example .env    # ajustar VITE_API_URL
npm run dev
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API, incluyendo el prefijo de versión | `http://localhost:4000/api/v1` |

Vite incrusta las variables en el *bundle* durante la compilación. Cambiar
`VITE_API_URL` en producción **exige volver a desplegar**; no basta con
actualizar el valor.

---

## Despliegue

| Capa | Servicio |
|---|---|
| Interfaz | Vercel |
| API | Render |
| Base de datos | Neon (PostgreSQL) |

El archivo `vercel.json` redirige todas las rutas a `index.html`, necesario
porque el enrutamiento ocurre del lado del cliente: sin esa regla, entrar
directo a una ruta interna o recargar la página devuelve 404.

`VITE_API_URL` debe apuntar a la API desplegada, y la variable `CORS_ORIGIN` del
backend debe coincidir **exactamente** con el dominio de la interfaz, sin barra
final.

---

## Contexto académico

Desarrollado como trabajo monográfico para optar al título de Ingeniero en
Sistemas en la **Bluefields Indian & Caribbean University (BICU)**, 2026.
Metodología de desarrollo en cascada.

- **Autores:** Gabriel Mayorga · Sayda Mejía
- **Tutora:** MSc. Yessenia Picado

---

<div align="center">

Construido por **[Gabriel Mayorga](https://github.com/GabrielMayorga)** · [Nuvix](https://gabrielmayorga.github.io)

</div>
