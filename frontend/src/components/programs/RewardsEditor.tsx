import { Button } from '../ui/Button'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Reward } from '../../services/api'

export function RewardsEditor({
  value,
  onChange,
}: {
  value: Reward[]
  onChange: (rows: Reward[]) => void
}) {
  const { t } = useTranslation('admin')
  const update = (index: number, patch: Partial<Reward>) =>
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  return (
    <div className="program-page">
      <h3>{t('gameContent.rewardsEditor.title')}</h3>
      {value.map((r, index) => (
        <div className="program-item" key={index}>
          <div className="program-fields">
            <label>
              {t('gameContent.rewardsEditor.type')}
              <select
                value={r.kind}
                onChange={(e) => update(index, { kind: e.target.value })}
              >
                <option value="item">{t('gameContent.rewardsEditor.kindItem')}</option>
                <option value="tokens">{t('gameContent.rewardsEditor.kindTokens')}</option>
                <option value="balance">{t('gameContent.rewardsEditor.kindBalance')}</option>
                <option value="bonus">{t('gameContent.rewardsEditor.kindBonus')}</option>
              </select>
            </label>
            <label>
              {t('gameContent.rewardsEditor.quantity')}
              <input
                type="number"
                min={r.kind === 'item' || r.kind === 'tokens' ? 1 : 0.01}
                step={r.kind === 'item' || r.kind === 'tokens' ? 1 : 0.01}
                required
                value={r.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
              />
            </label>
            {r.kind === 'item' && (
              <>
                <label>
                  {t('gameContent.rewardsEditor.itemId')}
                  <input
                    type="number"
                    min={1}
                    required
                    value={r.item_id || ''}
                    onChange={(e) =>
                      update(index, { item_id: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  {t('gameContent.rewardsEditor.name')}
                  <input
                    required
                    maxLength={120}
                    value={r.name || ''}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </label>
                <label>
                  {t('gameContent.rewardsEditor.enchant')}
                  <input
                    type="number"
                    min={0}
                    max={65535}
                    value={r.enchant || 0}
                    onChange={(e) =>
                      update(index, { enchant: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            )}
          </div>
          <Button
            type="button"
            className="ghost"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 size={14} />
            {t('gameContent.rewardsEditor.remove')}
          </Button>
        </div>
      ))}
      <div className="program-actions">
        <Button
          type="button"
          className="ghost"
          onClick={() =>
            onChange([
              ...value,
              {
                kind: 'item',
                item_id: 57,
                name: 'Adena',
                quantity: 1,
                enchant: 0,
              },
            ])
          }
        >
          <Plus size={16} />
          {t('gameContent.rewardsEditor.add')}
        </Button>
      </div>
    </div>
  )
}
