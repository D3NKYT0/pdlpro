// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { lineageApi } from '../../services/api'
import { ManageAccountModal } from './ManageAccountModal'

vi.mock('../../services/domain/lineage.service', () => ({
  lineageApi: {
    changePassword: vi.fn(),
    unlink: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ManageAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders primary active account correctly without unlink button', () => {
    render(
      <ManageAccountModal
        open={true}
        account={{ login: 'denky', is_primary: true, linked: true }}
        isActive={true}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Gerenciar Conta: denky')).toBeInTheDocument()
    expect(screen.getByText('Conta principal')).toBeInTheDocument()
    expect(screen.getByText('Conta ativa')).toBeInTheDocument()
    expect(screen.getByText('Alterar senha do jogo')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nova senha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Confirmar nova senha/i)).toBeInTheDocument()
    expect(
      screen.getAllByText('A conta principal está vinculada à sua conta mestre e não pode ser desvinculada.').length,
    ).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /Desvincular do painel/i })).not.toBeInTheDocument()
  })

  it('renders additional inactive account with activate button and unlink option', async () => {
    const onSelectActive = vi.fn()
    const user = userEvent.setup()

    render(
      <ManageAccountModal
        open={true}
        account={{ login: 'alt1', is_primary: false, linked: true }}
        isActive={false}
        onClose={vi.fn()}
        onSelectActive={onSelectActive}
      />,
    )

    expect(screen.getByText('Gerenciar Conta: alt1')).toBeInTheDocument()
    expect(screen.getByText('Conta adicional vinculada')).toBeInTheDocument()
    expect(screen.getByText('Inativa')).toBeInTheDocument()

    const activateBtn = screen.getByRole('button', { name: /Definir como ativa/i })
    await user.click(activateBtn)
    expect(onSelectActive).toHaveBeenCalledWith('alt1')

    const unlinkBtn = screen.getByRole('button', { name: /Desvincular do painel/i })
    expect(unlinkBtn).toBeInTheDocument()
  })

  it('submits password change when valid and notifies user', async () => {
    vi.mocked(lineageApi.changePassword).mockResolvedValue({ ok: true })
    const onPasswordChangeSuccess = vi.fn()
    const user = userEvent.setup()

    render(
      <ManageAccountModal
        open={true}
        account={{ login: 'denky', is_primary: true, linked: true }}
        isActive={true}
        onClose={vi.fn()}
        onPasswordChangeSuccess={onPasswordChangeSuccess}
      />,
    )

    const newPassInput = screen.getByPlaceholderText('No mínimo 8 caracteres')
    const confirmPassInput = screen.getByPlaceholderText('Repita a nova senha')
    const saveBtn = screen.getByRole('button', { name: /Salvar nova senha/i })

    expect(saveBtn).toBeDisabled()

    await user.type(newPassInput, 'newPass1234')
    await user.type(confirmPassInput, 'newPass1234')

    expect(saveBtn).not.toBeDisabled()
    await user.click(saveBtn)

    await waitFor(() => {
      expect(lineageApi.changePassword).toHaveBeenCalledWith('denky', 'newPass1234')
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Senha da conta denky alterada'))
      expect(onPasswordChangeSuccess).toHaveBeenCalled()
    })
  })

  it('handles unlink flow with confirmation for secondary accounts', async () => {
    vi.mocked(lineageApi.unlink).mockResolvedValue({ ok: true } as any)
    const onUnlinkSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <ManageAccountModal
        open={true}
        account={{ login: 'secondary1', is_primary: false, linked: true }}
        isActive={false}
        onClose={onClose}
        onUnlinkSuccess={onUnlinkSuccess}
      />,
    )

    const unlinkBtn = screen.getByRole('button', { name: /Desvincular do painel/i })
    await user.click(unlinkBtn)

    expect(screen.getByText(/Tem certeza que deseja desvincular a conta secondary1/i)).toBeInTheDocument()

    const confirmBtns = screen.getAllByRole('button', { name: /Desvincular do painel/i })
    await user.click(confirmBtns[confirmBtns.length - 1])

    await waitFor(() => {
      expect(lineageApi.unlink).toHaveBeenCalledWith('secondary1')
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('desvinculada com sucesso'))
      expect(onUnlinkSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
