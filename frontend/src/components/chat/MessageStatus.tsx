interface Props {
  readAt: string | undefined;
}

export default function MessageStatus({ readAt }: Props) {
  const isRead = readAt != null;

  if (isRead) {
    // Двойная галочка — цвет акцента темы
    return (
      <span className="inline-flex items-center shrink-0" title="Прочитано">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M1 5.5L4.5 9L10 3" stroke="var(--color-tg-primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5.5L8.5 9L14 3" stroke="var(--color-tg-primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  // Одинарная галочка — muted цвет текста своих сообщений
  return (
    <span className="inline-flex items-center shrink-0" title="Отправлено">
      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
        <path d="M1 4.5L4.5 8L11 1" stroke="var(--color-tg-msg-out-text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}
