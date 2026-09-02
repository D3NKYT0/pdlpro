import { afterEach, expect, it, vi } from 'vitest'
import { creationOptions, credentialJSON, requestOptions } from './webauthn'

const bytes = () => new Uint8Array([251, 255, 0]).buffer
class Attestation {
  clientDataJSON = bytes()
  attestationObject = bytes()
  getTransports() { return ['internal'] }
}
class Assertion {
  clientDataJSON = bytes()
  authenticatorData = bytes()
  signature = bytes()
  userHandle: ArrayBuffer | null = bytes()
}
afterEach(() => vi.unstubAllGlobals())

it('converte opções de criação sem alterar o payload original', () => {
  const original = { challenge: '-_8A', user: { id: '-_8A', name: 'hero' }, excludeCredentials: [{ id: '-_8A', type: 'public-key' }] }
  const options = creationOptions(original)
  expect(new Uint8Array(options.challenge as ArrayBuffer)).toEqual(new Uint8Array([251, 255, 0]))
  expect(new Uint8Array(options.user.id as ArrayBuffer)).toEqual(new Uint8Array([251, 255, 0]))
  expect(options.excludeCredentials?.[0].type).toBe('public-key')
  expect(original.challenge).toBe('-_8A')
  expect(original.user.id).toBe('-_8A')
})

it('usa listas vazias quando não há credenciais cadastradas', () => {
  expect(creationOptions({ challenge: 'AA', user: { id: 'AA' } }).excludeCredentials).toEqual([])
  expect(requestOptions({ challenge: 'AA' }).allowCredentials).toEqual([])
})

it('converte IDs permitidos e preserva timeout e rpId', () => {
  const result = requestOptions({ challenge: '-_8A', allowCredentials: [{ id: '-_8A', type: 'public-key' }], timeout: 60000, rpId: 'test.dev' })
  expect(result.timeout).toBe(60000)
  expect(result.rpId).toBe('test.dev')
  expect(new Uint8Array(result.allowCredentials![0].id as ArrayBuffer)).toEqual(new Uint8Array([251, 255, 0]))
})

it.each(['attestation', 'assertion', 'anonymous'])('serializa resposta %s em base64url sem padding', kind => {
  vi.stubGlobal('AuthenticatorAttestationResponse', Attestation)
  vi.stubGlobal('AuthenticatorAssertionResponse', Assertion)
  const response = kind === 'attestation' ? new Attestation() : new Assertion()
  if (kind === 'anonymous') (response as Assertion).userHandle = null
  const result = credentialJSON({ id: 'key', rawId: bytes(), type: 'public-key', authenticatorAttachment: 'platform', getClientExtensionResults: () => ({ credProps: { rk: true } }), response } as unknown as PublicKeyCredential)
  expect(result.rawId).toBe('-_8A')
  expect(result.clientExtensionResults).toEqual({ credProps: { rk: true } })
  expect(result.response).toEqual(kind === 'attestation'
    ? { clientDataJSON: '-_8A', attestationObject: '-_8A', transports: ['internal'] }
    : { clientDataJSON: '-_8A', authenticatorData: '-_8A', signature: '-_8A', userHandle: kind === 'anonymous' ? null : '-_8A' })
})
