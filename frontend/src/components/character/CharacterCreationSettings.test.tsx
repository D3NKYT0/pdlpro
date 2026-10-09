// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { CharacterCreationSettings, defaultCharacterCreation } from './CharacterCreationSettings'
import type { ApiCharacterCreation } from '../../services/api'

afterEach(cleanup)

function mount() {
  const save = vi.fn()
  function Editor() {
    const [value, setValue] = useState<ApiCharacterCreation>(defaultCharacterCreation)
    return <form onSubmit={event => { event.preventDefault(); save(value) }}>
      <CharacterCreationSettings value={value} onChange={setValue} disabled={false} maxLevel={80} />
      <button type="submit">Save coordinates</button>
    </form>
  }
  render(<Editor />)
  return { user: userEvent.setup(), save }
}

it.each(['X', 'Y', 'Z'])('aceita sinal negativo antes dos dígitos na coordenada %s', async axis => {
  const { user, save } = mount()
  const input = screen.getByLabelText(`Posição inicial ${axis}`)
  await user.clear(input)
  await user.type(input, '-')
  expect(input).toHaveValue('-')
  await user.type(input, '0123')
  expect(input).toHaveValue('-0123')
  await user.click(screen.getByRole('button', { name: 'Save coordinates' }))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ default: expect.objectContaining({ [axis.toLowerCase()]: -123 }) }))
})

it.each(['', '-', '1.5', '1e3', '2147483648', '-2147483649'])('bloqueia salvar coordenada incompleta ou fora do limite: %s', async text => {
  const { user, save } = mount()
  const input = screen.getByLabelText('Posição inicial X')
  await user.clear(input)
  if (text) await user.type(input, text)
  await user.click(screen.getByRole('button', { name: 'Save coordinates' }))
  expect(input).toBeInvalid()
  if (text === "2147483648" || text === "-2147483649") expect((input as HTMLInputElement).validationMessage).toBe("Informe um inteiro entre -2147483648 e 2147483647.")
  expect(save).not.toHaveBeenCalled()
})

it.each(['-2147483648', '2147483647', '0', '123'])('envia a coordenada válida %s como número', async text => {
  const { user, save } = mount()
  const input = screen.getByLabelText('Posição inicial X')
  await user.clear(input)
  await user.type(input, text)
  expect(input).toBeValid()
  await user.click(screen.getByRole('button', { name: 'Save coordinates' }))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ default: expect.objectContaining({ x: Number(text) }) }))
})
