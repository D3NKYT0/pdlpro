interface SectionTitleProps {
  title: string
  subtitle?: string
  className?: string
}

export function SectionTitle({ title, subtitle, className = '' }: SectionTitleProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center py-12 md:py-16 overflow-hidden w-full ${className}`}>
      <div className="relative z-10 flex flex-col items-center gap-1 text-center">
        <h2 className="font-title text-3xl md:text-5xl font-bold tracking-wider text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs md:text-sm tracking-[0.2em] uppercase font-medium text-muted-foreground mt-2">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
