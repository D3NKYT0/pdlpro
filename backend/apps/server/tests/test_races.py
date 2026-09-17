from apps.server.domain.races import race_from_class


def test_race_from_interlude_class_ids():
    assert race_from_class(88) == "human"
    assert race_from_class(17) == "human"
    assert race_from_class(24) == "elf"
    assert race_from_class(102) == "elf"
    assert race_from_class(36) == "dark_elf"
    assert race_from_class(106) == "dark_elf"
    assert race_from_class(46) == "orc"
    assert race_from_class(113) == "orc"
    assert race_from_class(57) == "dwarf"
    assert race_from_class(118) == "dwarf"
    assert race_from_class(0) == "human"
    assert race_from_class(999) == "human"
