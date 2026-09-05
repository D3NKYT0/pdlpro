from datetime import timedelta

from django.utils import timezone

from apps.content.application.emotions import (
    care_cue,
    detect_user_affect,
    emotion_from_needs,
    model_affect,
    pose_for_reply,
    resolve_emotion,
)


def test_detects_user_feelings_in_portuguese_and_english_without_false_positives():
    assert detect_user_affect("Hoje estou triste e não sei o que fazer.") == "sad"
    assert detect_user_affect("grosso me deixou triste kk") == "sad"
    assert detect_user_affect("I am tired, I need a break.") == "sleepy"
    assert detect_user_affect("Consegui!") == "joyful"
    assert detect_user_affect("não consegui recuperar a senha") == "frustrated"
    assert detect_user_affect("kkkk que piada") == "amused"
    assert detect_user_affect("Já passou, estou bem.") == "calm"
    assert detect_user_affect("estou na tela de personagens") is None
    assert detect_user_affect("Como recupero minha senha?") is None


def test_needs_pick_the_most_urgent_attribute_and_joy_requires_balance():
    assert emotion_from_needs(satiety=10, energy=15, happiness=80, hygiene=80) == "sad"
    assert emotion_from_needs(satiety=80, energy=10, happiness=80, hygiene=80) == "sleepy"
    assert emotion_from_needs(satiety=80, energy=80, happiness=80, hygiene=8) == "frustrated"
    assert emotion_from_needs(satiety=80, energy=80, happiness=10, hygiene=80) == "sad"
    assert emotion_from_needs(satiety=90, energy=90, happiness=90, hygiene=90) == "joyful"
    assert emotion_from_needs(satiety=75, energy=75, happiness=75, hygiene=75) == "calm"


def test_active_empathy_overrides_needs_until_it_expires():
    now = timezone.now()
    sad = resolve_emotion(needs="sleepy", empathy="sad", empathy_expires_at=now + timedelta(minutes=10), now=now)
    assert sad == {"id": "sad", "pose": "07-triste", "idle_pose": "07-triste", "source": "user"}
    expired = resolve_emotion(needs="sleepy", empathy="sad", empathy_expires_at=now - timedelta(minutes=1), now=now)
    assert expired["id"] == "sleepy"
    assert expired["source"] == "needs"
    assert expired["idle_pose"] == "01-boas-vindas"


def test_reply_pose_mirrors_the_user_socially_and_keeps_tips_when_helping():
    emotion = {"id": "sad", "pose": "07-triste", "idle_pose": "07-triste", "source": "user"}
    assert pose_for_reply("social", "01-boas-vindas", emotion, "sad") == "07-triste"
    assert pose_for_reply("knowledge", "04-dica", emotion, "sad") == "04-dica"
    assert pose_for_reply("knowledge", "04-dica", emotion, None) == "04-dica"
    assert pose_for_reply("social", "06-rindo", emotion, None) == "07-triste"
    assert pose_for_reply("blocked", "10-frustrado", emotion, "sad") == "10-frustrado"
    assert pose_for_reply("social", "01-boas-vindas", emotion, "calm") == "01-boas-vindas"


def test_care_cue_picks_the_lowest_need_and_ignores_balanced_attributes():
    assert care_cue(8, 80, 80, 80) == {
        "id": "satiety",
        "message": {"pt": "O Denkynho está com fome.", "en": "Denkynho is hungry."},
    }
    assert care_cue(80, 10, 80, 80)["id"] == "energy"
    assert care_cue(80, 80, 80, 10)["message"] == {
        "pt": "O Denkynho precisa de um banho.",
        "en": "Denkynho needs a bath.",
    }
    assert care_cue(75, 75, 75, 75) is None
    assert model_affect("sad") == "sad"
    assert model_affect("grumpy") is None
    assert model_affect(None) is None
