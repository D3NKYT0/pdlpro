from django.db import migrations

CATALOG = [
    ("supporters", "Apoiadores", "Comunidade", "Programa de apoiadores, cupons e comissões."),
    ("roadmap", "Roadmap", "Conteúdo", "Atualizações públicas do servidor em PT, EN e ES."),
    ("shop", "Loja", "Economia", "Itens e pacotes da loja do painel."),
    ("wallet", "Carteira", "Economia", "Saldo, bônus, fichas e câmbio com o jogo."),
    ("inventory", "Inventário", "Economia", "Bag, baú e itens da conta vinculada."),
    ("marketplace", "Marketplace", "Economia", "Compra e venda de itens entre jogadores."),
    ("auction", "Leilões", "Economia", "Leilão de personagens."),
    ("games", "Central de jogos", "Jogos", "Roda da Fortuna, baús, taverna, pescaria e arena."),
    ("battle-pass", "Passe de batalha", "Jogos", "Temporada, missões, trocas e marcos."),
    ("daily-bonus", "Bônus diário", "Jogos", "Resgate diário do calendário da temporada."),
    ("fishing", "Pescaria", "Jogos", "Vara, iscas e coleção no lago da central de jogos."),
    ("hunt", "Caça do dia", "Jogos", "Missões de PvP, PK, tempo online e nível no personagem."),
    ("profile", "Meu perfil", "Conta", "Dados da conta master e preferências."),
    ("accounts", "Conta L2", "Conta", "Vínculo, personagens e ficha Lineage."),
    ("progress", "Nível e conquistas", "Conta", "Nível, XP, conquistas e prêmios da conta no Painel."),
    ("notifications", "Avisos", "Comunicação", "Sino da barra superior e histórico de avisos."),
    ("support", "Atendimento", "Comunicação", "Chamados da equipe; o jogador entra pela Ajuda."),
    ("help", "Ajuda", "Comunicação", "Handbook, Denkynho e perguntas frequentes."),
    ("news", "Notícias", "Conteúdo", "Notícias públicas do site."),
    ("rankings", "Rankings", "Conteúdo", "Rankings públicos do servidor."),
    ("wiki", "Wiki", "Conteúdo", "Enciclopédia pública do servidor."),
    ("faq", "Perguntas frequentes", "Conteúdo", "FAQ pública do site."),
    ("downloads", "Downloads", "Conteúdo", "Arquivos, patches e cliente."),
    ("calendar", "Calendário", "Conteúdo", "Eventos públicos do servidor."),
    ("game-stores", "Lojas do jogo", "Conteúdo", "Private stores offline publicadas pelo servidor."),
]

LEGACY = [
    ("supporters", "Apoiadores", "Comunidade"),
    ("roadmap", "Roadmap", "Conteúdo"),
    ("shop", "Loja", "Economia"),
    ("wallet", "Carteira", "Economia"),
    ("inventory", "Inventário", "Economia"),
    ("marketplace", "Marketplace", "Economia"),
    ("auction", "Leilões", "Economia"),
    ("games", "Central de jogos", "Jogos"),
    ("battle-pass", "Passe de batalha", "Jogos"),
    ("daily-bonus", "Bônus diário", "Jogos"),
    ("fishing", "Pesca", "Jogos"),
    ("hunt", "Caça do dia", "Jogos"),
    ("profile", "Meu perfil", "Conta"),
    ("accounts", "Conta L2", "Conta"),
    ("progress", "Progresso", "Conta"),
    ("notifications", "Avisos", "Comunicação"),
    ("support", "Atendimento", "Comunicação"),
    ("help", "Ajuda", "Comunicação"),
    ("news", "Notícias", "Conteúdo"),
    ("rankings", "Rankings", "Conteúdo"),
    ("wiki", "Wiki", "Conteúdo"),
    ("faq", "Perguntas frequentes", "Conteúdo"),
    ("downloads", "Downloads", "Conteúdo"),
    ("calendar", "Calendário", "Conteúdo"),
    ("game-stores", "Lojas do jogo", "Conteúdo"),
]


def forwards(apps, schema_editor):
    Resource = apps.get_model("programs", "SystemResource")
    for code, name, category, description in CATALOG:
        Resource.objects.filter(code=code).update(name=name, category=category, description=description)


def backwards(apps, schema_editor):
    Resource = apps.get_model("programs", "SystemResource")
    for code, name, category in LEGACY:
        Resource.objects.filter(code=code).update(
            name=name,
            category=category,
            description=f"Disponibilidade de {name.lower()} para os jogadores.",
        )


class Migration(migrations.Migration):
    dependencies = [("programs", "0006_seed_hunt_and_stores_resources")]
    operations = [migrations.RunPython(forwards, backwards)]
