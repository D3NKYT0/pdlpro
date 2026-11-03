from common.di.bootstrap import DependencyInjection


def link_player(user, character_name=None):
    """Cria e vincula a conta de jogo ``user.username`` com um personagem para receber lances."""
    from apps.server.domain.gateways import ILineageGateway

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    if gateway.get_account(user.username) is None:
        gateway.register_account(user.username, "l2pass123", user.email)
    gateway.link_account(user.username, str(user.id))
    return gateway.seed_character(user.username, character_name or f"{user.username}Char")
