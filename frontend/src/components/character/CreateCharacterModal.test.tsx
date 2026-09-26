// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { CreateCharacterModal } from './CreateCharacterModal'

afterEach(() => {
  cleanup()
})

it('renderiza campos de criação de personagem e preview inicial', () => {
  render(
    <CreateCharacterModal
      open={true}
      accountLogin="denky"
      onClose={vi.fn()}
      onConfirm={vi.fn()}
    />,
  )

  expect(screen.getByText('Criar Novo Personagem')).toBeVisible()
  expect(screen.getByLabelText(/1\. Nick do Personagem/i)).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Humano' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Elfo' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Elfo Negro' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Orc' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Anão' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /Masculino/i })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /Feminino/i })).toBeInTheDocument()
})

it('permite preencher o nick, trocar raça e submeter a criação', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn().mockResolvedValue(undefined)

  render(
    <CreateCharacterModal
      open={true}
      accountLogin="denky"
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />,
  )

  const input = screen.getByLabelText(/1\. Nick do Personagem/i)
  await user.type(input, 'Legolas')

  // Troca para Elfo
  await user.click(screen.getByRole('radio', { name: 'Elfo' }))

  // Troca gênero para Feminino
  await user.click(screen.getByRole('radio', { name: /Feminino/i }))

  // Clica no botão de submit
  await user.click(screen.getByRole('button', { name: 'Criar Personagem' }))

  expect(onConfirm).toHaveBeenCalledWith({
    login: 'denky',
    name: 'Legolas',
    race: 1, // Elfo
    class_id: 18, // Elven Fighter
    sex: 1, // Feminino
    hair_style: 0,
    hair_color: 0,
    face: 0,
  })
})

it('valida nick curto ou com caracteres inválidos', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn()

  render(
    <CreateCharacterModal
      open={true}
      accountLogin="denky"
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />,
  )

  const input = screen.getByLabelText(/1\. Nick do Personagem/i)
  await user.type(input, 'A')

  await user.click(screen.getByRole('button', { name: 'Criar Personagem' }))
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/Nick deve conter entre 2 e 16 letras ou números/i)
})
