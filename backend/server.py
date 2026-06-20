from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ MODELS ============
class CompanySettings(BaseModel):
    nome_empresa: str = "CONSTRUÇÕES BARROS"
    nome_titular: str = "António Virgílio Marques Barros"
    morada: str = "Bc Eira Velha 1, 4930-341 - Valença"
    nif: str = "195060822"
    telefone: str = "930 582 585"
    email: str = "construcoesbarros.valenca@gmail.com"
    iban: str = ""
    iva_default: int = 23


class OrcamentoItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    quantidade: float = 1.0
    unidade: str = "serviço"
    preco_unitario: float = 0.0
    iva: int = 0


class OrcamentoBase(BaseModel):
    cliente_nome: str = ""
    cliente_morada: str = ""
    cliente_nif: str = ""
    cliente_contacto: str = ""
    segurado: str = ""
    apolice: str = ""
    seguradora: str = ""
    sinistro_data: str = ""
    obra: str = ""
    vistoria: str = ""
    observacoes: str = ""
    items: List[OrcamentoItem] = Field(default_factory=list)
    validade_dias: int = 30
    status: Literal["rascunho", "enviado", "aceite"] = "rascunho"
    para_seguro: bool = True


class OrcamentoCreate(OrcamentoBase):
    numero: Optional[str] = None  # If provided, used as-is; else auto-generated


class OrcamentoUpdate(BaseModel):
    numero: Optional[str] = None
    cliente_nome: Optional[str] = None
    cliente_morada: Optional[str] = None
    cliente_nif: Optional[str] = None
    cliente_contacto: Optional[str] = None
    segurado: Optional[str] = None
    apolice: Optional[str] = None
    seguradora: Optional[str] = None
    sinistro_data: Optional[str] = None
    obra: Optional[str] = None
    vistoria: Optional[str] = None
    observacoes: Optional[str] = None
    items: Optional[List[OrcamentoItem]] = None
    validade_dias: Optional[int] = None
    status: Optional[Literal["rascunho", "enviado", "aceite"]] = None
    para_seguro: Optional[bool] = None


class Orcamento(OrcamentoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    data_emissao: str
    validade_ate: str
    created_at: str
    updated_at: str
    subtotal: float = 0.0
    total_iva: float = 0.0
    total: float = 0.0


class OrcamentoImport(OrcamentoBase):
    numero: str
    data_emissao: str  # YYYY-MM-DD


class Cliente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    nif: str = ""
    contacto: str = ""
    morada: str = ""
    notas: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ClienteCreate(BaseModel):
    nome: str
    nif: str = ""
    contacto: str = ""
    morada: str = ""
    notas: str = ""


class Servico(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    unidade: str = "serviço"
    preco_unitario: float = 0.0
    iva: int = 23
    uso_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ServicoCreate(BaseModel):
    descricao: str
    unidade: str = "serviço"
    preco_unitario: float = 0.0
    iva: int = 23


# ============ HELPERS ============
def _today() -> datetime:
    return datetime.now(timezone.utc)


def _format_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _compute_totals(items: List[dict]) -> dict:
    subtotal = 0.0
    total_iva = 0.0
    for it in items:
        qty = float(it.get("quantidade", 0) or 0)
        pu = float(it.get("preco_unitario", 0) or 0)
        iva = float(it.get("iva", 0) or 0)
        line = qty * pu
        subtotal += line
        total_iva += line * (iva / 100.0)
    return {
        "subtotal": round(subtotal, 2),
        "total_iva": round(total_iva, 2),
        "total": round(subtotal + total_iva, 2),
    }


async def _bump_counter_to(year: int, seq: int):
    """Ensure the counter for given year is at least seq (used for imports)."""
    existing = await db.counters.find_one({"_id": f"orc_{year}"})
    current = existing.get("seq", 0) if existing else 0
    if seq > current:
        await db.counters.update_one(
            {"_id": f"orc_{year}"},
            {"$set": {"seq": seq}},
            upsert=True,
        )


async def _next_numero() -> str:
    year = _today().year
    counter = await db.counters.find_one_and_update(
        {"_id": f"orc_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1)
    return f"{year}{seq:03d}"


async def _auto_record_cliente(orc: dict):
    """Save client info if it doesn't already exist (case-insensitive name match)."""
    nome = (orc.get("cliente_nome") or "").strip()
    if not nome:
        return
    existing = await db.clientes.find_one(
        {"nome": {"$regex": f"^{nome}$", "$options": "i"}}
    )
    if existing:
        # update with new info if previously empty
        patch = {}
        for f in ("nif", "contacto", "morada"):
            src = (orc.get(f"cliente_{f}") or "").strip()
            if src and not existing.get(f):
                patch[f] = src
        if patch:
            await db.clientes.update_one({"_id": existing["_id"]}, {"$set": patch})
        return
    c = Cliente(
        nome=nome,
        nif=orc.get("cliente_nif", "") or "",
        contacto=orc.get("cliente_contacto", "") or "",
        morada=orc.get("cliente_morada", "") or "",
    )
    await db.clientes.insert_one(c.dict())


async def _auto_record_servicos(items: List[dict]):
    for it in items:
        desc = (it.get("descricao") or "").strip()
        if not desc:
            continue
        existing = await db.servicos.find_one(
            {"descricao": {"$regex": f"^{desc}$", "$options": "i"}}
        )
        if existing:
            await db.servicos.update_one(
                {"_id": existing["_id"]},
                {
                    "$inc": {"uso_count": 1},
                    "$set": {
                        "unidade": it.get("unidade", existing.get("unidade", "serviço")),
                        "preco_unitario": float(it.get("preco_unitario", existing.get("preco_unitario", 0))),
                        "iva": int(it.get("iva", existing.get("iva", 0))),
                    },
                },
            )
        else:
            s = Servico(
                descricao=desc,
                unidade=it.get("unidade", "serviço"),
                preco_unitario=float(it.get("preco_unitario", 0)),
                iva=int(it.get("iva", 0)),
                uso_count=1,
            )
            await db.servicos.insert_one(s.dict())


# ============ COMPANY ============
@api_router.get("/company", response_model=CompanySettings)
async def get_company():
    doc = await db.company.find_one({"_id": "default"}, {"_id": 0})
    if not doc:
        defaults = CompanySettings().dict()
        await db.company.insert_one({"_id": "default", **defaults})
        return CompanySettings(**defaults)
    return CompanySettings(**doc)


@api_router.put("/company", response_model=CompanySettings)
async def update_company(data: CompanySettings):
    d = data.dict()
    await db.company.update_one({"_id": "default"}, {"$set": d}, upsert=True)
    return CompanySettings(**d)


# ============ ORÇAMENTOS ============
@api_router.get("/orcamentos/next-number")
async def peek_next_number():
    year = _today().year
    counter = await db.counters.find_one({"_id": f"orc_{year}"})
    seq = (counter.get("seq", 0) if counter else 0) + 1
    return {"numero": f"{year}{seq:03d}"}


@api_router.get("/orcamentos", response_model=List[Orcamento])
async def list_orcamentos():
    docs = await db.orcamentos.find({}, {"_id": 0}).sort("numero", -1).to_list(1000)
    return [Orcamento(**d) for d in docs]


@api_router.get("/orcamentos/{orc_id}", response_model=Orcamento)
async def get_orcamento(orc_id: str):
    doc = await db.orcamentos.find_one({"id": orc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Orçamento não encontrado")
    return Orcamento(**doc)


@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(data: OrcamentoCreate):
    now = _today()
    if data.numero:
        # Custom numero requested
        if await db.orcamentos.find_one({"numero": data.numero}):
            raise HTTPException(409, f"Já existe um orçamento com o número {data.numero}")
        numero = data.numero
        try:
            year = int(numero[:4])
            seq = int(numero[4:])
            await _bump_counter_to(year, seq)
        except Exception:
            pass
    else:
        numero = await _next_numero()
    items_dicts = [i.dict() for i in data.items]
    totals = _compute_totals(items_dicts)
    validade = now + timedelta(days=data.validade_dias)
    orc = Orcamento(
        numero=numero,
        data_emissao=_format_date(now),
        validade_ate=_format_date(validade),
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
        **data.dict(exclude={"items", "numero"}),
        items=data.items,
        **totals,
    )
    doc = orc.dict()
    await db.orcamentos.insert_one({**doc})
    await _auto_record_cliente(doc)
    await _auto_record_servicos([i.dict() for i in data.items])
    return orc


@api_router.post("/orcamentos/import", response_model=List[Orcamento])
async def import_orcamentos(data: List[OrcamentoImport]):
    """Bulk import historical orçamentos with explicit numero and data_emissao."""
    out = []
    for entry in data:
        # Avoid duplicates by numero
        existing = await db.orcamentos.find_one({"numero": entry.numero})
        if existing:
            continue
        items_dicts = [i.dict() for i in entry.items]
        totals = _compute_totals(items_dicts)
        emis = datetime.strptime(entry.data_emissao, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        validade = emis + timedelta(days=entry.validade_dias)
        orc = Orcamento(
            numero=entry.numero,
            data_emissao=entry.data_emissao,
            validade_ate=_format_date(validade),
            created_at=emis.isoformat(),
            updated_at=emis.isoformat(),
            **entry.dict(exclude={"items", "numero", "data_emissao"}),
            items=entry.items,
            **totals,
        )
        await db.orcamentos.insert_one(orc.dict())
        await _auto_record_cliente(orc.dict())
        await _auto_record_servicos(items_dicts)
        # Bump counter
        try:
            year = int(entry.numero[:4])
            seq = int(entry.numero[4:])
            await _bump_counter_to(year, seq)
        except Exception:
            pass
        out.append(orc)
    return out


@api_router.patch("/orcamentos/{orc_id}", response_model=Orcamento)
async def update_orcamento(orc_id: str, data: OrcamentoUpdate):
    existing = await db.orcamentos.find_one({"id": orc_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Orçamento não encontrado")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    # If changing numero, ensure uniqueness
    if "numero" in update_data and update_data["numero"] != existing.get("numero"):
        if await db.orcamentos.find_one({"numero": update_data["numero"]}):
            raise HTTPException(409, f"Já existe um orçamento com o número {update_data['numero']}")
        try:
            year = int(update_data["numero"][:4])
            seq = int(update_data["numero"][4:])
            await _bump_counter_to(year, seq)
        except Exception:
            pass
    if "items" in update_data:
        update_data["items"] = [i.dict() if hasattr(i, "dict") else i for i in update_data["items"]]
        totals = _compute_totals(update_data["items"])
        update_data.update(totals)
    if "validade_dias" in update_data:
        emis = datetime.fromisoformat(existing["created_at"])
        update_data["validade_ate"] = _format_date(emis + timedelta(days=update_data["validade_dias"]))
    update_data["updated_at"] = _today().isoformat()
    await db.orcamentos.update_one({"id": orc_id}, {"$set": update_data})
    merged = {**existing, **update_data}
    return Orcamento(**merged)


@api_router.delete("/orcamentos/{orc_id}")
async def delete_orcamento(orc_id: str):
    res = await db.orcamentos.delete_one({"id": orc_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Orçamento não encontrado")
    return {"ok": True}


# ============ CLIENTES ============
@api_router.get("/clientes", response_model=List[Cliente])
async def list_clientes():
    docs = await db.clientes.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    return [Cliente(**d) for d in docs]


@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(data: ClienteCreate):
    c = Cliente(**data.dict())
    await db.clientes.insert_one(c.dict())
    return c


@api_router.patch("/clientes/{cli_id}", response_model=Cliente)
async def update_cliente(cli_id: str, data: ClienteCreate):
    existing = await db.clientes.find_one({"id": cli_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Cliente não encontrado")
    await db.clientes.update_one({"id": cli_id}, {"$set": data.dict()})
    return Cliente(**{**existing, **data.dict()})


@api_router.delete("/clientes/{cli_id}")
async def delete_cliente(cli_id: str):
    res = await db.clientes.delete_one({"id": cli_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Cliente não encontrado")
    return {"ok": True}


# ============ SERVIÇOS (CATÁLOGO) ============
@api_router.get("/servicos", response_model=List[Servico])
async def list_servicos():
    docs = await db.servicos.find({}, {"_id": 0}).sort([("uso_count", -1), ("descricao", 1)]).to_list(1000)
    return [Servico(**d) for d in docs]


@api_router.post("/servicos", response_model=Servico)
async def create_servico(data: ServicoCreate):
    s = Servico(**data.dict())
    await db.servicos.insert_one(s.dict())
    return s


@api_router.patch("/servicos/{srv_id}", response_model=Servico)
async def update_servico(srv_id: str, data: ServicoCreate):
    existing = await db.servicos.find_one({"id": srv_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Serviço não encontrado")
    await db.servicos.update_one({"id": srv_id}, {"$set": data.dict()})
    return Servico(**{**existing, **data.dict()})


@api_router.delete("/servicos/{srv_id}")
async def delete_servico(srv_id: str):
    res = await db.servicos.delete_one({"id": srv_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"service": "Construções Barros - Orçamentos API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
