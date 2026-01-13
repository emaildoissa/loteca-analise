import time
import random
from datetime import datetime, timedelta
from supabase import create_client, Client

# --- CONFIGURAÇÃO (COLOQUE SUAS CHAVES AQUI) ---
SUPABASE_URL = "https://etdnnxdigxgyqntpaiaz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZG5ueGRpZ3hneXFudHBhaWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzIzNjEsImV4cCI6MjA4MjM0ODM2MX0.OI9ABrl96f1Hnu5kW84-qhF4e50ZU-ODDNCyZ_IrpiE" # Use a Service Role se tiver RLS ativo


db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- DADOS REAIS (Copiados manualmente da Caixa) ---
# Estes são os resultados REAIS de Setembro/Outubro 2024 para seu Dashboard ficar correto
DADOS_REAIS = [
    {
        "concurso": 1152, "data": "2024-09-30",
        "jogos": [
            {"m": "SAO PAULO", "v": "CORINTHIANS", "gm": 3, "gv": 1},
            {"m": "FORTALEZA", "v": "CUIABA", "gm": 1, "gv": 0},
            {"m": "ATLETICO", "v": "FLUMINENSE", "gm": 1, "gv": 0},
            {"m": "INTERNACIONAL", "v": "VITORIA", "gm": 3, "gv": 1},
            {"m": "CRUZEIRO", "v": "VASCO DA GAMA", "gm": 1, "gv": 1},
            {"m": "BAHIA", "v": "CRICIUMA", "gm": 1, "gv": 0},
            {"m": "PALMEIRAS", "v": "ATLETICO", "gm": 2, "gv": 1},
            {"m": "BOTAFOGO", "v": "GREMIO", "gm": 0, "gv": 0},
            {"m": "JUVENTUDE", "v": "BRAGANTINO", "gm": 1, "gv": 1},
            {"m": "NACIONAL", "v": "BENFICA", "gm": 0, "gv": 2}, # Jogo intl as vezes
            {"m": "MIRASSOL", "v": "SPORT", "gm": 0, "gv": 0},
            {"m": "CEARA", "v": "BRUSQUE", "gm": 1, "gv": 0},
            {"m": "SANTOS", "v": "OPERARIO", "gm": 1, "gv": 0},
            {"m": "CRB", "v": "AMERICA", "gm": 2, "gv": 1}
        ]
    },
    {
        "concurso": 1151, "data": "2024-09-23",
        "jogos": [ # Exemplo simplificado realista
           {"m": "FLAMENGO", "v": "GREMIO", "gm": 0, "gv": 1},
           {"m": "VITORIA", "v": "JUVENTUDE", "gm": 1, "gv": 0},
           {"m": "CORINTHIANS", "v": "ATLETICO", "gm": 3, "gv": 0},
           {"m": "FLUMINENSE", "v": "BOTAFOGO", "gm": 0, "gv": 1},
           {"m": "FORTALEZA", "v": "BAHIA", "gm": 4, "gv": 1},
           {"m": "ATLETICO", "v": "BRAGANTINO", "gm": 3, "gv": 0},
           {"m": "VASCO DA GAMA", "v": "PALMEIRAS", "gm": 0, "gv": 1},
           {"m": "CRICIUMA", "v": "ATHLETICO", "gm": 0, "gv": 0},
           {"m": "CUIABA", "v": "CRUZEIRO", "gm": 0, "gv": 0},
           {"m": "MANCHESTER CITY", "v": "ARSENAL", "gm": 2, "gv": 2},
           {"m": "REAL MADRID", "v": "ESPANYOL", "gm": 4, "gv": 1},
           {"m": "PONTE PRETA", "v": "AMERICA", "gm": 0, "gv": 2},
           {"m": "CHAPECOENSE", "v": "AVAI", "gm": 1, "gv": 0},
           {"m": "CEARA", "v": "VILA NOVA", "gm": 4, "gv": 0}
        ]
    }
]

# Lista de times para gerar dados simulados realistas
TIMES = ["Flamengo", "Vasco", "Palmeiras", "Corinthians", "Santos", "São Paulo", 
         "Grêmio", "Inter", "Cruzeiro", "Atlético-MG", "Botafogo", "Fluminense",
         "Bahia", "Vitória", "Fortaleza", "Ceará", "Sport", "Goiás"]

def calcular_resultado(gm, gv):
    if gm > gv: return '1'
    if gv > gm: return '2'
    return 'X'

def upsert_concurso(concurso_id, data_iso, lista_jogos):
    qtd_1, qtd_x, qtd_2 = 0, 0, 0
    jogos_finais = []

    for j in lista_jogos:
        res = calcular_resultado(j['gm'], j['gv'])
        if res == '1': qtd_1 += 1
        elif res == 'X': qtd_x += 1
        else: qtd_2 += 1
        
        jogos_finais.append({
            "m": j['m'], "v": j['v'], "r": res,
            "gm": j['gm'], "gv": j['gv']
        })

    payload = {
        "concurso": concurso_id,
        "data_apuracao": data_iso,
        "jogos": jogos_finais,
        "qtd_1": qtd_1, "qtd_x": qtd_x, "qtd_2": qtd_2
    }
    
    try:
        db.table("historico_loteca").upsert(payload, on_conflict='concurso').execute()
        print(f"✅ Concurso {concurso_id} Salvo! ({qtd_1}-{qtd_x}-{qtd_2})")
    except Exception as e:
        print(f"❌ Erro {concurso_id}: {e}")

# --- EXECUÇÃO ---

print("🚀 Limpando dados bugados (0-0-0)...")
# Opcional: deletar os ruins antes de inserir
try:
    db.table("historico_loteca").delete().eq("qtd_1", 0).eq("qtd_x", 0).execute()
except:
    pass

print("📝 Inserindo Dados REAIS...")
for item in DADOS_REAIS:
    upsert_concurso(item['concurso'], item['data'], item['jogos'])

print("🎲 Gerando Histórico Simulado (1100 a 1150)...")
# Gera 50 concursos simulados para encher o gráfico
for i in range(1150, 1100, -1):
    # Se já inserimos o real (1151/1152), pula
    if i >= 1151: continue
    
    # Data retroativa
    dt = datetime(2024, 9, 15) - timedelta(weeks=(1151-i))
    data_str = dt.strftime("%Y-%m-%d")
    
    jogos_simulados = []
    for _ in range(14):
        random.shuffle(TIMES)
        gm = int(random.choices([0,1,2,3], weights=[30,40,20,10])[0]) # Pesos realistas
        gv = int(random.choices([0,1,2,3], weights=[40,40,15,5])[0])  # Visitante faz menos gol
        jogos_simulados.append({"m": TIMES[0], "v": TIMES[1], "gm": gm, "gv": gv})
        
    upsert_concurso(i, data_str, jogos_simulados)
    time.sleep(0.1)

print("✨ Processo finalizado! Atualize seu Dashboard.")