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
    iva: int = 0  # percentage: 0, 6, 13, 23


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
    pass


class OrcamentoUpdate(BaseModel):
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
    numero: str  # e.g. "2026001"
    data_emissao: str  # YYYY-MM-DD
    validade_ate: str  # YYYY-MM-DD
    created_at: str
    updated_at: str
    subtotal: float = 0.0
    total_iva: float = 0.0
    total: float = 0.0


def _today_pt() -> datetime:
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


async def _next_numero() -> str:
    year = _today_pt().year
    prefix = str(year)
    counter = await db.counters.find_one_and_update(
        {"_id": f"orc_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1)
    return f"{prefix}{seq:03d}"


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
    year = _today_pt().year
    counter = await db.counters.find_one({"_id": f"orc_{year}"})
    seq = (counter.get("seq", 0) if counter else 0) + 1
    return {"numero": f"{year}{seq:03d}"}


@api_router.get("/orcamentos", response_model=List[Orcamento])
async def list_orcamentos():
    docs = await db.orcamentos.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Orcamento(**d) for d in docs]


@api_router.get("/orcamentos/{orc_id}", response_model=Orcamento)
async def get_orcamento(orc_id: str):
    doc = await db.orcamentos.find_one({"id": orc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Orçamento não encontrado")
    return Orcamento(**doc)


@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(data: OrcamentoCreate):
    now = _today_pt()
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
        **data.dict(exclude={"items"}),
        items=data.items,
        **totals,
    )
    doc = orc.dict()
    await db.orcamentos.insert_one({**doc})
    return orc


@api_router.patch("/orcamentos/{orc_id}", response_model=Orcamento)
async def update_orcamento(orc_id: str, data: OrcamentoUpdate):
    existing = await db.orcamentos.find_one({"id": orc_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Orçamento não encontrado")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "items" in update_data:
        update_data["items"] = [i.dict() if hasattr(i, "dict") else i for i in update_data["items"]]
        totals = _compute_totals(update_data["items"])
        update_data.update(totals)
    if "validade_dias" in update_data:
        emis = datetime.fromisoformat(existing["created_at"])
        update_data["validade_ate"] = _format_date(emis + timedelta(days=update_data["validade_dias"]))
    update_data["updated_at"] = _today_pt().isoformat()
    await db.orcamentos.update_one({"id": orc_id}, {"$set": update_data})
    merged = {**existing, **update_data}
    return Orcamento(**merged)


@api_router.delete("/orcamentos/{orc_id}")
async def delete_orcamento(orc_id: str):
    res = await db.orcamentos.delete_one({"id": orc_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Orçamento não encontrado")
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
