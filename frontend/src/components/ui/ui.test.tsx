// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { createRef, useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Button, ButtonLink, IconButton } from './Button'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Field } from './Field'
import { EmptyState, ErrorNotice, LoadingState } from './Feedback'
import { PageHeader } from './PageHeader'
import { Tabs } from './Tabs'
import { Toggle } from './Toggle'
import { Pagination } from './Pagination'

afterEach(cleanup)
it('link estilizado mantém navegação e semântica de link', async () => {
  render(<MemoryRouter><Routes><Route path="/" element={<ButtonLink to="/destino" variant="secondary" size="sm">Ver detalhes</ButtonLink>} /><Route path="/destino" element={<h1>Detalhes</h1>} /></Routes></MemoryRouter>)
  const link = screen.getByRole('link', { name: 'Ver detalhes' })
  expect(link).toHaveAttribute('href', '/destino')
  expect(link).toHaveAttribute('data-theme-part', 'button')
  await userEvent.click(link)
  expect(screen.getByRole('heading', { name: 'Detalhes' })).toBeVisible()
})
it('ação somente com ícone tem nome, teclado e anúncio de envio', async () => {
  const click = vi.fn()
  const { rerender } = render(<IconButton label="Excluir item" variant="danger" onClick={click}><svg aria-hidden="true" /></IconButton>)
  const user = userEvent.setup()
  await user.tab()
  await user.keyboard('{Enter}')
  expect(click).toHaveBeenCalledTimes(1)
  rerender(<IconButton label="Excluir item" variant="danger" busy busyLabel="Excluindo..." onClick={click}><svg aria-hidden="true" /></IconButton>)
  expect(screen.getByRole('button', { name: 'Excluir item: Excluindo...' })).toBeDisabled()
  await user.keyboard('{Enter}')
  expect(click).toHaveBeenCalledTimes(1)
})
it('paginação respeita limites e bloqueia navegação durante a consulta', async () => {
  const change = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(<Pagination page={1} pages={3} onChange={change} />)
  expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: /Próxima/ }))
  expect(change).toHaveBeenLastCalledWith(2)
  rerender(<Pagination page={3} pages={3} onChange={change} />)
  expect(screen.getByRole('button', { name: /Próxima/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: /Anterior/ }))
  expect(change).toHaveBeenLastCalledWith(2)
  rerender(<Pagination page={2} pages={3} busy onChange={change} />)
  await user.click(screen.getByRole('button', { name: /Próxima/ }))
  expect(change).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled()
})
it('botão padrão não envia formulário; submit é explícito', async () => {
  const submit = vi.fn(event => event.preventDefault())
  render(<form onSubmit={submit}><Button>Cancelar</Button><Button type="submit">Salvar</Button></form>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(submit).toHaveBeenCalledTimes(1)
})
it('ação pendente mantém semântica acessível e impede clique', async () => {
  const click = vi.fn()
  render(<Button busy busyLabel="Salvando..." onClick={click}>Salvar</Button>)
  const button = screen.getByRole('button', { name: 'Salvando...' })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  await userEvent.click(button)
  expect(click).not.toHaveBeenCalled()
})
it('campo mantém associação nativa, ref, dica e erro', async () => {
  const ref = createRef<HTMLLabelElement>()
  render(<Field ref={ref} label="Nome" error="Obrigatório" hint="Nome público"><input /></Field>)
  const input = screen.getByRole('textbox', { name: /Nome/ })
  await userEvent.type(input, 'Hero')
  expect(input).toHaveValue('Hero')
  expect(ref.current?.tagName).toBe('LABEL')
  expect(ref.current).toHaveAttribute('data-theme-part', 'field')
  expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório')
})
it('estados de consulta distinguem vazio, carregamento e erro recuperável', async () => {
  const retry = vi.fn()
  render(<><EmptyState>Sem itens</EmptyState><LoadingState /><ErrorNotice error={new Error('Falha na consulta')} onRetry={retry} /></>)
  expect(screen.getByRole('status')).toHaveTextContent('Carregando informações')
  expect(screen.getByRole('status')).toHaveAttribute('data-theme-part', 'loading-state')
  expect(screen.getByRole('alert')).toHaveTextContent('Falha na consulta')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retry).toHaveBeenCalledTimes(1)
})
it('sem erro não cria alerta; erro desconhecido usa fallback', () => {
  const { rerender } = render(<ErrorNotice error={null} />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  rerender(<ErrorNotice error={{ status: 500 }} fallback="Indisponível" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Indisponível')
})
it('cabeçalho compartilha título, descrição e ações', () => {
  render(<PageHeader title="Inventário" eyebrow="Jogador" description="Seus itens" actions={<Button>Atualizar</Button>} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inventário')
  expect(screen.getByRole('banner')).toHaveAttribute('data-theme-part', 'page-header')
  expect(screen.getByRole('button', { name: 'Atualizar' })).toBeVisible()
})
it('abas funcionam com setas, Home/End e mantêm um ponto de tabulação', async () => {
  function Example() {
    const [value, setValue] = useState('one')
    return <Tabs id="example" label="Seções" items={[{ id: 'one', label: 'Primeira' }, { id: 'two', label: 'Segunda' }]} value={value} onChange={setValue} />
  }
  render(<Example />)
  const user = userEvent.setup()
  await user.tab()
  await user.keyboard('{ArrowRight}')
  const second = screen.getByRole('tab', { name: 'Segunda' })
  expect(second.parentElement).toHaveAttribute('data-theme-part', 'tabs')
  expect(second).toHaveFocus()
  expect(second).toHaveAttribute('aria-selected', 'true')
  expect(second).toHaveAttribute('aria-controls', 'example-panel-two')
  await user.keyboard('{Home}')
  expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveFocus()
  await user.keyboard('{ArrowLeft}')
  expect(second).toHaveFocus()
  await user.keyboard('{End}')
  expect(second).toHaveFocus()
})
it('toggle usa checkbox nativo e bloqueia alterações durante envio', async () => {
  const change = vi.fn()
  const { rerender } = render(<Toggle label="Disponível" checked={false} onChange={change} />)
  const user = userEvent.setup()
  await user.tab()
  await user.keyboard(' ')
  expect(change).toHaveBeenCalledTimes(1)
  rerender(<Toggle label="Disponível" checked busy onChange={change} />)
  expect(screen.getByRole('checkbox', { name: 'Disponível' })).toBeDisabled()
})
