# Generated for charge currencies and package prices

import uuid
from decimal import Decimal
from django.db import migrations, models
import django.db.models.deletion


def seed_charge_currencies_and_prices(apps, schema_editor):
    WalletChargeCurrency = apps.get_model('wallet', 'WalletChargeCurrency')
    CoinPackagePrice = apps.get_model('wallet', 'CoinPackagePrice')
    CoinPackage = apps.get_model('wallet', 'CoinPackage')
    CoinConfig = apps.get_model('wallet', 'CoinConfig')

    active_config = CoinConfig.objects.filter(active=True).first()
    brl_rate = active_config.multiplier if active_config else Decimal('1.00')
    usd_rate = (
        active_config.usd_multiplier
        if active_config and active_config.usd_multiplier is not None
        else Decimal('5.00')
    )

    if not WalletChargeCurrency.objects.filter(code='BRL').exists():
        WalletChargeCurrency.objects.create(
            code='BRL',
            enabled=True,
            coins_per_unit=brl_rate,
            sort_order=0,
            settlement=True,
        )

    if not WalletChargeCurrency.objects.filter(code='USD').exists():
        WalletChargeCurrency.objects.create(
            code='USD',
            enabled=True,
            coins_per_unit=usd_rate,
            sort_order=1,
            settlement=False,
        )

    for package in CoinPackage.objects.all():
        if package.price_brl and package.price_brl > 0:
            CoinPackagePrice.objects.get_or_create(
                package=package,
                currency_code='BRL',
                defaults={'amount': package.price_brl},
            )
        if package.price_usd and package.price_usd > 0:
            CoinPackagePrice.objects.get_or_create(
                package=package,
                currency_code='USD',
                defaults={'amount': package.price_usd},
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0007_add_bonus_customization_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='WalletChargeCurrency',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='Identificador público. Sempre UUID v4.', unique=True)),
                ('seq_id', models.BigAutoField(editable=False, help_text='ID sequencial interno. Nunca expor via API.', primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('code', models.CharField(max_length=10, unique=True)),
                ('enabled', models.BooleanField(default=True)),
                ('coins_per_unit', models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=12)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('settlement', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Moeda de cobrança',
                'verbose_name_plural': 'Moedas de cobrança',
                'db_table': 'wallet_charge_currency',
                'ordering': ['sort_order', 'code'],
            },
        ),
        migrations.CreateModel(
            name='CoinPackagePrice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='Identificador público. Sempre UUID v4.', unique=True)),
                ('seq_id', models.BigAutoField(editable=False, help_text='ID sequencial interno. Nunca expor via API.', primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('currency_code', models.CharField(max_length=10)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('package', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prices', to='wallet.coinpackage')),
            ],
            options={
                'verbose_name': 'Preço de pacote de moedas',
                'verbose_name_plural': 'Preços de pacotes de moedas',
                'db_table': 'wallet_coin_package_price',
                'ordering': ['currency_code'],
                'unique_together': {('package', 'currency_code')},
            },
        ),
        migrations.RunPython(seed_charge_currencies_and_prices, reverse_code=noop),
    ]
