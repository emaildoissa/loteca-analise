import requests
import json
import time
from supabase import create_client, Client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = "https://etdnnxdigxgyqntpaiaz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZG5ueGRpZ3hneXFudHBhaWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzIzNjEsImV4cCI6MjA4MjM0ODM2MX0.OI9ABrl96f1Hnu5kW84-qhF4e50ZU-ODDNCyZ_IrpiE" # Use a Service Role se tiver RLS ativo
db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Headers para "enganar" a Caixa e parecer um navegador real
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json'
}

def get_loteca_data(concurso_num=None):
    """Busca dados de um concurso específico ou do último se for None"""
    base_url = "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca"
    url = f"{base_url}/{concurso_num}" if concurso_num else base_url
    
    try:
        # Desabilita verificação SSL pq o certificado da Caixa as vezes falha em scripts
        response = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Erro ao baixar concurso {concurso_num}: {e}")
    return None

def parse_and_save(data):
    if not data: return

    concurso = data.get('numero')
    data_apuracao = data.get('dataApuracao') # Formato vem DD/MM/YYYY
    
    # Converter data para YYYY-MM-DD
    if data_apuracao:
        d, m, y = data_apuracao.split('/')
        data_apuracao_iso = f"{y}-{m}-{d}"
    else:
        return

    lista_jogos = data.get('listaJogos', [])
    jogos_formatados = []
    
    qtd_1, qtd_x, qtd_2 = 0, 0, 0

    for jogo in lista_jogos:
        # A API da caixa retorna os nomes dos times
        mandante = jogo.get('timeCoracaoMandante') or jogo.get('nomeTimeCoracaoMandante') or "Time 1"
        visitante = jogo.get('timeCoracaoVisitante') or jogo.get('nomeTimeCoracaoVisitante') or "Time 2"
        
        # Resultado (Coluna vencedora)
        # Na API da caixa: 1 = Coluna 1, 2 = Coluna 2 (Visitante), 3 = Coluna do Meio (Empate) - CUIDADO AQUI
        # Vamos normalizar para nosso app: '1', 'X', '2'
        
        coluna_vencedora = None
        # Lógica de detecção de ganhador da Caixa
        gols_m = jogo.get('golsMandante', 0)
        gols_v = jogo.get('golsVisitante', 0)
        
        # Se o concurso já aconteceu, calculamos o resultado
        if gols_m > gols_v:
            coluna_vencedora = '1'
            qtd_1 += 1
        elif gols_v > gols_m:
            coluna_vencedora = '2'
            qtd_2 += 1
        else:
            coluna_vencedora = 'X'
            qtd_x += 1
            
        jogos_formatados.append({
            "m": mandante.strip(),
            "v": visitante.strip(),
            "r": coluna_vencedora
        })

    # Salvar no Supabase
    payload = {
        "concurso": concurso,
        "data_apuracao": data_apuracao_iso,
        "jogos": jogos_formatados, # O Supabase converte lista pra JSONB automaticamente
        "qtd_1": qtd_1,
        "qtd_x": qtd_x,
        "qtd_2": qtd_2
    }

    try:
        data, count = db.table("historico_loteca").upsert(payload, on_conflict='concurso').execute()
        print(f"✅ Concurso {concurso} salvo com sucesso! (Matriz: {qtd_1}-{qtd_x}-{qtd_2})")
    except Exception as e:
        print(f"❌ Erro ao salvar {concurso}: {e}")

# --- EXECUÇÃO ---
# 1. Pegar o último para saber onde parar
print("Buscando último concurso...")
ultimo = get_loteca_data()
if ultimo:
    ultimo_num = ultimo['numero']
    print(f"Último concurso é o {ultimo_num}. Iniciando carga...")
    
    # Loop reverso ou sequencial. Vamos pegar os últimos 100 para testar rápido.
    # Mude range(ultimo_num, 0, -1) para pegar TODOS (vai demorar uns 15 mins)
    for i in range(ultimo_num, ultimo_num - 50, -1): 
        dados = get_loteca_data(i)
        parse_and_save(dados)
        time.sleep(0.5) # Pausa para não bloquear o IP