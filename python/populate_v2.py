import requests
import urllib3
import time
from supabase import create_client, Client

# --- CONFIGURAÇÃO (PREENCHA AQUI!) ---
SUPABASE_URL = "https://etdnnxdigxgyqntpaiaz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZG5ueGRpZ3hneXFudHBhaWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzIzNjEsImV4cCI6MjA4MjM0ODM2MX0.OI9ABrl96f1Hnu5kW84-qhF4e50ZU-ODDNCyZ_IrpiE" # Use a Service Role se tiver RLS ativo


db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Lista de APIs para tentar (A oficial e a de backup)
SOURCES = [
    "https://loteriascaixa-api.herokuapp.com/api/loteca/{}", # Fonte Comunitária (Mais detalhada)
    "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca/{}" # Oficial (Falha no histórico)
]

def fetch_concurso(numero):
    for url_template in SOURCES:
        url = url_template.format(numero)
        try:
            print(f"   Trying: {url}...")
            # Headers para evitar bloqueio
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0'}
            response = requests.get(url, headers=headers, verify=False, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Verifica se tem jogos. A API comunitária usa chave 'jogos', a oficial usa 'listaJogos'
                lista = data.get('jogos') or data.get('listaJogos') or []
                
                if len(lista) == 14: # Só aceita se tiver 14 jogos
                    return data, lista
                else:
                    print(f"   ⚠️  Fonte retornou lista vazia ou incompleta ({len(lista)} jogos). Tentando próxima...")
        except Exception as e:
            print(f"   ❌ Erro na fonte: {e}")
    return None, None

def salvar_no_banco(dados_api, lista_jogos):
    concurso = dados_api.get('concurso') or dados_api.get('numero')
    data_str = dados_api.get('data') or dados_api.get('dataApuracao')
    
    # Padronizar data (DD/MM/YYYY -> YYYY-MM-DD)
    if data_str and '/' in data_str:
        d, m, y = data_str.split('/')
        data_iso = f"{y}-{m}-{d}"
    else:
        print("   ❌ Data inválida, pulando.")
        return

    jogos_formatados = []
    qtd_1, qtd_x, qtd_2 = 0, 0, 0

    for j in lista_jogos:
        # A API comunitária tem nomes de chaves diferentes da oficial
        mandante = j.get('time1') or j.get('timeCoracaoMandante') or j.get('nomeTimeCoracaoMandante')
        visitante = j.get('time2') or j.get('timeCoracaoVisitante') or j.get('nomeTimeCoracaoVisitante')
        
        # Placar pode vir como int ou string, ou 'golsMandante'
        try:
            gol_m = int(j.get('placar1') if j.get('placar1') is not None else j.get('golsMandante', 0))
            gol_v = int(j.get('placar2') if j.get('placar2') is not None else j.get('golsVisitante', 0))
        except:
            gol_m, gol_v = 0, 0 # Se der erro na conversão

        coluna = 'X'
        if gol_m > gol_v: 
            coluna = '1'; qtd_1 += 1
        elif gol_v > gol_m: 
            coluna = '2'; qtd_2 += 1
        else: 
            coluna = 'X'; qtd_x += 1

        jogos_formatados.append({
            "m": mandante, "v": visitante, "r": coluna,
            "gm": gol_m, "gv": gol_v # Salvamos os gols pra debug se quiser
        })

    payload = {
        "concurso": concurso,
        "data_apuracao": data_iso,
        "jogos": jogos_formatados,
        "qtd_1": qtd_1, "qtd_x": qtd_x, "qtd_2": qtd_2
    }

    # Upsert (Atualiza se já existir, corrigindo os 0-0-0)
    db.table("historico_loteca").upsert(payload, on_conflict='concurso').execute()
    print(f"✅ Concurso {concurso} ATUALIZADO com sucesso! Matriz: {qtd_1}-{qtd_x}-{qtd_2}")

# --- EXECUÇÃO ---
# Vamos do 1140 até o 1180 (ou ajuste conforme quiser)
INICIO = 1140
FIM = 1185

print(f"🚀 Iniciando reparo do banco (Concursos {INICIO} a {FIM})...")

for i in range(FIM, INICIO, -1):
    print(f"Processando {i}...")
    dados, lista = fetch_concurso(i)
    
    if dados and lista:
        salvar_no_banco(dados, lista)
    else:
        print(f"❌ Falha total ao buscar concurso {i}")
    
    time.sleep(1) # Respeite a API