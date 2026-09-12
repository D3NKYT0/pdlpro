from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.account_use_cases import (
    AccountActor,
    ConfirmLinkByEmailInput,
    ConfirmLinkByEmailUseCase,
    GetCharacterInput,
    GetCharacterUseCase,
    GetLinkSlotsUseCase,
    InspectPrimaryLoginUseCase,
    LinkGameAccountInput,
    LinkGameAccountUseCase,
    ListAccessibleAccountsUseCase,
    ListCharactersInput,
    ListCharacterSkillsUseCase,
    ListCharactersUseCase,
    RegisterGameAccountInput,
    RegisterGameAccountUseCase,
    RequestLinkByEmailInput,
    RequestLinkByEmailUseCase,
    UnlinkGameAccountInput,
    UnlinkGameAccountUseCase,
    UpdateGamePasswordInput,
    UpdateGamePasswordUseCase,
)
from apps.server.application.character_use_cases import (
    ChangeNicknameUseCase,
    ChangeSexUseCase,
    CharacterServiceInput,
    ListServicePricesUseCase,
    PurchaseLinkSlotInput,
    PurchaseLinkSlotUseCase,
    UnstuckCharacterUseCase,
)
from apps.server.domain.skill_catalog import ISkillCatalog
from apps.server.presentation.serializers import (
    AccessibleAccountSerializer,
    ChangeNicknameSerializer,
    ChangeSexSerializer,
    GameAccountSerializer,
    GameCharacterSerializer,
    LinkGameAccountSerializer,
    PrimaryLoginStateSerializer,
    PurchaseSlotSerializer,
    RegisterGameAccountSerializer,
    UnlinkGameAccountSerializer,
    UnstuckSerializer,
    UpdateGamePasswordSerializer,
)
from common.views import InjectedAPIView


def actor_from(request) -> AccountActor:
    return AccountActor(user_id=request.user.id, username=request.user.username, email=request.user.email)


class LineageAccountsView(InjectedAPIView):
    """Entrada HTTP para ``InspectPrimaryLoginUseCase``, ``ListAccessibleAccountsUseCase``,
    ``GetLinkSlotsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Contas Lineage vinculadas"),
        description=gettext_lazy("Retorna contas acessíveis, slots de vínculo e o estado do login principal."),
    )
    def get(self, request):
        actor = actor_from(request)
        primary = self.resolve(InspectPrimaryLoginUseCase).execute(actor)
        accounts = self.resolve(ListAccessibleAccountsUseCase).execute(actor)
        slots = self.resolve(GetLinkSlotsUseCase).execute(actor)
        return Response(
            {
                "accounts": AccessibleAccountSerializer(accounts, many=True).data,
                "slots": slots,
                "primary": PrimaryLoginStateSerializer(primary).data,
            }
        )


class RegisterGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``RegisterGameAccountUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Registrar conta de jogo"),
        description=gettext_lazy("Cria uma nova conta de jogo e a vincula ao usuário autenticado."),
        request=RegisterGameAccountSerializer,
    )
    def post(self, request):
        serializer = RegisterGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = self.resolve(RegisterGameAccountUseCase).execute(
            RegisterGameAccountInput(
                actor=actor_from(request),
                password=serializer.validated_data["password"],
                login=serializer.validated_data.get("login") or "",
            )
        )
        return Response(GameAccountSerializer(account).data)


class LinkGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``LinkGameAccountUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Vincular conta de jogo"),
        description=gettext_lazy("Vincula uma conta de jogo existente ao usuário autenticado mediante senha."),
        request=LinkGameAccountSerializer,
    )
    def post(self, request):
        serializer = LinkGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = self.resolve(LinkGameAccountUseCase).execute(
            LinkGameAccountInput(
                actor=actor_from(request),
                login=serializer.validated_data["login"],
                password=serializer.validated_data["password"],
            )
        )
        return Response(GameAccountSerializer(account).data)


class UnlinkGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``UnlinkGameAccountUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Desvincular conta de jogo"),
        description=gettext_lazy("Remove o vínculo da conta de jogo informada com o usuário autenticado."),
        request=UnlinkGameAccountSerializer,
    )
    def post(self, request):
        serializer = UnlinkGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.resolve(UnlinkGameAccountUseCase).execute(
            UnlinkGameAccountInput(actor=actor_from(request), login=serializer.validated_data["login"])
        )
        return Response({"ok": True})


class CharactersView(InjectedAPIView):
    """Entrada HTTP para ``ListCharactersUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Listar personagens"),
        description=gettext_lazy("Lista os personagens da conta de jogo acessível ao usuário autenticado."),
    )
    def get(self, request):
        login = request.query_params.get("login") or request.user.username
        chars = self.resolve(ListCharactersUseCase).execute(
            ListCharactersInput(actor=actor_from(request), login=login)
        )
        return Response(GameCharacterSerializer(chars, many=True).data)


class CharacterDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetCharacterUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Detalhe do personagem"),
        description=gettext_lazy("Retorna os dados do personagem informado na conta acessível ao usuário."),
    )
    def get(self, request, char_id: int):
        login = request.query_params.get("login") or request.user.username
        char = self.resolve(GetCharacterUseCase).execute(
            GetCharacterInput(actor=actor_from(request), login=login, char_id=char_id)
        )
        return Response(GameCharacterSerializer(char).data)


class CharacterSkillsView(InjectedAPIView):
    """Entrada HTTP para ``ListCharacterSkillsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Skills do personagem"),
        description=gettext_lazy(
            "Lista as skills aprendidas pelo personagem informado, com nome, ícone e pastas da janela L2 (físicas, mágicas, reforço, enfraquecimento)."
        ),
    )
    def get(self, request, char_id: int):
        login = request.query_params.get("login") or request.user.username
        skills = self.resolve(ListCharacterSkillsUseCase).execute(
            GetCharacterInput(actor=actor_from(request), login=login, char_id=char_id)
        )
        catalog = self.resolve(ISkillCatalog)
        payload = []
        for skill in skills:
            meta = catalog.metadata(skill.skill_id)
            progress = catalog.progress(skill.skill_id, skill.level)
            payload.append(
                {
                    "skill_id": skill.skill_id,
                    "level": progress["level"],
                    "enchant": progress["enchant"],
                    "enchant_route": progress["enchant_route"],
                    "enchant_max": progress["enchant_max"],
                    "enchantable": progress["enchantable"],
                    "class_index": skill.class_index,
                    "name": meta["name"],
                    "icon_url": meta["icon_url"],
                    "operate": meta["operate"],
                    "kind": meta["kind"],
                    "group": meta["group"],
                    "skill_type": meta["skill_type"],
                }
            )
        return Response(payload)


class UpdateGamePasswordView(InjectedAPIView):
    """Entrada HTTP para ``UpdateGamePasswordUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Alterar senha do jogo"),
        description=gettext_lazy("Atualiza a senha da conta de jogo vinculada ao usuário autenticado."),
        request=UpdateGamePasswordSerializer,
    )
    def post(self, request):
        serializer = UpdateGamePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.resolve(UpdateGamePasswordUseCase).execute(
            UpdateGamePasswordInput(
                actor=actor_from(request),
                login=serializer.validated_data.get("login") or request.user.username,
                password=serializer.validated_data["password"],
            )
        )
        return Response({"ok": True})


class ChangeNicknameView(InjectedAPIView):
    """Entrada HTTP para ``ChangeNicknameUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Alterar nick do personagem"),
        description=gettext_lazy("Altera o nick do personagem informado cobrando o serviço correspondente."),
        request=ChangeNicknameSerializer,
    )
    def post(self, request):
        serializer = ChangeNicknameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(ChangeNicknameUseCase).execute(
            (
                CharacterServiceInput(
                    user_id=request.user.id,
                    username=request.user.username,
                    login=data["login"],
                    char_id=data["char_id"],
                    request_key=data.get("request_key"),
                ),
                data["name"],
            )
        )
        return Response({"ok": True})


class ChangeSexView(InjectedAPIView):
    """Entrada HTTP para ``ChangeSexUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Alterar sexo do personagem"),
        description=gettext_lazy("Altera o sexo do personagem informado cobrando o serviço correspondente."),
        request=ChangeSexSerializer,
    )
    def post(self, request):
        serializer = ChangeSexSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(ChangeSexUseCase).execute(
            (
                CharacterServiceInput(
                    user_id=request.user.id,
                    username=request.user.username,
                    login=data["login"],
                    char_id=data["char_id"],
                    request_key=data.get("request_key"),
                ),
                data["sex"],
            )
        )
        return Response({"ok": True})


class UnstuckView(InjectedAPIView):
    """Entrada HTTP para ``UnstuckCharacterUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Destravar personagem"),
        description=gettext_lazy("Move o personagem preso para um local seguro no servidor de jogo."),
        request=UnstuckSerializer,
    )
    def post(self, request):
        serializer = UnstuckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(UnstuckCharacterUseCase).execute(
            CharacterServiceInput(
                user_id=request.user.id,
                username=request.user.username,
                login=data["login"],
                char_id=data["char_id"],
            )
        )
        return Response({"ok": True})


class RequestLinkByEmailView(InjectedAPIView):
    """Entrada HTTP para ``RequestLinkByEmailUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Solicitar vínculo por e-mail"),
        description=gettext_lazy("Inicia o fluxo de vínculo de conta de jogo mediante confirmação por e-mail."),
    )
    def post(self, request):
        return Response(
            self.resolve(RequestLinkByEmailUseCase).execute(
                RequestLinkByEmailInput(actor=actor_from(request), email=request.data.get("email", ""))
            )
        )


class ConfirmLinkByEmailView(InjectedAPIView):
    """Entrada HTTP para ``ConfirmLinkByEmailUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Confirmar vínculo por e-mail"),
        description=gettext_lazy("Confirma o vínculo da conta de jogo com o token recebido por e-mail."),
    )
    def post(self, request):
        account = self.resolve(ConfirmLinkByEmailUseCase).execute(
            ConfirmLinkByEmailInput(actor=actor_from(request), token=request.data.get("token", ""))
        )
        return Response(GameAccountSerializer(account).data)


class PurchaseSlotView(InjectedAPIView):
    """Entrada HTTP para ``PurchaseLinkSlotUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Comprar slot de vínculo"),
        description=gettext_lazy("Adquire slots adicionais de vínculo de contas de jogo para o usuário autenticado."),
        request=PurchaseSlotSerializer,
    )
    def post(self, request):
        serializer = PurchaseSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.resolve(PurchaseLinkSlotUseCase).execute(
            PurchaseLinkSlotInput(user_id=request.user.id, quantity=serializer.validated_data["quantity"])
        )
        return Response(result)


class ServicePricesView(InjectedAPIView):
    """Entrada HTTP para ``ListServicePricesUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Conta Lineage"],
        summary=gettext_lazy("Preços dos serviços"),
        description=gettext_lazy("Lista os preços dos serviços de personagem disponíveis no painel."),
    )
    def get(self, request):
        return Response(self.resolve(ListServicePricesUseCase).execute())
