"""Backend API tests for Construções Barros Orçamentos."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://auto-budget-tool-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ----------- Company singleton -----------
class TestCompany:
    def test_get_company_seeded(self, session):
        r = session.get(f"{API}/company", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "_id" not in data
        assert data["nome_empresa"] == "CONSTRUÇÕES BARROS"
        assert data["nif"] == "195060822"
        assert data["telefone"] == "930 582 585"
        assert data["email"] == "construcoesbarros.valenca@gmail.com"

    def test_put_company_update_and_revert(self, session):
        original = session.get(f"{API}/company").json()
        updated = {**original, "iban": "PT50 0000 0000 0000 0000 0000 0"}
        r = session.put(f"{API}/company", json=updated, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["iban"] == updated["iban"]
        # verify persisted
        g = session.get(f"{API}/company").json()
        assert g["iban"] == updated["iban"]
        # revert
        session.put(f"{API}/company", json=original)


# ----------- Orcamentos CRUD -----------
class TestOrcamentos:
    created_id = None

    def test_next_number_format(self, session):
        r = session.get(f"{API}/orcamentos/next-number", timeout=30)
        assert r.status_code == 200
        n = r.json()["numero"]
        assert len(n) == 7
        assert n.startswith("2026")

    def test_create_orcamento_computes_totals(self, session):
        payload = {
            "cliente_nome": "TEST_Cliente Lda",
            "cliente_nif": "123456789",
            "cliente_contacto": "912345678",
            "cliente_morada": "Rua Teste 1, Valença",
            "items": [
                {"descricao": "Pintura", "quantidade": 2, "unidade": "m2", "preco_unitario": 100.0, "iva": 23},
                {"descricao": "Material", "quantidade": 1, "unidade": "un", "preco_unitario": 50.0, "iva": 6},
                {"descricao": "Isento", "quantidade": 1, "unidade": "un", "preco_unitario": 30.0, "iva": 0},
            ],
            "validade_dias": 30,
            "para_seguro": True,
        }
        r = session.post(f"{API}/orcamentos", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        # totals: subtotal = 200+50+30 = 280; iva = 200*0.23 + 50*0.06 + 0 = 46+3 = 49; total = 329
        assert d["subtotal"] == 280.0
        assert d["total_iva"] == 49.0
        assert d["total"] == 329.0
        assert d["numero"].startswith("2026")
        assert d["status"] == "rascunho"
        assert d["data_emissao"]
        assert d["validade_ate"]
        TestOrcamentos.created_id = d["id"]

    def test_list_sorted_desc(self, session):
        r = session.get(f"{API}/orcamentos", timeout=30)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert any(o["id"] == TestOrcamentos.created_id for o in lst)
        # not strictly testing order but ensure list works
        for o in lst:
            assert "_id" not in o

    def test_get_single(self, session):
        r = session.get(f"{API}/orcamentos/{TestOrcamentos.created_id}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == TestOrcamentos.created_id

    def test_patch_status_and_items(self, session):
        new_items = [{"descricao": "Update", "quantidade": 3, "unidade": "un", "preco_unitario": 10.0, "iva": 13}]
        r = session.patch(
            f"{API}/orcamentos/{TestOrcamentos.created_id}",
            json={"status": "enviado", "items": new_items, "validade_dias": 60},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "enviado"
        # subtotal=30, iva=3.9, total=33.9
        assert d["subtotal"] == 30.0
        assert d["total_iva"] == 3.9
        assert d["total"] == 33.9

    def test_sequential_numero(self, session):
        peek = session.get(f"{API}/orcamentos/next-number").json()["numero"]
        r = session.post(f"{API}/orcamentos", json={"cliente_nome": "TEST_Seq", "items": []})
        assert r.status_code == 200
        assert r.json()["numero"] == peek
        # cleanup
        session.delete(f"{API}/orcamentos/{r.json()['id']}")

    def test_delete(self, session):
        r = session.delete(f"{API}/orcamentos/{TestOrcamentos.created_id}", timeout=30)
        assert r.status_code == 200
        g = session.get(f"{API}/orcamentos/{TestOrcamentos.created_id}")
        assert g.status_code == 404

    def test_get_404(self, session):
        assert session.get(f"{API}/orcamentos/does-not-exist").status_code == 404
