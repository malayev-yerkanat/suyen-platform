export const ruSpecialists = {
  'specialist.view': 'Посмотреть специалиста',
  'specialist.allTimes': 'Все доступные часы',
  'specialist.timezone': 'Время Алматы (Asia/Almaty)',
  'specialist.notFound': 'Специалист не найден или больше недоступен.',
  'specialist.back': 'К списку специалистов',
  'specialist.about': 'О специалисте',
  'specialist.languages': 'Языки сессии',
  'specialist.duration': 'Длительность',
  'specialist.minutes': 'мин',
  'specialist.demoNote': 'Это вымышленный профиль для проверки записи. Реальные консультации в тестовой версии не проводятся.',
} as const;

export const kkSpecialists = {
  'specialist.view': 'Маман туралы көру',
  'specialist.allTimes': 'Барлық қолжетімді уақыт',
  'specialist.timezone': 'Алматы уақыты (Asia/Almaty)',
  'specialist.notFound': 'Маман табылмады немесе енді қолжетімді емес.',
  'specialist.back': 'Мамандар тізіміне оралу',
  'specialist.about': 'Маман туралы',
  'specialist.languages': 'Кеңес тілдері',
  'specialist.duration': 'Ұзақтығы',
  'specialist.minutes': 'мин',
  'specialist.demoNote': 'Бұл — жазылуды тексеруге арналған ойдан шығарылған профиль. Сынақ нұсқасында нақты кеңестер өткізілмейді.',
} satisfies Record<keyof typeof ruSpecialists, string>;
