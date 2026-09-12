import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { SkillIcon } from '../SkillIcon'
import { Modal } from '../ui/Modal'
import { Tabs } from '../ui/Tabs'
import type { ApiGameSkill, SkillGroup } from '../../services/api'

const GRID_COLUMNS = 8
const SKILL_GROUPS: SkillGroup[] = ['physical', 'magic', 'reinforcement', 'weaken', 'special', 'other']

type OperateTab = 'active' | 'passive'

function padRow<T>(items: T[]): Array<T | undefined> {
  const size = Math.max(GRID_COLUMNS, Math.ceil(items.length / GRID_COLUMNS) * GRID_COLUMNS)
  return Array.from({ length: size }, (_, index) => items[index])
}

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
  const title = skill.enchant > 0
    ? t('character.skills.slotAriaEnchanted', { name: skill.name, level: skill.level, enchant: skill.enchant })
    : t('character.skills.slotAria', { name: skill.name, level: skill.level })
  return (
    <button
      type="button"
      className="character-bag-slot is-filled"
      title={title}
      aria-label={title}
      onClick={() => onSelect(skill)}
    >
      <SkillIcon skillId={skill.skill_id} name={skill.name} iconUrl={skill.icon_url} size={32} />
      {skill.enchant > 0 ? (
        <span className="character-bag-slot-enchant">{t('character.skills.enchantBadge', { value: skill.enchant })}</span>
      ) : (
        <span className="character-bag-slot-enchant">{t('character.skills.levelBadge', { level: skill.level })}</span>
      )}
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
  const [tab, setTab] = useState<OperateTab>('active')
  const [collapsed, setCollapsed] = useState<Set<SkillGroup>>(() => new Set())
  const [selected, setSelected] = useState<ApiGameSkill | null>(null)

  const visibleSkills = useMemo(
    () => skills.filter((skill) => (tab === 'passive' ? skill.operate === 'passive' : skill.operate !== 'passive')),
    [skills, tab],
  )

  const groups = useMemo(
    () =>
      SKILL_GROUPS.map((id) => ({
        id,
        items: visibleSkills.filter((skill) => skill.group === id),
      })).filter((group) => group.items.length > 0),
    [visibleSkills],
  )

  function toggleGroup(id: SkillGroup) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="character-skills" aria-label={t('character.skills.sectionLabel')}>
      <div className="character-skills-window">
        <div className="character-skills-window-frame" aria-hidden="true">
          <span className="character-skills-corner is-tl" />
          <span className="character-skills-corner is-tr" />
          <span className="character-skills-corner is-bl" />
          <span className="character-skills-corner is-br" />
        </div>
        <header className="character-skills-titlebar">
          <h3>{t('character.skills.title')}</h3>
        </header>
        <Tabs
          id="character-skills"
          label={t('character.skills.tabsLabel')}
          className="character-skills-tabs"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'active', label: t('character.skills.tabs.active') },
            { id: 'passive', label: t('character.skills.tabs.passive') },
          ]}
        />
        <div
          id={`character-skills-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`character-skills-tab-${tab}`}
          className="character-skills-body"
        >
          {loading ? <div className="character-bag-message">{t('character.skills.loading')}</div> : null}
          {error ? <div className="character-bag-message is-error">{t('character.skills.error')}</div> : null}
          {!loading && !error && skills.length === 0 ? (
            <div className="character-bag-message">{t('character.skills.empty')}</div>
          ) : null}
          {!loading && !error && skills.length > 0 && groups.length === 0 ? (
            <div className="character-bag-message">{t('character.skills.emptyFilter')}</div>
          ) : null}
          {!loading && !error
            ? groups.map((group) => {
                const label = t(`character.skills.groups.${group.id}`)
                const expanded = !collapsed.has(group.id)
                const slots = padRow(group.items)
                return (
                  <section key={group.id} className="character-skills-group">
                    <button
                      type="button"
                      className="character-skills-group-toggle"
                      aria-expanded={expanded}
                      aria-controls={`character-skills-group-${group.id}`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <span className={`character-skills-fold${expanded ? ' is-open' : ''}`} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                    {expanded ? (
                      <div
                        id={`character-skills-group-${group.id}`}
                        className="character-bag-grid character-skills-grid"
                        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
                        aria-label={label}
                      >
                        {slots.map((skill, index) => (
                          <SkillSlot
                            key={skill ? `${skill.skill_id}-${skill.class_index}-${index}` : `empty-${group.id}-${index}`}
                            skill={skill}
                            onSelect={setSelected}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                )
              })
            : null}
        </div>
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
              {selected.enchantable ? (
                <div>
                  <dt>{t('character.skills.modal.fields.enchant')}</dt>
                  <dd>{t('character.skills.enchantValue', { value: selected.enchant, max: selected.enchant_max })}</dd>
                </div>
              ) : null}
              {selected.enchant_route > 0 ? (
                <div>
                  <dt>{t('character.skills.modal.fields.route')}</dt>
                  <dd>{t('character.skills.routeValue', { route: selected.enchant_route })}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('character.skills.modal.fields.operate')}</dt>
                <dd>{t(`character.skills.operate.${selected.operate}`)}</dd>
              </div>
              <div>
                <dt>{t('character.skills.modal.fields.group')}</dt>
                <dd>{t(`character.skills.groups.${selected.group}`)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
