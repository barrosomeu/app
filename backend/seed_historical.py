#!/usr/bin/env python3
"""Seed historical orçamentos from the user's old PDFs."""
import requests
import json

API = "http://localhost:8001/api"

# Clean test orçamento(s) first
existing = requests.get(f"{API}/orcamentos").json()
for o in existing:
    if o["numero"] in {"2026001", "2026002", "2026003", "2026004"}:
        requests.delete(f"{API}/orcamentos/{o['id']}")
        print(f"Deleted test {o['numero']}")

historical = [
    {
        "numero": "2026105",
        "data_emissao": "2026-05-20",
        "validade_dias": 30,
        "cliente_nome": "Ione",
        "cliente_contacto": "930 582 585",
        "cliente_morada": "",
        "para_seguro": False,
        "status": "aceite",
        "items": [
            {
                "id": "h105-1",
                "descricao": "Restauração de muro de pedra",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 1500.00,
                "iva": 0,
            }
        ],
    },
    {
        "numero": "2026106",
        "data_emissao": "2026-05-21",
        "validade_dias": 30,
        "cliente_nome": "Clara",
        "cliente_contacto": "963356197",
        "cliente_morada": "Lugar das Azenhas, Ganfei",
        "para_seguro": False,
        "status": "aceite",
        "items": [
            {
                "id": "h106-1",
                "descricao": "Pintar -> Primário + 2 mãos de tinta: 2xQuartos, 1xCozinha, 2xCasas de banho, 1xCorredor, 1xSala",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 1150.00,
                "iva": 0,
            },
            {
                "id": "h106-2",
                "descricao": "PVC - Imitar madeira",
                "quantidade": 3.0,
                "unidade": "m",
                "preco_unitario": 50.00,
                "iva": 0,
            },
            {
                "id": "h106-3",
                "descricao": "Tapar buracos das telhas",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 100.00,
                "iva": 0,
            },
            {
                "id": "h106-4",
                "descricao": "Isolamento parede",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 100.00,
                "iva": 0,
            },
        ],
    },
    {
        "numero": "2026107",
        "data_emissao": "2026-06-05",
        "validade_dias": 30,
        "cliente_nome": "Patrícia Sousa Reis Lima",
        "cliente_contacto": "925926972",
        "cliente_morada": "Avenida Miguel Dantas, Edifício Tróias nº22, Bloco Poente - 9º andar 4930-678 Valença",
        "para_seguro": True,
        "status": "enviado",
        "observacoes": "Orçamento preparado para submissão a seguradora, com descrição clara dos trabalhos e valores discriminados.",
        "items": [
            {
                "id": "h107-1",
                "descricao": "Demolição, remoção de entulhos e preparação da área",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 250.00,
                "iva": 0,
            },
            {
                "id": "h107-2",
                "descricao": "Reparação da tubagem de esgoto da banheira (mão de obra especializada)",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 452.00,
                "iva": 0,
            },
            {
                "id": "h107-3",
                "descricao": "Assentamento de revestimento cerâmico",
                "quantidade": 16.0,
                "unidade": "m2",
                "preco_unitario": 28.00,
                "iva": 0,
            },
            {
                "id": "h107-4",
                "descricao": "Fornecimento de azulejo e materiais de aplicação (cola, juntas e consumíveis)",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 250.00,
                "iva": 0,
            },
            {
                "id": "h107-5",
                "descricao": "Limpeza final e acabamentos",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 100.00,
                "iva": 0,
            },
        ],
    },
    {
        "numero": "2026108",
        "data_emissao": "2026-06-08",
        "validade_dias": 30,
        "cliente_nome": "Freguesia de Ganfei",
        "cliente_nif": "507011953",
        "cliente_morada": "Largo de S. Teotónio - Tardinhade 4930-371 Ganfei",
        "para_seguro": False,
        "status": "enviado",
        "items": [
            {
                "id": "h108-1",
                "descricao": "Restauro e pintura \"Senhor do Castanhal\" por dentro e por fora",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 1800.00,
                "iva": 0,
            }
        ],
    },
    {
        "numero": "2026109",
        "data_emissao": "2026-06-15",
        "validade_dias": 30,
        "cliente_nome": "Domingos Afonso",
        "cliente_morada": "Vila Praia de Âncora",
        "para_seguro": False,
        "status": "aceite",
        "items": [
            {
                "id": "h109-1",
                "descricao": "Isolamento térmico EPS de 2cm com cimento WEBER",
                "quantidade": 56.0,
                "unidade": "m2",
                "preco_unitario": 50.00,
                "iva": 0,
            }
        ],
    },
    {
        "numero": "2026110",
        "data_emissao": "2026-06-20",
        "validade_dias": 30,
        "cliente_nome": "Ione",
        "cliente_contacto": "930 582 585",
        "para_seguro": True,
        "status": "enviado",
        "observacoes": "Proposta destinada a fins de seguro e reparação da ocorrência indicada.",
        "items": [
            {
                "id": "h110-1",
                "descricao": "Lavar e aplicação de massa WEBER",
                "quantidade": 1.0,
                "unidade": "serviço",
                "preco_unitario": 2600.00,
                "iva": 0,
            }
        ],
    },
]

r = requests.post(f"{API}/orcamentos/import", json=historical)
print(f"Import status: {r.status_code}")
result = r.json()
print(f"Imported {len(result)} orçamentos:")
for o in result:
    print(f"  {o['numero']} - {o['cliente_nome']} - €{o['total']}")

clientes = requests.get(f"{API}/clientes").json()
print(f"\n{len(clientes)} clientes auto-criados:")
for c in clientes:
    print(f"  - {c['nome']}")

servicos = requests.get(f"{API}/servicos").json()
print(f"\n{len(servicos)} serviços no catálogo:")
for s in servicos:
    print(f"  - {s['descricao'][:60]} (€{s['preco_unitario']})")
