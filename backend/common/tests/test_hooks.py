from common.hooks import HookEvent, HookNames, IHookHandler, InProcessHookBus


class _Recorder(IHookHandler):
    names = frozenset({HookNames.CHECKOUT_COMPLETED})

    def __init__(self) -> None:
        self.events: list[HookEvent] = []

    def handle(self, event: HookEvent) -> None:
        self.events.append(event)


class _Boom(IHookHandler):
    names = frozenset({HookNames.CHECKOUT_COMPLETED})

    def handle(self, event: HookEvent) -> None:
        raise RuntimeError("boom")


def test_bus_delivers_only_matching_handlers():
    bus = InProcessHookBus()
    recorder = _Recorder()
    bus.add(recorder)
    bus.publish(HookNames.PAYMENT_SETTLED, {"order_id": "1"})
    assert recorder.events == []
    bus.publish(HookNames.CHECKOUT_COMPLETED, {"purchase_id": "p1"})
    assert len(recorder.events) == 1
    assert recorder.events[0].payload["purchase_id"] == "p1"


def test_bus_does_not_register_the_same_handler_twice():
    bus = InProcessHookBus()
    recorder = _Recorder()
    bus.add(recorder)
    bus.add(recorder)
    bus.publish(HookNames.CHECKOUT_COMPLETED, {})
    assert len(recorder.events) == 1


def test_bus_isolates_handler_failures(caplog):
    bus = InProcessHookBus()
    recorder = _Recorder()
    bus.add(_Boom())
    bus.add(recorder)
    bus.publish(HookNames.CHECKOUT_COMPLETED, {"ok": True})
    assert recorder.events[0].payload["ok"] is True
    assert "falhou no gancho" in caplog.text
