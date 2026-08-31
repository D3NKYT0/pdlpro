from common.di.container import Container
from common.di.lifetime import Lifetime


class ILogger:
    def log(self, message: str) -> str:
        raise NotImplementedError


class Logger(ILogger):
    def log(self, message: str) -> str:
        return f"logged:{message}"


class Greeter:
    def __init__(self, logger: ILogger) -> None:
        self.logger = logger

    def hello(self, name: str) -> str:
        return self.logger.log(f"hello {name}")


def test_constructor_injection():
    container = Container()
    container.register(ILogger, Logger, lifetime=Lifetime.SINGLETON)
    container.register_self(Greeter, lifetime=Lifetime.TRANSIENT)
    greeter = container.resolve(Greeter)
    assert greeter.hello("pdl") == "logged:hello pdl"


def test_scoped_instances_differ_between_scopes():
    root = Container()
    root.register(ILogger, Logger, lifetime=Lifetime.SCOPED)
    a = root.create_scope()
    b = root.create_scope()
    assert a.resolve(ILogger) is a.resolve(ILogger)
    assert a.resolve(ILogger) is not b.resolve(ILogger)


def test_singleton_is_shared():
    root = Container()
    root.register(ILogger, Logger, lifetime=Lifetime.SINGLETON)
    a = root.create_scope()
    b = root.create_scope()
    assert a.resolve(ILogger) is b.resolve(ILogger)
