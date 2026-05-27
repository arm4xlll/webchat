interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
};

export default function UserAvatar({ name, avatarUrl, size = 'md', className = '', onClick }: Props) {
  const base = `${sizeClasses[size]} rounded-full shrink-0 select-none${onClick ? ' cursor-pointer' : ''}`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onClick={onClick}
        className={`${base} object-cover ${className}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${base} bg-tg-primary text-white flex items-center justify-center font-semibold ${className}`}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
