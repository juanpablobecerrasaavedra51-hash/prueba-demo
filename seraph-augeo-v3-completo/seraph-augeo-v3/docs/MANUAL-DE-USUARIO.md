# Seraph Augeo v3 · Manual de usuario

Seraph Augeo es un sistema de metas que pide **evidencia** de lo que hiciste y
te lo devuelve en forma de niveles, cofres y artefactos. No hay cuentas, no hay
servidor y nada de tu progreso sale de tu equipo.

---

## 1. Abrir la app

Tienes dos formas, elige una:

- **Archivo único** — doble clic en `seraph-augeo-v3.html`. Funciona sin
  internet y sin instalar nada.
- **Escritorio** — abre `Seraph Augeo` (Windows: `SeraphAugeo-3.1.0-portable.exe`;
  macOS: `Seraph Augeo.app`; Linux: `Seraph Augeo-linux-x64/`). No necesita
  instalar nada aparte.

Las dos versiones son la misma app. La de escritorio tiene una ventaja: puede
hablar con **cualquier** proveedor de IA, incluidos los locales, sin que el
navegador bloquee la petición.

---

## 2. La puerta de la Inteligencia

Es lo primero que verás en una instalación nueva: **«Paso 1 de 3 · La
Inteligencia»**. La app no te deja entrar hasta que un proveedor responda de
verdad. Es a propósito: sin IA validada, el Guardián no podría preguntar ni
evaluar.

### 2.1 Elige un proveedor

La rejilla muestra **31 opciones**:

**En la nube (con clave):** OpenAI, Anthropic (Claude), Gemini, OpenRouter,
Groq, Mistral, DeepSeek, xAI (Grok), Together AI, Fireworks, Perplexity,
Cerebras, DeepInfra, Hyperbolic, Nebius, SambaNova, Novita, GitHub Models,
Moonshot (Kimi), Z.ai (GLM), Alibaba (Qwen), SiliconFlow.

**En tu equipo (sin clave):** Ollama, LM Studio, llama.cpp, vLLM, Jan, GPT4All,
KoboldCpp, text-generation-webui.

**Comodín:** «Otro (URL propia)», para cualquier servicio compatible con el
formato de OpenAI.

### 2.2 Rellena el formulario

| Campo | Qué poner |
|---|---|
| **URL** | Normalmente ya viene puesta. Sólo se cambia si tu servidor usa otro puerto o dominio |
| **Modelo** | El nombre exacto (`gpt-4o-mini`, `llama3.1:8b`…). Si lo dejas vacío, la app pregunta al servidor cuáles tiene |
| **Clave** | La API key del proveedor. Los locales no la piden |

Dónde se consigue cada clave: el nombre del proveedor en la rejilla enlaza a su
página de claves.

### 2.3 Pulsa «Probar conexión»

La app hace una llamada real y responde una de dos cosas:

- **Conectado · Proveedor · modelo** con los milisegundos que tardó. El botón
  **Continuar** se enciende.
- **Un error explicado**: «No se pudo conectar con el modelo local», «La clave es
  inválida», «El modelo no existe», «URL inválida», «Sin conexión». No hace falta
  adivinar: dice qué falló.

Nada se guarda como «listo» sin esa prueba. Guardar la clave, por sí solo, no
abre la puerta.

### 2.4 Varios proveedores

Puedes guardar tantos perfiles como quieras: prueba uno, cámbialo, guarda otro.
Aparecen en la lista con su estado, y **basta con que uno funcione** para entrar.
Los que ya validaste quedan ahí para el futuro; puedes borrarlos con la **×** o
cambiar el activo con **usar**.

### 2.5 ¿Y si no tengo ninguna IA?

Abajo hay **«Cerrar sin IA»**. La app no te deja entrar al sistema completo, pero
puedes volver más tarde: la puerta se abre sola en el siguiente arranque.

> La clave se guarda **sólo en este equipo** y se envía únicamente al proveedor
> que elijas. Ningún servidor de Seraph Augeo la recibe, porque no existe tal
> servidor.

---

## 3. Configurar una IA local (gratis y sin internet)

1. Instala un servidor local. El más fácil es **Ollama** (ollama.com).
2. Descarga un modelo pequeño:
   ```bash
   ollama pull llama3.1:8b
   ```
3. Comprueba que responde: abre `http://localhost:11434` en el navegador.
4. En la puerta elige **Ollama**, deja la URL `http://localhost:11434/v1`, escribe
   el modelo (`llama3.1:8b`) y pulsa **Probar conexión**.

Con LM Studio, llama.cpp, vLLM, Jan, GPT4All, KoboldCpp o text-generation-webui es
igual: arranca el servidor, elige la opción correspondiente y ajusta el puerto si
lo cambiaste.

**Consejo:** la versión de escritorio es la mejor para IA local, porque no hay
CORS de por medio. En el navegador, si abres el HTML con doble clic, algunos
navegadores bloquean `http://localhost` desde `file://`; en ese caso usa el
`.exe`/la app de escritorio.

---

## 4. Crear tu primera meta

Después de la puerta siguen dos pasos:

1. **Paso 2 de 3 · La meta** — qué quieres conseguir, en una frase concreta.
2. **Paso 3 de 3 · El plan** — porqué, área, horizonte y las tareas sugeridas.

La app propone 3 hitos, 9 tareas y un hábito. Puedes editar todo antes de
empezar. Cuanto más concreta la meta, mejores preguntas hará el Guardián.

---

## 5. El día a día

### Hoy
Tus tareas del día, tus misiones y tu hábito. Cada tarea se marca con **Verificar**.

### Verificar (lo importante)

Al pulsar Verificar se abre una pregunta atada a **tu** tarea y **tu** meta, y un
cronómetro. Escribe qué hiciste. Cuenta todo lo que puedas:

- **Evidencia**: nada / una nota / un resultado visible o un testigo.
- **Detalle**: números, nombres propios, pasos concretos. Repetir la respuesta
  anterior resta.
- **Tiempo**: los minutos declarados frente a lo que estimaste.

Resultado:

| Puntuación | Veredicto | XP |
|---:|---|---|
| 80–100 | Verificado | completo |
| 55–79 | Probable | 75 % |
| 30–54 | Dudoso (queda marcado) | 50 % |
| 0–29 | Sin verificar | 0 |

Desde 55 puntos puedes ganar un cofre.

### Cofres y artefactos
Hay 15 rarezas, de Ceniza a Inefable. Cada cofre da monedas, XP, esencia e
impulsos, y a veces un **artefacto** de los 20 que existen. Los artefactos no se
fabrican: aparecen una vez y no se repiten.

- Tope: 3 cofres ganados al día (4 con la Llave del umbral).
- Piedad: 12 aperturas sin Raro o mejor garantizan Raro o mejor.
- Comprar cuesta 240 monedas o 6 esencia, máximo 2 al día.

### Metas
Aquí ves el avance de cada meta, editas tareas y archivas lo terminado.

### Guardián
El Guardián diagnostica con la IA que configuraste: qué te está frenando, qué
tarea conviene hoy, cómo reformular una meta. Si la IA falla, la app sigue con su
motor local y lo dice en pantalla.

### Altar
Nivel, artefactos conseguidos, logros y constancia.

---

## 6. Ajustes

| Opción | Para qué |
|---|---|
| **IA** | Volver a la puerta: añadir, probar o borrar proveedores |
| **Descargar copia** | Guarda todo tu progreso en un JSON |
| **Importar** | Restaura un JSON descargado |
| **Movimiento** | Apaga animaciones si te distraen o el equipo va justo |
| **Reiniciar** | Empieza de cero (pide confirmación) |

---

## 7. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| «No se pudo conectar con el modelo local» | El servidor local no está arrancado, o el puerto no es el que pusiste. Arranca Ollama / LM Studio y comprueba `http://localhost:PUERTO` |
| «La clave es inválida» | Clave mal copiada, revocada o sin saldo. Crea otra en la página del proveedor |
| «El modelo no existe» | El nombre no coincide. Déjalo vacío para que la app consulte la lista |
| «Sin conexión» | No hay red, o el proveedor está caído. La app no reintenta en bucle |
| «Bloqueado por el navegador (CORS)» | Abriste el HTML con doble clic y el proveedor no acepta ese origen. Usa la versión de escritorio |
| El botón Continuar sigue apagado | No hay ningún perfil con prueba exitosa. Pulsa **Probar conexión** |
| Windows SmartScreen avisa | El ejecutable no está firmado. «Más información» → «Ejecutar de todas formas» |
| macOS dice que no puede abrirlo | Igual: sin firma. Clic derecho sobre la app → **Abrir** → **Abrir** |
| Perdí el progreso | El navegador borró sus datos. Restaura tu último JSON desde Ajustes → Importar |

---

## 8. Privacidad en una frase

Tu progreso se queda en tu equipo (`localStorage`). La clave de IA se queda en tu
equipo. Lo único que sale a internet es la pregunta que le haces al proveedor que
tú elegiste, y sólo si tú lo configuraste.

---

## 9. Nota honesta

La verificación es una **estimación transparente** basada en evidencia, detalle,
tiempo e historial. Mide lo que escribes y cuánto tiempo dedicas; no lee tu mente
ni demuestra nada ante nadie. Los cinco componentes se muestran siempre.
