/* ============================================================================
   data/plans — Áreas y plantillas de plan (3 hitos, 9 tareas, hábito)
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const E = A.E;
  const uid = A.uid;


  /* ---------------------------- Plantillas de plan ------------------------ */
  /* Cada área trae 3 hitos y 9 tareas. Todo editable después. */
  const AREAS = [
    { id: 'salud', name: 'Salud y cuerpo', icon: 'flame' },
    { id: 'estudio', name: 'Estudio', icon: 'book' },
    { id: 'trabajo', name: 'Trabajo y oficio', icon: 'target' },
    { id: 'dinero', name: 'Dinero', icon: 'coin' },
    { id: 'creatividad', name: 'Creatividad', icon: 'feather' },
    { id: 'vinculos', name: 'Vínculos', icon: 'user' },
    { id: 'mente', name: 'Mente y calma', icon: 'moon' },
  ];

  const PLANS = {
    salud: {
      milestones: ['Recuperar el sueño y el movimiento', 'Sostener el cuerpo en el tiempo', 'Cerrar con una medida real'],
      habit: { title: 'Caminar 20 minutos', target: 5 },
      tasks: [
        ['Fijar la hora exacta de dormir durante 5 noches', 15, 3, 2],
        ['Caminar 20 minutos sin teléfono', 20, 4, 1],
        ['Anotar qué comiste y cómo te sentiste', 10, 3, 1],
        ['Preparar la comida de mañana la noche anterior', 25, 4, 2],
        ['Hacer 12 minutos de movilidad al despertar', 12, 3, 1],
        ['Medir sueño y energía durante una semana', 10, 3, 1],
        ['Sustituir una bebida por agua todos los días', 5, 2, 1],
        ['Caminar 45 minutos seguidos un día', 45, 4, 3],
        ['Comparar tus medidas del día 1 y del día 21', 20, 5, 2],
      ],
    },
    estudio: {
      milestones: ['Entender el terreno', 'Practicar con repetición', 'Probar bajo presión'],
      habit: { title: 'Estudiar 25 minutos', target: 5 },
      tasks: [
        ['Ver el temario completo y marcarlo', 25, 4, 2],
        ['Estudiar el primer bloque y resumirlo en 5 líneas', 30, 4, 2],
        ['Resolver 5 ejercicios sin mirar apuntes', 30, 4, 2],
        ['Explicar un tema en voz alta como si enseñaras', 20, 5, 2],
        ['Hacer una lista de las 10 dudas reales', 15, 4, 1],
        ['Repasar solo lo fallado ayer', 20, 5, 1],
        ['Crear 8 tarjetas de memoria y repasarlas', 20, 3, 1],
        ['Simular un examen corto con tiempo', 40, 5, 3],
        ['Cerrar la semana corrigiendo tus propios errores', 30, 5, 3],
      ],
    },
    trabajo: {
      milestones: ['Ordenar y priorizar', 'Producir algo visible', 'Entregar y medir'],
      habit: { title: '25 minutos sin interrupciones', target: 5 },
      tasks: [
        ['Listar todo lo pendiente y elegir solo 3', 15, 4, 1],
        ['Definir qué significa «terminado» para la entrega', 15, 4, 1],
        ['Hacer el primer bloque de 25 minutos sin notificaciones', 25, 4, 2],
        ['Avanzar la parte más difícil antes de mediodía', 45, 5, 3],
        ['Pedir una revisión o un dato que te falta', 10, 4, 1],
        ['Escribir el borrador completo, aunque sea imperfecto', 50, 5, 3],
        ['Corregir el borrador con una lista corta', 30, 4, 2],
        ['Entregar y anotar la fecha real', 10, 5, 2],
        ['Medir qué te quitó más tiempo esta semana', 15, 4, 1],
      ],
    },
    dinero: {
      milestones: ['Ver el mapa real', 'Reducir la fuga', 'Aumentar la entrada'],
      habit: { title: 'Anotar cada gasto del día', target: 6 },
      tasks: [
        ['Anotar todos los gastos fijos del mes', 30, 5, 2],
        ['Calcular cuánto entra y cuánto sale', 20, 5, 2],
        ['Marcar las 3 fugas más grandes', 20, 4, 1],
        ['Cancelar o bajar un gasto concreto', 25, 4, 2],
        ['Definir un monto semanal para gastos sueltos', 15, 4, 1],
        ['Separar un 5% al recibir dinero', 10, 4, 1],
        ['Buscar una entrada extra realista', 30, 5, 2],
        ['Hacer una llamada o enviar una propuesta', 20, 5, 2],
        ['Revisar el mes y anotar qué funcionó', 25, 5, 2],
      ],
    },
    creatividad: {
      milestones: ['Encontrar la chispa', 'Producir sin juzgar', 'Terminar y mostrar'],
      habit: { title: '15 minutos de creación libre', target: 5 },
      tasks: [
        ['Reunir 10 referencias que te muevan', 25, 3, 1],
        ['Escribir en una frase qué quieres hacer sentir', 15, 4, 1],
        ['Hacer un borrador feo en 20 minutos', 20, 4, 2],
        ['Elegir una sola dirección y descartar el resto', 15, 4, 2],
        ['Trabajar 45 minutos solo en la parte difícil', 45, 5, 3],
        ['Terminar una versión completa, sin pulir', 50, 5, 3],
        ['Pulir solo tres detalles', 30, 4, 2],
        ['Mostrarlo a una persona y pedir una crítica', 20, 5, 2],
        ['Anotar qué harías distinto en la siguiente', 15, 3, 1],
      ],
    },
    vinculos: {
      milestones: ['Reconectar', 'Sostener el contacto', 'Reparar lo pendiente'],
      habit: { title: 'Un mensaje sincero al día', target: 5 },
      tasks: [
        ['Elegir 3 personas que quieres recuperar', 15, 4, 1],
        ['Escribir un mensaje sin pedir nada', 10, 4, 1],
        ['Hacer una llamada de 15 minutos', 15, 5, 2],
        ['Proponer un plan concreto con fecha', 10, 4, 1],
        ['Escuchar sin interrumpir durante una conversación', 20, 5, 3],
        ['Resolver una conversación que estás evitando', 30, 5, 3],
        ['Agradecer algo específico a alguien', 10, 3, 1],
        ['Preguntar cómo está de verdad', 10, 4, 1],
        ['Cerrar la semana con una visita o comida', 60, 5, 3],
      ],
    },
    mente: {
      milestones: ['Bajar el ruido', 'Observar los patrones', 'Sostener la calma'],
      habit: { title: '5 minutos de respiración', target: 6 },
      tasks: [
        ['Escribir todo lo que te preocupa, sin ordenar', 15, 4, 1],
        ['Elegir una sola preocupación y escribir el peor caso', 15, 4, 2],
        ['Respirar 5 minutos contando las exhalaciones', 5, 3, 1],
        ['Salir a caminar sin auriculares', 20, 4, 1],
        ['Anotar tres momentos del día y cómo los sentiste', 10, 3, 1],
        ['Silenciar notificaciones durante dos horas', 5, 4, 1],
        ['Escribir qué parte de esto sí puedes controlar', 15, 4, 2],
        ['Dormir sin pantallas la última media hora', 30, 4, 2],
        ['Releer tus notas de la semana y marcar un patrón', 20, 5, 2],
      ],
    },
  };

  function buildPlan(goal) {
    const plan = PLANS[goal.area] || PLANS.trabajo;
    const tasks = plan.tasks.map((t, i) => ({
      id: 't' + uid(),
      title: t[0],
      estMinutes: t[1],
      impact: t[2],
      effort: t[3],
      ms: Math.floor(i / 3),
      done: false, tier: '', score: 0, answer: '', evidence: 0,
      completedAt: null, elapsedSec: 0, aiUsed: false,
    }));
    const milestones = plan.milestones.map((title, i) => ({ title, at: i }));
    return { tasks, milestones, habit: plan.habit };
  }

  function horizonDate(days) {
    return E.ymd(E.addDays(new Date(), days));
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.AREAS = AREAS;
  A.PLANS = PLANS;
  A.buildPlan = buildPlan;
  A.horizonDate = horizonDate;

})(window.Seraph = window.Seraph || {});
