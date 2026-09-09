import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import type { FormEvent } from 'react'
import {
  BadgeDollarSign,
  Store,
  UserRound,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { getClassName } from '../../lib/lineage'

interface CharacterOption {
  char_id: number
  name: string
  level: number
  class_id: number
  online: boolean
  pvp: number
  pk: number
  clan_name: string
  title: string
}

interface EquipmentPreview {
  item_id: number
  name?: string | null
  slot?: number | null
}

interface MarketplaceSellFormProps {
  characters: CharacterOption[]
  charId: string
  price: string
  notes: string
  publishing: boolean
  equipmentLoading: boolean
  equipment: EquipmentPreview[]
  onCharChange: (value: string) => void
  onPriceChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function MarketplaceSellForm({
  characters,
  charId,
  price,
  notes,
  publishing,
  equipmentLoading,
  equipment,
  onCharChange,
  onPriceChange,
  onNotesChange,
  onSubmit,
}: MarketplaceSellFormProps) {
  const selectedCharacter = characters.find((character) => String(character.char_id) === charId)

  return (
    <Card className="marketplace-sell-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">Novo anúncio</span>
          <h2>Vender personagem</h2>
        </div>
        <BadgeDollarSign aria-hidden="true" />
      </div>
      <form onSubmit={onSubmit}>
        <Field>
          Personagem
          <select value={charId} onChange={(event) => onCharChange(event.target.value)} required>
            <option value="">Selecione para visualizar</option>
            {characters.map((char) => (
              <option key={char.char_id} value={char.char_id}>
                {char.name} — nível {char.level}
              </option>
            ))}
          </select>
        </Field>

        {selectedCharacter ? (
          <div className="marketplace-character-preview">
            <div className="marketplace-character-preview-head">
              <div className="marketplace-character-emblem"><UserRound aria-hidden="true" /></div>
              <div>
                <span className="panel-eyebrow">Prévia do anúncio</span>
                <strong>{selectedCharacter.name}</strong>
                <small>{getClassName(selectedCharacter.class_id)} · nível {selectedCharacter.level}</small>
              </div>
              <span className={`marketplace-online-state ${selectedCharacter.online ? 'online' : 'offline'}`}>
                {selectedCharacter.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <dl className="marketplace-character-preview-stats">
              <div><dt>PvP</dt><dd>{selectedCharacter.pvp.toLocaleString('pt-BR')}</dd></div>
              <div><dt>PK</dt><dd>{selectedCharacter.pk.toLocaleString('pt-BR')}</dd></div>
              <div><dt>Clã</dt><dd>{selectedCharacter.clan_name || 'Sem clã'}</dd></div>
              <div><dt>Título</dt><dd>{selectedCharacter.title || 'Sem título'}</dd></div>
            </dl>
            <div className="marketplace-character-preview-equipment">
              <span>Equipamentos que aparecerão no anúncio</span>
              {equipmentLoading ? <small>Carregando equipamentos...</small> : null}
              {!equipmentLoading ? (
                <div>
                  {equipment.slice(0, 10).map((item, index) => (
                    <ItemIcon itemId={item.item_id} name={item.name} size={32} key={`${item.item_id}-${item.slot ?? index}`} />
                  ))}
                  {!equipment.length ? <small>Nenhum equipamento encontrado.</small> : null}
                </div>
              ) : null}
            </div>
            {selectedCharacter.online ? <p>O personagem precisa estar offline para ser anunciado.</p> : null}
          </div>
        ) : null}

        <Field>
          Preço
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => onPriceChange(event.target.value)} placeholder="0,00" required />
        </Field>
        <Field>
          Descrição para o comprador
          <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} maxLength={500} placeholder="Destaques, build ou observações do personagem" />
        </Field>
        <Button type="submit" disabled={publishing || !selectedCharacter || selectedCharacter.online}>
          <Store aria-hidden="true" /> {publishing ? 'Publicando...' : 'Publicar anúncio'}
        </Button>
      </form>
    </Card>
  )
}
