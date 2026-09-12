interface SkillIconProps {
  skillId?: string | number | null
  name?: string | null
  iconUrl?: string | null
  size?: number
  className?: string
}

const DEFAULT_SKILL_ICON = '/skill-icons/default.png'

export function skillIconSrc(skillId?: string | number | null, iconUrl?: string | null): string {
  if (iconUrl) return iconUrl
  if (skillId == null || skillId === '') return DEFAULT_SKILL_ICON
  return `/skill-icons/${Number(skillId)}.png`
}

export function SkillIcon({ skillId, name, iconUrl, size = 32, className = '' }: SkillIconProps) {
  const src = skillIconSrc(skillId, iconUrl)
  return (
    <img
      key={src}
      className={`l2-skill-icon ${className}`.trim()}
      src={src}
      alt={name || ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={(event) => {
        const image = event.currentTarget
        if (image.getAttribute('src') !== DEFAULT_SKILL_ICON) image.src = DEFAULT_SKILL_ICON
      }}
    />
  )
}
