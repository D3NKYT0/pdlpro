"""Fill English and Spanish Django gettext catalogs from Portuguese msgids.

Usage (from backend/):
  .\\.venv\\Scripts\\python.exe scripts\\fill_po_translations.py
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALE = ROOT / "locale"

# Portuguese msgid -> (English, Spanish)
TRANSLATIONS: dict[str, tuple[str, str]] = {
    "Acesso": ("Access", "Acceso"),
    "Perfil": ("Profile", "Perfil"),
    "Status e permissões": ("Status and permissions", "Estado y permisos"),
    "Segurança": ("Security", "Seguridad"),
    "Economia": ("Economy", "Economía"),
    "Termos": ("Terms", "Términos"),
    "Metadados": ("Metadata", "Metadatos"),
    "Nova conta": ("New account", "Nueva cuenta"),
    "Confirme seu e-mail no PDL PRO": (
        "Confirm your email on PDL PRO",
        "Confirma tu correo en PDL PRO",
    ),
    "Olá, %(username)s.\n\nConfirme seu e-mail neste link (válido por 48h):\n%(link)s\n": (
        "Hello, %(username)s.\n\nConfirm your email with this link (valid for 48h):\n%(link)s\n",
        "Hola, %(username)s.\n\nConfirma tu correo con este enlace (válido por 48h):\n%(link)s\n",
    ),
    "Redefinir senha do PDL PRO": (
        "Reset your PDL PRO password",
        "Restablecer la contraseña de PDL PRO",
    ),
    "Olá, %(username)s.\n\nRedefina sua senha neste link (válido por 1 hora):\n%(link)s\n": (
        "Hello, %(username)s.\n\nReset your password with this link (valid for 1 hour):\n%(link)s\n",
        "Hola, %(username)s.\n\nRestablece tu contraseña con este enlace (válido por 1 hora):\n%(link)s\n",
    ),
    "Contas": ("Accounts", "Cuentas"),
    "Usuário": ("User", "Usuario"),
    "Senha": ("Password", "Contraseña"),
    "Confirmação da senha": ("Password confirmation", "Confirmación de la contraseña"),
    "E-mail": ("Email", "Correo electrónico"),
    "Nome de exibição": ("Display name", "Nombre para mostrar"),
    "Biografia": ("Bio", "Biografía"),
    "Avatar": ("Avatar", "Avatar"),
    "Função": ("Role", "Función"),
    "Conta ativa": ("Active account", "Cuenta activa"),
    "Acesso administrativo": ("Staff access", "Acceso administrativo"),
    "Superadministrador": ("Superuser", "Superadministrador"),
    "Grupos": ("Groups", "Grupos"),
    "Permissões específicas": ("Specific permissions", "Permisos específicos"),
    "E-mail verificado": ("Verified email", "Correo verificado"),
    "Autenticação em dois fatores": (
        "Two-factor authentication",
        "Autenticación en dos factores",
    ),
    "Segredo TOTP": ("TOTP secret", "Secreto TOTP"),
    "Último acesso": ("Last login", "Último acceso"),
    "Fichas": ("Tokens", "Fichas"),
    "Aceite dos termos": ("Terms acceptance", "Aceptación de los términos"),
    "Versão dos termos e privacidade": (
        "Terms and privacy version",
        "Versión de los términos y privacidad",
    ),
    "Identificador": ("Identifier", "Identificador"),
    "Criado em": ("Created at", "Creado el"),
    "Atualizado em": ("Updated at", "Actualizado el"),
    "grupos": ("groups", "grupos"),
    "Pesquise os grupos disponíveis e use as setas para atribuir ou remover.": (
        "Search available groups and use the arrows to assign or remove them.",
        "Busca los grupos disponibles y usa las flechas para asignar o quitar.",
    ),
    "permissões": ("permissions", "permisos"),
    "Pesquise as permissões disponíveis e use as setas para atribuir ou remover.": (
        "Search available permissions and use the arrows to assign or remove them.",
        "Busca los permisos disponibles y usa las flechas para asignar o quitar.",
    ),
    "Usuários": ("Users", "Usuarios"),
    "Perfil gamer": ("Gamer profile", "Perfil gamer"),
    "Chave de acesso": ("Passkey", "Llave de acceso"),
    "Chaves de acesso": ("Passkeys", "Llaves de acceso"),
    "Conquista": ("Achievement", "Logro"),
    "Conquista do jogador": ("Player achievement", "Logro del jugador"),
    "Recompensa": ("Reward", "Recompensa"),
    "Recompensa resgatada": ("Claimed reward", "Recompensa canjeada"),
    "Leilão": ("Auction", "Subasta"),
    "Leilões": ("Auctions", "Subastas"),
    "Lance": ("Bid", "Puja"),
    "Lances": ("Bids", "Pujas"),
    "Comunicação": ("Communication", "Comunicación"),
    "Notificação": ("Notification", "Notificación"),
    "Notificações": ("Notifications", "Notificaciones"),
    "Inscrição push": ("Push subscription", "Suscripción push"),
    "Inscrições push": ("Push subscriptions", "Suscripciones push"),
    "Publicação": ("Publication", "Publicación"),
    "Português": ("Portuguese", "Portugués"),
    "English": ("English", "English"),
    "Español": ("Spanish", "Español"),
    "Marque Somente assistente para um passo a passo do Denkynho. Não é necessária uma migration: o artigo entra na consulta no próximo salvamento.": (
        "Check Assistant only for a Denkynho step-by-step. No migration is required: the article enters the query on the next save.",
        "Marca Solo asistente para un paso a paso del Denkynho. No se necesita una migration: el artículo entra en la consulta en el próximo guardado.",
    ),
    "Destino": ("Destination", "Destino"),
    "Este artigo fica só na consulta do Denkynho. Jogadores recebem audiência Todos; a equipe e os superadministradores usam os níveis correspondentes.": (
        "This article is only in the Denkynho query. Players get the Everyone audience; staff and superusers use the matching levels.",
        "Este artículo queda solo en la consulta del Denkynho. Los jugadores reciben la audiencia Todos; el equipo y los superadministradores usan los niveles correspondientes.",
    ),
    "Conteúdo": ("Content", "Contenido"),
    "Notícia": ("News item", "Noticia"),
    "Notícias": ("News", "Noticias"),
    "Resposta rápida exibida primeiro pelo assistente; a resposta completa traz os detalhes.": (
        "Short answer shown first by the assistant; the full answer provides the details.",
        "Respuesta rápida mostrada primero por el asistente; la respuesta completa aporta los detalles.",
    ),
    "Termos alternativos separados por vírgulas usados para localizar esta orientação.": (
        "Alternative terms separated by commas used to find this guidance.",
        "Términos alternativos separados por comas usados para localizar esta orientación.",
    ),
    "English alternative terms separated by commas.": (
        "English alternative terms separated by commas.",
        "Términos alternativos en inglés separados por comas.",
    ),
    "Términos alternativos en español separados por comas.": (
        "Spanish alternative terms separated by commas.",
        "Términos alternativos en español separados por comas.",
    ),
    "Público mínimo autorizado a receber este artigo no assistente.": (
        "Minimum audience authorized to receive this article in the assistant.",
        "Público mínimo autorizado a recibir este artículo en el asistente.",
    ),
    "Se marcado, o artigo fica só na consulta do Denkynho e não aparece na página FAQ nem nas sugestões.": (
        "If checked, the article stays only in the Denkynho query and does not appear on the FAQ page or in suggestions.",
        "Si está marcado, el artículo queda solo en la consulta del Denkynho y no aparece en la página FAQ ni en las sugerencias.",
    ),
    "FAQ": ("FAQ", "FAQ"),
    "Passo a passo do Denkynho": ("Denkynho step-by-step", "Paso a paso del Denkynho"),
    "Passos a passo do Denkynho": (
        "Denkynho step-by-step guides",
        "Pasos a paso del Denkynho",
    ),
    "Peças cosméticas liberadas e equipadas pelo usuário.": (
        "Cosmetic pieces unlocked and equipped by the user.",
        "Piezas cosméticas liberadas y equipadas por el usuario.",
    ),
    "Sentimento do usuário que o mascote está acompanhando; vazio quando não há empatia ativa.": (
        "User feeling the mascot is mirroring; empty when there is no active empathy.",
        "Sentimiento del usuario que la mascota está acompañando; vacío cuando no hay empatía activa.",
    ),
    "Quando a empatia expira, o humor volta a ser calculado só pelas necessidades do mascote.": (
        "When empathy expires, mood is calculated only from the mascot's needs again.",
        "Cuando la empatía expira, el humor vuelve a calcularse solo con las necesidades de la mascota.",
    ),
    "Apelido opcional da conversa; não armazena o histórico.": (
        "Optional conversation nickname; does not store history.",
        "Apodo opcional de la conversación; no almacena el historial.",
    ),
    "Tamanho preferido das respostas: brief, balanced ou detailed.": (
        "Preferred response length: brief, balanced, or detailed.",
        "Tamaño preferido de las respuestas: brief, balanced o detailed.",
    ),
    "Último dia em que o mascote registrou uma visita; o bônus diário não se acumula.": (
        "Last day the mascot recorded a visit; the daily bonus does not stack.",
        "Último día en que la mascota registró una visita; el bono diario no se acumula.",
    ),
    "Perfil do Denkynho": ("Denkynho profile", "Perfil del Denkynho"),
    "Perfis do Denkynho": ("Denkynho profiles", "Perfiles del Denkynho"),
    "Cuidado do Denkynho": ("Denkynho care action", "Cuidado del Denkynho"),
    "Cuidados do Denkynho": ("Denkynho care actions", "Cuidados del Denkynho"),
    "Download": ("Download", "Descarga"),
    "Downloads": ("Downloads", "Descargas"),
    "Página do wiki": ("Wiki page", "Página del wiki"),
    "Wiki": ("Wiki", "Wiki"),
    "Evento": ("Event", "Evento"),
    "Calendário": ("Calendar", "Calendario"),
    "Jogos": ("Games", "Juegos"),
    "Configuração de jogo": ("Game configuration", "Configuración de juego"),
    "Configurações de jogos": ("Game configurations", "Configuraciones de juegos"),
    "Prêmio da roleta": ("Roulette prize", "Premio de la ruleta"),
    "Prêmios da roleta": ("Roulette prizes", "Premios de la ruleta"),
    "Giro da roleta": ("Roulette spin", "Giro de la ruleta"),
    "Giros da roleta": ("Roulette spins", "Giros de la ruleta"),
    "Bag": ("Bag", "Bag"),
    "Bags": ("Bags", "Bags"),
    "Item da bag": ("Bag item", "Ítem de la bag"),
    "Resgate de bônus diário": ("Daily bonus claim", "Canje de bono diario"),
    "Item de catálogo": ("Catalog item", "Ítem de catálogo"),
    "Itens de catálogo": ("Catalog items", "Ítems de catálogo"),
    "Tipo de caixa": ("Box type", "Tipo de caja"),
    "Tipos de caixa": ("Box types", "Tipos de caja"),
    "Caixa": ("Box", "Caja"),
    "Caixas": ("Boxes", "Cajas"),
    "Booster da caixa": ("Box booster", "Booster de la caja"),
    "Jogada de dados": ("Dice roll", "Tirada de dados"),
    "Giro de slots": ("Slots spin", "Giro de slots"),
    "Vara de pesca": ("Fishing rod", "Caña de pescar"),
    "Peixe": ("Fish", "Pez"),
    "Pescaria": ("Fishing trip", "Pesca"),
    "Arma da economia": ("Economy weapon", "Arma de la economía"),
    "Monstro": ("Monster", "Monstruo"),
    "Combate da economia": ("Economy combat", "Combate de la economía"),
    "Temporada do passe": ("Pass season", "Temporada del pase"),
    "Nível do passe": ("Pass level", "Nivel del pase"),
    "Recompensa do passe": ("Pass reward", "Recompensa del pase"),
    "Progresso do passe": ("Pass progress", "Progreso del pase"),
    "Resgate do passe": ("Pass claim", "Canje del pase"),
    "Inventário": ("Inventory", "Inventario"),
    "Inventários": ("Inventories", "Inventarios"),
    "Item de inventário": ("Inventory item", "Ítem de inventario"),
    "Itens de inventário": ("Inventory items", "Ítems de inventario"),
    "Item bloqueado": ("Locked item", "Ítem bloqueado"),
    "Itens bloqueados": ("Locked items", "Ítems bloqueados"),
    "Log de inventário": ("Inventory log", "Registro de inventario"),
    "Logs de inventário": ("Inventory logs", "Registros de inventario"),
    "Marketplace": ("Marketplace", "Marketplace"),
    "Anúncio de personagem": ("Character listing", "Anuncio de personaje"),
    "Anúncios de personagem": ("Character listings", "Anuncios de personaje"),
    "Pagamento": ("Payment", "Pago"),
    "Pedido de pagamento": ("Payment order", "Pedido de pago"),
    "Pedidos de pagamento": ("Payment orders", "Pedidos de pago"),
    "Log de webhook": ("Webhook log", "Registro de webhook"),
    "Logs de webhook": ("Webhook logs", "Registros de webhook"),
    "Programas e recursos": ("Programs and features", "Programas y recursos"),
    "Apoiador": ("Supporter", "Patrocinador"),
    "Apoiadores": ("Supporters", "Patrocinadores"),
    "Comissão": ("Commission", "Comisión"),
    "Comissões": ("Commissions", "Comisiones"),
    "Repasse de comissão": ("Commission payout", "Transferencia de comisión"),
    "Repasses de comissão": ("Commission payouts", "Transferencias de comisión"),
    "Planejado": ("Planned", "Planificado"),
    "Em andamento": ("In progress", "En curso"),
    "Concluído": ("Completed", "Completado"),
    "Entrada do roadmap": ("Roadmap entry", "Entrada del roadmap"),
    "Entradas do roadmap": ("Roadmap entries", "Entradas del roadmap"),
    "Recurso do sistema": ("System feature", "Recurso del sistema"),
    "Recursos do sistema": ("System features", "Recursos del sistema"),
    "Identidade": ("Identity", "Identidad"),
    "Rates": ("Rates", "Rates"),
    "Coming Soon": ("Coming Soon", "Coming Soon"),
    "Vinculação de conta Lineage": (
        "Lineage account linking",
        "Vinculación de cuenta Lineage",
    ),
    "Clique no link para vincular a conta %(login)s ao PDL PRO:\n\n%(link)s\n\nO link expira em 1 hora.": (
        "Click the link to link account %(login)s to PDL PRO:\n\n%(link)s\n\nThe link expires in 1 hour.",
        "Haz clic en el enlace para vincular la cuenta %(login)s a PDL PRO:\n\n%(link)s\n\nEl enlace caduca en 1 hora.",
    ),
    "Servidor Lineage": ("Lineage server", "Servidor Lineage"),
    "Conta Lineage": ("Lineage account", "Cuenta Lineage"),
    "Contas Lineage": ("Lineage accounts", "Cuentas Lineage"),
    "Slot de vínculo": ("Link slot", "Ranura de vínculo"),
    "Slots de vínculo": ("Link slots", "Ranuras de vínculo"),
    "Preço de serviço": ("Service price", "Precio de servicio"),
    "Preços de serviço": ("Service prices", "Precios de servicio"),
    "Configuração do painel": ("Panel setting", "Configuración del panel"),
    "Configurações do painel": ("Panel settings", "Configuraciones del panel"),
    "Loja": ("Shop", "Tienda"),
    "Item da loja": ("Shop item", "Ítem de la tienda"),
    "Itens da loja": ("Shop items", "Ítems de la tienda"),
    "Pacote": ("Bundle", "Paquete"),
    "Pacotes": ("Bundles", "Paquetes"),
    "Item do pacote": ("Bundle item", "Ítem del paquete"),
    "Itens do pacote": ("Bundle items", "Ítems del paquete"),
    "Carrinho": ("Cart", "Carrito"),
    "Carrinhos": ("Carts", "Carritos"),
    "Item do carrinho": ("Cart item", "Ítem del carrito"),
    "Itens do carrinho": ("Cart items", "Ítems del carrito"),
    "Compra da loja": ("Shop purchase", "Compra de la tienda"),
    "Compras da loja": ("Shop purchases", "Compras de la tienda"),
    "Pacote do carrinho": ("Cart bundle", "Paquete del carrito"),
    "Pacotes do carrinho": ("Cart bundles", "Paquetes del carrito"),
    "Código promocional": ("Promo code", "Código promocional"),
    "Códigos promocionais": ("Promo codes", "Códigos promocionales"),
    "Staff": ("Staff", "Staff"),
    "Log de auditoria": ("Audit log", "Registro de auditoría"),
    "Logs de auditoria": ("Audit logs", "Registros de auditoría"),
    "Atendimento": ("Support", "Atención"),
    "Aberto": ("Open", "Abierto"),
    "Em atendimento": ("In progress", "En atención"),
    "Aguardando jogador": ("Waiting for player", "Esperando al jugador"),
    "Aguardando equipe": ("Waiting for staff", "Esperando al equipo"),
    "Resolvido": ("Resolved", "Resuelto"),
    "Fechado": ("Closed", "Cerrado"),
    "Problema técnico": ("Technical issue", "Problema técnico"),
    "Pagamento e loja": ("Payment and shop", "Pago y tienda"),
    "Conta e segurança": ("Account and security", "Cuenta y seguridad"),
    "Suporte ao jogo": ("Game support", "Soporte del juego"),
    "Relatar um bug": ("Report a bug", "Informar de un error"),
    "Denúncia": ("Report", "Denuncia"),
    "Sugestão": ("Suggestion", "Sugerencia"),
    "Outro assunto": ("Other topic", "Otro asunto"),
    "Baixa": ("Low", "Baja"),
    "Normal": ("Normal", "Normal"),
    "Alta": ("High", "Alta"),
    "Urgente": ("Urgent", "Urgente"),
    "Chamado": ("Ticket", "Ticket"),
    "Chamados": ("Tickets", "Tickets"),
    "Mensagem do chamado": ("Ticket message", "Mensaje del ticket"),
    "Mensagens dos chamados": ("Ticket messages", "Mensajes de los tickets"),
    "Temas": ("Themes", "Temas"),
    "Tema": ("Theme", "Tema"),
    "Carteira": ("Wallet", "Cartera"),
    "Carteiras": ("Wallets", "Carteras"),
    "Entrada": ("Credit", "Entrada"),
    "Saída": ("Debit", "Salida"),
    "Transação": ("Transaction", "Transacción"),
    "Transações": ("Transactions", "Transacciones"),
    "Configuração de moeda": ("Currency setting", "Configuración de moneda"),
    "Configurações de moeda": ("Currency settings", "Configuraciones de moneda"),
    "Bônus de compra": ("Purchase bonus", "Bono de compra"),
    "Promoção de recarga": ("Top-up promotion", "Promoción de recarga"),
    "Promoções de recarga": ("Top-up promotions", "Promociones de recarga"),
    "Pacote de moedas": ("Coin package", "Paquete de monedas"),
    "Pacotes de moedas": ("Coin packages", "Paquetes de monedas"),
    "Common": ("Common", "Common"),
    "nome@exemplo.com": ("name@example.com", "nombre@ejemplo.com"),
    "dd/mm/aaaa": ("dd/mm/yyyy", "dd/mm/aaaa"),
    "dd/mm/aaaa hh:mm": ("dd/mm/yyyy hh:mm", "dd/mm/aaaa hh:mm"),
    "hh:mm": ("hh:mm", "hh:mm"),
    "0,00": ("0.00", "0,00"),
    '{"chave": "valor"}': ('{"key": "value"}', '{"clave": "valor"}'),
    "Informe %(label)s": ("Enter %(label)s", "Introduce %(label)s"),
    "Não foi possível processar a solicitação.": (
        "Unable to process the request.",
        "No se pudo procesar la solicitud.",
    ),
    "O recurso solicitado não foi encontrado.": (
        "The requested resource was not found.",
        "No se encontró el recurso solicitado.",
    ),
    "A solicitação conflita com o estado atual do recurso.": (
        "The request conflicts with the current resource state.",
        "La solicitud entra en conflicto con el estado actual del recurso.",
    ),
    "Você não tem permissão para realizar esta ação.": (
        "You do not have permission to perform this action.",
        "No tienes permiso para realizar esta acción.",
    ),
    "Verifique os dados informados e tente novamente.": (
        "Check the provided data and try again.",
        "Revisa los datos informados e inténtalo de nuevo.",
    ),
    "Usuário não encontrado.": ("User not found.", "Usuario no encontrado."),
    "Este nome de usuário já está em uso.": (
        "This username is already in use.",
        "Este nombre de usuario ya está en uso.",
    ),
    "Este e-mail já está em uso.": (
        "This email is already in use.",
        "Este correo ya está en uso.",
    ),
    "Usuário ou senha inválidos.": (
        "Invalid username or password.",
        "Usuario o contraseña no válidos.",
    ),
    "O servidor está em período de lançamento. O login está restrito à equipe no momento.": (
        "The server is in a launch period. Login is currently restricted to staff.",
        "El servidor está en período de lanzamiento. El inicio de sesión está restringido al equipo por ahora.",
    ),
    "Código 2FA inválido.": ("Invalid 2FA code.", "Código 2FA no válido."),
    "Sessão não encontrada.": ("Session not found.", "Sesión no encontrada."),
    "Refresh token inválido.": ("Invalid refresh token.", "Refresh token no válido."),
    "Não foi possível validar esta chave de acesso.": (
        "Unable to validate this passkey.",
        "No se pudo validar esta llave de acceso.",
    ),
    "Não foi possível concluir a autenticação social.": (
        "Unable to complete social authentication.",
        "No se pudo completar la autenticación social.",
    ),
    "Leilão não encontrado.": ("Auction not found.", "Subasta no encontrada."),
    "Este leilão não está ativo.": (
        "This auction is not active.",
        "Esta subasta no está activa.",
    ),
    "Lance inválido.": ("Invalid bid.", "Puja no válida."),
    "Você não pode dar lance no próprio leilão.": (
        "You cannot bid on your own auction.",
        "No puedes pujar en tu propia subasta.",
    ),
    "Duração do leilão inválida.": (
        "Invalid auction duration.",
        "Duración de la subasta no válida.",
    ),
    "Fichas insuficientes.": ("Insufficient tokens.", "Fichas insuficientes."),
    "Você já resgatou o bônus de hoje.": (
        "You have already claimed today's bonus.",
        "Ya canjeaste el bono de hoy.",
    ),
    "Este jogo não está ativo.": ("This game is not active.", "Este juego no está activo."),
    "Esta caixa não tem boosters restantes.": (
        "This box has no boosters left.",
        "Esta caja no tiene boosters restantes.",
    ),
    "Essa caixa não pertence a você.": (
        "That box does not belong to you.",
        "Esa caja no te pertenece.",
    ),
    "Recompensa inválida.": ("Invalid reward.", "Recompensa no válida."),
    "Inventário não encontrado.": ("Inventory not found.", "Inventario no encontrado."),
    "Este item não pode ser retirado do jogo.": (
        "This item cannot be withdrawn from the game.",
        "Este ítem no se puede retirar del juego.",
    ),
    "Quantidade insuficiente no inventário do painel.": (
        "Insufficient quantity in the panel inventory.",
        "Cantidad insuficiente en el inventario del panel.",
    ),
    "Anúncio não encontrado.": ("Listing not found.", "Anuncio no encontrado."),
    "Este personagem não está à venda.": (
        "This character is not for sale.",
        "Este personaje no está a la venta.",
    ),
    "Você não pode comprar o próprio personagem.": (
        "You cannot buy your own character.",
        "No puedes comprar tu propio personaje.",
    ),
    "Este personagem já está listado para venda.": (
        "This character is already listed for sale.",
        "Este personaje ya está listado para la venta.",
    ),
    "A conta já atingiu o limite de personagens do cliente Lineage 2.": (
        "The account has already reached the Lineage 2 client character limit.",
        "La cuenta ya alcanzó el límite de personajes del cliente Lineage 2.",
    ),
    "O preço deve ser maior que zero.": (
        "The price must be greater than zero.",
        "El precio debe ser mayor que cero.",
    ),
    "Pedido de pagamento não encontrado.": (
        "Payment order not found.",
        "Pedido de pago no encontrado.",
    ),
    "Este pedido já foi confirmado.": (
        "This order has already been confirmed.",
        "Este pedido ya fue confirmado.",
    ),
    "Método de pagamento indisponível.": (
        "Payment method unavailable.",
        "Método de pago no disponible.",
    ),
    "Este pedido não pode ser alterado.": (
        "This order cannot be changed.",
        "Este pedido no se puede modificar.",
    ),
    "Valor inválido.": ("Invalid amount.", "Importe no válido."),
    "Falha ao iniciar o pagamento.": (
        "Failed to start payment.",
        "Error al iniciar el pago.",
    ),
    "Cadastro de apoiador não encontrado.": (
        "Supporter registration not found.",
        "Registro de patrocinador no encontrado.",
    ),
    "Pedido de repasse não encontrado.": (
        "Payout request not found.",
        "Pedido de transferencia no encontrado.",
    ),
    "Entrada do roadmap não encontrada.": (
        "Roadmap entry not found.",
        "Entrada del roadmap no encontrada.",
    ),
    "Recurso do sistema não encontrado.": (
        "System feature not found.",
        "Recurso del sistema no encontrado.",
    ),
    "Não foi possível processar a solicitação do programa.": (
        "Unable to process the program request.",
        "No se pudo procesar la solicitud del programa.",
    ),
    "O banco do servidor Lineage não está disponível.": (
        "The Lineage server database is not available.",
        "La base de datos del servidor Lineage no está disponible.",
    ),
    "Conta Lineage não encontrada.": (
        "Lineage account not found.",
        "Cuenta Lineage no encontrada.",
    ),
    "Já existe uma conta Lineage com este login.": (
        "A Lineage account with this login already exists.",
        "Ya existe una cuenta Lineage con este login.",
    ),
    "Esta conta Lineage já está vinculada.": (
        "This Lineage account is already linked.",
        "Esta cuenta Lineage ya está vinculada.",
    ),
    "Limite de contas vinculadas atingido. Compre um slot extra.": (
        "Linked account limit reached. Buy an extra slot.",
        "Límite de cuentas vinculadas alcanzado. Compra una ranura extra.",
    ),
    "O personagem precisa estar offline.": (
        "The character must be offline.",
        "El personaje debe estar desconectado.",
    ),
    "Este nick já está em uso.": (
        "This nickname is already in use.",
        "Este nick ya está en uso.",
    ),
    "Chamado não encontrado.": ("Ticket not found.", "Ticket no encontrado."),
    "Esta ação não está disponível para o chamado.": (
        "This action is not available for the ticket.",
        "Esta acción no está disponible para el ticket.",
    ),
    "Identificador público. Sempre UUID v4.": (
        "Public identifier. Always UUID v4.",
        "Identificador público. Siempre UUID v4.",
    ),
    "ID sequencial interno. Nunca expor via API.": (
        "Internal sequential ID. Never expose via API.",
        "ID secuencial interno. Nunca exponer vía API.",
    ),
    "Acesso ao painel administrativo": (
        "Administrative panel access",
        "Acceso al panel administrativo",
    ),
    "Log in": ("Log in", "Iniciar sesión"),
}


def unescape(s: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(s):
        if s[i] == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            mapping = {"n": "\n", "t": "\t", '"': '"', "\\": "\\"}
            out.append(mapping.get(nxt, nxt))
            i += 2
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def escape(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\t", "\\t")
    )


def format_quoted_block(value: str, *, force_multiline: bool = False) -> list[str]:
    if not force_multiline and "\n" not in value and len(value) <= 70:
        return [f'"{escape(value)}"']
    lines = ['""']
    remaining = value
    while remaining:
        if "\n" in remaining:
            idx = remaining.index("\n")
            chunk = remaining[:idx]
            remaining = remaining[idx + 1 :]
            lines.append(f'"{escape(chunk)}\\n"')
        else:
            lines.append(f'"{escape(remaining)}"')
            remaining = ""
    return lines


def format_msgid(value: str) -> list[str]:
    body = format_quoted_block(value, force_multiline="\n" in value or len(value) > 70)
    return [f"msgid {body[0]}"] + body[1:]


def format_msgstr(value: str, *, force_multiline: bool) -> list[str]:
    body = format_quoted_block(value, force_multiline=force_multiline)
    return [f"msgstr {body[0]}"] + body[1:]

@dataclass
class PoEntry:
    prefix_lines: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    msgid: str = ""
    msgstr: str = ""
    is_header: bool = False


def parse_po(text: str) -> tuple[list[str], list[PoEntry]]:
    """Return (leading_comment_lines_before_header, entries)."""
    lines = text.splitlines()
    entries: list[PoEntry] = []
    i = 0
    leading: list[str] = []

    # Collect file header comments until first msgid
    while i < len(lines) and not lines[i].startswith("msgid "):
        leading.append(lines[i])
        i += 1

    while i < len(lines):
        # Skip blank separators
        while i < len(lines) and lines[i].strip() == "":
            i += 1
        if i >= len(lines):
            break

        entry = PoEntry()
        # Collector lines belonging to this entry until msgid
        while i < len(lines) and not lines[i].startswith("msgid "):
            line = lines[i]
            if line.startswith("#, "):
                flags = [f.strip() for f in line[3:].split(",")]
                entry.flags.extend(flags)
            elif line.startswith("#|"):
                # obsolete fuzzy reference — drop when rewriting
                pass
            else:
                entry.prefix_lines.append(line)
            i += 1

        if i >= len(lines):
            break

        # msgid
        assert lines[i].startswith("msgid ")
        first = lines[i][len("msgid ") :]
        parts: list[str] = []
        if first == '""':
            i += 1
            while i < len(lines) and lines[i].startswith('"'):
                parts.append(unescape(lines[i][1:-1]))
                i += 1
        else:
            parts.append(unescape(first[1:-1]))
            i += 1
        entry.msgid = "".join(parts)
        entry.is_header = entry.msgid == ""

        # msgstr
        while i < len(lines) and lines[i].strip() == "":
            i += 1
        if i >= len(lines) or not lines[i].startswith("msgstr "):
            raise ValueError(f"Expected msgstr after msgid {entry.msgid!r}")
        first = lines[i][len("msgstr ") :]
        parts = []
        if first == '""':
            i += 1
            while i < len(lines) and lines[i].startswith('"'):
                parts.append(unescape(lines[i][1:-1]))
                i += 1
        else:
            parts.append(unescape(first[1:-1]))
            i += 1
        entry.msgstr = "".join(parts)
        entries.append(entry)

    return leading, entries


def write_po(path: Path, leading: list[str], entries: list[PoEntry]) -> None:
    out: list[str] = []
    out.extend(leading)

    for idx, entry in enumerate(entries):
        if idx > 0:
            out.append("")
        out.extend(entry.prefix_lines)
        flags = [f for f in entry.flags if f != "fuzzy"]
        if flags:
            out.append("#, " + ", ".join(flags))
        if entry.is_header:
            out.append('msgid ""')
            out.append('msgstr ""')
            for meta_line in entry.msgstr.split("\n"):
                if meta_line:
                    out.append(f'"{escape(meta_line)}\\n"')
            continue
        out.extend(format_msgid(entry.msgid))
        force_multi = "\n" in entry.msgid or "\n" in entry.msgstr or len(entry.msgstr) > 70
        out.extend(format_msgstr(entry.msgstr, force_multiline=force_multi))

    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def apply_language(entries: list[PoEntry], lang: str) -> tuple[int, list[str]]:
    missing: list[str] = []
    filled = 0
    lang_idx = 0 if lang == "en" else 1
    for entry in entries:
        if entry.is_header:
            continue
        pair = TRANSLATIONS.get(entry.msgid)
        if pair is None:
            missing.append(entry.msgid)
            continue
        entry.msgstr = pair[lang_idx]
        if "fuzzy" in entry.flags:
            entry.flags = [f for f in entry.flags if f != "fuzzy"]
        filled += 1
    return filled, missing


def verify(entries: list[PoEntry]) -> list[str]:
    bad: list[str] = []
    for entry in entries:
        if entry.is_header:
            continue
        if not entry.msgstr.strip():
            bad.append(entry.msgid)
    return bad


def process(lang: str) -> int:
    path = LOCALE / lang / "LC_MESSAGES" / "django.po"
    text = path.read_text(encoding="utf-8")
    leading, entries = parse_po(text)
    filled, missing = apply_language(entries, lang)
    if missing:
        print(f"[{lang}] MISSING {len(missing)} translations:", file=sys.stderr)
        for m in missing:
            print(f"  - {m!r}", file=sys.stderr)
        raise SystemExit(1)
    write_po(path, leading, entries)
    # re-read verify
    _, check = parse_po(path.read_text(encoding="utf-8"))
    bad = verify(check)
    if bad:
        print(f"[{lang}] empty msgstr after write: {len(bad)}", file=sys.stderr)
        raise SystemExit(1)
    print(f"[{lang}] filled {filled} strings -> {path}")
    return filled


def main() -> None:
    # sanity: catalog coverage
    sample = (LOCALE / "en" / "LC_MESSAGES" / "django.po").read_text(encoding="utf-8")
    _, entries = parse_po(sample)
    msgids = [e.msgid for e in entries if not e.is_header]
    unknown = [m for m in msgids if m not in TRANSLATIONS]
    extra = [m for m in TRANSLATIONS if m not in set(msgids)]
    if unknown:
        print(f"Dictionary missing {len(unknown)} msgids", file=sys.stderr)
        for m in unknown:
            print(f"  - {m!r}", file=sys.stderr)
        raise SystemExit(1)
    if extra:
        print(f"Warning: {len(extra)} dictionary keys not in catalog (ignored)")
    en_n = process("en")
    es_n = process("es")
    print(f"TOTAL_TRANSLATED en={en_n} es={es_n}")


if __name__ == "__main__":
    main()
