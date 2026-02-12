from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiosqlite
import json
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.hash import pbkdf2_sha256
import jwt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database configuration
DATABASE_PATH = ROOT_DIR / 'database.db'

def get_db():
    return aiosqlite.connect(DATABASE_PATH)

async def init_db():
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        # Tables creation
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT
            )
        ''')
        # ... (rest of the tables)
        await db.execute('''
            CREATE TABLE IF NOT EXISTS vestidos (
                id TEXT PRIMARY KEY,
                nome TEXT,
                codigo TEXT UNIQUE,
                categoria TEXT,
                tamanho TEXT,
                cor TEXT,
                descricao TEXT,
                valor_aluguel REAL,
                status TEXT DEFAULT 'disponivel',
                fotos TEXT DEFAULT '[]',
                created_at TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS clientes (
                id TEXT PRIMARY KEY,
                nome_completo TEXT,
                cpf TEXT UNIQUE,
                telefone TEXT,
                endereco TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS alugueis (
                id TEXT PRIMARY KEY,
                vestido_id TEXT,
                vestido_nome TEXT,
                cliente_id TEXT,
                data_retirada TEXT,
                data_devolucao TEXT,
                valor_aluguel REAL,
                valor_sinal REAL,
                forma_pagamento TEXT,
                status TEXT DEFAULT 'pendente',
                observacoes TEXT,
                created_at TEXT,
                FOREIGN KEY (vestido_id) REFERENCES vestidos(id),
                FOREIGN KEY (cliente_id) REFERENCES clientes(id)
            )
        ''')
        
        # Initialize admin user
        admin_email = "admin@vestidos.com"
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
        if not await cursor.fetchone():
            admin_id = str(uuid.uuid4())
            # admin123 hashed
            hashed_pw = pbkdf2_sha256.hash("admin123")
            await db.execute(
                "INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)",
                (admin_id, admin_email, hashed_pw, "Administrador", "admin")
            )
        
        await db.commit()

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 72

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Handle potentially closed connections not yet removed
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class VestidoCreate(BaseModel):
    nome: str
    codigo: str
    categoria: str
    tamanho: str
    cor: str
    descricao: str
    valor_aluguel: float

class VestidoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    codigo: str
    categoria: str
    tamanho: str
    cor: str
    descricao: str
    valor_aluguel: float
    status: str
    fotos: List[str] = []
    created_at: str

class VestidoUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    categoria: Optional[str] = None
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    descricao: Optional[str] = None
    valor_aluguel: Optional[float] = None
    status: Optional[str] = None

class ClienteCreate(BaseModel):
    nome_completo: str
    cpf: str
    telefone: str
    endereco: str

class AluguelCreate(BaseModel):
    vestido_id: str
    cliente: ClienteCreate
    data_retirada: datetime
    data_devolucao: datetime
    valor_aluguel: float
    valor_sinal: float
    forma_pagamento: str
    observacoes: Optional[str] = ""

class AluguelResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    vestido_id: str
    vestido_nome: Optional[str] = ""
    cliente: dict
    data_retirada: str
    data_devolucao: str
    valor_aluguel: float
    valor_sinal: float
    valor_pago: float = 0.0
    forma_pagamento: str
    observacoes: str
    status: str
    avarias: Optional[str] = ""
    created_at: str

class AluguelUpdate(BaseModel):
    status: Optional[str] = None
    avarias: Optional[str] = None
    valor_pago: Optional[float] = None

class DashboardStats(BaseModel):
    total_vestidos: int
    vestidos_disponiveis: int
    vestidos_alugados: int
    vestidos_manutencao: int
    alugueis_ativos: int
    alugueis_proximos: int
    alugueis_atrasados: int
    faturamento_diario: float
    faturamento_semanal: float
    faturamento_mensal: float

# Helper para validar CPF
def is_valid_cpf(cpf: str) -> bool:
    cpf = ''.join(filter(str.isdigit, cpf))
    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False
    for i in range(9, 11):
        value = sum((int(cpf[num]) * ((i + 1) - num) for num in range(0, i)))
        digit = ((value * 10) % 11) % 10
        if digit != int(cpf[i]):
            return False
    return True

# Auth helpers
def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    try:
        return pbkdf2_sha256.verify(password, hashed)
    except Exception:
        return False

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 72

def create_token(user_id: str) -> str:
    import time
    expiry = int(time.time()) + (JWT_EXPIRATION_HOURS * 3600)
    payload = {
        'user_id': user_id,
        'exp': expiry
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        async with get_db() as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT id, email, name, role FROM users WHERE id = ?", (user_id,))
            user = await cursor.fetchone()
            if not user:
                raise HTTPException(status_code=401, detail="Usuário não encontrado")
            return dict(user)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido ou expirado: {str(e)}")

@app.on_event("startup")
async def startup():
    await init_db()

# Auth routes
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (credentials.email,))
        user = await cursor.fetchone()
        
        if not user or not verify_password(credentials.password, user['password']):
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
        
        token = create_token(user['id'])
        user_response = UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            role=user['role']
        )
        return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# Vestidos routes
@api_router.post("/vestidos", response_model=VestidoResponse)
async def create_vestido(
    nome: str = Form(...),
    codigo: str = Form(...),
    categoria: str = Form(...),
    tamanho: str = Form(...),
    cor: str = Form(...),
    descricao: str = Form(...),
    valor_aluguel: float = Form(...),
    fotos: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user)
):
    vestido_id = str(uuid.uuid4())
    foto_urls = []
    
    # Save uploaded photos
    for foto in fotos:
        if foto.filename:
            ext = foto.filename.split('.')[-1]
            filename = f"{vestido_id}_{uuid.uuid4()}.{ext}"
            filepath = UPLOADS_DIR / filename
            with open(filepath, 'wb') as f:
                shutil.copyfileobj(foto.file, f)
            foto_urls.append(f"/uploads/{filename}")
    
    vestido = {
        'id': vestido_id,
        'nome': nome,
        'codigo': codigo,
        'categoria': categoria,
        'tamanho': tamanho,
        'cor': cor,
        'descricao': descricao,
        'valor_aluguel': valor_aluguel,
        'status': 'disponivel',
        'fotos': json.dumps(foto_urls),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            '''INSERT INTO vestidos (id, nome, codigo, categoria, tamanho, cor, descricao, valor_aluguel, status, fotos, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (vestido['id'], vestido['nome'], vestido['codigo'], vestido['categoria'], vestido['tamanho'], 
             vestido['cor'], vestido['descricao'], vestido['valor_aluguel'], vestido['status'], 
             vestido['fotos'], vestido['created_at'])
        )
        await db.commit()
        await manager.broadcast({"type": "update"})
    
    vestido['fotos'] = foto_urls
    return VestidoResponse(**vestido)

@api_router.get("/vestidos", response_model=List[VestidoResponse])
async def get_vestidos(
    categoria: Optional[str] = None,
    tamanho: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    sql = "SELECT * FROM vestidos WHERE 1=1"
    params = []
    
    if categoria:
        sql += " AND categoria = ?"
        params.append(categoria)
    if tamanho:
        sql += " AND tamanho = ?"
        params.append(tamanho)
    if status:
        sql += " AND status = ?"
        params.append(status)
    if search:
        sql += " AND (nome LIKE ? OR codigo LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql, params)
        vestidos = await cursor.fetchall()
        
    result = []
    for v in vestidos:
        item = dict(v)
        item['fotos'] = json.loads(item['fotos'])
        result.append(VestidoResponse(**item))
    return result

@api_router.get("/vestidos/{vestido_id}", response_model=VestidoResponse)
async def get_vestido(vestido_id: str, current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM vestidos WHERE id = ?", (vestido_id,))
        vestido = await cursor.fetchone()
        
    if not vestido:
        raise HTTPException(status_code=404, detail="Vestido não encontrado")
    
    item = dict(vestido)
    item['fotos'] = json.loads(item['fotos'])
    return VestidoResponse(**item)

@api_router.put("/vestidos/{vestido_id}", response_model=VestidoResponse)
async def update_vestido(
    vestido_id: str,
    update_data: VestidoUpdate,
    current_user: dict = Depends(get_current_user)
):
    fields = update_data.dict(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    sql = "UPDATE vestidos SET "
    sql += ", ".join([f"{k} = ?" for k in fields.keys()])
    sql += " WHERE id = ?"
    params = list(fields.values()) + [vestido_id]
    
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        await db.execute(sql, params)
        await db.commit()
        await manager.broadcast({"type": "update"})
        
        cursor = await db.execute("SELECT * FROM vestidos WHERE id = ?", (vestido_id,))
        vestido = await cursor.fetchone()
        
    if not vestido:
        raise HTTPException(status_code=404, detail="Vestido não encontrado")
        
    item = dict(vestido)
    item['fotos'] = json.loads(item['fotos'])
    return VestidoResponse(**item)

@api_router.delete("/vestidos/{vestido_id}")
async def delete_vestido(vestido_id: str, current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        await db.execute("DELETE FROM vestidos WHERE id = ?", (vestido_id,))
        await db.commit()
        await manager.broadcast({"type": "update"})
    return {"message": "Vestido excluído com sucesso"}

# Aluguéis routes
@api_router.post("/alugueis", response_model=AluguelResponse)
async def create_aluguel(
    aluguel: AluguelCreate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        # Check if vestido exists and is available
        cursor = await db.execute("SELECT nome, status FROM vestidos WHERE id = ?", (aluguel.vestido_id,))
        vestido = await cursor.fetchone()
        
        if not vestido:
            raise HTTPException(status_code=404, detail="Vestido não encontrado")
        if vestido['status'] != 'disponivel':
            raise HTTPException(status_code=400, detail="Vestido não está disponível")
        
        # Check or create client
        cursor = await db.execute("SELECT id FROM clientes WHERE cpf = ?", (aluguel.cliente.cpf,))
        client_row = await cursor.fetchone()
        
        if client_row:
            cliente_id = client_row['id']
        else:
            cliente_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO clientes (id, nome_completo, cpf, telefone, endereco) VALUES (?, ?, ?, ?, ?)",
                (cliente_id, aluguel.cliente.nome_completo, aluguel.cliente.cpf, aluguel.cliente.telefone, aluguel.cliente.endereco)
            )
        
        aluguel_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db.execute(
            '''INSERT INTO alugueis (id, vestido_id, vestido_nome, cliente_id, data_retirada, data_devolucao, 
                                   valor_aluguel, valor_sinal, valor_pago, forma_pagamento, status, observacoes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (aluguel_id, aluguel.vestido_id, vestido['nome'], cliente_id, aluguel.data_retirada.isoformat(),
             aluguel.data_devolucao.isoformat(), aluguel.valor_aluguel, aluguel.valor_sinal, aluguel.valor_sinal,
             aluguel.forma_pagamento, 'ativo', aluguel.observacoes or '', created_at)
        )
        
        # Update vestido status
        await db.execute("UPDATE vestidos SET status = 'alugado' WHERE id = ?", (aluguel.vestido_id,))
        await db.commit()
        await manager.broadcast({"type": "update"})
        
        return AluguelResponse(
            id=aluguel_id,
            vestido_id=aluguel.vestido_id,
            vestido_nome=vestido['nome'],
            cliente=aluguel.cliente.dict(),
            data_retirada=aluguel.data_retirada.isoformat(),
            data_devolucao=aluguel.data_devolucao.isoformat(),
            valor_aluguel=aluguel.valor_aluguel,
            valor_sinal=aluguel.valor_sinal,
            valor_pago=aluguel.valor_sinal,
            forma_pagamento=aluguel.forma_pagamento,
            observacoes=aluguel.observacoes or '',
            status='ativo',
            created_at=created_at
        )

@api_router.get("/alugueis", response_model=List[AluguelResponse])
async def get_alugueis(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    sql = '''
        SELECT a.*, c.nome_completo, c.cpf, c.telefone, c.endereco 
        FROM alugueis a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE 1=1
    '''
    params = []
    
    if status:
        sql += " AND a.status = ?"
        params.append(status)
    
    if search:
        sql += " AND (a.vestido_nome LIKE ? OR c.nome_completo LIKE ? OR c.cpf LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])
    
    sql += " ORDER BY a.created_at DESC"
    
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()
        
    result = []
    for r in rows:
        row_dict = dict(r)
        cliente = {
            "nome_completo": row_dict.pop("nome_completo"),
            "cpf": row_dict.pop("cpf"),
            "telefone": row_dict.pop("telefone"),
            "endereco": row_dict.pop("endereco")
        }
        row_dict["cliente"] = cliente
        result.append(AluguelResponse(**row_dict))
    return result

@api_router.get("/alugueis/{aluguel_id}", response_model=AluguelResponse)
async def get_aluguel(aluguel_id: str, current_user: dict = Depends(get_current_user)):
    sql = '''
        SELECT a.*, c.nome_completo, c.cpf, c.telefone, c.endereco 
        FROM alugueis a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE a.id = ?
    '''
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql, (aluguel_id,))
        row = await cursor.fetchone()
        
    if not row:
        raise HTTPException(status_code=404, detail="Aluguel não encontrado")
    
    row_dict = dict(row)
    cliente = {
        "nome_completo": row_dict.pop("nome_completo"),
        "cpf": row_dict.pop("cpf"),
        "telefone": row_dict.pop("telefone"),
        "endereco": row_dict.pop("endereco")
    }
    row_dict["cliente"] = cliente
    return AluguelResponse(**row_dict)

@api_router.put("/alugueis/{aluguel_id}", response_model=AluguelResponse)
async def update_aluguel(
    aluguel_id: str,
    aluguel_update: AluguelUpdate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT status, vestido_id, valor_aluguel FROM alugueis WHERE id = ?", (aluguel_id,))
        aluguel = await cursor.fetchone()
        
        if not aluguel:
            raise HTTPException(status_code=404, detail="Aluguel não encontrado")
        
        fields = aluguel_update.dict(exclude_unset=True)
        if fields:
            # If status changed to 'finalizado', ensure it's fully paid
            if fields.get('status') == 'finalizado':
                fields['valor_pago'] = aluguel['valor_aluguel']

            sql = "UPDATE alugueis SET "
            sql += ", ".join([f"{k} = ?" for k in fields.keys()])
            sql += " WHERE id = ?"
            params = list(fields.values()) + [aluguel_id]
            await db.execute(sql, params)
            
            # If status changed to 'finalizado', free the vestido
            if fields.get('status') == 'finalizado':
                await db.execute("UPDATE vestidos SET status = 'disponivel' WHERE id = ?", (aluguel['vestido_id'],))
            
            await db.commit()
            await manager.broadcast({"type": "update"})
            
        return await get_aluguel(aluguel_id, current_user)

@api_router.delete("/alugueis/{aluguel_id}")
async def delete_aluguel(aluguel_id: str, current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT status, vestido_id FROM alugueis WHERE id = ?", (aluguel_id,))
        aluguel = await cursor.fetchone()
        
        if not aluguel:
            raise HTTPException(status_code=404, detail="Aluguel não encontrado")
        
        # Return vestido to available if aluguel was active
        if aluguel['status'] == 'ativo':
            await db.execute("UPDATE vestidos SET status = 'disponivel' WHERE id = ?", (aluguel['vestido_id'],))
        
        await db.execute("DELETE FROM alugueis WHERE id = ?", (aluguel_id,))
        await db.commit()
        await manager.broadcast({"type": "update"})
        
    return {"message": "Aluguel excluído com sucesso"}

# Dashboard
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT COUNT(*) FROM vestidos")
        total_vestidos = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM vestidos WHERE status = 'disponivel'")
        vestidos_disponiveis = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM vestidos WHERE status = 'alugado'")
        vestidos_alugados = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM vestidos WHERE status = 'manutencao'")
        vestidos_manutencao = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM alugueis WHERE status = 'ativo'")
        alugueis_ativos = (await cursor.fetchone())[0]
        
        # Calculate time markers for stats
        hoje = datetime.now(timezone.utc)
        tres_dias = (hoje + timedelta(days=3)).isoformat()
        um_dia_atras = (hoje - timedelta(days=1)).isoformat()
        sete_dias_atras = (hoje - timedelta(days=7)).isoformat()
        trinta_dias_atras = (hoje - timedelta(days=30)).isoformat()
        hoje_iso = hoje.isoformat()

        # Overdue rentals
        cursor = await db.execute(
            "SELECT COUNT(*) FROM alugueis WHERE status = 'ativo' AND data_devolucao < ?", 
            (hoje_iso,)
        )
        alugueis_atrasados = (await cursor.fetchone())[0]

        # Upcoming rentals (next 3 days, not overdue)
        cursor = await db.execute(
            "SELECT COUNT(*) FROM alugueis WHERE status = 'ativo' AND data_devolucao BETWEEN ? AND ?", 
            (hoje_iso, tres_dias)
        )
        alugueis_proximos = (await cursor.fetchone())[0]

        # Billing: Daily
        cursor = await db.execute(
            "SELECT SUM(valor_pago) FROM alugueis WHERE created_at >= ?", 
            (um_dia_atras,)
        )
        faturamento_diario = (await cursor.fetchone())[0] or 0.0

        # Billing: Weekly
        cursor = await db.execute(
            "SELECT SUM(valor_pago) FROM alugueis WHERE created_at >= ?", 
            (sete_dias_atras,)
        )
        faturamento_semanal = (await cursor.fetchone())[0] or 0.0

        # Billing: Monthly
        cursor = await db.execute(
            "SELECT SUM(valor_pago) FROM alugueis WHERE created_at >= ?", 
            (trinta_dias_atras,)
        )
        faturamento_mensal = (await cursor.fetchone())[0] or 0.0
        
    return DashboardStats(
        total_vestidos=total_vestidos,
        vestidos_disponiveis=vestidos_disponiveis,
        vestidos_alugados=vestidos_alugados,
        vestidos_manutencao=vestidos_manutencao,
        alugueis_ativos=alugueis_ativos,
        alugueis_proximos=alugueis_proximos,
        alugueis_atrasados=alugueis_atrasados,
        faturamento_diario=faturamento_diario,
        faturamento_semanal=faturamento_semanal,
        faturamento_mensal=faturamento_mensal
    )
    
# Histórico
@api_router.get("/historico/vestido/{vestido_id}", response_model=List[AluguelResponse])
async def get_historico_vestido(vestido_id: str, current_user: dict = Depends(get_current_user)):
    sql = '''
        SELECT a.*, c.nome_completo, c.cpf, c.telefone, c.endereco 
        FROM alugueis a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE a.vestido_id = ?
        ORDER BY a.created_at DESC
    '''
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql, (vestido_id,))
        rows = await cursor.fetchall()
        
    result = []
    for r in rows:
        row_dict = dict(r)
        cliente = {
            "nome_completo": row_dict.pop("nome_completo"),
            "cpf": row_dict.pop("cpf"),
            "telefone": row_dict.pop("telefone"),
            "endereco": row_dict.pop("endereco")
        }
        row_dict["cliente"] = cliente
        result.append(AluguelResponse(**row_dict))
    return result

@api_router.get("/historico/cliente/{cpf}", response_model=List[AluguelResponse])
async def get_historico_cliente(cpf: str, current_user: dict = Depends(get_current_user)):
    sql = '''
        SELECT a.*, c.nome_completo, c.cpf, c.telefone, c.endereco 
        FROM alugueis a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE c.cpf = ?
        ORDER BY a.created_at DESC
    '''
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql, (cpf,))
        rows = await cursor.fetchall()
        
    result = []
    for r in rows:
        row_dict = dict(r)
        cliente = {
            "nome_completo": row_dict.pop("nome_completo"),
            "cpf": row_dict.pop("cpf"),
            "telefone": row_dict.pop("telefone"),
            "endereco": row_dict.pop("endereco")
        }
        row_dict["cliente"] = cliente
        result.append(AluguelResponse(**row_dict))
    return result

app.include_router(api_router)

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)