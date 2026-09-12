import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { SkillIcon } from '../SkillIcon'
import { Modal } from '../ui/Modal'
import type { ApiGameSkill } from '../../services/api'

const GRID_COLUMNS = 10
const GRID_MIN_SLOTS = 40

function SkillSlot({
  skill,
  onSelect,
}: {
  skill?: ApiGameSkill
  onSelect: (skill: ApiGameSkill) => void
}) {
  const { t } = useTranslation('panel')
  if (!skill) {
    return <div className="character-bag-slot is-empty" aria-hidden="true" />
  }
  const title = `${skill.name} · ${t('character.skills.itemId', { id: skill.skill_id })} · ${t('character.skills.levelValue', { level: skill.level })}`
  return (
    <button
      type="button"
      className="character-bag-slot is-filled"
      title={title}
      aria-label={t('character.skills.slotAria', { name: skill.name, level: skill.level })}
      onClick={() => onSelect(skill)}
    >
      <SkillIcon skillId={skill.skill_id} name={skill.name} iconUrl={skill.icon_url} size={34} />
      <span className="character-bag-slot-enchant">{t('character.skills.levelBadge', { level: skill.level })}</span>
    </button>
  )
}

export function CharacterSkillsPanel({
  skills,
  loading,
  error,
}: {
  skills: ApiGameSkill[]
  loading: boolean
  error: boolean
}) {
  const { t } = useTranslation('panel')
  const [selected, setSelected] = useState<ApiGameSkill | null>(null)
  const slots = useMemo(() => {
    const size = Math.max(GRID_MIN_SLOTS, Math.ceil(skills.length / GRID_COLUMNS) * GRID_COLUMNS)
    return Array.from({ length: size }, (_, index) => skills[index])
  }, [skills])

  return (
    <section className="character-bag character-skills" aria-label={t('character.skills.sectionLabel')}>
      <div className="character-skills-heading">
        <Sparkles aria-hidden="true" />
        <h3>{t('character.skills.title')}</h3>
        <strong>{skills.length}</strong>
        <span>
          {skills.length === 1 ? t('character.skills.count_one') : t('character.skills.count_other')}
        </span>
      </div>
      <div className="character-bag-panel">
        {loading ? <div className="character-bag-message">{t('character.skills.loading')}</div> : null}
        {error ? <div className="character-bag-message is-error">{t('character.skills.error')}</div> : null}
        {!loading && !error && skills.length === 0 ? (
          <div className="character-bag-message">{t('character.skills.empty')}</div>
        ) : null}
        {!loading && !error && skills.length > 0 ? (
          <div
            className="character-bag-grid"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
            aria-label={t('character.skills.gridLabel')}
          >
            {slots.map((skill, index) => (
              <SkillSlot
                key={skill ? `${skill.skill_id}-${skill.class_index}-${index}` : `empty-${index}`}
                skill={skill}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : null}
      </div>
      <Modal
        open={Boolean(selected)}
        title={selected?.name ?? t('character.skills.modal.title')}
        onClose={() => setSelected(null)}
        className="character-item-modal"
      >
        {selected ? (
          <div className="character-item-modal-body">
            <div className="character-item-modal-hero">
              <SkillIcon skillId={selected.skill_id} name={selected.name} iconUrl={selected.icon_url} size={64} />
              <div>
                <strong>{selected.name}</strong>
                <span>{t('character.skills.levelValue', { level: selected.level })}</span>
              </div>
            </div>
            <dl className="ui-detail-list">
              <div>
                <dt>{t('character.skills.modal.fields.id')}</dt>
                <dd>{selected.skill_id}</dd>
              </div>
              <div>
                <dt>{t('character.skills.modal.fields.level')}</dt>
                <dd>{selected.level}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
