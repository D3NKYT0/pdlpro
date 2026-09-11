"""Catálogo de msgids PT das mensagens de domínio para ``makemessages``.

O domínio não importa Django; as strings abaixo espelham os ``message = "..."`` de
``*/domain/exceptions.py`` e ``common.architecture.exceptions`` para que o gettext
as colete. Não altere os arquivos de domínio a partir daqui.
"""

from django.utils.translation import gettext as _

# common.architecture.exceptions
_("Não foi possível processar a solicitação.")
_("O recurso solicitado não foi encontrado.")
_("A solicitação conflita com o estado atual do recurso.")
_("Você não tem permissão para realizar esta ação.")
_("Verifique os dados informados e tente novamente.")

# apps.accounts.domain.exceptions
_("Usuário não encontrado.")
_("Este nome de usuário já está em uso.")
_("Este e-mail já está em uso.")
_("Usuário ou senha inválidos.")
_("O servidor está em período de lançamento. O login está restrito à equipe no momento.")
_("Código 2FA inválido.")
_("Sessão não encontrada.")
_("Refresh token inválido.")
_("Não foi possível validar esta chave de acesso.")
_("Não foi possível concluir a autenticação social.")

# apps.auction.domain.exceptions
_("Leilão não encontrado.")
_("Este leilão não está ativo.")
_("Lance inválido.")
_("Você não pode dar lance no próprio leilão.")
_("Duração do leilão inválida.")

# apps.games.domain.exceptions
_("Fichas insuficientes.")
_("Você já resgatou o bônus de hoje.")
_("Este jogo não está ativo.")
_("Esta caixa não tem boosters restantes.")
_("Essa caixa não pertence a você.")
_("Recompensa inválida.")

# apps.inventory.domain.exceptions
_("Inventário não encontrado.")
_("Este item não pode ser retirado do jogo.")
_("Quantidade insuficiente no inventário do painel.")

# apps.marketplace.domain.exceptions
_("Anúncio não encontrado.")
_("Este personagem não está à venda.")
_("Você não pode comprar o próprio personagem.")
_("Este personagem já está listado para venda.")
_("A conta já atingiu o limite de personagens do cliente Lineage 2.")
_("O preço deve ser maior que zero.")

# apps.payment.domain.exceptions
_("Pedido de pagamento não encontrado.")
_("Este pedido já foi confirmado.")
_("Método de pagamento indisponível.")
_("Este pedido não pode ser alterado.")
_("Valor inválido.")
_("Falha ao iniciar o pagamento.")

# apps.programs.domain.exceptions
_("Cadastro de apoiador não encontrado.")
_("Pedido de repasse não encontrado.")
_("Entrada do roadmap não encontrada.")
_("Recurso do sistema não encontrado.")
_("Não foi possível processar a solicitação do programa.")

# apps.server.domain.exceptions
_("O banco do servidor Lineage não está disponível.")
_("Conta Lineage não encontrada.")
_("Já existe uma conta Lineage com este login.")
_("Esta conta Lineage já está vinculada.")
_("Limite de contas vinculadas atingido. Compre um slot extra.")
_("O personagem precisa estar offline.")
_("Este nick já está em uso.")

# apps.support.domain.exceptions
_("Chamado não encontrado.")
_("Esta ação não está disponível para o chamado.")

# common.error_contract.STATUS_ERROR_MESSAGES
_("Autenticação necessária.")
_("Método não permitido.")
_("O conteúdo enviado excede o tamanho permitido.")
_("Formato de conteúdo não suportado.")
_("Muitas tentativas. Aguarde um momento e tente novamente.")
_("Ocorreu um erro interno. Tente novamente em instantes.")
_("Um serviço necessário respondeu com erro.")
_("Serviço temporariamente indisponível.")
_("Um serviço necessário demorou demais para responder.")

# presentation / validators (API)
_("Use apenas letras e números, sem espaços ou símbolos.")
_("O nome de usuário deve ter entre 3 e 16 caracteres.")
_("Resolva o CAPTCHA para criar sua conta.")
_("Resolva o CAPTCHA para continuar.")
_("Validação CSRF necessária.")
_("Refresh token ausente.")
_("Não foi possível autenticar com esta chave.")
_("Use 3 a 16 letras ou números, sem espaços.")
_("Conecte o banco do jogo para transferir moedas.")
_("Selecione uma recompensa.")
_("Use um nome de até 30 letras, sem termos ofensivos.")
_("Personagem não encontrado nesta conta.")
_("Transferência de moedas indisponível neste servidor.")
_("Observação de itens indisponível neste gateway.")
_("Carteira não encontrada.")
_("Saldo insuficiente.")
_("Transferência inválida.")
_("Saldo insuficiente. Bônus não pode ser enviado ao jogo.")
_("Informe um código válido do autenticador.")
_("Código do autenticador")
_("Ação 2FA inválida.")
_("ID de item inválido.")
_("Assinatura inválida.")
_("Metadados JSON inválidos.")
_("Configuração desconhecida.")
_("Jogo desconhecido.")
_("Imagem inválida.")
_("Você não tem permissão para esta ação.")
_("recurso não encontrado")
_("Não foi possível consultar os itens. Confira a conexão L2 e o módulo SQL.")
