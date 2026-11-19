# Especificación técnica: Seraph Augeo

> Seraph Augeo es una aplicación que actúa como un ojo omnisciente y un guía práctico para ayudar a las personas a cumplir cualquier objetivo en cualquier área de su vida. Su propósito central une tres cosas: visión total, guía accionable y crecimiento medible. La app conecta metas, hábitos, tiempo, finanzas, estudios y proyectos en un solo mapa, de modo que el usuario vea qué lo acerca y qué lo aleja de sus objetivos. No se limita a mostrar datos: descompone metas grandes en micro-tareas diarias, le dice al usuario cuál es el siguiente paso de mayor impacto y reajusta el plan cuando algo falla, sin castigar, reorientando. El progreso se vuelve medible y real, con tendencias y proyecciones que muestran si va a llegar a la meta.

A eso se suma una gamificación intensiva diseñada para producir resultados prometedores: cada tarea completada otorga experiencia y monedas, las metas se convierten en misiones con niveles y rangos, y los hábitos sostenidos desbloquean logros, rachas y recompensas. El usuario sube de nivel a medida que crece de verdad, compite en ligas y retos con amigos o equipos, y recibe bonificaciones por constancia y por impacto. Así, cumplir objetivos deja de ser un esfuerzo aislado y se vuelve un juego motivador donde el avance personal se siente como una victoria constante.

Seraph Augeo está pensado para estudiantes, emprendedores, profesionales y equipos que tienen metas pero carecen de un sistema que los ordene. Su promesa es simple: ve todo tu contexto, te dice qué hacer ahora, te recompensa por avanzar y te hace crecer hasta lograrlo. Con un modelo freemium y una IA que aprende del usuario, la app convierte completar objetivos en un camino claro, guiado, sostenible y adictivo en el mejor sentido.

**Alcance**

Qué SÍ incluye el MVP: Creación de metas en lenguaje natural con desglose automático en tareas diarias; panel unificado "El Ojo" (vista global de progreso); motor de "siguiente paso" (recomendación diaria de la tarea de mayor impacto); seguimiento básico de hábitos y tiempo; y gamificación intensiva (misiones, niveles, XP, rachas y logros).
Qué NO incluye (fuera del alcance inicial): Integraciones con APIs externas de terceros (banca, salud, GitHub); funciones sociales (ligas, equipos o competencias); IA conversacional abierta; versión web de escritorio; ni planes empresariales (B2B). Todo esto queda para fases posteriores

**Contexto general**

Seraph Augeo ("El ángel que hace crecer") es una aplicación móvil diseñada para actuar como un ojo omnisciente y un guía práctico que ayuda a las personas a cumplir cualquier objetivo. Nace como respuesta a la falta de sistemas que ordenen las metas personales. Su propósito es unir visión total, guía accionable y crecimiento medible en un solo ecosistema.
A diferencia de un simple to-do list, la app descompone metas complejas, sugiere el siguiente paso exacto y reajusta los planes ante fallos sin castigar al usuario. Incorpora una gamificación intensiva (misiones, XP, rangos) para convertir el esfuerzo en un hábito adictivo y motivador. Está dirigida a estudiantes, emprendedores y profesionales de Latinoamérica, y busca que completar objetivos deje de ser intuición para convertirse en un camino claro, guiado y sostenible.

_Generado con SkillNeitor 1.2.0 · 2026-11-12 · 0 ítems · 0 categorías_

# Definición de producto

_Decisiones registradas por el wizard de SkillNeitor. Los pasos no aplicables se muestran explícitamente._

## Fase A — Producto y experiencia

### Paso 1 — Interfaz de usuario y categorías

**Skill:** UI Type Selector
**Estado:** Completo

**Tipo de interfaz:** Web app, App móvil (iOS/Android), Desktop, Híbrida
**Categorías del producto:** Autenticación, Gestión de usuarios, Reportes, Catálogos, Dashboards, Configuración, Analítica, IA / chatbot

### Paso 2 — Experiencia de usuario y comportamiento

**Skill:** UX Behavior Pattern
**Estado:** Completo

**Flujo:** Libre
**Densidad:** Cómoda
**Feedback:** Toasts, Modales, Inline
**Navegación:** Tabs, Wizard
**Accesibilidad:** WCAG AA (por defecto)

### Paso 3 — Componentes estándar de UI

**Skill:** UI Component Catalog
**Estado:** Completo

**Panel de control:** Página dedicada
**Dropdown de opciones:** En sidebar
**Sidebar: disposición:** Expandible
**Sidebar: comportamiento:** Auto-hide
**Menú hamburguesa:** Híbrido

### Paso 4 — Elementos de UI + comportamiento UX

**Skill:** Element-Behavior Mapping
**Estado:** Completo

**Formularios:** Validación inline
**Tablas:** Filtros
**Notificaciones:** Banner
**Estados vacíos:** Simple
**Loaders / skeletons:** Spinner
**Confirmaciones destructivas:** Modal de confirmación

## Fase B — Stack técnico y datos

### Paso 5 — Tecnologías, librerías y usos

**Skill:** Tech Stack Declaration
**Estado:** Completo

**Frontend:** css
**Backend:** java script , php
**Librerías de UI:** boostrap
**Gestión de estado:** signals
**Testing:** playwrit
**Build:** web
**Uso declarado de cada pieza:** normal

### Paso 6 — Estilo de backend y principios

**Skill:** Backend Style & Principles
**Estado:** Completo

**Estilo:** REST
**Principios:** Hexagonal, 12-factor

### Paso 7 — Tipos de base de datos

**Skill:** Data Store Selector
**Estado:** Completo

**Tipos:** Relacional (SQL), Documental, Columnar, Semi-estructurada (JSON/JSONB)
**Justificación:** por que es escalable

### Paso 8 — Procesamiento y analítica de datos

**Skill:** Data & Analytics Pipeline
**Estado:** Completo

**Ingesta:** Manual
**Procesamiento:** ELT
**Transformación:** Agregación, Enriquecimiento
**Almacenamiento analítico:** Vistas materializadas

## Fase C — Inteligencia artificial y analítica

### Paso 9 — Agentes de IA (local / online)

**Skill:** AI Agent Selector
**Estado:** Completo

**Modo:** IA online
**Runtime local:** Modelo embebido en la app
**Proveedor online:** Google
**Modelo:** no hay
**Manejo de API key:** Variable de entorno
**Rol del agente:** Razonamiento, Agente con herramientas

### Paso 10 — Asistencia por IA y chatbot

**Skill:** AI Assistant & Chatbot
**Estado:** Completo

**¿Asistencia por IA en la app?:** Sí
**¿Chatbot?:** No
**Alcance del chatbot:** Soporte, Consultas de datos, Acciones sobre el sistema
**Canal:** Widget flotante
**Memoria:** Persistente
**Límites y escalado:** que pueda sugerir acciones o planes al usuario
**Circunstancias de uso:** Solo en ciertas pantallas

### Paso 11 — Métricas, KPI, EDA y visualización

**Skill:** Analytics & Visualization Catalog
**Estado:** Completo

**Métricas y KPI:** Conversión, Uso por módulo, Métrica personalizada
**Fórmula y unidad de cada métrica:** no se eso
**Estadísticas descriptivas:** Media, Distribución
**EDA:** Outliers, Tendencias
**Tipos de gráficos:** Barras, Líneas, Dispersión, Pastel, Histograma, Boxplot, Heatmap, Área, Radar, Mapa
**Frecuencia de actualización:** Semanal

## Fase D — Operación, seguridad y distribución

### Paso 12 — Seguridad de login/logout

**Skill:** Auth & Session Security
**Estado:** Completo

**Método de login:** Sin login
**Duración de sesión:** Persistente
**Renovación:** Deslizante
**Cierre por inactividad:** 15 minutos
**Logout global:** Sí
**2FA:** Passkey
**Bloqueo por intentos:** 10 intentos
**Política de contraseñas:** Personalizada
**Recuperación:** Email, TOTP, Administrador

### Paso 13 — Mono usuario vs. multiusuario

**Skill:** User Model Selector
**Estado:** Completo

**Modelo:** Multiusuario con permisos granulares
**Roles:** Personalizado
**Jerarquía:** Árbol
**Aislamiento de datos:** Por tenant/organización

### Paso 14 — Persistencia local (localStorage / PWA)

**Skill:** Local Persistence Selector
**Estado:** Completo

**Modo de persistencia:** Archivos locales
**¿PWA?:** Sí
**Capacidades PWA:** Instalable
**Sincronización con backend:** Automática
**Estrategia de conflicto:** Merge

### Paso 15 — Compilación y plataforma destino

**Skill:** Build & Deploy Target
**Estado:** Completo

**Compilación:** Contenedor
**Plataformas:** Multiplataforma
**Empaquetadores:** Electron, Tauri, PyInstaller, Dockerfile, Otro
**Notas de despliegue:** eh no se

### Paso 16 — Repositorio y acciones asociadas

**Skill:** Repository & VCS Actions
**Estado:** Completo

**¿Maneja repositorio?:** Sí
**Proveedor:** GitHub
**Visibilidad:** Público
**Acciones:** Init, Commit, Push, Merge, Release
**Estrategia de ramas:** GitFlow
**Notas de repositorio:** no ninguna

## Resumen de decisiones

| Fase | Paso | Estado | Resumen |
| --- | --- | --- | --- |
| A | 1. Interfaz de usuario y categorías | Completo | Web app, App móvil (iOS/Android), Desktop, Híbrida; Autenticación, Gestión de usuarios, Reportes, Catálogos, Dashboards, Configuración, Analítica, IA / chatbot |
| A | 2. Experiencia de usuario y comportamiento | Completo | Libre; Cómoda; Toasts, Modales, Inline; Tabs, Wizard; WCAG AA (por defecto) |
| A | 3. Componentes estándar de UI | Completo | Página dedicada; En sidebar; Expandible; Auto-hide; Híbrido |
| A | 4. Elementos de UI + comportamiento UX | Completo | Validación inline; Filtros; Banner; Simple; Spinner; Modal de confirmación |
| B | 5. Tecnologías, librerías y usos | Completo | css; java script , php; boostrap; signals; playwrit; web; normal |
| B | 6. Estilo de backend y principios | Completo | REST; Hexagonal, 12-factor |
| B | 7. Tipos de base de datos | Completo | Relacional (SQL), Documental, Columnar, Semi-estructurada (JSON/JSONB); por que es escalable |
| B | 8. Procesamiento y analítica de datos | Completo | Manual; ELT; Agregación, Enriquecimiento; Vistas materializadas |
| C | 9. Agentes de IA (local / online) | Completo | IA online; Modelo embebido en la app; Google; no hay; Variable de entorno; Razonamiento, Agente con herramientas |
| C | 10. Asistencia por IA y chatbot | Completo | Sí; No; Soporte, Consultas de datos, Acciones sobre el sistema; Widget flotante; Persistente; que pueda sugerir acciones o planes al usuario; Solo en ciertas pantallas |
| C | 11. Métricas, KPI, EDA y visualización | Completo | Conversión, Uso por módulo, Métrica personalizada; no se eso; Media, Distribución; Outliers, Tendencias; Barras, Líneas, Dispersión, Pastel, Histograma, Boxplot, Heatmap, Área, Radar, Mapa; Semanal |
| D | 12. Seguridad de login/logout | Completo | Sin login; Persistente; Deslizante; 15 minutos; Sí; Passkey; 10 intentos; Personalizada; Email, TOTP, Administrador |
| D | 13. Mono usuario vs. multiusuario | Completo | Multiusuario con permisos granulares; Personalizado; Árbol; Por tenant/organización |
| D | 14. Persistencia local (localStorage / PWA) | Completo | Archivos locales; Sí; Instalable; Automática; Merge |
| D | 15. Compilación y plataforma destino | Completo | Contenedor; Multiplataforma; Electron, Tauri, PyInstaller, Dockerfile, Otro; eh no se |
| D | 16. Repositorio y acciones asociadas | Completo | Sí; GitHub; Público; Init, Commit, Push, Merge, Release; GitFlow; no ninguna |

---

---

<!-- Avisos:
- No hay ítems seleccionados.
-->
