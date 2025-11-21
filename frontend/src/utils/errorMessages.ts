// Утилита для преобразования ошибок API в русские сообщения

export const getErrorMessage = (error: any): string => {
  // Если это уже строка (Error.message), возвращаем её
  if (typeof error === 'string') {
    return error;
  }

  // Если это Error объект с message
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Если это объект с message напрямую
  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }

  // Обработка axios ошибок
  if (error?.response?.data) {
    const errorData = error.response.data;
    const message = errorData.message;

  // Если сообщение уже на русском, возвращаем как есть
  if (typeof message === 'string') {
    // Маппинг английских сообщений на русские (на случай если backend вернет английский)
    const errorMap: Record<string, string> = {
      'Invalid credentials': 'Неверный email или пароль',
      'User with this email already exists': 'Пользователь с таким email уже существует',
      'User account is inactive': 'Аккаунт пользователя неактивен',
      'Invalid refresh token': 'Недействительный токен обновления',
      'Unauthorized': 'Необходима авторизация',
      'password authentication failed': 'Ошибка аутентификации',
      'User not found or inactive': 'Пользователь не найден или неактивен',
    };

    // Проверяем массив ошибок валидации
    if (Array.isArray(message)) {
      // Переводим ошибки валидации
      const validationMap: Record<string, string> = {
        'email must be an email': 'Email должен быть корректным email адресом',
        'email must not be empty': 'Email обязателен для заполнения',
        'password must not be empty': 'Пароль обязателен для заполнения',
        'password must be longer than or equal to 6 characters': 'Пароль должен содержать минимум 6 символов',
        'name must not be empty': 'Имя обязательно для заполнения',
        'name must be longer than or equal to 2 characters': 'Имя должно содержать минимум 2 символа',
        'roleId must be a UUID': 'Роль должна быть выбрана',
      };

      return message
        .map((msg) => {
          // Ищем в маппинге
          if (validationMap[msg]) {
            return validationMap[msg];
          }
          // Проверяем паттерны
          if (msg.includes('email')) {
            if (msg.includes('empty')) return 'Email обязателен для заполнения';
            if (msg.includes('email')) return 'Email должен быть корректным email адресом';
          }
          if (msg.includes('password')) {
            if (msg.includes('empty')) return 'Пароль обязателен для заполнения';
            if (msg.includes('longer')) return 'Пароль должен содержать минимум 6 символов';
          }
          if (msg.includes('name')) {
            if (msg.includes('empty')) return 'Имя обязательно для заполнения';
            if (msg.includes('longer')) return 'Имя должно содержать минимум 2 символа';
          }
          if (msg.includes('roleId') || msg.includes('UUID')) {
            return 'Роль должна быть выбрана';
          }
          return msg;
        })
        .join(', ');
    }

    // Проверяем маппинг
    if (errorMap[message]) {
      return errorMap[message];
    }

    // Если сообщение содержит известные паттерны
    if (message.toLowerCase().includes('invalid credentials')) {
      return 'Неверный email или пароль';
    }
    if (message.toLowerCase().includes('already exists')) {
      return 'Пользователь с таким email уже существует';
    }
    if (message.toLowerCase().includes('unauthorized')) {
      return 'Необходима авторизация';
    }
    if (message.toLowerCase().includes('not found')) {
      return 'Пользователь не найден';
    }

    return message;
  }

  // Если это объект ошибки валидации
  if (errorData.error) {
    return errorData.error;
  }

  return 'Произошла ошибка. Попробуйте еще раз.';
};
