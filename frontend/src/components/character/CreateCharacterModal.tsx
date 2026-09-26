import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Sparkles, Sword, User, Wand2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CharacterAvatar } from './CharacterAvatar'

export interface StartingClass {
  id: number
  name: string
  type: 'fighter' | 'mystic'
  description: string
}

export interface RaceConfig {
  id: number
  key: 'human' | 'elf' | 'dark_elf' | 'orc' | 'dwarf'
  name: string
  lore: string
  startingClasses: StartingClass[]
}

export const CHARACTER_CREATION_RACES: RaceConfig[] = [
  {
    id: 0,
    key: 'human',
    name: 'Humano',
    lore: 'Versáteis e equilibrados, adaptáveis a qualquer estilo de combate e magia.',
    startingClasses: [
      { id: 0, name: 'Human Fighter', type: 'fighter', description: 'Combate físico, espadas, lanças e escudos.' },
      { id: 10, name: 'Human Mage', type: 'mystic', description: 'Magias elementais, suporte e invocações.' },
    ],
  },
  {
    id: 1,
    key: 'elf',
    name: 'Elfo',
    lore: 'Velocidade, agilidade e alta taxa de conjuração mágica abençoada por Eva.',
    startingClasses: [
      { id: 18, name: 'Elven Fighter', type: 'fighter', description: 'Agilidade excepcional, arcos e lâminas rápidas.' },
      { id: 25, name: 'Elven Mage', type: 'mystic', description: 'Magia de cura rápida, luz e espíritos da natureza.' },
    ],
  },
  {
    id: 2,
    key: 'dark_elf',
    name: 'Elfo Negro',
    lore: 'Força bruta devastadora e o maior poder de ataque mágico básico de Aden.',
    startingClasses: [
      { id: 31, name: 'Dark Elven Fighter', type: 'fighter', description: 'Ataques críticos letais, adagas e artes das sombras.' },
      { id: 38, name: 'Dark Elven Mage', type: 'mystic', description: 'Feitiços sombrios, maldições e poder destrutivo.' },
    ],
  },
  {
    id: 3,
    key: 'orc',
    name: 'Orc',
    lore: 'Vigor inigualável, resistência a efeitos negativos e o maior pool de HP.',
    startingClasses: [
      { id: 44, name: 'Orc Fighter', type: 'fighter', description: 'Armas de duas mãos, garras de combate e resistência colossal.' },
      { id: 49, name: 'Orc Mage', type: 'mystic', description: 'Xamanismo, buffs tribais de guerra e drenagem de alma.' },
    ],
  },
  {
    id: 4,
    key: 'dwarf',
    name: 'Anão',
    lore: 'Mestres de manufatura, extração de recursos (Spoil) e controle de mercado.',
    startingClasses: [
      { id: 53, name: 'Dwarven Fighter', type: 'fighter', description: 'Martelos, maças pesadas, extração e artesanato exclusivo.' },
    ],
  },
]

export interface CreateCharacterModalProps {
  open: boolean
  accountLogin: string
  pending?: boolean
  onClose: () => void
  onConfirm: (payload: {
    login: string
    name: string
    race: number
    class_id: number
    sex: number
    hair_style: number
    hair_color: number
    face: number
  }) => Promise<void>
}

export function CreateCharacterModal({
  open,
  accountLogin,
  pending = false,
  onClose,
  onConfirm,
}: CreateCharacterModalProps) {
  const { t } = useTranslation('panel')

  const [name, setName] = useState('')
  const [raceId, setRaceId] = useState(0)
  const [sex, setSex] = useState<0 | 1>(0)
  const [classId, setClassId] = useState(0)
  const [hairStyle, setHairStyle] = useState(0)
  const [hairColor, setHairColor] = useState(0)
  const [face, setFace] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)

  const activeRace = CHARACTER_CREATION_RACES.find((r) => r.id === raceId) ?? CHARACTER_CREATION_RACES[0]

  function handleSelectRace(newRaceId: number) {
    setRaceId(newRaceId)
    const targetRace = CHARACTER_CREATION_RACES.find((r) => r.id === newRaceId)
    if (targetRace && !targetRace.startingClasses.some((c) => c.id === classId)) {
      setClassId(targetRace.startingClasses[0]?.id ?? 0)
    }
    setValidationError(null)
  }

  function handleSelectSex(newSex: 0 | 1) {
    setSex(newSex)
    const maxHair = newSex === 1 ? 6 : 4
    if (hairStyle > maxHair) {
      setHairStyle(0)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const cleaned = name.trim()
    if (!cleaned) {
      setValidationError(t('accounts.createCharModal.errors.nameRequired', { defaultValue: 'Informe o nick do personagem.' }))
      return
    }
    if (cleaned.length < 2 || cleaned.length > 16 || !/^[a-zA-Z0-9]+$/.test(cleaned)) {
      setValidationError(t('accounts.createCharModal.errors.nameInvalid', { defaultValue: 'Nick deve conter entre 2 e 16 letras ou números, sem espaços.' }))
      return
    }
    setValidationError(null)
    await onConfirm({
      login: accountLogin,
      name: cleaned,
      race: raceId,
      class_id: classId,
      sex,
      hair_style: hairStyle,
      hair_color: hairColor,
      face,
    })
  }

  const maxHairStyles = sex === 1 ? 7 : 5
  const hairStyleOptions = Array.from({ length: maxHairStyles }, (_, i) => i)
  const hairColorOptions = [0, 1, 2, 3]
  const faceOptions = [0, 1, 2]

  const activeClass = activeRace.startingClasses.find((c) => c.id === classId) ?? activeRace.startingClasses[0]

  return (
    <Modal
      className="create-character-modal"
      open={open}
      title={t('accounts.createCharModal.title', { defaultValue: 'Criar Novo Personagem' })}
      onClose={onClose}
    >
      <form className="create-char-form" onSubmit={handleSubmit}>
        <div className="create-char-grid">
          {/* ========================================================
              COLUNA ESQUERDA: PREVIEW EM TEMPO REAL DO PERSONAGEM
              ======================================================== */}
          <aside className="create-char-preview-panel">
            <div className="create-char-preview-card">
              <div className="create-char-avatar-frame">
                <CharacterAvatar
                  name={name || 'Novo Personagem'}
                  race={activeRace.key}
                  sex={sex}
                  classId={classId}
                  size="xl"
                  className="create-char-portrait"
                />
                <span className="create-char-sex-badge">
                  {sex === 1 ? '♀ Feminino' : '♂ Masculino'}
                </span>
              </div>

              <div className="create-char-preview-details">
                <h3 className="create-char-preview-name">
                  {name.trim() || t('accounts.createCharModal.unnamed', { defaultValue: 'Sem Nome' })}
                </h3>
                <div className="create-char-preview-tags">
                  <span className="create-char-tag race-tag">{activeRace.name}</span>
                  <span className="create-char-tag class-tag">{activeClass?.name}</span>
                </div>
                <p className="create-char-preview-meta">
                  <span>Lv 1</span> • <span>Conta: {accountLogin}</span>
                </p>
                <div className="create-char-visual-summary">
                  <span>Cabelo: #{hairStyle + 1}</span>
                  <span>Cor: #{hairColor + 1}</span>
                  <span>Rosto: #{face + 1}</span>
                </div>
              </div>
            </div>

            <div className="create-char-lore-card">
              <span className="create-char-lore-title">
                <Sparkles aria-hidden="true" />
                {activeRace.name}
              </span>
              <p className="create-char-lore-text">{activeRace.lore}</p>
            </div>
          </aside>

          {/* ========================================================
              COLUNA DIREITA: CUSTOMIZAÇÃO (NICK, RAÇA, CLASSE, VISUAL)
              ======================================================== */}
          <div className="create-char-controls-panel">
            {/* 1. Nome do personagem */}
            <div className="create-char-section">
              <label className="create-char-section-label" htmlFor="char-name-input">
                {t('accounts.createCharModal.nameLabel', { defaultValue: '1. Nick do Personagem' })}
              </label>
              <input
                id="char-name-input"
                name="name"
                className="input create-char-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                placeholder={t('accounts.createCharModal.namePlaceholder', { defaultValue: 'Ex: SirLancelot' })}
                maxLength={16}
                required
                autoFocus
              />
              <span className="create-char-hint">
                {t('accounts.createCharModal.nameHint', { defaultValue: 'Use 2 a 16 letras ou números (sem caracteres especiais).' })}
              </span>
            </div>

            {/* 2. Seleção de Raça */}
            <div className="create-char-section">
              <span className="create-char-section-label">
                {t('accounts.createCharModal.raceLabel', { defaultValue: '2. Raça' })}
              </span>
              <div className="create-char-races-grid" role="radiogroup" aria-label="Raça">
                {CHARACTER_CREATION_RACES.map((r) => {
                  const selected = r.id === raceId
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`create-char-race-btn ${selected ? 'is-selected' : ''}`}
                      onClick={() => handleSelectRace(r.id)}
                    >
                      <span className="race-btn-name">{r.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Gênero / Sexo */}
            <div className="create-char-section">
              <span className="create-char-section-label">
                {t('accounts.createCharModal.genderLabel', { defaultValue: '3. Gênero' })}
              </span>
              <div className="create-char-gender-options" role="radiogroup" aria-label="Gênero">
                <button
                  type="button"
                  role="radio"
                  aria-checked={sex === 0}
                  className={`btn-gender ${sex === 0 ? 'is-selected' : ''}`}
                  onClick={() => handleSelectSex(0)}
                >
                  <User aria-hidden="true" />
                  <span>{t('accounts.createCharModal.male', { defaultValue: 'Masculino' })}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={sex === 1}
                  className={`btn-gender ${sex === 1 ? 'is-selected' : ''}`}
                  onClick={() => handleSelectSex(1)}
                >
                  <User aria-hidden="true" />
                  <span>{t('accounts.createCharModal.female', { defaultValue: 'Feminino' })}</span>
                </button>
              </div>
            </div>

            {/* 4. Classe Inicial */}
            <div className="create-char-section">
              <span className="create-char-section-label">
                {t('accounts.createCharModal.classLabel', { defaultValue: '4. Classe Inicial' })}
              </span>
              <div className="create-char-classes-list" role="radiogroup" aria-label="Classe">
                {activeRace.startingClasses.map((cls) => {
                  const selected = cls.id === classId
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`create-char-class-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setClassId(cls.id)
                        setValidationError(null)
                      }}
                    >
                      <div className="class-card-header">
                        <span className="class-card-icon">
                          {cls.type === 'fighter' ? <Sword aria-hidden="true" /> : <Wand2 aria-hidden="true" />}
                        </span>
                        <strong className="class-card-name">{cls.name}</strong>
                        <span className="class-card-type">
                          {cls.type === 'fighter'
                            ? t('accounts.createCharModal.fighter', { defaultValue: 'Guerreiro' })
                            : t('accounts.createCharModal.mystic', { defaultValue: 'Místico' })}
                        </span>
                      </div>
                      <p className="class-card-desc">{cls.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Customização Visual (Cabelo, Cor, Rosto) */}
            <div className="create-char-section">
              <span className="create-char-section-label">
                {t('accounts.createCharModal.visualLabel', { defaultValue: '5. Personalização Visual' })}
              </span>
              <div className="create-char-appearance-grid">
                {/* Estilo de cabelo */}
                <div className="appearance-group">
                  <span className="appearance-sublabel">
                    {t('accounts.createCharModal.hairStyle', { defaultValue: 'Estilo de Cabelo' })}
                  </span>
                  <div className="appearance-pills">
                    {hairStyleOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn-pill ${hairStyle === opt ? 'is-active' : ''}`}
                        onClick={() => setHairStyle(opt)}
                      >
                        {opt + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor de cabelo */}
                <div className="appearance-group">
                  <span className="appearance-sublabel">
                    {t('accounts.createCharModal.hairColor', { defaultValue: 'Cor de Cabelo' })}
                  </span>
                  <div className="appearance-pills">
                    {hairColorOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn-pill color-pill color-${opt} ${hairColor === opt ? 'is-active' : ''}`}
                        onClick={() => setHairColor(opt)}
                      >
                        Cor {opt + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rosto / Face */}
                <div className="appearance-group">
                  <span className="appearance-sublabel">
                    {t('accounts.createCharModal.face', { defaultValue: 'Rosto' })}
                  </span>
                  <div className="appearance-pills">
                    {faceOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn-pill ${face === opt ? 'is-active' : ''}`}
                        onClick={() => setFace(opt)}
                      >
                        Rosto {opt + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {validationError ? (
              <div className="create-char-error-notice" role="alert">
                <Shield aria-hidden="true" />
                <span>{validationError}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="create-char-actions">
          <Button variant="ghost" type="button" onClick={onClose} disabled={pending}>
            {t('common.cancel', { defaultValue: 'Cancelar' })}
          </Button>
          <Button variant="primary" type="submit" disabled={pending || !name.trim()}>
            {pending
              ? t('accounts.createCharModal.creating', { defaultValue: 'Criando personagem...' })
              : t('accounts.createCharModal.submit', { defaultValue: 'Criar Personagem' })}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
