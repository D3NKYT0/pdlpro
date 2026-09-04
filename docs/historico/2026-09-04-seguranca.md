# Validação das correções de segurança — 4 de setembro de 2026

[Índice](../README.md) · [Atualização e operação](../operacao/seguranca.md)

Validação local em Windows, Python 3.14, Django 6.0.8 e PostgreSQL 16 descartável. Não foram utilizados pagamentos, e-mails ou operações reais no servidor de jogo.

Foram reproduzidas antes das correções nove regressões de autenticação, autorização, recuperação, limitação de requisições e serviços pagos. A confirmação concorrente de pagamento também reproduziu crédito duplicado antes do bloqueio do pedido e passou depois.

| Verificação | Resultado |
| --- | --- |
| Backend completo com `pytest --cov` | 902 testes passaram; cobertura combinada 86,28%, acima do piso de 84% |
| Concorrência PostgreSQL, `payment/tests/concurrency_postgresql.py` | 1 teste passou; duas confirmações geram um único crédito |
| Frontend, `npm run test:coverage` | 745 testes em 64 arquivos passaram |
| Cobertura frontend | Statements 73,24%; branches 63,64%; funções 65,45%; linhas 75,51%; pisos aprovados |
| `npm run typecheck` e `npm run build` | Passaram |
| Django `check` e `makemigrations --check --dry-run` | Sem problemas e sem migrações pendentes de geração |
| `ruff check .` | 573 apontamentos preexistentes; comparação com o conteúdo de HEAD dos arquivos alterados não identificou novos apontamentos |
| `scripts/audit_reuse.py` | Nenhum grupo candidato |
| Navegador local | Catálogo administrativo, login MFA e personagem conferidos com o tema; formulário administrativo e personagem também em 390 × 844; troca de nickname do personagem fictício concluída |

A cobertura foi revisada por arquivo, incluindo rotação de sessão, prova MFA, reserva de saldo e comando de conciliação. Os testes verificam saldo insuficiente, repetição, resposta incerta, estorno único, chave conflitante, parâmetros inválidos e ausência de alteração quando o estado desejado já existe.

O Ruff global permanece reprovado pelos apontamentos anteriores. O frontend não tem ESLint configurado, conforme o guia de testes; a análise estática executada foi o TypeScript. Duas advertências de depreciação do Daphne no Python 3.14 permanecem. A integração com os bancos e provedores reais exige homologação no ambiente apropriado.

Estas alterações foram validadas no checkout local, sem implantação. A atualização exige a migração `server.0005_characterserviceoperation` e novo login dos usuários, conforme o guia operacional.
