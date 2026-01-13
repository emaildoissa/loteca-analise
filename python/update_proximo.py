import requests
import urllib3
from supabase import create_client, Client

# --- CONFIGURAÇÃO ---
# Mude disto:
# SUPABASE_URL = "SUA_URL_AQUI"

# Para algo assim (começando com https://):
SUPABASE_URL = "https://etdnnxdigxgyqntpaiaz.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Sua chave Service Role gigante

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def atualizar_proximo_concurso():
    # URL sem número no final retorna o concurso MAIS RECENTE (o aberto)
    url = "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0'
    }

    print("📡 Buscando concurso aberto na Caixa...")
    
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=15)
        if response.status_code != 200:
            print("❌ Erro ao conectar na Caixa.")
            return

        data = response.json()
        concurso = data.get('numero')
        data_apuracao = data.get('dataApuracao') # Vem DD/MM/YYYY
        lista_jogos = data.get('listaJogos', [])

        if not lista_jogos:
            print("⚠️ Concurso encontrado, mas lista de jogos está vazia (Caixa ainda não divulgou).")
            return

        # Converter Data
        d, m, y = data_apuracao.split('/')
        data_iso = f"{y}-{m}-{d}"

        print(f"✅ Encontrado Concurso {concurso} ({data_apuracao}) com {len(lista_jogos)} jogos.")

        # Formatar para o Supabase
        jogos_formatados = []
        for j in lista_jogos:
            jogos_formatados.append({
                "m": j.get('timeCoracaoMandante') or j.get('nomeTimeCoracaoMandante'),
                "v": j.get('timeCoracaoVisitante') or j.get('nomeTimeCoracaoVisitante'),
                "r": None, # Sem resultado ainda
                "probM": 0.33, "probX": 0.33, "probV": 0.33 # Placeholder para probabilidades
            })

        payload = {
            "concurso": concurso,
            "data_apuracao": data_iso,
            "jogos": jogos_formatados,
            "qtd_1": 0, "qtd_x": 0, "qtd_2": 0 # Zerado pois não aconteceu
        }

        # Salvar no Banco
        db.table("historico_loteca").upsert(payload, on_conflict='concurso').execute()
        print("💾 Salvo no Supabase com sucesso! Agora vá na página de Palpites.")

    except Exception as e:
        print(f"❌ Erro fatal: {e}")

if __name__ == "__main__":
    atualizar_proximo_concurso()