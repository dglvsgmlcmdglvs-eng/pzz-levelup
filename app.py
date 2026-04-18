from flask import Flask, request, jsonify
from flask_cors import CORS
import secrets
import hashlib
from datetime import datetime, timedelta
from functools import wraps

from send_sms import enviar_sms
from database import get_db, init_db

app = Flask(__name__, static_folder="../", static_url_path="/static")
CORS(app)

PAGAMENTOS_VALIDOS = {"pix", "dinheiro", "cartao_credito", "cartao_debito"}
OTP_EXPIRY_MINUTES = 5
OTP_RATE_LIMIT_SECONDS = 20
SESSION_EXPIRY_HOURS = 24
ADMIN_TOKEN_EXPIRY_HOURS = 8


def limpar_telefone(telefone):
    return "".join(c for c in telefone if c.isdigit())


def gerar_otp(telefone):
    """Gera um código OTP de 6 dígitos e salva no banco."""
    telefone_limpo = limpar_telefone(telefone)
    codigo = f"{secrets.randbelow(900000) + 100000}"
    expira_em = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    db = get_db()

    # Rate limit: verificar se já enviou um código há menos de 60s
    ultimo = db.execute(
        "SELECT criado_em FROM codigos_otp WHERE telefone = ? ORDER BY criado_em DESC LIMIT 1",
        (telefone_limpo,),
    ).fetchone()

    if ultimo:
        criado = datetime.strptime(ultimo["criado_em"], "%Y-%m-%d %H:%M:%S")
        if (datetime.utcnow() - criado).total_seconds() < OTP_RATE_LIMIT_SECONDS:
            db.close()
            return None, "Aguarde 1 minuto antes de solicitar outro código"

    # Invalidar códigos anteriores
    db.execute(
        "UPDATE codigos_otp SET usado = 1 WHERE telefone = ? AND usado = 0",
        (telefone_limpo,),
    )

    db.execute(
        "INSERT INTO codigos_otp (telefone, codigo, expira_em) VALUES (?, ?, ?)",
        (telefone_limpo, codigo, expira_em.strftime("%Y-%m-%d %H:%M:%S")),
    )
    db.commit()
    db.close()

    # === AQUI SERIA O ENVIO REAL (Twilio, WhatsApp, etc.) ===
    print(f"\n{'='*40}")
    print(f"📱 CÓDIGO OTP para {telefone_limpo}: {codigo}")
    print(f"⏰ Expira em {OTP_EXPIRY_MINUTES} minutos")
    print(f"{'='*40}\n")

    # 📩 Enviar SMS
    try:
        telefone_formatado = f"+55{telefone_limpo}"
        enviar_sms(telefone_formatado, codigo)
    except Exception as e:
        print(e)
        return None, "Erro ao enviar SMS"

    return codigo, None


def validar_otp(telefone, codigo, consumir=True):
    """Valida um código OTP. Se consumir=True, marca como usado."""
    telefone_limpo = limpar_telefone(telefone)

    db = get_db()
    otp = db.execute(
        "SELECT * FROM codigos_otp WHERE telefone = ? AND codigo = ? AND usado = 0 ORDER BY criado_em DESC LIMIT 1",
        (telefone_limpo, codigo),
    ).fetchone()

    if not otp:
        db.close()
        return False, "Código inválido"

    expira = datetime.strptime(otp["expira_em"], "%Y-%m-%d %H:%M:%S")
    if datetime.utcnow() > expira:
        db.execute("UPDATE codigos_otp SET usado = 1 WHERE id = ?", (otp["id"],))
        db.commit()
        db.close()
        return False, "Código expirado. Solicite um novo"

    if consumir:
        db.execute("UPDATE codigos_otp SET usado = 1 WHERE id = ?", (otp["id"],))
        db.commit()

    db.close()
    return True, None


def criar_sessao(telefone):
    """Cria um token de sessão para o telefone verificado."""
    telefone_limpo = limpar_telefone(telefone)
    token = secrets.token_urlsafe(32)
    expira_em = datetime.utcnow() + timedelta(hours=SESSION_EXPIRY_HOURS)

    db = get_db()
    db.execute(
        "INSERT INTO sessoes (telefone, token, expira_em) VALUES (?, ?, ?)",
        (telefone_limpo, token, expira_em.strftime("%Y-%m-%d %H:%M:%S")),
    )
    db.commit()
    db.close()
    return token


def validar_sessao(token):
    """Valida um token de sessão. Retorna o telefone se válido."""
    if not token:
        return None

    db = get_db()
    sessao = db.execute(
        "SELECT * FROM sessoes WHERE token = ? LIMIT 1",
        (token,),
    ).fetchone()

    if not sessao:
        db.close()
        return None

    expira = datetime.strptime(sessao["expira_em"], "%Y-%m-%d %H:%M:%S")
    if datetime.utcnow() > expira:
        db.execute("DELETE FROM sessoes WHERE id = ?", (sessao["id"],))
        db.commit()
        db.close()
        return None

    db.close()
    return sessao["telefone"]


def autenticar_telefone(data):
    """Autentica via token de sessão OU código OTP. Retorna (telefone, erro)."""
    token = data.get("session_token", "")
    telefone = data.get("telefone", "") or (
        data.get("customer", {}).get("telefone", "")
    )
    telefone_limpo = limpar_telefone(telefone)

    # Tentar token de sessão primeiro
    if token:
        telefone_sessao = validar_sessao(token)
        if telefone_sessao and telefone_sessao == telefone_limpo:
            return telefone_limpo, None
        elif telefone_sessao:
            return None, "Token não corresponde ao telefone"

    # Fallback: código OTP
    # codigo_otp = data.get("codigo_otp", "")
    # if not codigo_otp:
    #     return None, "Verificação obrigatória. Envie o código para seu telefone"

    # valido, erro = validar_otp(telefone_limpo, codigo_otp)
    # if not valido:
    #     return None, erro

    return telefone_limpo, None


# ===== ENDPOINTS OTP =====


@app.route("/api/otp/enviar", methods=["POST"])
def enviar_otp():
    data = request.get_json()
    telefone = data.get("telefone", "") if data else ""
    telefone_limpo = limpar_telefone(telefone)

    if len(telefone_limpo) < 10:
        return jsonify({"erro": "Telefone inválido"}), 400

    codigo, erro = gerar_otp(telefone_limpo)
    if erro:
        return jsonify({"erro": erro}), 429

    return jsonify({"mensagem": "Código enviado com sucesso"})


@app.route("/api/otp/verificar", methods=["POST"])
def verificar_otp():
    data = request.get_json()
    telefone = data.get("telefone", "") if data else ""
    codigo = data.get("codigo", "") if data else ""

    telefone_limpo = limpar_telefone(telefone)
    if len(telefone_limpo) < 10:
        return jsonify({"erro": "Telefone inválido"}), 400

    if not codigo or len(codigo) != 6:
        return jsonify({"erro": "Código deve ter 6 dígitos"}), 400

    valido, erro = validar_otp(telefone_limpo, codigo, consumir=False)
    if not valido:
        return jsonify({"erro": erro}), 400

    # Gerar token de sessão
    token = criar_sessao(telefone_limpo)

    return jsonify(
        {"mensagem": "Telefone verificado", "verificado": True, "session_token": token}
    )


@app.route("/api/pedidos", methods=["POST"])
def criar_pedido():
    data = request.get_json()
    if not data:
        return jsonify({"erro": "Corpo da requisição vazio"}), 400

    # --- validação ---
    customer = data.get("customer", {})
    items = data.get("items", [])
    pagamento = data.get("pagamento", "")

    campos = {"nome", "telefone", "rua", "numero", "bairro"}
    faltando = [c for c in campos if not customer.get(c, "").strip()]
    if faltando:
        return jsonify({"erro": f"Campos obrigatórios: {', '.join(faltando)}"}), 400

    # --- autenticar telefone (token ou OTP) ---
    telefone_auth, erro = autenticar_telefone(data)
    if erro:
        return jsonify({"erro": erro}), 400

    if not items:
        return jsonify({"erro": "O pedido precisa ter ao menos um item"}), 400

    if pagamento not in PAGAMENTOS_VALIDOS:
        return jsonify({"erro": "Forma de pagamento inválida"}), 400

    # --- calcular total no servidor ---
    total = 0
    for item in items:
        qty = item.get("qty", 0)
        price = item.get("price", 0)
        if qty <= 0 or price <= 0:
            return jsonify({"erro": "Item com quantidade ou preço inválido"}), 400
        total += qty * price

    # --- salvar ---
    db = get_db()
    try:
        cursor = db.execute(
            """INSERT INTO pedidos (nome, telefone, rua, numero, complemento, bairro, pagamento, troco, total)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                customer["nome"].strip(),
                customer["telefone"].strip(),
                customer["rua"].strip(),
                customer["numero"].strip(),
                customer.get("complemento", "").strip() or None,
                customer["bairro"].strip(),
                pagamento,
                data.get("troco") or None,
                round(total, 2),
            ),
        )
        pedido_id = cursor.lastrowid

        for item in items:
            subtotal = item["qty"] * item["price"]
            db.execute(
                """INSERT INTO pedido_itens (pedido_id, nome, quantidade, preco_unitario, subtotal)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    pedido_id,
                    item["name"],
                    item["qty"],
                    item["price"],
                    round(subtotal, 2),
                ),
            )

        db.commit()
    except Exception:
        db.rollback()
        return jsonify({"erro": "Erro ao salvar pedido"}), 500
    finally:
        db.close()

    return (
        jsonify(
            {
                "mensagem": "Pedido criado com sucesso",
                "pedido": {
                    "id": pedido_id,
                    "items": items,
                    "total": round(total, 2),
                    "pagamento": pagamento,
                    "troco": data.get("troco"),
                    "customer": customer,
                },
            }
        ),
        201,
    )


@app.route("/api/pedidos", methods=["GET"])
def listar_pedidos():
    db = get_db()
    pedidos = db.execute("SELECT * FROM pedidos ORDER BY criado_em DESC").fetchall()

    resultado = []
    for p in pedidos:
        itens = db.execute(
            "SELECT nome, quantidade, preco_unitario, subtotal FROM pedido_itens WHERE pedido_id = ?",
            (p["id"],),
        ).fetchall()

        resultado.append(
            {
                "id": p["id"],
                "nome": p["nome"],
                "telefone": p["telefone"],
                "endereco": f"{p['rua']}, {p['numero']}"
                + (f" - {p['complemento']}" if p["complemento"] else "")
                + f" - {p['bairro']}",
                "pagamento": p["pagamento"],
                "troco": p["troco"],
                "total": p["total"],
                "status": p["status"],
                "criado_em": p["criado_em"],
                "itens": [dict(i) for i in itens],
            }
        )

    db.close()
    return jsonify(resultado)


@app.route("/api/pedidos/<int:pedido_id>/status", methods=["PATCH"])
def atualizar_status(pedido_id):
    data = request.get_json()
    novo_status = data.get("status", "") if data else ""

    status_validos = {
        "pendente",
        "preparando",
        "saiu_para_entrega",
        "entregue",
        "cancelado",
    }
    if novo_status not in status_validos:
        return (
            jsonify({"erro": f"Status inválido. Use: {', '.join(status_validos)}"}),
            400,
        )

    db = get_db()
    result = db.execute(
        "UPDATE pedidos SET status = ? WHERE id = ?", (novo_status, pedido_id)
    )
    db.commit()

    if result.rowcount == 0:
        db.close()
        return jsonify({"erro": "Pedido não encontrado"}), 404

    db.close()
    return jsonify({"mensagem": "Status atualizado", "status": novo_status})


@app.route("/api/pedidos/consulta", methods=["POST"])
def consultar_por_telefone():
    data = request.get_json()
    if not data:
        return jsonify({"erro": "Corpo da requisição vazio"}), 400

    telefone_limpo, erro = autenticar_telefone(data)
    if erro:
        return jsonify({"erro": erro}), 400

    db = get_db()
    pedidos = db.execute(
        "SELECT * FROM pedidos WHERE REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') = ? ORDER BY criado_em DESC",
        (telefone_limpo,),
    ).fetchall()

    resultado = []
    for p in pedidos:
        itens = db.execute(
            "SELECT nome, quantidade, preco_unitario, subtotal FROM pedido_itens WHERE pedido_id = ?",
            (p["id"],),
        ).fetchall()

        resultado.append(
            {
                "id": p["id"],
                "nome": p["nome"],
                "telefone": p["telefone"],
                "endereco": f"{p['rua']}, {p['numero']}"
                + (f" - {p['complemento']}" if p["complemento"] else "")
                + f" - {p['bairro']}",
                "pagamento": p["pagamento"],
                "total": p["total"],
                "status": p["status"],
                "criado_em": p["criado_em"],
                "itens": [dict(i) for i in itens],
            }
        )

    db.close()
    return jsonify(resultado)


@app.route("/api/cliente/dados", methods=["POST"])
def dados_cliente():
    data = request.get_json()
    if not data:
        return jsonify({"erro": "Corpo da requisição vazio"}), 400

    telefone_limpo, erro = autenticar_telefone(data)
    if erro:
        return jsonify({"erro": erro}), 400

    db = get_db()
    ultimo = db.execute(
        "SELECT nome, telefone, rua, numero, complemento, bairro FROM pedidos WHERE REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') = ? ORDER BY criado_em DESC LIMIT 1",
        (telefone_limpo,),
    ).fetchone()
    db.close()

    if not ultimo:
        return jsonify({"encontrado": False})

    return jsonify(
        {
            "encontrado": True,
            "nome": ultimo["nome"],
            "telefone": ultimo["telefone"],
            "rua": ultimo["rua"],
            "numero": ultimo["numero"],
            "complemento": ultimo["complemento"] or "",
            "bairro": ultimo["bairro"],
        }
    )


# ===== ADMIN AUTH =====

admin_tokens = {}


def verificar_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token or token not in admin_tokens:
            return jsonify({"erro": "Não autorizado"}), 401
        if datetime.utcnow() > admin_tokens[token]["expira_em"]:
            del admin_tokens[token]
            return jsonify({"erro": "Sessão expirada"}), 401
        return f(*args, **kwargs)

    return decorated


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    usuario = data.get("usuario", "") if data else ""
    senha = data.get("senha", "") if data else ""

    if not usuario or not senha:
        return jsonify({"erro": "Usuário e senha obrigatórios"}), 400

    senha_hash = hashlib.sha256(senha.encode()).hexdigest()

    db = get_db()
    admin = db.execute(
        "SELECT * FROM admin_users WHERE usuario = ? AND senha_hash = ?",
        (usuario, senha_hash),
    ).fetchone()
    db.close()

    if not admin:
        return jsonify({"erro": "Usuário ou senha inválidos"}), 401

    token = secrets.token_urlsafe(32)
    admin_tokens[token] = {
        "usuario": usuario,
        "expira_em": datetime.utcnow() + timedelta(hours=ADMIN_TOKEN_EXPIRY_HOURS),
    }

    return jsonify({"token": token, "usuario": usuario})


@app.route("/api/admin/pedidos", methods=["GET"])
@verificar_admin
def admin_listar_pedidos():
    db = get_db()
    pedidos = db.execute("SELECT * FROM pedidos ORDER BY criado_em DESC").fetchall()

    resultado = []
    for p in pedidos:
        itens = db.execute(
            "SELECT nome, quantidade, preco_unitario, subtotal FROM pedido_itens WHERE pedido_id = ?",
            (p["id"],),
        ).fetchall()

        resultado.append(
            {
                "id": p["id"],
                "nome": p["nome"],
                "telefone": p["telefone"],
                "endereco": f"{p['rua']}, {p['numero']}"
                + (f" - {p['complemento']}" if p["complemento"] else "")
                + f" - {p['bairro']}",
                "pagamento": p["pagamento"],
                "troco": p["troco"],
                "total": p["total"],
                "status": p["status"],
                "criado_em": p["criado_em"],
                "itens": [dict(i) for i in itens],
            }
        )

    db.close()
    return jsonify(resultado)


@app.route("/api/admin/pedidos/<int:pedido_id>/status", methods=["PATCH"])
@verificar_admin
def admin_atualizar_status(pedido_id):
    data = request.get_json()
    novo_status = data.get("status", "") if data else ""

    status_validos = {
        "pendente",
        "preparando",
        "saiu_para_entrega",
        "entregue",
        "cancelado",
    }
    if novo_status not in status_validos:
        return (
            jsonify({"erro": f"Status inválido. Use: {', '.join(status_validos)}"}),
            400,
        )

    db = get_db()
    result = db.execute(
        "UPDATE pedidos SET status = ? WHERE id = ?", (novo_status, pedido_id)
    )
    db.commit()

    if result.rowcount == 0:
        db.close()
        return jsonify({"erro": "Pedido não encontrado"}), 404

    db.close()
    return jsonify({"mensagem": "Status atualizado", "status": novo_status})


@app.route("/check")
def admin_page():
    return app.send_static_file("check.html")


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
    @app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    db = get_db()
    produtos = db.execute("SELECT * FROM produtos WHERE ativo = 1").fetchall()
    db.close()

    return jsonify([dict(p) for p in produtos])
    @app.route("/api/admin/produtos", methods=["POST"])
def criar_produto():
    data = request.json
    db = get_db()

    db.execute("""
        INSERT INTO produtos (nome, descricao, preco, imagem, categoria)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data["nome"],
        data.get("descricao"),
        data["preco"],
        data.get("imagem"),
        data.get("categoria")
    ))

    db.commit()
    db.close()

    return jsonify({"msg": "Produto criado"})
    @app.route("/api/admin/produtos", methods=["GET"])
def listar_produtos_admin():
    db = get_db()
    produtos = db.execute("SELECT * FROM produtos").fetchall()
    db.close()

    return jsonify([dict(p) for p in produtos])
    @app.route("/api/admin/produtos/<int:id>", methods=["DELETE"])
def deletar_produto(id):
    db = get_db()
    db.execute("DELETE FROM produtos WHERE id=?", (id,))
    db.commit()
    db.close()

    return jsonify({"msg": "Deletado"})
