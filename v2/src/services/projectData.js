const fallbackData = {
  userName: 'Héctor',
  project: {
    title: 'Brevet 1000 km',
    eventDate: '2026-10-09',
    startDate: '2026-06-19',
    phase: 'Construcción',
    currentWeek: 8,
    totalWeeks: 16,
    score: 72,
    scoreStatus: 'Preparación adecuada',
    dimensions: [
      { label: 'Consistencia', value: 84 },
      { label: 'Volumen', value: 66 },
      { label: 'Fondos', value: 60 },
      { label: 'Recuperación', value: 79 },
    ],
    coach: {
      observation: 'La consistencia reciente es adecuada.',
      risk: 'Falta exposición reciente a fondos largos.',
      action: 'Planifica una salida progresiva de 150 a 200 km durante los próximos 10 días.',
    },
    nextMilestone: {
      target: 200,
      longest: 119,
    },
    activities: [
      { date: '31 JUL', title: 'Salida aeróbica', detail: '32 km · 1 h 28 min' },
      { date: '30 JUL', title: 'Salida con viento', detail: '45 km · 2 h 05 min' },
      { date: '29 JUL', title: 'Descanso', detail: 'Movilidad y recuperación' },
    ],
  },
}

export async function loadProjectData() {
  try {
    const response = await fetch('/api/project-summary')
    if (!response.ok) return fallbackData
    return await response.json()
  } catch {
    return fallbackData
  }
}
