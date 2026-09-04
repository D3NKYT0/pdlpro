import { describe, expect, it } from 'vitest'
import type { ApiUser } from '../../services/types'
import { helpIdentity } from './identity'

const user = (fields: Partial<ApiUser> = {}): ApiUser => ({
  id: '1', username: 'dani', email: 'd@example.com', display_name: 'Daniel Silva', bio: '', role: 'player',
  is_email_verified: true, fichas: 0, avatar_url: null, ...fields,
})

describe('identidade do Denkynho', () => {
  it('sugere o primeiro nome válido da sessão', () => {
    expect(helpIdentity(user())).toMatchObject({ suggestedName: 'Daniel', role: 'player', roleLabel: 'jogador' })
  })

  it('prioriza superadministrador e reconhece equipe', () => {
    expect(helpIdentity(user({ role: 'staff', is_staff_member: true })).role).toBe('staff')
    expect(helpIdentity(user({ role: 'staff', is_superuser: true })).role).toBe('superadmin')
  })

  it('não usa um nome de conta recusado pelo filtro', () => {
    expect(helpIdentity(user({ display_name: 'R0L4' })).suggestedName).toBeUndefined()
  })
})
