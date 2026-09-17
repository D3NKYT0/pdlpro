import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { ItemIcon } from '../components/ItemIcon'
import { CharacterAvatar } from '../components/character/CharacterAvatar'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCompactQuantity } from '../lib/formatters'
import { serverApi } from '../services/api'

const STORE_TYPES = ['sell', 'buy', 'package', 'craft'] as const
const STORES_STALE_MS = 30_000

export function StoresPage() {
  const { t } = useTranslation('public')
  const { t: tPanel } = useTranslation('panel')
  const [search, setSearch] = useState('')
  const [storeType, setStoreType] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const query = useQuery({
    queryKey: ['game-stores', debouncedSearch.trim(), storeType],
    queryFn: () => serverApi.stores(debouncedSearch.trim(), storeType),
    staleTime: STORES_STALE_MS,
    placeholderData: keepPreviousData,
  })
  const stores = query.data?.stores ?? []
  const available = query.data?.available !== false

  return (
    <div className="public-page stores-page">
      <PublicHero
        kicker={t('stores.eyebrow')}
        title={t('stores.title')}
        description={t('stores.description')}
      />
      <div className="container">
        <div className="public-faq-tools" data-store-filter={storeType || 'all'}>
          <label>
            {t('stores.search')}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            {t('stores.type')}
            <select value={storeType} onChange={(event) => setStoreType(event.target.value)}>
              <option value="">{t('stores.allTypes')}</option>
              {STORE_TYPES.map((type) => (
                <option key={type} value={type}>{t(`stores.types.${type}`)}</option>
              ))}
            </select>
          </label>
        </div>
        {query.isLoading ? <PublicEmpty>{t('stores.loading')}</PublicEmpty> : null}
        {query.isError ? <PublicEmpty>{t('stores.error')}</PublicEmpty> : null}
        {!query.isLoading && !query.isError && !available ? (
          <PublicEmpty>{t('stores.unavailable')}</PublicEmpty>
        ) : null}
        {!query.isLoading && !query.isError && available && stores.length === 0 ? (
          <PublicEmpty>{t('stores.empty')}</PublicEmpty>
        ) : null}
        {!query.isLoading && available && stores.length > 0 ? (
          <div className="public-grid">
            {stores.map((store) => {
              const town = tPanel(`character.towns.${store.town}`, { defaultValue: store.town })
              const race = t(`stores.races.${store.race}`, { defaultValue: store.race })
              const sex = t(store.sex === 1 ? 'stores.sex.female' : 'stores.sex.male')
              return (
                <article
                  className="public-tile"
                  data-store-type={store.store_type}
                  key={`${store.char_id}-${store.title}-${store.store_type}`}
                >
                  <div>
                    <header className="stores-head">
                      <CharacterAvatar
                        className="stores-avatar"
                        name={store.name}
                        race={store.race}
                        sex={store.sex}
                        size="xl"
                        alt={t('stores.avatarAlt', { name: store.name, race, sex })}
                      />
                      <div>
                        <span className="public-kicker stores-type">
                          {t(`stores.types.${store.store_type}`, { defaultValue: store.store_type })}
                        </span>
                        <h3>{store.name}</h3>
                        <p>{store.title || t('stores.noTitle')}</p>
                        <div className="stores-place">
                          <MapPin aria-hidden="true" />
                          <span>
                            <strong>{t('stores.place', { town })}</strong>
                            <small>{t('stores.coords', { x: store.x, y: store.y, z: store.z })}</small>
                            {store.clan_name ? <small>{store.clan_name}</small> : null}
                          </span>
                        </div>
                      </div>
                    </header>
                    <ul className="stores-item-list">
                      {store.items.map((item) => (
                        <li key={`${store.char_id}-${item.item_id}-${item.enchant}-${item.price}`}>
                          <span className="stores-item-icons">
                            <ItemIcon itemId={item.item_id} name={item.name} size={28} />
                            {item.result_item_id ? (
                              <>
                                <span className="stores-recipe-arrow" aria-hidden="true" />
                                <ItemIcon
                                  className="stores-item-result"
                                  itemId={item.result_item_id}
                                  name={t('stores.recipeResult', { name: item.result_name || item.name })}
                                  size={28}
                                />
                              </>
                            ) : null}
                          </span>
                          <span>
                            <strong>{item.name}</strong>
                            {item.enchant > 0 ? ` ${t('stores.enchant', { value: item.enchant })}` : ''}
                            <small> ×{item.quantity}</small>
                          </span>
                          <b>{t('stores.price', { price: formatCompactQuantity(item.price) })}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
