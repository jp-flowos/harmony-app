import { cn } from "@/lib/utils";

interface GreetingProps {
  /** Friendly Phosphor icon (e.g. <Hand /> waving), ~28-32px, duotone preferred. */
  icon?: React.ReactNode;
  /** Short greeting headline. Keep action-oriented. */
  title: string;
  /** Optional one-line subtext explaining the screen's purpose. */
  subtitle?: string;
  className?: string;
}

/**
 * Conversational header for forms — sets a warm tone without being childish.
 * "안녕하세요!" + action-oriented subtitle.
 */
export function Greeting({ icon, title, subtitle, className }: GreetingProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {icon && (
        <span aria-hidden="true" className="text-coral-500">
          {icon}
        </span>
      )}
      <h2 className="text-2xl font-extrabold text-mocha-900 leading-snug tracking-tight">
        {title}
      </h2>
      {subtitle && <p className="text-lg text-mocha-700 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
