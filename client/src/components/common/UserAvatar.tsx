import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Аватар пользователя: фото, если загружено, иначе инициалы.
 * Radix сам покажет fallback, если картинка не загрузилась.
 */
export function UserAvatar({
  name,
  avatar,
  className,
  fallbackClassName,
  title,
}: {
  name: string;
  avatar?: string | null;
  className?: string;
  fallbackClassName?: string;
  title?: string;
}) {
  return (
    <Avatar className={className} title={title}>
      {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
      <AvatarFallback
        className={cn("bg-primary/15 font-semibold text-primary", fallbackClassName)}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
