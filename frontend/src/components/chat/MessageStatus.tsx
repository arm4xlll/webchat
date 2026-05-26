interface Props {
  messageCreatedAt: string;
  // ISO timestamp когда собеседник последний раз читал чат (undefined = ещё не читал)
  otherLastReadAt: string | undefined;
}

export default function MessageStatus({ messageCreatedAt, otherLastReadAt }: Props) {
  const isRead = otherLastReadAt != null &&
    new Date(messageCreatedAt) <= new Date(otherLastReadAt);

  if (isRead) {
    // Двойная синяя галочка
    return (
      <span className="inline-flex items-center shrink-0" title="Прочитано">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M1 5.5L4.5 9L10 3" stroke="#3390ec" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5.5L8.5 9L14 3" stroke="#3390ec" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  // Одинарная серая галочка — отправлено
  return (
    <span className="inline-flex items-center shrink-0" title="Отправлено">
      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
        <path d="M1 4.5L4.5 8L11 1" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}
