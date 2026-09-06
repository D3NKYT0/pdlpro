"""Overlays das poses de ação: cópia da arte oficial (sem rebaixamento).

As boxes em poses.json posicionam/escalam no CSS; o PNG mantém a qualidade
dos overlays de conversa (`02-sucesso-olhos`, bocas oficiais).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(r'd:\PROJETOS\PDL\PRO\frontend\public\mascot\denkynho\poses')
POSES_JSON = Path(r'd:\PROJETOS\PDL\PRO\frontend\src\components\help\poses.json')

PLANS = {
    '05-dormindo': {
        'eyes': None,
        'mouth': {
            'box': [100.0, 148.0, 136.0, 168.0],
            'openMouth': False,
            'file': '05-dormindo-boca.png',
            'template': '01-boas-vindas-falar.png',
        },
    },
    '06-rindo': {
        'eyes': None,
        'mouth': 'keep',
    },
    '11-comendo': {
        'eyes': {
            'box': [71.75, 52.0, 148.25, 74.75],
            'file': '11-comendo-olhos.png',
            'template': '02-sucesso-olhos.png',
        },
        'mouth': {
            'box': [88.96, 102.75, 131.04, 126.75],
            'openMouth': False,
            'file': '11-comendo-boca.png',
            'template': '01-boas-vindas-falar.png',
        },
    },
    '12-jogando': {
        'eyes': {
            'box': [74.0, 49.75, 147.5, 72.5],
            'file': '12-jogando-olhos.png',
            'template': '02-sucesso-olhos.png',
        },
        'mouth': {
            'box': [90.54, 100.5, 130.96, 124.5],
            'openMouth': True,
            'file': '12-jogando-boca.png',
            'template': '02-sucesso-boca.png',
        },
    },
    '13-dancando': {
        'eyes': {
            'box': [91.5, 55.0, 158.5, 79.0],
            'file': '13-dancando-olhos.png',
            'template': '02-sucesso-olhos.png',
        },
        'mouth': {
            'box': [106.58, 107.0, 143.43, 131.0],
            'openMouth': True,
            'file': '13-dancando-boca.png',
            'template': '02-sucesso-boca.png',
        },
    },
    '14-carinho': {
        'eyes': None,
        'mouth': {
            'box': [110.0, 100.0, 150.0, 126.0],
            'openMouth': False,
            'file': '14-carinho-boca.png',
            'template': '01-boas-vindas-falar.png',
        },
    },
    '15-banho': {
        'eyes': {
            'box': [120.75, 56.25, 177.5, 85.75],
            'file': '15-banho-olhos.png',
            'template': '02-sucesso-olhos.png',
        },
        'mouth': {
            'box': [133.52, 113.75, 164.73, 137.75],
            'openMouth': False,
            'file': '15-banho-boca.png',
            'template': '01-boas-vindas-falar.png',
        },
    },
    '16-andando': {
        'eyes': {
            'box': [125.25, 59.0, 181.75, 85.25],
            'file': '16-andando-olhos.png',
            'template': '02-sucesso-olhos.png',
        },
        'mouth': {
            'box': [137.96, 113.25, 169.04, 137.25],
            'openMouth': False,
            'file': '16-andando-boca.png',
            'template': '01-boas-vindas-falar.png',
        },
    },
}


def main() -> None:
    poses = json.loads(POSES_JSON.read_text(encoding='utf-8'))
    by_id = {p['id']: p for p in poses}
    written: list[str] = []

    for pose_id, plan in PLANS.items():
        entry = by_id[pose_id]

        eyes = plan['eyes']
        if eyes is None:
            entry['eyes'] = None
        else:
            shutil.copyfile(ROOT / eyes['template'], ROOT / eyes['file'])
            entry['eyes'] = {'src': eyes['file'], 'box': eyes['box']}
            written.append(f"{eyes['file']} <- {eyes['template']}")

        mouth = plan['mouth']
        if mouth == 'keep':
            pass
        elif mouth is None:
            entry['mouth'] = None
        else:
            shutil.copyfile(ROOT / mouth['template'], ROOT / mouth['file'])
            entry['mouth'] = {'src': mouth['file'], 'box': mouth['box']}
            entry['openMouth'] = mouth['openMouth']
            written.append(f"{mouth['file']} <- {mouth['template']}")

    POSES_JSON.write_text(json.dumps(poses, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('restored:')
    for line in written:
        print(' ', line)


if __name__ == '__main__':
    main()
