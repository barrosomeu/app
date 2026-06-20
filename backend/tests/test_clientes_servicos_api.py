"""Backend tests for Clientes & Servicos catalog + historical imports (iteration 2)."""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Seed verification (5 clientes, 13 servicos, 6 historical orçamentos) --------
class TestSeedState:
    def test_five_clientes_seeded(self, session):
        r = session.get(f"{API}/clientes", timeout=30)
        assert r.status_code == 200, r.text
        names = [c["nome"] for c in r.json()]
        # Backend doesn't seed test data; we check >=5 because main agent seeded
        assert len(names) >= 5, f"expected >=5 seeded clientes, got: {names}"
        expected_substrings = ["Clara", "Domingos", "Ganfei", "Ione", "Patr"]
        for sub in expected_substrings:
            assert any(sub in n for n in names), f"missing cliente containing '{sub}', got {names}"

    def test_thirteen_servicos_seeded(self, session):
        r = session.get(f"{API}/servicos", timeout=30)
        assert r.status_code == 200, r.text
        servicos = r.json()
        assert len(servicos) >= 13, f"expected >=13 seeded servicos, got {len(servicos)}"
        # Validate sort by uso_count desc
        counts = [s["uso_count"] for s in servicos]
        assert counts == sorted(counts, reverse=True), f"servicos not sorted by uso_count desc: {counts}"
        for s in servicos:
            assert "_id" not in s
            assert s["descricao"]

    def test_historical_orcamentos_total(self, session):
        r = session.get(f"{API}/orcamentos", timeout=30)
        assert r.status_code == 200
        historical = [o for o in r.json() if o["numero"] in
                      ("2026105", "2026106", "2026107", "2026108", "2026109", "2026110")]
        assert len(historical) == 6, f"expected 6 historical, got {len(historical)} numeros {[o['numero'] for o in historical]}"
        total_sum = round(sum(o["total"] for o in historical), 2)
        # User expects €11.700,00
        assert abs(total_sum - 11700.0) < 0.5, f"historical total {total_sum} != 11700"

    def test_next_number_after_import(self, session):
        r = session.get(f"{API}/orcamentos/next-number", timeout=30)
        assert r.status_code == 200
        n = r.json()["numero"]
        # After 2026110 import, next should be at least 2026111
        assert int(n) >= 2026111, f"next number {n} < 2026111"


# -------- Clientes CRUD --------
class TestClientesCRUD:
    created_id = None

    def test_create_cliente(self, session):
        r = session.post(f"{API}/clientes", json={
            "nome": "TEST_Cliente Pytest",
            "nif": "999000111",
            "contacto": "910000000",
            "morada": "Rua Teste",
            "notas": "auto-test",
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        assert d["nome"] == "TEST_Cliente Pytest"
        assert d["nif"] == "999000111"
        TestClientesCRUD.created_id = d["id"]

    def test_get_cliente_via_list(self, session):
        r = session.get(f"{API}/clientes", timeout=30)
        ids = [c["id"] for c in r.json()]
        assert TestClientesCRUD.created_id in ids

    def test_update_cliente(self, session):
        r = session.patch(f"{API}/clientes/{TestClientesCRUD.created_id}", json={
            "nome": "TEST_Cliente Pytest Updated",
            "nif": "888000222",
            "contacto": "920000000",
            "morada": "Rua Nova",
            "notas": "updated",
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["nome"] == "TEST_Cliente Pytest Updated"
        assert d["nif"] == "888000222"
        # verify persisted
        lst = session.get(f"{API}/clientes").json()
        c = next(c for c in lst if c["id"] == TestClientesCRUD.created_id)
        assert c["nome"] == "TEST_Cliente Pytest Updated"

    def test_delete_cliente(self, session):
        r = session.delete(f"{API}/clientes/{TestClientesCRUD.created_id}", timeout=30)
        assert r.status_code == 200
        lst = session.get(f"{API}/clientes").json()
        assert TestClientesCRUD.created_id not in [c["id"] for c in lst]

    def test_delete_404(self, session):
        r = session.delete(f"{API}/clientes/no-such-id")
        assert r.status_code == 404


# -------- Servicos CRUD --------
class TestServicosCRUD:
    created_id = None

    def test_create_servico(self, session):
        r = session.post(f"{API}/servicos", json={
            "descricao": "TEST_Servico Pytest",
            "unidade": "m2",
            "preco_unitario": 12.5,
            "iva": 23,
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        assert d["descricao"] == "TEST_Servico Pytest"
        assert d["preco_unitario"] == 12.5
        assert d["uso_count"] == 0
        TestServicosCRUD.created_id = d["id"]

    def test_update_servico(self, session):
        r = session.patch(f"{API}/servicos/{TestServicosCRUD.created_id}", json={
            "descricao": "TEST_Servico Pytest Updated",
            "unidade": "un",
            "preco_unitario": 20.0,
            "iva": 6,
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["preco_unitario"] == 20.0
        assert d["iva"] == 6

    def test_delete_servico(self, session):
        r = session.delete(f"{API}/servicos/{TestServicosCRUD.created_id}", timeout=30)
        assert r.status_code == 200


# -------- Auto-record from POST /orcamentos --------
class TestAutoRecord:
    cliente_name = "TEST_AutoCliente Z"
    servico_desc = "TEST_AutoServico Z Special Job"
    orc_id = None

    def test_create_with_new_cliente_and_servico(self, session):
        r = session.post(f"{API}/orcamentos", json={
            "cliente_nome": self.cliente_name,
            "cliente_nif": "111222333",
            "cliente_contacto": "961112233",
            "cliente_morada": "Rua Auto, Valença",
            "items": [
                {"descricao": self.servico_desc, "quantidade": 1, "unidade": "serviço",
                 "preco_unitario": 99.0, "iva": 23}
            ],
        }, timeout=30)
        assert r.status_code == 200, r.text
        TestAutoRecord.orc_id = r.json()["id"]

    def test_cliente_auto_recorded(self, session):
        names = [c["nome"] for c in session.get(f"{API}/clientes").json()]
        assert self.cliente_name in names, f"auto-recorded cliente missing, got {names}"

    def test_servico_auto_recorded_with_uso_count(self, session):
        servicos = session.get(f"{API}/servicos").json()
        match = next((s for s in servicos if s["descricao"] == self.servico_desc), None)
        assert match is not None, "servico not auto-recorded"
        assert match["uso_count"] >= 1
        assert match["preco_unitario"] == 99.0

    def test_create_again_increments_uso(self, session):
        r = session.post(f"{API}/orcamentos", json={
            "cliente_nome": self.cliente_name,
            "items": [
                {"descricao": self.servico_desc, "quantidade": 1, "unidade": "serviço",
                 "preco_unitario": 99.0, "iva": 23}
            ],
        }, timeout=30)
        assert r.status_code == 200
        orc_id2 = r.json()["id"]
        # cliente should not duplicate
        cnt = sum(1 for c in session.get(f"{API}/clientes").json() if c["nome"] == self.cliente_name)
        assert cnt == 1, f"cliente duplicated, count={cnt}"
        # servico uso_count should be >= 2
        match = next(s for s in session.get(f"{API}/servicos").json() if s["descricao"] == self.servico_desc)
        assert match["uso_count"] >= 2
        # cleanup
        session.delete(f"{API}/orcamentos/{orc_id2}")

    def test_cleanup(self, session):
        # delete orc, then delete cliente + servico we created
        if TestAutoRecord.orc_id:
            session.delete(f"{API}/orcamentos/{TestAutoRecord.orc_id}")
        for c in session.get(f"{API}/clientes").json():
            if c["nome"] == TestAutoRecord.cliente_name:
                session.delete(f"{API}/clientes/{c['id']}")
        for s in session.get(f"{API}/servicos").json():
            if s["descricao"] == TestAutoRecord.servico_desc:
                session.delete(f"{API}/servicos/{s['id']}")


# -------- Import bulk --------
class TestImport:
    def test_import_idempotent_skip_existing(self, session):
        # importing an existing numero should be skipped (returns empty)
        r = session.post(f"{API}/orcamentos/import", json=[{
            "numero": "2026105",
            "data_emissao": "2026-01-01",
            "cliente_nome": "Re-import attempt",
            "items": [],
            "validade_dias": 30,
            "para_seguro": False,
        }], timeout=30)
        assert r.status_code == 200, r.text
        assert r.json() == [], "expected skip for existing numero, got %s" % r.json()

    def test_import_new_numero_then_cleanup(self, session):
        new_no = "2025999"
        r = session.post(f"{API}/orcamentos/import", json=[{
            "numero": new_no,
            "data_emissao": "2025-06-01",
            "cliente_nome": "TEST_Import",
            "items": [{"descricao": "TEST_Import item", "quantidade": 1, "unidade": "un",
                       "preco_unitario": 50.0, "iva": 23}],
            "validade_dias": 30,
            "para_seguro": False,
        }], timeout=30)
        assert r.status_code == 200, r.text
        out = r.json()
        assert len(out) == 1
        assert out[0]["numero"] == new_no
        assert out[0]["total"] == 61.5  # 50 + 23%
        # cleanup
        session.delete(f"{API}/orcamentos/{out[0]['id']}")
        # cleanup auto-recorded test cliente & servico
        for c in session.get(f"{API}/clientes").json():
            if c["nome"] == "TEST_Import":
                session.delete(f"{API}/clientes/{c['id']}")
        for s in session.get(f"{API}/servicos").json():
            if s["descricao"] == "TEST_Import item":
                session.delete(f"{API}/servicos/{s['id']}")
