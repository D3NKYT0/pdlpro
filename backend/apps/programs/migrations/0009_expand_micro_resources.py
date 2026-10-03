from django.db import migrations


CATALOG = [
    ("shop-checkout", "Finalizar compras", "Economia"),
    ("shop-packages", "Pacotes da loja", "Economia"),
    ("shop-history", "Histórico de compras", "Economia"),
    ("wallet-purchase", "Comprar moedas", "Economia"),
    ("wallet-transfer", "Transferir saldo", "Economia"),
    ("wallet-game-exchange", "Câmbio com o jogo", "Economia"),
    ("wallet-history", "Histórico financeiro", "Economia"),
    ("inventory-withdraw", "Retirar itens do jogo", "Economia"),
    ("inventory-deposit", "Enviar itens ao jogo", "Economia"),
    ("inventory-trade", "Transferir itens entre personagens", "Economia"),
    ("inventory-bag-transfer", "Mover itens da bag para o baú", "Economia"),
    ("marketplace-sell", "Anunciar vendas", "Economia"),
    ("marketplace-buy", "Comprar anúncios", "Economia"),
    ("auction-create", "Criar leilões", "Economia"),
    ("auction-bid", "Dar lances", "Economia"),
    ("games-roulette", "Roda da Fortuna", "Jogos"),
    ("games-boxes", "Baús", "Jogos"),
    ("games-boxes-buy", "Comprar e reiniciar baús", "Jogos"),
    ("games-boxes-open", "Abrir baús", "Jogos"),
    ("games-dice", "Dados", "Jogos"),
    ("games-slots", "Slot Machine", "Jogos"),
    ("games-economy", "Arena e encantamento", "Jogos"),
    ("games-fight", "Combater monstros", "Jogos"),
    ("games-enchant", "Encantar arma", "Jogos"),
    ("games-buy-tokens", "Comprar fichas", "Jogos"),
    ("games-statistics", "Estatísticas dos jogos", "Jogos"),
    ("battle-pass-premium", "Comprar passe premium", "Jogos"),
    ("battle-pass-claim", "Resgatar recompensas de nível", "Jogos"),
    ("battle-pass-quests", "Resgatar missões", "Jogos"),
    ("battle-pass-exchanges", "Trocas do passe", "Jogos"),
    ("battle-pass-milestones", "Resgatar marcos", "Jogos"),
    ("battle-pass-auto-claim", "Resgate automático", "Jogos"),
    ("daily-bonus-claim", "Resgatar bônus diário", "Jogos"),
    ("fishing-cast", "Lançar a vara", "Jogos"),
    ("fishing-buy-bait", "Comprar iscas", "Jogos"),
    ("hunt-claim", "Resgatar missões da caça", "Jogos"),
    ("accounts-register", "Criar conta de jogo", "Conta"),
    ("accounts-link-credentials", "Vincular por login e senha", "Conta"),
    ("accounts-link-email", "Vincular por e-mail", "Conta"),
    ("accounts-buy-slots", "Comprar vagas de contas", "Conta"),
    ("accounts-password", "Alterar senha da conta de jogo", "Conta"),
    ("accounts-unlink", "Desvincular conta de jogo", "Conta"),
    ("accounts-nickname", "Alterar nome do personagem", "Conta"),
    ("accounts-sex", "Alterar gênero do personagem", "Conta"),
    ("accounts-unstuck", "Destravar personagem", "Conta"),
    ("accounts-teleport", "Teleportar personagem", "Conta"),
    ("accounts-appearance", "Alterar aparência", "Conta"),
    ("accounts-clear-karma", "Limpar karma", "Conta"),
    ("accounts-clear-pk", "Limpar PK", "Conta"),
    ("accounts-skills", "Consultar skills do personagem", "Conta"),
    ("profile-edit", "Editar perfil e avatar", "Conta"),
    ("progress-claim-rewards", "Resgatar prêmios da conta", "Conta"),
    ("supporters-apply", "Candidatura e perfil de apoiador", "Comunidade"),
    ("supporters-payout", "Solicitar saque de comissões", "Comunidade"),
    ("notifications-push", "Notificações push", "Comunicação"),
    ("support-create", "Abrir chamados", "Comunicação"),
    ("support-reply", "Responder chamados", "Comunicação"),
    ("support-status", "Encerrar e reabrir chamados", "Comunicação"),
    ("help-chat", "Conversar com o assistente", "Comunicação"),
    ("help-pet", "Cuidados do Denkynho", "Comunicação"),
    ("help-wardrobe", "Armário do Denkynho", "Comunicação"),
    ("news-detail", "Ler notícias completas", "Conteúdo"),
    ("wiki-detail", "Ler páginas da Wiki", "Conteúdo"),
    ("faq-panel", "FAQ no painel", "Conteúdo"),
    ("roadmap-detail", "Detalhes do roadmap", "Conteúdo"),
    ("rankings-pvp", "Ranking PvP", "Conteúdo"),
    ("rankings-pk", "Ranking PK", "Conteúdo"),
    ("rankings-adena", "Ranking Adena", "Conteúdo"),
    ("rankings-clans", "Ranking de clãs", "Conteúdo"),
    ("rankings-level", "Ranking de nível", "Conteúdo"),
    ("rankings-online", "Ranking de tempo online", "Conteúdo"),
    ("rankings-olympiad", "Olimpíadas", "Conteúdo"),
    ("rankings-grandboss", "Grand Bosses", "Conteúdo"),
    ("rankings-siege", "Cerco aos castelos", "Conteúdo"),
    ("rankings-search", "Buscar personagens", "Conteúdo"),
]


def forwards(apps, schema_editor):
    resource = apps.get_model("programs", "SystemResource")
    for code, name, category in CATALOG:
        resource.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "category": category,
                "enabled": True,
                "description": "Disponibilidade desta ação dentro do módulo.",
            },
        )


def backwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.filter(
        code__in=[row[0] for row in CATALOG]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("programs", "0008_seed_micro_resources")]
    operations = [migrations.RunPython(forwards, backwards)]
